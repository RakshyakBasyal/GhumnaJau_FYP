import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Search,
  Calendar,
  Users,
  Plus,
  X,
  Compass,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Info,
  User,
  ShieldCheck,
  Globe,
  Wallet,
  Check,
  UserX,
  UserPlus,
  Send,
  AlignLeft
} from "lucide-react";
import { io } from "socket.io-client";
import { useToast } from "../context/ToastContext";
import {
  getBuddyConnections,
  getBuddyRequests,
  sendBuddyRequest,
  respondBuddyRequest,
  getDiscoverTrips,
  getGeneralDiscoveryTrips,
  createTrip,
  getTripRooms,
  joinTripRoom,
  respondToRoomRequest,
  inviteBuddyToRoom,
  acceptRoomInvite,
  createTripRoom
} from "../services/api";

const BASE_URL = "http://localhost:5000";

const avatarUrl = (value) => {
  if (!value) return "";
  const s = String(value);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};

export default function FindBuddy() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [view, setView] = useState("discovery"); 
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [buddies, setBuddies] = useState([]); 
  const [connectMap, setConnectMap] = useState({});
  const [incomingMap, setIncomingMap] = useState({});
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [dialog, setDialog] = useState(null); 

  const [myId, setMyId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const uid = decoded?.id || decoded?._id;
        setMyId(uid);
      } catch (e) {
        console.error("Token decode error", e);
      }
    }
  }, []);

  // Socket setup for live updates
  useEffect(() => {
    if (!myId) return;
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on('connect', () => socket.emit('registerUser', myId));

    socket.on('buddy:request:new', () => {
      fetchData();
      showToast('New buddy request received!', 'info');
    });

    socket.on('buddy:request:updated', ({ status }) => {
      fetchData();
      if (status === 'accepted') {
        showToast('Buddy request accepted! You are now connected.', 'success');
      }
    });

    socket.on('room:request:new', () => {
      if (view === 'rooms') fetchData();
      showToast('New join request for your group!', 'info');
    });

    socket.on('room:invite:new', ({ roomName }) => {
      if (view === 'rooms') fetchData();
      showToast(`You've been invited to join a trip to ${roomName}!`, 'info');
    });

    return () => socket.disconnect();
  }, [myId, view]);

  const [searchForm, setSearchForm] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    budget: "",
    travelStyle: ""
  });

  const [roomForm, setRoomForm] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    maxMembers: 4,
    description: ""
  });

  const fetchData = async (isSearch = false) => {
    try {
      const [reqRes, connRes] = await Promise.all([
        getBuddyRequests(),
        getBuddyConnections(),
      ]);

      const statusMap = {};
      const reqMap = {};
      
      const connectedBuddies = connRes?.data?.buddies || [];
      const incoming = reqRes?.data?.incoming || [];
      const outgoing = reqRes?.data?.outgoing || [];

      setBuddies(connectedBuddies);
      connectedBuddies.forEach(u => { if (u?._id) statusMap[u._id] = "connected"; });
      
      incoming.forEach(r => {
        if (r?.requester?._id) {
          statusMap[r.requester._id] = "received";
          reqMap[r.requester._id] = r._id;
        }
      });

      outgoing.forEach(r => {
        if (r?.recipient?._id) {
          statusMap[r.recipient._id] = "sent";
        }
      });

      setConnectMap(statusMap);
      setIncomingMap(reqMap);

      if (view === "discovery") {
        const res = await getGeneralDiscoveryTrips();
        setSuggestedUsers(res?.data || []);
      } else if (view === "matching") {
        if (isSearch || (trips && trips.length > 0)) {
           const res = await getDiscoverTrips(searchForm);
           setTrips(res?.data || []);
        }
      } else if (view === "rooms") {
        const res = await getTripRooms();
        setRooms(res?.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [view]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchForm.destination || !searchForm.startDate || !searchForm.endDate) {
      showToast("Please fill in destination and dates", "error");
      return;
    }

    try {
      setLoading(true);
      await createTrip(searchForm);
      const res = await getDiscoverTrips(searchForm);
      setTrips(res.data);
      
      setView("matching");
      setShowSearchForm(false);
      
      if (res.data.length === 0) {
        setDialog({
          title: "Trip Saved",
          message: "No immediate matches found, but your trip is now live! Others will find you when they search for similar plans.",
          type: 'info'
        });
      } else {
        showToast(`Found ${res.data.length} matching trips!`, "success");
      }
    } catch (err) {
      showToast("Failed to search", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.destination || !roomForm.startDate) {
      showToast("Please fill in destination and start date", "error");
      return;
    }

    try {
      setLoading(true);
      await createTripRoom(roomForm);
      showToast("Trip group created successfully!", "success");
      setShowRoomForm(false);
      setRoomForm({
        destination: "",
        startDate: "",
        endDate: "",
        maxMembers: 4,
        description: ""
      });
      fetchData();
    } catch (err) {
      showToast("Failed to create group", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    const status = connectMap[userId] || "none";
    if (status === "connected" || status === "sent") return;

    try {
      if (status === "received") {
        const requestId = incomingMap[userId];
        await respondBuddyRequest(requestId, "accept");
        showToast("Buddy request accepted!", "success");
      } else {
        await sendBuddyRequest(userId);
        showToast("Connection request sent!", "success");
      }
      fetchData();
    } catch (err) {
      showToast("Operation failed", "error");
    }
  };

  const handleRespond = async (userId, action) => {
    const requestId = incomingMap[userId];
    if (!requestId) return;

    try {
      await respondBuddyRequest(requestId, action);
      showToast(`Request ${action === 'accept' ? 'accepted' : 'rejected'}`, "success");
      fetchData();
    } catch (err) {
      showToast("Operation failed", "error");
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      const res = await joinTripRoom(roomId);
      showToast(res.data.msg || "Join request sent!", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.msg || "Failed to join room", "error");
    }
  };

  const handleAcceptInvite = async (roomId) => {
    try {
      await acceptRoomInvite(roomId);
      showToast("Joined room via invitation!", "success");
      navigate(`/community?room=${roomId}`);
    } catch (err) {
      showToast("Failed to accept invitation", "error");
    }
  };

  const handleRoomAction = async (roomId, userId, action) => {
    try {
      await respondToRoomRequest({ roomId, userId, action });
      showToast(`Request ${action}ed`, "success");
      fetchData();
    } catch (err) {
      showToast("Failed to process request", "error");
    }
  };

  const handleInviteBuddy = async (roomId, buddyId) => {
    try {
      await inviteBuddyToRoom({ roomId, buddyId });
      showToast("Invitation sent!", "success");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.msg || "Failed to send invitation", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Dialog Modal */}
        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${dialog.type === 'info' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {dialog.type === 'info' ? <Info size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{dialog.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">{dialog.message}</p>
              <button 
                onClick={() => setDialog(null)}
                className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Buddy Finder</h1>
            <p className="text-slate-500 text-sm font-medium max-w-md">Connect with fellow travelers and plan your next journey together.</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start md:self-center">
            {[
              { id: 'discovery', label: 'Suggested', icon: LayoutGrid },
              { id: 'matching', label: 'My Matches', icon: Compass },
              { id: 'rooms', label: 'Groups', icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  view === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Search/Create Bar */}
        <div className="mb-12">
          {view === 'rooms' ? (
            !showRoomForm ? (
              <button 
                onClick={() => setShowRoomForm(true)}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-400 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-4">
                  <Users size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium">Want to start a travel group? Create a trip room here...</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-emerald-100 transition-colors">
                  <Plus size={14} /> Create Group
                </div>
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Create a New Trip Group</h2>
                  <button onClick={() => setShowRoomForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Destination</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="e.g. Pokhara, Nepal"
                        value={roomForm.destination}
                        onChange={e => setRoomForm({...roomForm, destination: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={roomForm.startDate}
                        onChange={e => setRoomForm({...roomForm, startDate: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">End Date <span className="text-[9px] lowercase opacity-60">(Optional)</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={roomForm.endDate}
                        onChange={e => setRoomForm({...roomForm, endDate: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Max Members</label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number"
                        min="2"
                        max="20"
                        value={roomForm.maxMembers}
                        onChange={e => setRoomForm({...roomForm, maxMembers: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Description <span className="text-[9px] lowercase opacity-60">(Optional)</span></label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3.5 top-4 text-slate-400" size={16} />
                      <textarea 
                        placeholder="Tell others about your trip plans..."
                        value={roomForm.description}
                        onChange={e => setRoomForm({...roomForm, description: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowRoomForm(false)}
                      className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                    >
                      Create Group
                    </button>
                  </div>
                </form>
              </div>
            )
          ) : (
            !showSearchForm ? (
              <button 
                onClick={() => setShowSearchForm(true)}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-slate-400 hover:border-blue-200 hover:bg-blue-50/30 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-4">
                  <Search size={20} className="text-blue-500" />
                  <span className="text-sm font-medium">Where are you heading next? Search specific trips & dates...</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold group-hover:bg-blue-100 transition-colors">
                  <Plus size={14} /> Plan a Trip
                </div>
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Plan a New Trip</h2>
                  <button onClick={() => setShowSearchForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Destination</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="e.g. Pokhara, Nepal"
                        value={searchForm.destination}
                        onChange={e => setSearchForm({...searchForm, destination: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={searchForm.startDate}
                        onChange={e => setSearchForm({...searchForm, startDate: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="date"
                        value={searchForm.endDate}
                        onChange={e => setSearchForm({...searchForm, endDate: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowSearchForm(false)}
                      className="px-6 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                    >
                      Search Matches
                    </button>
                  </div>
                </form>
              </div>
            )
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-400 text-sm font-medium">Finding the perfect buddies...</p>
            </div>
          ) : (
            <>
              {/* Mode 1: Discovery (Suggestions based on profile) */}
              {view === 'discovery' && (
                <div className="animate-in fade-in duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Recommended for You</h2>
                      <p className="text-slate-500 text-xs font-medium">Matching your travel identity</p>
                    </div>
                  </div>

                  {suggestedUsers.length === 0 ? (
                    <EmptyState 
                      icon={Info} 
                      title="No suggestions yet" 
                      description="Update your profile travel identity to get personalized buddy recommendations!"
                      actionText="Update Profile"
                      onAction={() => navigate('/profile')}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggestedUsers.filter(u => u && u._id).map(user => (
                        <DetailedUserCard 
                          key={user._id}
                          user={user}
                          status={connectMap[user._id] || "none"}
                          onConnect={() => handleConnect(user._id)}
                          onRespond={(action) => handleRespond(user._id, action)}
                          onView={() => navigate(`/profile/${user._id}`)}
                          score={user.compatibilityScore}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Matching (Search Results) */}
              {view === 'matching' && (
                <div className="animate-in fade-in duration-500">
                   <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Compass size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Matching Trips</h2>
                        <p className="text-slate-500 text-xs font-medium">Heading to same destination on your dates</p>
                      </div>
                    </div>
                  </div>

                  {trips.length === 0 ? (
                    <EmptyState 
                      icon={Search} 
                      title="No matches found" 
                      description="We've saved your trip! Others will see you when they search for similar dates and destinations."
                      actionText="Start a New Search"
                      onAction={() => setShowSearchForm(true)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {trips.filter(t => t && t._id && t.user).map(trip => (
                        <TripMatchCard 
                          key={trip._id}
                          trip={trip}
                          status={connectMap[trip.user._id] || "none"}
                          onConnect={() => handleConnect(trip.user._id)}
                          onRespond={(action) => handleRespond(trip.user._id, action)}
                          onView={() => navigate(`/profile/${trip.user._id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: Trip Rooms (Groups) */}
              {view === 'rooms' && (
                <div className="animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Users size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Trip Groups</h2>
                        <p className="text-slate-500 text-xs font-medium">Join existing communities planning shared adventures</p>
                      </div>
                    </div>
                  </div>

                  {rooms.length === 0 ? (
                    <EmptyState 
                      icon={Users} 
                      title="No active groups" 
                      description="There are no trip rooms available at the moment."
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rooms.filter(r => r && r._id).map(room => (
                        <RoomCard 
                          key={room._id}
                          room={room}
                          myId={myId}
                          buddies={buddies}
                          onJoin={() => handleJoinRoom(room._id)}
                          onAcceptInvite={() => handleAcceptInvite(room._id)}
                          onRespondRequest={(uid, action) => handleRoomAction(room._id, uid, action)}
                          onInviteBuddy={(bid) => handleInviteBuddy(room._id, bid)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Detailed UI Components ---

function DetailedUserCard({ user, status, onConnect, onRespond, onView, score }) {
  if (!user) return null;

  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (s >= 50) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 hover:border-blue-200 transition-all shadow-sm hover:shadow-md group flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div className="relative">
          <img 
            src={avatarUrl(user.avatar)} 
            alt={user.fullName} 
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm"
          />
          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-0.5 ${getScoreColor(score)}`}>
           <span>Match</span>
           <span className="text-sm font-black">{score}%</span>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-bold text-slate-900 text-lg mb-1">{user.fullName}</h4>
        <p className="text-xs text-slate-400 font-medium mb-4">{user.city || 'Travel Enthusiast'}</p>
        
        <div className="grid grid-cols-2 gap-3">
           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
             <Globe size={14} className="text-blue-500" />
             {user.travelStyle || 'Wanderer'}
           </div>
           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
             <Wallet size={14} className="text-emerald-500" />
             {user.travelBudget || 'Flexible'}
           </div>
           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
             <Clock size={14} className="text-indigo-500" />
             {user.travelPace || 'Balanced'}
           </div>
           <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
             <User size={14} className="text-slate-400" />
             {user.age ? `${user.age}y` : 'N/A'}, {user.gender || 'N/A'}
           </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-8 flex-1">
        {user.travelInterests?.slice(0, 4).map(interest => (
          <span key={interest} className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-100">
            {interest}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
        <button 
          onClick={onView}
          className="flex-1 py-3 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
        >
          View Profile
        </button>
        {status === 'received' ? (
          <div className="flex-[1.5] flex gap-2">
            <button 
              onClick={() => onRespond('accept')}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center"
            >
              <Check size={16} />
            </button>
            <button 
              onClick={() => onRespond('reject')}
              className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center"
            >
              <UserX size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onConnect}
            className={`flex-[1.5] py-3 text-xs font-bold rounded-xl transition-all ${
              status === 'none' 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100' 
                : 'bg-slate-100 text-slate-400 cursor-default'
            }`}
          >
            {status === 'none' ? 'Send Request' : status === 'connected' ? 'Connected' : 'Pending'}
          </button>
        )}
      </div>
    </div>
  );
}

function TripMatchCard({ trip, status, onConnect, onRespond, onView }) {
  const user = trip.user;
  if (!user) return null;
  
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md group flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img 
            src={avatarUrl(user.avatar)} 
            alt="" 
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-sm truncate">{user.fullName}</h4>
            <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
              <Compass size={12} /> {trip.matchScore}% Date Match
            </div>
          </div>
        </div>
        <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-[10px] font-bold uppercase">
          {trip.budget}
        </div>
      </div>

      <div className="space-y-3 mb-8 flex-1">
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
          <MapPin size={14} className="text-slate-400" />
          {trip.destination}
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
          <Calendar size={14} className="text-slate-400" />
          {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500 italic mt-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          {user.travelStyle}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
        <button 
          onClick={onView}
          className="flex-1 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
        >
          Profile
        </button>
        {status === 'received' ? (
          <div className="flex-[1.5] flex gap-2">
            <button 
              onClick={() => onRespond('accept')}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 flex items-center justify-center"
            >
              <Check size={16} />
            </button>
            <button 
              onClick={() => onRespond('reject')}
              className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center justify-center"
            >
              <UserX size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onConnect}
            className={`flex-[1.5] py-3 text-xs font-bold rounded-xl transition-all ${
              status === 'none' 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100' 
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {status === 'none' ? 'Connect' : status === 'connected' ? 'Buddies' : 'Sent'}
          </button>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, myId, buddies, onJoin, onAcceptInvite, onRespondRequest, onInviteBuddy }) {
  const isMember = (room.members || []).some(m => m && (m._id || m) === myId);
  const isCreator = (room.createdBy?._id || room.createdBy) === myId;
  const hasRequested = (room.pendingRequests || []).some(m => m && (m._id || m) === myId);
  const isInvited = (room.invitedBuddies || []).some(m => m && (m._id || m) === myId);

  const [showInvites, setShowInvites] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 hover:border-emerald-200 transition-all shadow-sm hover:shadow-md flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div className="flex -space-x-2">
          {(room.members || []).filter(m => m).slice(0, 4).map((m, i) => (
            <img key={i} src={avatarUrl(m.avatar)} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" alt="" title={m.fullName} />
          ))}
          {(room.members || []).length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
              +{(room.members || []).length - 4}
            </div>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl">
          {(room.members || []).length}/{room.maxMembers}
        </span>
      </div>
      
      <div className="mb-6 flex-1">
        <h3 className="text-lg font-bold text-slate-900 mb-1">{room.destination}</h3>
        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 font-medium">
          <Clock size={12} /> {new Date(room.startDate).toLocaleDateString()} Start
        </p>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed italic">
          "{room.description || 'No description provided.'}"
        </p>
      </div>

      {/* Owner View: Manage Requests & Invites */}
      {isCreator && (
        <div className="mb-6 space-y-4 pt-4 border-t border-slate-50">
          {/* Pending Requests */}
          {room.pendingRequests?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Join Requests</p>
              <div className="space-y-2">
                {room.pendingRequests.map(u => (
                  <div key={u._id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                    <div className="flex items-center gap-2">
                      <img src={avatarUrl(u.avatar)} className="w-6 h-6 rounded-lg object-cover" alt="" />
                      <span className="text-[11px] font-bold text-slate-700 truncate max-w-[80px]">{u.fullName}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onRespondRequest(u._id, 'accept')} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                        <Check size={12} />
                      </button>
                      <button onClick={() => onRespondRequest(u._id, 'reject')} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite Buddies */}
          <button 
            onClick={() => setShowInvites(!showInvites)}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {showInvites ? <X size={14} /> : <UserPlus size={14} />}
            {showInvites ? 'Close Invites' : 'Invite Buddies'}
          </button>

          {showInvites && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-100 shadow-xl rounded-2xl p-4 z-10 max-h-48 overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Your Buddies</p>
              <div className="space-y-2">
                {buddies.filter(b => !room.members.some(m => (m._id || m) === b._id)).map(buddy => (
                  <div key={buddy._id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <img src={avatarUrl(buddy.avatar)} className="w-6 h-6 rounded-lg object-cover" alt="" />
                      <span className="text-[11px] font-bold text-slate-700">{buddy.fullName}</span>
                    </div>
                    <button 
                      onClick={() => onInviteBuddy(buddy._id)}
                      disabled={room.invitedBuddies?.some(i => (i._id || i) === buddy._id)}
                      className={`p-1.5 rounded-lg transition-colors ${room.invitedBuddies?.some(i => (i._id || i) === buddy._id) ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                      <Send size={12} />
                    </button>
                  </div>
                ))}
                {buddies.length === 0 && <p className="text-[10px] text-slate-400 text-center py-2">No buddies to invite yet.</p>}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Join/Invite Logic */}
      {isCreator ? (
        <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-xs text-center border border-slate-100">
          Owner
        </div>
      ) : isMember ? (
        <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs text-center border border-emerald-100">
          Member
        </div>
      ) : isInvited ? (
        <button 
          onClick={onAcceptInvite}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={14} /> Accept Invitation
        </button>
      ) : hasRequested ? (
        <div className="w-full py-3 bg-slate-50 text-slate-400 rounded-xl font-bold text-xs text-center border border-slate-100">
          Request Pending
        </div>
      ) : (
        <button 
          onClick={onJoin}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
        >
          Request to Join
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center flex flex-col items-center shadow-sm">
      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 text-slate-300">
        <Icon size={40} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-10 leading-relaxed">{description}</p>
      {onAction && (
        <button 
          onClick={onAction}
          className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
