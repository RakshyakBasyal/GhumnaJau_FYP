import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  Loader2, 
  MapPin, 
  Search, 
  ShieldCheck, 
  Filter, 
  CheckCircle2, 
  Zap, 
  User,
  Heart,
  X
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import {
  getBuddyConnections,
  getBuddyRequests,
  getDiscoverUsers,
  sendBuddyRequest,
  respondBuddyRequest,
} from "../services/api";

const BASE_URL = "http://localhost:5000";

const avatarUrl = (value) => {
  if (!value) return "";
  // Only show photo if it's NOT from Google (meaning it's an uploaded one)
  if (String(value).includes('googleusercontent.com')) return '';
  return String(value).startsWith("http") ? value : `http://localhost:5000${value}`;
};

export default function FindBuddy({ isCommunityView = false }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const myId = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return decoded?.id || decoded?._id || null;
    } catch (_) {
      return null;
    }
  })();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [connectMap, setConnectMap] = useState({});
  const [incomingMap, setIncomingMap] = useState({}); // userId -> requestId
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    place: "",
    interest: "",
    language: "",
    style: "",
    pace: "",
  });

  const refreshAll = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const queryParams = {
        place: nextFilters.place || "",
        interest: nextFilters.interest || "",
        style: nextFilters.style || "",
        pace: nextFilters.pace || "",
      };
      if (queryParams.q) queryParams.q = queryParams.q.trim();
      
      const [usersRes, reqRes, connRes] = await Promise.all([
        getDiscoverUsers(queryParams),
        getBuddyRequests(),
        getBuddyConnections(),
      ]);

      const incomingData = reqRes.data.incoming || [];
      const connectedData = connRes.data.buddies || [];
      const discoverUsers = usersRes.data.users || [];

      setUsers(discoverUsers);

      const statusMap = {};
      const reqMap = {};
      connectedData.forEach((u) => { if (u?._id) statusMap[u._id] = "connected"; });
      incomingData.forEach((r) => { 
        if (r?.requester?._id) {
          statusMap[r.requester._id] = "received"; 
          reqMap[r.requester._id] = r._id;
        }
      });
      (reqRes.data.outgoing || []).forEach((r) => r?.recipient?._id && (statusMap[r.recipient._id] = "sent"));
      
      setConnectMap(statusMap);
      setIncomingMap(reqMap);
    } catch (err) {
      showToast("Failed to load buddies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleUsers = useMemo(
    () =>
      users
        .filter((u) => String(u._id) !== String(myId))
        .filter((u) => {
          const q = filters.q.trim().toLowerCase();
          if (!q) return true;
          return (u.fullName || "").toLowerCase().includes(q) || 
                 (u.preferredDestinations || []).some(d => d.toLowerCase().includes(q));
        })
        .filter((u) => {
          const lang = filters.language.trim().toLowerCase();
          if (!lang) return true;
          return (u.languages || []).some((l) => String(l).toLowerCase().includes(lang));
        })
        .sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0)),
    [users, myId, filters.q, filters.language]
  );

  const handleConnect = async (userId) => {
    const status = connectMap[userId] || "none";
    if (status === "connected" || status === "sent") return;

    try {
      if (status === "received") {
        const requestId = incomingMap[userId];
        if (!requestId) throw new Error("Request ID missing");
        await respondBuddyRequest(requestId, "accept");
        showToast("Buddy request accepted!", "success");
      } else {
        await sendBuddyRequest(userId);
        showToast("Request sent!", "success");
      }
      refreshAll();
    } catch (err) {
      showToast(err.message || "Operation failed", "error");
    }
  };

  const handleFilterChange = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    refreshAll(next);
  };

  const clearFilters = () => {
    const cleared = { q: "", place: "", interest: "", language: "", style: "", pace: "" };
    setFilters(cleared);
    refreshAll(cleared);
  };

  return (
    <div className={`${isCommunityView ? '' : 'min-h-screen bg-gray-50 py-6 px-4'}`}>
      <div className={`${isCommunityView ? '' : 'max-w-[1280px] mx-auto'}`}>
        
        {/* Unified Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${isCommunityView ? 'bg-white p-5 rounded-2xl border border-gray-100' : ''}`}>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Travel Buddies</h2>
            <p className="text-sm text-gray-500 mt-1">Connect with like-minded travelers exploring Nepal</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search name or place..."
                value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all w-56"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border transition-all ${
                showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Destination:</span>
              <input
                value={filters.place}
                onChange={(e) => handleFilterChange('place', e.target.value)}
                placeholder="Pokhara, Mustang..."
                className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 w-44"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Style:</span>
              <select 
                value={filters.style}
                onChange={(e) => handleFilterChange('style', e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700"
              >
                <option value="">Any Style</option>
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-range</option>
                <option value="luxury">Luxury</option>
                <option value="backpacker">Backpacker</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pace:</span>
              <select 
                value={filters.pace}
                onChange={(e) => handleFilterChange('pace', e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700"
              >
                <option value="">Any Pace</option>
                <option value="slow">Slow</option>
                <option value="moderate">Moderate</option>
                <option value="fast">Fast</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interest:</span>
              <input
                value={filters.interest}
                onChange={(e) => handleFilterChange('interest', e.target.value)}
                placeholder="trekking, food..."
                className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Language:</span>
              <input
                value={filters.language}
                onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
                placeholder="english..."
                className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 w-36"
              />
            </div>

            <button 
              onClick={clearFilters}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wider ml-auto bg-gray-50 rounded-xl border border-transparent hover:border-red-100"
            >
              Clear All
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          {/* Main Content Area */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {visibleUsers.length} {visibleUsers.length === 1 ? 'Buddy' : 'Buddies'} Found
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
            ) : visibleUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <Search size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No travelers found</h3>
                <p className="text-sm text-gray-500">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleUsers.map((user) => {
                  const status = connectMap[user._id] || "none";
                  const src = avatarUrl(user.avatar);
                  return (
                    <div key={user._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group border border-gray-100">
                      <div className="relative h-32 flex-shrink-0 overflow-hidden">
                        {src ? (
                          <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-200"><User size={56} /></div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-600 flex items-center gap-1 shadow-sm">
                          <Zap size={10} className="fill-blue-600" />
                          {user.compatibilityScore || 85}% Match
                        </div>
                      </div>
                      
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-base font-bold text-gray-900 truncate flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                            {user.fullName}
                            <CheckCircle2 size={16} className="text-blue-500" />
                          </h3>
                        </div>
                        
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-3">
                          <MapPin size={12} className="text-blue-500" />
                          <span className="font-bold">{(user.preferredDestinations || [])[0] || 'Nepal'}</span>
                          <span className="text-gray-300">•</span>
                          <span>{user.travelStyle || 'Explorer'}</span>
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {(user.travelInterests || []).slice(0, 3).map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-md border border-gray-100 uppercase tracking-wider">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto flex gap-2">
                          <button 
                            onClick={() => navigate(`/profile/${user._id}`)} 
                            className="flex-1 py-2 bg-white text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition border border-gray-200"
                          >
                            Profile
                          </button>
                          <button 
                            onClick={() => handleConnect(user._id)}
                            disabled={status !== 'none' && status !== 'received'}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                              status === 'none' || status === 'received' 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {status === 'none' ? 'Connect' : status === 'sent' ? 'Sent' : status === 'connected' ? 'Buddy' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Safety Tips */}
            <div className="bg-[#f6fbfb] rounded-2xl p-5 border border-[#e8f4f4]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-[#0d9488] shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-base font-bold text-gray-900">Safety Tips</h4>
              </div>
              <ul className="space-y-3">
                {[
                  "Meet in public places",
                  "Share itinerary with family",
                  "Verify buddy credentials",
                  "Trust your instincts"
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 leading-snug">
                    <Check size={14} className="text-[#0d9488] mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Matching */}
            <div className="bg-[#f5f9ff] rounded-2xl p-5 border border-[#e7f0ff]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <Heart size={20} className="fill-blue-600" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Smart Match</h4>
              </div>
              <p className="text-xs text-gray-500 mb-4">Matching based on:</p>
              <ul className="space-y-3">
                {[
                  "Travel interests",
                  "Budget preferences",
                  "Travel pace",
                  "Destination overlap"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
