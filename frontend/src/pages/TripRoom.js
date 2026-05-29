// frontend/src/pages/TripRoom.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Loader2, MapPin, Calendar, Users, Send, ArrowLeft,
  Check, X, UserPlus, Crown, MessageSquare, Share2,
  Plane, Hotel as HotelIcon, ClipboardList, ExternalLink,
  ChevronRight, Search, Receipt, PieChart, Plus, Trash2, Banknote,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { io } from "socket.io-client";
import { useToast } from "../context/ToastContext";
import {
  getTripRoomById, sendRoomMessage, respondToRoomRequest,
  inviteBuddyToRoom, getConnections, getMyTripRooms,
} from "../services/api";
import ExpensePanel from "../components/ExpensePanel";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const tok = () => localStorage.getItem("token");

const av = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

// ── Avatar blob ───────────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = "sm" }) => {
  const cls = size === "sm" ? "w-7 h-7 text-xs" : size === "md" ? "w-9 h-9 text-sm" : "w-11 h-11 text-base";
  const url = av(src);
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-blue-100 flex-shrink-0 flex items-center justify-center font-bold text-blue-700`}>
      {url ? <img src={url} alt={name} className="w-full h-full object-cover" /> : name?.charAt(0).toUpperCase()}
    </div>
  );
};

// ── Share modal: hotel/flight filtered by destination, itinerary always shown ─
const ShareModal = ({ onClose, onShare, destination }) => {
  const [tab,         setTab]         = useState("hotel");
  const [itineraries, setItineraries] = useState([]);
  const [hotels,      setHotels]      = useState([]);
  const [flights,     setFlights]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [query,       setQuery]       = useState("");
  const token = tok();

  useEffect(() => {
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    const B = `${BASE_URL}/api`;
    if (tab === "itinerary") {
      fetch(`${B}/itineraries`, { headers: h })
        .then(r => r.json()).then(d => setItineraries(Array.isArray(d) ? d : []))
        .catch(() => setItineraries([]))
        .finally(() => setLoading(false));
    } else if (tab === "hotel") {
      // Try to filter by destination name — if none match, show all
      fetch(`${B}/hotels`, { headers: h })
        .then(r => r.json())
        .then(d => {
          const all = Array.isArray(d) ? d : [];
          const destFiltered = destination
            ? all.filter(h => h.destination?.name?.toLowerCase().includes(destination.toLowerCase()))
            : all;
          setHotels(destFiltered.length > 0 ? destFiltered : all);
        })
        .catch(() => setHotels([]))
        .finally(() => setLoading(false));
    } else {
      fetch(`${B}/flights`, { headers: h })
        .then(r => r.json())
        .then(d => {
          const all = Array.isArray(d) ? d : [];
          const destFiltered = destination
            ? all.filter(f => f.to?.toLowerCase().includes(destination.toLowerCase()) || f.destination?.name?.toLowerCase().includes(destination.toLowerCase()))
            : all;
          setFlights(destFiltered.length > 0 ? destFiltered : all);
        })
        .catch(() => setFlights([]))
        .finally(() => setLoading(false));
    }
  }, [tab, token, destination]);

  const share = (label, link, details) => {
    onShare(`📎 **${label}**${details ? `\n${details}` : ""}${link ? `\n🔗 ${link}` : ""}`);
    onClose();
  };

  const TABS = [
    { id: "hotel",     label: "Hotels",      icon: HotelIcon },
    { id: "flight",    label: "Flights",     icon: Plane },
    { id: "itinerary", label: "Itinerary",   icon: ClipboardList },
  ];

  const lq = query.toLowerCase();
  const filteredHotels      = hotels.filter(h => !query || h.name?.toLowerCase().includes(lq));
  const filteredFlights     = flights.filter(f => !query || `${f.airline} ${f.flightNumber} ${f.from} ${f.to}`.toLowerCase().includes(lq));
  const filteredItineraries = itineraries.filter(i => !query || i.title?.toLowerCase().includes(lq));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Share to Group</p>
            {destination && (
              <p className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                <MapPin size={9} /> Filtered for {destination}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition">
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setQuery(""); }}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition ${
                tab === t.id ? "text-blue-600 border-b-2 border-blue-600 -mb-px" : "text-gray-400 hover:text-gray-600"
              }`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-50">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${tab}s...`}
              className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
        </div>

        {/* List */}
        <div className="max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Hotels */}
              {tab === "hotel" && (
                filteredHotels.length === 0
                  ? <p className="text-center text-gray-400 text-xs py-6">No hotels found</p>
                  : filteredHotels.map(h => {
                      const min = h.roomTypes?.length ? Math.min(...h.roomTypes.map(r => r.pricePerNight)) : 0;
                      return (
                        <button key={h._id}
                          onClick={() => share(h.name, `${window.location.origin}/hotels/${h._id}`, `📍 ${h.destination?.name || ""}${min ? ` · From NPR ${min.toLocaleString()}/night` : ""}`)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                            {h.images?.[0] ? <img src={`${BASE_URL}${h.images[0]}`} alt="" className="w-full h-full object-cover" />
                              : <HotelIcon size={14} className="text-blue-600 m-auto mt-2" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{h.name}</p>
                            <p className="text-[10px] text-gray-400">{h.destination?.name}{min ? ` · NPR ${min.toLocaleString()}/n` : ""}</p>
                          </div>
                          <Share2 size={12} className="text-gray-300 flex-shrink-0" />
                        </button>
                      );
                    })
              )}
              {/* Flights */}
              {tab === "flight" && (
                filteredFlights.length === 0
                  ? <p className="text-center text-gray-400 text-xs py-6">No flights found</p>
                  : filteredFlights.map(f => (
                      <button key={f._id}
                        onClick={() => share(`${f.airline} ${f.flightNumber}`, null, `✈️ ${f.from} → ${f.to} · ${f.departureTime} · NPR ${Number(f.price).toLocaleString()}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex-shrink-0 flex items-center justify-center">
                          <Plane size={13} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900">{f.airline} · {f.flightNumber}</p>
                          <p className="text-[10px] text-gray-400">{f.from} → {f.to} · {f.departureTime}</p>
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 flex-shrink-0">NPR {Number(f.price).toLocaleString()}</p>
                      </button>
                    ))
              )}
              {/* Itineraries */}
              {tab === "itinerary" && (
                filteredItineraries.length === 0
                  ? <p className="text-center text-gray-400 text-xs py-6">No itineraries yet</p>
                  : filteredItineraries.map(i => (
                      <button key={i._id}
                        onClick={() => share(i.title, `${window.location.origin}/itinerary/public/${i._id}`, `📍 ${i.destinationName || ""}${i.startDate ? ` · ${fmtDate(i.startDate)}` : ""}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-emerald-50 flex-shrink-0 flex items-center justify-center">
                          {i.destinationImage
                            ? <img src={`${BASE_URL}${i.destinationImage}`} alt="" className="w-full h-full object-cover" />
                            : <ClipboardList size={14} className="text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{i.title}</p>
                          {i.destinationName && <p className="text-[10px] text-gray-400 truncate flex items-center gap-1"><MapPin size={8} />{i.destinationName}</p>}
                        </div>
                        <Share2 size={12} className="text-gray-300 flex-shrink-0" />
                      </button>
                    ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Shared message rich bubble ─────────────────────────────────────────────────
const isShared = (text) => text?.startsWith("📎 **");
const parseShared = (text) => {
  const title   = (text.match(/📎 \*\*(.+?)\*\*/) || [])[1] || "";
  const link    = (text.match(/🔗 (https?:\/\/\S+)/) || [])[1] || null;
  const details = text.split("\n").filter(l => !l.startsWith("📎 **") && !l.startsWith("🔗 ")).join(" ").trim();
  const isHotel = link?.includes("/hotels/");
  const isFlight = text.includes("✈️");
  const Icon    = isHotel ? HotelIcon : isFlight ? Plane : ClipboardList;
  const iconCls = isHotel ? "text-blue-600 bg-blue-50" : isFlight ? "text-indigo-600 bg-indigo-50" : "text-emerald-600 bg-emerald-50";
  return { title, link, details, Icon, iconCls };
};
const SharedBubble = ({ text }) => {
  const { title, link, details, Icon, iconCls } = parseShared(text);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-[200px]">
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border-b border-gray-100 ${iconCls.includes("blue") ? "bg-blue-50" : iconCls.includes("indigo") ? "bg-indigo-50" : "bg-emerald-50"}`}>
        <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${iconCls}`}>
          <Icon size={11} />
        </div>
        <span className="text-[11px] font-semibold text-gray-800 truncate">{title}</span>
      </div>
      <div className="px-2.5 py-2">
        {details && <p className="text-[10px] text-gray-500 mb-1.5 line-clamp-2">{details}</p>}
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
            View <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
};

// ── Groups sidebar panel ──────────────────────────────────────────────────────
const GroupsSidebar = ({ currentRoomId, myId, onNavigate }) => {
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = tok();
    fetch(`${BASE_URL}/api/trips/rooms/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setMyRooms(Array.isArray(d) ? d : []))
      .catch(() => setMyRooms([]))
      .finally(() => setLoading(false));
  }, []);

  const others = myRooms.filter(r => r._id !== currentRoomId);

  return (
    <div className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-0">
      <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Groups</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-blue-500" />
          </div>
        ) : others.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center py-6 px-3">No other groups</p>
        ) : (
          others.map(room => {
            const members = room.members || [];
            return (
              <button key={room._id} onClick={() => onNavigate(room._id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                {/* Avatar stack */}
                <div className="flex -space-x-2 flex-shrink-0">
                  {members.slice(0, 2).map((m, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-blue-100">
                      {av(m.avatar)
                        ? <img src={av(m.avatar)} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-blue-700">{m.fullName?.charAt(0)}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{room.destination}</p>
                  <p className="text-[10px] text-gray-400">{members.length} member{members.length !== 1 ? "s" : ""}</p>
                </div>
                <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>
      <div className="px-3 py-2.5 border-t border-gray-100 flex-shrink-0">
        <button onClick={() => onNavigate(null)}
          className="w-full text-[11px] font-bold text-blue-600 hover:text-blue-800 text-center transition">
          Browse All Groups →
        </button>
      </div>
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TripRoom() {
  const { roomId }    = useParams();
  const navigate      = useNavigate();
  const { showToast } = useToast();

  const [room,        setRoom]        = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [text,        setText]        = useState("");
  const [sending,     setSending]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [connections, setConnections] = useState([]);
  const [showInvite,  setShowInvite]  = useState(false);
  const [showShare,   setShowShare]   = useState(false);
  const [activePanel, setActivePanel] = useState("chat"); // chat | members | expenses

  const chatRef  = useRef(null);
  const inputRef = useRef(null);

  const myId = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try { const d = JSON.parse(atob(token.split(".")[1])); return d?.id || d?._id || null; }
    catch (_) { return null; }
  })();

  const isMember  = (room?.members || []).some(m => (m._id || m).toString() === myId);
  const isOwner   = (room?.createdBy?._id || room?.createdBy || "").toString() === myId;
  const isCoOwner = (room?.coOwners || []).some(m => m.toString() === myId);
  const canManage = isOwner || isCoOwner;

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res  = await getTripRoomById(roomId);
      const data = res.data;
      setRoom(data);
      setMessages(data.messages || []);
    } catch (_) { showToast("Failed to load group", "error"); }
    finally { setLoading(false); }
  }, [roomId, showToast]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    getConnections().then(r => setConnections(r.data.connections || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!myId || !roomId) return;
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on("connect", () => socket.emit("registerUser", myId));
    socket.on("room:message:new", ({ roomId: rid, message }) => {
      if (rid !== roomId) return;
      setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
      if (message.type === "expense" || message.type === "settlement") {
        fetchRoom();
      }
    });
    socket.on("room:member:joined", ({ roomId: rid }) => { if (rid === roomId) fetchRoom(); });
    return () => socket.disconnect();
  }, [myId, roomId, fetchRoom]);

  // Auto-scroll — only the chat div scrolls
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (overrideText) => {
    const msg = (overrideText !== undefined ? overrideText : text).trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      await fetch(`${BASE_URL}/api/trips/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ text: msg }),
      });
      if (!overrideText) setText("");
      inputRef.current?.focus();
    } catch (_) { showToast("Failed to send", "error"); }
    finally { setSending(false); }
  };

  const handleRespond = async (userId, action) => {
    try {
      await respondToRoomRequest({ roomId, userId, action });
      showToast(`Request ${action}ed`, "success");
      fetchRoom();
    } catch (_) { showToast("Failed", "error"); }
  };

  const handleInvite = async (connId) => {
    try {
      await inviteBuddyToRoom({ roomId, buddyId: connId });
      showToast("Invited!", "success");
      setShowInvite(false);
    } catch (err) { showToast(err?.response?.data?.msg || "Failed", "error"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-500 text-sm">Group not found.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 text-sm font-semibold hover:underline">Go back</button>
      </div>
    );
  }

  if (!isMember && !isOwner && !isCoOwner) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-sm">
          <Users size={32} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-800 mb-2">You're not in this group</h2>
          <p className="text-gray-400 text-sm mb-5">Request to join from the Find Buddies page.</p>
          <button onClick={() => navigate("/community/buddies?tab=groups")}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
            Find Buddies
          </button>
        </div>
      </div>
    );
  }

  const pendingRequests = (room.pendingRequests || []).filter(Boolean);
  const invitableConns  = connections.filter(c => !(room.members || []).some(m => (m._id || m).toString() === c._id));

  // ── Layout: full page height, no page scroll ─────────────────────────────
  return (
    <div className="flex flex-col bg-[#f8fafc]" style={{ height: "calc(100vh - 64px)" }}>

      {/* Header */}
      <div className="bg-blue-600 text-white px-3 py-2.5 flex-shrink-0 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/20 rounded-lg transition flex-shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-sm leading-tight truncate">{room.destination}</h1>
              <p className="text-blue-100 text-[10px] flex items-center gap-2">
                <span className="flex items-center gap-0.5"><Calendar size={9} /> {fmtDate(room.startDate)}{room.endDate && room.startDate !== room.endDate && ` → ${fmtDate(room.endDate)}`}</span>
                <span className="flex items-center gap-0.5"><Users size={9} /> {(room.members || []).length}/{room.maxMembers || 10}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Members / Chat / Expenses toggle */}
            <button onClick={() => setActivePanel("chat")}
              className={`p-1.5 rounded-lg transition ${activePanel === "chat" ? "bg-white/30" : "hover:bg-white/20"}`} title="Chat">
              <MessageSquare size={16} />
            </button>
            <button onClick={() => setActivePanel("members")}
              className={`p-1.5 rounded-lg transition ${activePanel === "members" ? "bg-white/30" : "hover:bg-white/20"}`} title="Members">
              <Users size={16} />
            </button>
            <button onClick={() => setActivePanel("expenses")}
              className={`p-1.5 rounded-lg transition ${activePanel === "expenses" ? "bg-white/30" : "hover:bg-white/20"}`} title="Expenses">
              <Receipt size={16} />
            </button>

            {/* Invite */}
            {canManage && (
              <div className="relative">
                <button onClick={() => setShowInvite(v => !v)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Invite">
                  <UserPlus size={16} />
                </button>
                {showInvite && (
                  <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 shadow-2xl rounded-2xl p-2.5 z-30 w-52 max-h-60 overflow-y-auto">
                    <p className="text-[10px] font-bold text-gray-400 uppercase px-1 mb-1.5">Connections</p>
                    {invitableConns.length === 0
                      ? <p className="text-[11px] text-gray-400 text-center py-3">No connections to invite</p>
                      : invitableConns.map(c => (
                          <div key={c._id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-xl">
                            <Avatar src={c.avatar} name={c.fullName} size="sm" />
                            <span className="text-[11px] font-medium text-gray-700 flex-1 truncate">{c.fullName}</span>
                            <button onClick={() => handleInvite(c._id)}
                              disabled={(room.invitedBuddies || []).some(i => i.toString() === c._id)}
                              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition flex-shrink-0 ${
                                (room.invitedBuddies || []).some(i => i.toString() === c._id)
                                  ? "bg-gray-100 text-gray-400"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}>
                              {(room.invitedBuddies || []).some(i => i.toString() === c._id) ? "Sent" : "Invite"}
                            </button>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 min-h-0">

        {/* Groups sidebar */}
        <GroupsSidebar
          currentRoomId={roomId}
          myId={myId}
          onNavigate={(id) => id ? navigate(`/community/groups/${id}`) : navigate("/community/buddies?tab=groups")}
        />

        {/* Main area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">

          {/* ── MEMBERS panel ────────────────────────────────────────── */}
          {activePanel === "members" && (
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Members ({(room.members || []).length})</p>
                {room.description && <p className="text-xs text-gray-400 mt-0.5 italic">"{room.description}"</p>}
              </div>
              <div className="p-3 space-y-0.5">
                {(room.members || []).filter(Boolean).map(m => {
                  const isRoomOwner   = (room.createdBy?._id || room.createdBy || "").toString() === (m._id || m).toString();
                  const isRoomCoOwner = (room.coOwners || []).some(o => o.toString() === (m._id || m).toString());
                  return (
                    <div key={m._id || m} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-xl transition">
                      <Link to={`/profile/${m._id}`} className="flex-shrink-0">
                        <Avatar src={m.avatar} name={m.fullName} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/profile/${m._id}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition truncate block">
                          {m.fullName}{(m._id || m).toString() === myId && <span className="text-gray-400 font-normal"> (you)</span>}
                        </Link>
                        {m.travelStyle && <p className="text-[10px] text-gray-400">{m.travelStyle}</p>}
                      </div>
                      {(isRoomOwner || isRoomCoOwner) && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 flex-shrink-0">
                          <Crown size={9} /> {isRoomOwner ? "Owner" : "Co-owner"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pending requests */}
              {canManage && pendingRequests.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Join Requests ({pendingRequests.length})</p>
                  <div className="space-y-2">
                    {pendingRequests.map(u => (
                      <div key={u._id} className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                        <Avatar src={u.avatar} name={u.fullName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{u.fullName}</p>
                          {u.travelStyle && <p className="text-[10px] text-gray-400">{u.travelStyle}</p>}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => handleRespond(u._id, "accept")}
                            className="flex items-center gap-0.5 px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition">
                            <Check size={10} /> Accept
                          </button>
                          <button onClick={() => handleRespond(u._id, "reject")}
                            className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition border border-red-100">
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSES panel ────────────────────────────────────────── */}
          {activePanel === "expenses" && (
            <ExpensePanel room={room} myId={myId} onUpdate={fetchRoom} />
          )}

          {/* ── CHAT panel ───────────────────────────────────────────── */}
          {activePanel === "chat" && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">

              {/* Messages — ONLY this scrolls */}
              <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5"
                style={{ overscrollBehavior: "contain" }}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <MessageSquare size={28} className="text-gray-200 mb-2" />
                    <p className="text-gray-400 text-xs font-medium">No messages yet</p>
                    <p className="text-gray-300 text-[11px] mt-0.5">Start the conversation!</p>
                  </div>
                ) : messages.map((msg, idx) => {
                  const senderId  = msg.sender?._id || msg.sender;
                  const isMine    = String(senderId) === String(myId);
                  const name      = msg.sender?.fullName || "Member";
                  const shared    = isShared(msg.text);

                  if (msg.type === 'expense') {
                    const expense = room.expenses?.find(e => String(e._id) === String(msg.expenseRef));
                    if (expense) {
                      const totalAmount = expense.amount;
                      const payer = expense.paidBy;
                      const payerName = payer?.fullName || "Member";
                      const payerAvatar = payer?.avatar;
                      const isPayerMe = String(payer?._id || payer) === String(myId);

                      const splits = expense.splitWith || [];
                      const mySplit = splits.find(s => String(s.user?._id || s.user) === String(myId));
                      const myShare = mySplit ? mySplit.amount : 0;
                      const splitCount = splits.length;

                      const catColors = {
                        Hotel: "bg-blue-50 text-blue-700 border-blue-100",
                        Food: "bg-amber-50 text-amber-700 border-amber-100",
                        Transport: "bg-purple-50 text-purple-700 border-purple-100",
                        Activities: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        Miscellaneous: "bg-gray-50 text-gray-700 border-gray-100",
                      };
                      const catBadgeClass = catColors[expense.category] || catColors.Miscellaneous;

                      return (
                        <div key={msg._id || idx} className="flex justify-center my-3 w-full">
                          <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden w-full max-w-[340px] transition-all hover:shadow-lg">
                            {/* Card Header */}
                            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catBadgeClass}`}>
                                {expense.category}
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {fmtDate(expense.date)} · {fmtTime(msg.createdAt)}
                              </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                  <Receipt size={16} />
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 truncate flex-1" title={expense.description}>
                                  {expense.description}
                                </h4>
                              </div>
                              {expense.notes && (
                                <p className="text-[11px] text-gray-400 italic mb-3 pl-10 border-l border-gray-100">
                                  "{expense.notes}"
                                </p>
                              )}

                              {/* Amount Display */}
                              <div className="flex items-baseline justify-between mb-4 border-b border-gray-50 pb-3">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Paid</p>
                                  <p className="text-lg font-black text-gray-900">
                                    NPR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {isPayerMe ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                                      You paid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-150">
                                      Paid by {payerName.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Split summary for the user */}
                              <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar src={payerAvatar} name={payerName} size="sm" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] text-gray-400 leading-none">Paid by</p>
                                    <p className="text-xs font-bold text-gray-800 truncate mt-0.5">{payerName}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {isPayerMe ? (
                                    <>
                                      <p className="text-[10px] text-gray-400 font-medium">To Receive</p>
                                      <p className="text-xs font-bold text-emerald-600">
                                        NPR {(totalAmount - myShare).toLocaleString()}
                                      </p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-[10px] text-gray-400 font-medium">To Pay</p>
                                      <p className={`text-xs font-bold ${mySplit ? "text-red-500" : "text-gray-500"}`}>
                                        {mySplit ? `NPR ${myShare.toLocaleString()}` : "NPR 0"}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Detailed Split Breakdown */}
                              {splits.length > 0 && (
                                <div className="border-t border-gray-100 pt-3">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Split Shares ({splitCount} {splitCount === 1 ? "person" : "people"})
                                  </p>
                                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                    {splits.map((s, sIdx) => {
                                      const u = s.user;
                                      const uName = u?.fullName || "Member";
                                      const isUMe = String(u?._id || u) === String(myId);
                                      const isUPayer = String(u?._id || u) === String(payer?._id || payer);
                                      
                                      return (
                                        <div key={s._id || sIdx} className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <Avatar src={u?.avatar} name={uName} size="sm" />
                                            <span className="font-medium text-gray-700 truncate">
                                              {isUMe ? "You" : uName}
                                            </span>
                                            {isUPayer && (
                                              <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-100 px-1 rounded font-bold">
                                                Payer
                                              </span>
                                            )}
                                          </div>
                                          <span className="font-bold text-gray-800">
                                            NPR {s.amount.toLocaleString()}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Card Footer Button */}
                            <div className="bg-gray-50/30 border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                Logged by {isMine ? "you" : name}
                              </span>
                              <button 
                                onClick={() => setActivePanel("expenses")}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                              >
                                Manage Expenses <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={msg._id || idx} className="flex justify-center my-2 w-full">
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 w-full max-w-[340px] flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-250 text-gray-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Receipt size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Expense Deleted
                              </p>
                              <p className="text-xs text-gray-500 truncate italic">
                                "{msg.text}"
                              </p>
                            </div>
                            <span className="text-[9px] text-gray-400 font-medium">
                              {fmtTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  }

                  if (msg.type === 'settlement') {
                    const settlement = room.settlements?.find(s => String(s._id) === String(msg.settlementRef));
                    if (settlement) {
                      const fromUser = settlement.from;
                      const toUser = settlement.to;
                      const fromName = fromUser?.fullName || "Member";
                      const toName = toUser?.fullName || "Member";
                      const isFromMe = String(fromUser?._id || fromUser) === String(myId);
                      const isToMe = String(toUser?._id || toUser) === String(myId);

                      return (
                        <div key={msg._id || idx} className="flex justify-center my-3 w-full">
                          <div className="bg-white border border-emerald-100 rounded-2xl shadow-md overflow-hidden w-full max-w-[340px] transition-all hover:shadow-lg">
                            {/* Header */}
                            <div className="px-4 py-2.5 bg-emerald-50/30 border-b border-emerald-50 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-600" /> Balance Settled
                              </span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {fmtDate(settlement.date)} · {fmtTime(msg.createdAt)}
                              </span>
                            </div>

                            {/* Body */}
                            <div className="p-4 flex flex-col items-center">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Amount Exchanged</p>
                              <p className="text-lg font-black text-emerald-600 text-center mb-4">
                                NPR {settlement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>

                              {/* Transaction Flow visual */}
                              <div className="flex items-center gap-6 w-full justify-center py-3 bg-gray-50 rounded-xl border border-gray-100 px-4">
                                <div className="flex flex-col items-center min-w-[70px] max-w-[90px]">
                                  <Avatar src={fromUser?.avatar} name={fromName} size="md" />
                                  <p className="text-[11px] font-bold text-gray-800 text-center truncate w-full mt-1.5">
                                    {isFromMe ? "You" : fromName.split(' ')[0]}
                                  </p>
                                  <p className="text-[9px] text-gray-400 leading-none">Paid</p>
                                </div>

                                <div className="flex-1 flex flex-col items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                                    <ArrowRight size={14} />
                                  </div>
                                </div>

                                <div className="flex flex-col items-center min-w-[70px] max-w-[90px]">
                                  <Avatar src={toUser?.avatar} name={toName} size="md" />
                                  <p className="text-[11px] font-bold text-gray-800 text-center truncate w-full mt-1.5">
                                    {isToMe ? "You" : toName.split(' ')[0]}
                                  </p>
                                  <p className="text-[9px] text-gray-400 leading-none">Received</p>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50/30 border-t border-gray-100 px-4 py-2 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                Recorded by {isMine ? "you" : name}
                              </span>
                              <button 
                                onClick={() => setActivePanel("expenses")}
                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                              >
                                View Balances <ArrowRight size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={msg._id || idx} className="flex justify-center my-2 w-full">
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl shadow-sm px-4 py-3 w-full max-w-[340px] flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-250 text-gray-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Banknote size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Settlement Removed
                              </p>
                              <p className="text-xs text-gray-500 truncate italic">
                                "{msg.text}"
                              </p>
                            </div>
                            <span className="text-[9px] text-gray-400 font-medium">
                              {fmtTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={msg._id || idx} className={`flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <Avatar src={msg.sender?.avatar} name={name} size="sm" />
                      )}
                      <div className={`flex flex-col max-w-[65%] ${isMine ? "items-end" : "items-start"}`}>
                        {!isMine && (
                          <span className="text-[10px] text-gray-400 font-medium mb-0.5 ml-0.5">{name}</span>
                        )}
                        {shared ? (
                          <SharedBubble text={msg.text} />
                        ) : (
                          <div className={`px-3 py-1.5 rounded-2xl text-xs shadow-sm leading-relaxed ${
                            isMine
                              ? "bg-blue-600 text-white rounded-br-none"
                              : "bg-gray-100 text-gray-800 rounded-bl-none"
                          }`}>
                            {msg.text}
                          </div>
                        )}
                        <span className="text-[9px] text-gray-400 mt-0.5 mx-0.5">{fmtTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input — fixed at bottom, compact */}
              <div className="flex-shrink-0 px-3 py-2 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowShare(true)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                    title="Share hotel / flight / itinerary">
                    <Share2 size={16} />
                  </button>
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Message the group..."
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <button onClick={() => handleSend()}
                    disabled={sending || !text.trim()}
                    className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex-shrink-0">
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareModal
          onClose={() => setShowShare(false)}
          onShare={(msg) => handleSend(msg)}
          destination={room.destination}
        />
      )}
    </div>
  );
}
