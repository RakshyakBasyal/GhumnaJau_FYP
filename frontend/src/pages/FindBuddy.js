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
  User,
  Heart,
  X,
  Compass
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

const TRAVEL_STYLES = [
  "Adventure Seeker",
  "Cultural Explorer",
  "Backpacker",
  "Luxury Traveler",
  "Eco Traveler",
  "Solo Wanderer",
  "Food Lover",
  "Spiritual Seeker",
  "Urban Explorer",
  "Wildlife Enthusiast",
];
const TRAVEL_PACES   = ["Slow", "Moderate", "Fast"];
const BUDGET_RANGES  = ["Budget Traveler", "Mid-Range Traveler", "Luxury Traveler"];

const avatarUrl = (value) => {
  if (!value) return "";
  const s = String(value);
  // Support both local uploads and external (Google) photos
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
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
  const [allDestinations, setAllDestinations] = useState([]);
  const [destQuery, setDestQuery] = useState("");
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    place: "",
    interest: "",
    language: "",
    style: "",
    pace: "",
    budget: "",
  });

  const refreshAll = async (nextFilters = filters) => {
    setLoading(true);
    try {
      const queryParams = {
        place: nextFilters.place || "",
        interest: nextFilters.interest || "",
        style: nextFilters.style || "",
        pace: nextFilters.pace || "",
        budget: nextFilters.budget || "",
      };
      if (queryParams.q) queryParams.q = queryParams.q.trim();
      
      const [usersRes, reqRes, connRes, destRes] = await Promise.all([
        getDiscoverUsers(queryParams),
        getBuddyRequests(),
        getBuddyConnections(),
        fetch(`${BASE_URL}/api/destinations`).then(r => r.json())
      ]);

      const incomingData = reqRes.data.incoming || [];
      const connectedData = connRes.data.buddies || [];
      const discoverUsers = usersRes.data.users || [];
      const dests = Array.isArray(destRes) ? destRes : destRes.destinations || [];

      setUsers(discoverUsers);
      setAllDestinations(dests);

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
    [users, myId, filters]
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
    const cleared = { q: "", place: "", interest: "", language: "", style: "", pace: "", budget: "" };
    setFilters(cleared);
    setDestQuery("");
    refreshAll(cleared);
  };

  const filteredDests = useMemo(() => {
    if (!destQuery.trim()) return [];
    return allDestinations
      .filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()))
      .slice(0, 5);
  }, [allDestinations, destQuery]);

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
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 animate-in slide-in-from-top-2 duration-300 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Destination Search with Suggestions */}
              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Preferred Destination</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={destQuery || filters.place}
                    onChange={(e) => {
                      setDestQuery(e.target.value);
                      setShowDestSuggestions(true);
                      if (!e.target.value) handleFilterChange('place', '');
                    }}
                    onFocus={() => setShowDestSuggestions(true)}
                    placeholder="Where to?"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-gray-700"
                  />
                  {(destQuery || filters.place) && (
                    <button 
                      onClick={() => { setDestQuery(""); handleFilterChange('place', ''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Destination Suggestions Dropdown */}
                {showDestSuggestions && filteredDests.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[60] overflow-hidden p-1 animate-in fade-in zoom-in-95 duration-200">
                    {filteredDests.map(d => (
                      <button
                        key={d._id}
                        onClick={() => {
                          handleFilterChange('place', d.name);
                          setDestQuery(d.name);
                          setShowDestSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl transition-all text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {d.images?.[0] ? (
                            <img 
                              src={d.images[0].startsWith('http') ? d.images[0] : `${BASE_URL}${d.images[0]}`} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <MapPin size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800">{d.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{d.country || 'Nepal'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Travel Style */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Travel Style</label>
                <select 
                  value={filters.style}
                  onChange={(e) => handleFilterChange('style', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 transition-all appearance-none"
                >
                  <option value="">All Styles</option>
                  {TRAVEL_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              
              {/* Travel Pace */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Travel Pace</label>
                <select 
                  value={filters.pace}
                  onChange={(e) => handleFilterChange('pace', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 transition-all appearance-none"
                >
                  <option value="">All Paces</option>
                  {TRAVEL_PACES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Budget Range */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Range</label>
                <select
                  value={filters.budget}
                  onChange={(e) => handleFilterChange('budget', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 transition-all appearance-none"
                >
                  <option value="">All Budgets</option>
                  {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Interest */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Special Interests</label>
                <input
                  value={filters.interest}
                  onChange={(e) => handleFilterChange('interest', e.target.value)}
                  placeholder="e.g. Trekking, Food"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 transition-all"
                />
              </div>

              {/* Language */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Language Spoken</label>
                <input
                  value={filters.language}
                  onChange={(e) => setFilters((prev) => ({ ...prev, language: e.target.value }))}
                  placeholder="e.g. English, Nepali"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-end gap-3">
                <button 
                  onClick={clearFilters}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-red-500 transition-all uppercase tracking-wider bg-gray-50 rounded-xl border border-gray-100 hover:border-red-100"
                >
                  Reset
                </button>
              </div>
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleUsers.map((user) => {
                  const status = connectMap[user._id] || "none";
                  const src = avatarUrl(user.avatar);
                  const score = user.compatibilityScore ?? 0;
                  const scoreColor = score >= 70 ? 'text-green-600' : 'text-blue-600';
                  const scoreBg = score >= 70 ? 'bg-green-50' : 'bg-blue-50';
                  const scoreBorder = score >= 70 ? 'border-green-100' : 'border-blue-100';

                  return (
                    <div key={user._id} className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col group border border-gray-100">
                      
                      {/* Main Card Content */}
                      <div className="p-5 flex flex-col items-center text-center">
                        
                        {/* Avatar */}
                        <div className="relative mb-3">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-50 bg-white shadow-sm">
                            {src ? (
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-200">
                                <User size={40} />
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">
                            <CheckCircle2 size={16} className="text-blue-500" />
                          </div>
                        </div>

                        {/* Name & Basic Info */}
                        <div className="mb-4">
                          <h3 className="text-lg font-bold text-gray-900">
                            {user.fullName}
                          </h3>
                          <div className="flex items-center justify-center gap-2 mt-0.5">
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">
                              {user.travelStyle || 'Traveler'}
                            </span>
                            {user.city && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase">
                                <MapPin size={10} className="text-blue-400" />
                                {user.city}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Compatibility Score - Vibrant & Simple */}
                        <div className={`w-full ${scoreBg} ${scoreBorder} border rounded-2xl p-3 mb-4 flex flex-col items-center justify-center`}>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Match Score</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className={`text-3xl font-bold ${scoreColor}`}>
                              {score}
                            </span>
                            <span className={`text-sm font-bold ${scoreColor} opacity-70`}>%</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full">
                          <button
                            onClick={() => navigate(`/profile/${user._id}`)}
                            className="flex-1 py-2.5 px-4 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition border border-gray-100"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => handleConnect(user._id)}
                            disabled={status !== 'none' && status !== 'received'}
                            className={`flex-[1.5] py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
                              status === 'none' || status === 'received'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : status === 'connected'
                                ? 'bg-green-100 text-green-700 border border-green-200 cursor-default'
                                : 'bg-gray-100 text-gray-400 cursor-default'
                            }`}
                          >
                            {status === 'none' ? 'Connect' : status === 'sent' ? 'Sent' : status === 'connected' ? 'Buddies' : 'Accept'}
                          </button>
                        </div>
                      </div>

                      {/* Subtle Match Details */}
                      <div className="px-5 pb-5 space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {[
                            { label: "Interests",    value: user.scoreBreakdown?.interests    ?? 0 },
                            { label: "Style",        value: user.scoreBreakdown?.style        ?? 0 },
                            { label: "Pace",         value: user.scoreBreakdown?.pace         ?? 0 },
                            { label: "Budget",       value: user.scoreBreakdown?.budget       ?? 0 },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-medium">{label}</span>
                              <span className={`text-[10px] font-bold ${
                                value >= 70 ? 'text-green-600' : 'text-blue-600'
                              }`}>{value}%</span>
                            </div>
                          ))}
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
                  { label: "Travel interests", pts: "35pts" },
                  { label: "Destination overlap", pts: "20pts" },
                  { label: "Travel style", pts: "15pts" },
                  { label: "Travel pace", pts: "10pts" },
                  { label: "Languages spoken", pts: "10pts" },
                  { label: "Budget range", pts: "10pts" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-xs font-bold text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      {item.label}
                    </div>
                    <span className="text-[10px] text-blue-400 font-bold">{item.pts}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
                Complete your travel profile to get more accurate matches.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
