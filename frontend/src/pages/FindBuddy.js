// frontend/src/pages/FindBuddy.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2, MapPin, Search, Calendar, Users, Plus, X,
  CheckCircle2, Info, MessageSquare, Star, Check,
  ChevronDown, UserCheck,
} from "lucide-react";
import { io } from "socket.io-client";
import { useToast } from "../context/ToastContext";
import {
  connectUser, getConnections, getGeneralDiscoveryTrips,
  getDiscoverTrips, getTripRooms, getMyTripRooms, joinTripRoom,
  respondToRoomRequest, inviteBuddyToRoom, acceptRoomInvite, createTrip,
} from "../services/api";

const BASE_URL = "http://localhost:5000";

const avatarUrl = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

// ─────────────────────────────────────────────────────────────────────────────
// BUDDY CARD — Hotels.jsx card style reference
// Photo fills the top, name+city overlaid on image, clean body with tags/actions
// ─────────────────────────────────────────────────────────────────────────────
const BuddyCard = ({ user, connectionStatus, onConnect, onMessage, onView }) => {
  const av          = avatarUrl(user.avatar);
  const isConnected = connectionStatus === "connected";

  const scoreColor =
    user.compatibilityScore >= 75 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : user.compatibilityScore >= 50 ? "text-blue-700 bg-blue-50 border-blue-200"
    : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <div
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
      onClick={onView}
    >
      {/* ── Photo area — same proportions as Hotels card ── */}
      <div className="relative h-56 overflow-hidden">
        {av ? (
          <img
            src={av}
            alt={user.fullName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-5xl font-bold">
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Match % badge — top right (like rating badge in Hotels) */}
        {user.compatibilityScore > 0 && (
          <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-md backdrop-blur-sm ${scoreColor}`}>
            {user.compatibilityScore}% match
          </div>
        )}

        {/* Name + destination overlay — bottom left (like Hotels) */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-lg font-bold leading-tight mb-0.5" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
            {user.fullName}
          </h3>
          {(user.preferredDestinations?.length > 0 || user.city) && (
            <p className="text-sm flex items-center gap-1" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {user.preferredDestinations?.length > 0
                ? user.preferredDestinations.slice(0, 2).join(", ")
                : user.city}
            </p>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="p-5 flex flex-col flex-1" onClick={(e) => e.stopPropagation()}>

        {/* Travel style + budget tags (like amenity tags in Hotels) */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {user.travelStyle && (
            <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
              {user.travelStyle}
            </span>
          )}
          {user.travelBudget && (
            <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
              {user.travelBudget.replace(" Traveler", "")}
            </span>
          )}
          {user.travelPace && (
            <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
              {user.travelPace} pace
            </span>
          )}
        </div>

        {/* Match reasons */}
        {user.matchReasons?.length > 0 && (
          <div className="space-y-0.5 mb-3">
            {user.matchReasons.slice(0, 2).map((r) => (
              <div key={r} className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        )}

        {/* Interests */}
        {user.travelInterests?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {user.travelInterests.slice(0, 3).map((i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">
                {i}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="text-xs text-gray-400 line-clamp-2 italic mb-3">"{user.bio}"</p>
        )}

        {/* Price/Action row — mirrors Hotels card footer */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Travel interests</p>
            <p className="text-sm font-medium text-gray-700">
              {user.travelInterests?.slice(0, 2).join(", ") || "Not specified"}
            </p>
          </div>

          {isConnected ? (
            <button
              onClick={(e) => { e.stopPropagation(); onMessage(); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <MessageSquare size={14} /> Message
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onConnect(); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <UserCheck size={14} /> Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIP CARD — for search results (solo travelers)
// ─────────────────────────────────────────────────────────────────────────────
const TripCard = ({ trip, connectionStatus, onConnect, onView }) => {
  const user = trip.user;
  if (!user) return null;
  const av = avatarUrl(user.avatar);

  return (
    <div
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
      onClick={onView}
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        {av ? (
          <img src={av} alt={user.fullName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center text-white text-4xl font-bold">
            {user.fullName?.charAt(0)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {trip.matchScore > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-xl text-xs font-bold text-blue-700 shadow-md">
            {trip.matchScore}% match
          </div>
        )}

        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-base font-bold leading-tight" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
            {user.fullName}
          </h3>
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            <MapPin size={11} /> {trip.destination}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
            <Calendar size={10} /> {fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}
          </span>
          {trip.budget && (
            <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
              {trip.budget.replace(" Traveler", "")}
            </span>
          )}
        </div>

        {trip.matchReasons?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {trip.matchReasons.map((r) => (
              <span key={r} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-100">
                {r}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">{user.travelStyle || "Traveler"}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
              connectionStatus === "connected"
                ? "bg-gray-100 text-gray-500"
                : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
            }`}
          >
            {connectionStatus === "connected"
              ? <><MessageSquare size={13} /> Message</>
              : <><UserCheck size={13} /> Connect</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GROUP CARD — for trip rooms
// ─────────────────────────────────────────────────────────────────────────────
const GroupCard = ({ room, myId, connections, onJoin, onAcceptInvite, onRespondRequest, onInviteBuddy, onEnter }) => {
  const isMember     = (room.members     || []).some(m => (m._id || m).toString() === myId);
  const isOwner      = (room.createdBy?._id || room.createdBy || "").toString() === myId;
  const isCoOwner    = (room.coOwners    || []).some(m => m.toString() === myId);
  const hasRequested = (room.pendingRequests || []).some(m => (m._id || m).toString() === myId);
  const isInvited    = (room.invitedBuddies  || []).some(m => (m._id || m).toString() === myId);
  const canManage    = isOwner || isCoOwner;
  const spotsLeft    = (room.maxMembers || 10) - (room.members || []).length;
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      {/* Header strip */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg leading-tight">{room.destination}</h3>
            <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar size={12} />
              {fmtDate(room.startDate)}{room.endDate && room.startDate !== room.endDate && ` → ${fmtDate(room.endDate)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs font-medium">
              {(room.members || []).length}/{room.maxMembers || 10} members
            </p>
            {spotsLeft > 0 && (
              <p className="text-emerald-300 text-xs font-bold mt-0.5">{spotsLeft} spots left</p>
            )}
          </div>
        </div>

        {/* Member avatars */}
        <div className="flex items-center -space-x-2 mt-4">
          {(room.members || []).filter(Boolean).slice(0, 5).map((m, i) => {
            const av = avatarUrl(m.avatar);
            return (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-blue-400 flex-shrink-0" title={m.fullName}>
                {av ? <img src={av} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{m.fullName?.charAt(0)}</div>}
              </div>
            );
          })}
          {(room.members || []).length > 5 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white">
              +{(room.members || []).length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        {room.description && (
          <p className="text-xs text-gray-400 italic mb-4 line-clamp-2">"{room.description}"</p>
        )}

        {room.budget && (
          <span className="self-start px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full mb-4">
            {room.budget}
          </span>
        )}

        {/* Owner: pending join requests */}
        {canManage && (room.pendingRequests || []).filter(Boolean).length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              {room.pendingRequests.length} Join Request{room.pendingRequests.length !== 1 ? "s" : ""}
            </p>
            {(room.pendingRequests || []).filter(Boolean).map(u => (
              <div key={u._id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {avatarUrl(u.avatar)
                      ? <img src={avatarUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-500">{u.fullName?.charAt(0)}</div>}
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[90px]">{u.fullName}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onRespondRequest(u._id, "accept")}
                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-xs">
                    <Check size={11} />
                  </button>
                  <button onClick={() => onRespondRequest(u._id, "reject")}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition text-xs">
                    <X size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
          {isMember || isOwner || isCoOwner ? (
            <button onClick={() => onEnter(room._id)}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-1.5">
              <MessageSquare size={14} /> Open Group Chat
            </button>
          ) : isInvited ? (
            <button onClick={onAcceptInvite}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              Accept Invitation
            </button>
          ) : hasRequested ? (
            <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200">
              Request Pending
            </div>
          ) : spotsLeft > 0 ? (
            <button onClick={onJoin}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              Request to Join
            </button>
          ) : (
            <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200">
              Group Full
            </div>
          )}

          {/* Invite connections (owners only) */}
          {canManage && connections.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowInvite(v => !v)}
                className="h-full px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                title="Invite your connections">
                <Users size={14} />
              </button>
              {showInvite && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 shadow-xl rounded-2xl p-3 z-20 w-56 max-h-52 overflow-y-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Your Connections</p>
                  {connections
                    .filter(c => !(room.members || []).some(m => (m._id || m).toString() === c._id))
                    .map(c => (
                      <div key={c._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-700 truncate flex-1">{c.fullName}</span>
                        <button
                          onClick={() => { onInviteBuddy(c._id); setShowInvite(false); }}
                          disabled={(room.invitedBuddies || []).some(i => i.toString() === c._id)}
                          className={`ml-2 text-xs px-2 py-1 rounded-lg font-medium transition ${
                            (room.invitedBuddies || []).some(i => i.toString() === c._id)
                              ? "bg-gray-100 text-gray-400"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
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
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TRIP MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CreateTripModal = ({ onClose, onCreated }) => {
  const [form, setForm]           = useState({ destination: "", startDate: "", endDate: "", budget: "", description: "" });
  const [loading, setLoading]     = useState(false);
  const [dests, setDests]         = useState([]);
  const [showSugg, setShowSugg]   = useState(false);
  const [hiIdx, setHiIdx]         = useState(-1);
  const destRef                   = useRef(null);
  const { showToast }             = useToast();

  // Load destinations from backend for suggestions
  useEffect(() => {
    fetch(`${BASE_URL}/api/destinations`)
      .then(r => r.json())
      .then(d => setDests(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (destRef.current && !destRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = dests.filter(d => form.destination && d.name.toLowerCase().includes(form.destination.toLowerCase())).slice(0, 6);

  const handleKeyDown = (e) => {
    if (!showSugg || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(p => (p + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx(p => (p - 1 + filtered.length) % filtered.length); }
    else if (e.key === "Enter") { e.preventDefault(); if (hiIdx >= 0) selectDest(filtered[hiIdx]); }
    else if (e.key === "Escape") setShowSugg(false);
  };

  const selectDest = (dest) => {
    setForm(p => ({ ...p, destination: dest.name }));
    setShowSugg(false);
    setHiIdx(-1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.startDate) {
      showToast("Destination and start date are required", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await createTrip({ ...form, createGroup: true });
      showToast("Trip created! Your group is now live.", "success");
      onCreated(res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.msg || "Failed to create trip", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Plan a Trip</h3>
            <p className="text-xs text-gray-400 mt-0.5">A group is created automatically for others to find and join</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={17} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Destination with suggestion dropdown */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Destination *</label>
            <div className="relative" ref={destRef}>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                required
                type="text"
                placeholder="Search or type destination..."
                value={form.destination}
                onChange={e => { setForm(p => ({ ...p, destination: e.target.value })); setShowSugg(true); setHiIdx(-1); }}
                onFocus={() => setShowSugg(true)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
              {/* Suggestions */}
              {showSugg && form.destination && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52">
                  {filtered.length > 0 ? filtered.map((dest, idx) => (
                    <div key={dest._id} onClick={() => selectDest(dest)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-gray-50 last:border-0 ${idx === hiIdx ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {dest.images?.[0]
                          ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                        <p className="text-[10px] text-gray-400">{dest.country || "Nepal"}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="px-3 py-3 text-xs text-gray-400 text-center">
                      No match — you can still type any destination
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Start Date *</label>
              <input required type="date" value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">End Date</label>
              <input type="date" value={form.endDate} min={form.startDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Budget</label>
            <select value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition">
              <option value="">Optional</option>
              <option value="Budget">Budget</option>
              <option value="Mid-range">Mid-range</option>
              <option value="Luxury">Luxury</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Description</label>
            <textarea rows={2} placeholder="Tell others about your trip plans..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Creating..." : "Create Trip & Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function FindBuddy() {
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const searchRef     = useRef(null);
  const sortRef       = useRef(null);

  const [tab, setTab]                   = useState("general");
  const [loading, setLoading]           = useState(true);
  const [suggested,    setSuggested]    = useState([]);
  const [trips,        setTrips]        = useState([]);
  const [rooms,        setRooms]        = useState([]);
  const [connections,  setConnections]  = useState([]);
  const [connectionIds, setConnectionIds] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Destination search with suggestions (like Hotels.jsx)
  const [searchTerm,        setSearchTerm]        = useState("");
  const [destinations,      setDestinations]      = useState([]);
  const [showSuggestions,   setShowSuggestions]   = useState(false);
  const [highlightedIndex,  setHighlightedIndex]  = useState(-1);
  const [showSortDropdown,  setShowSortDropdown]  = useState(false);
  const [tripSearch, setTripSearch]     = useState({ destination: "", startDate: "", endDate: "" });
  const [hasSearched, setHasSearched]   = useState(false);

  const myId = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try { const d = JSON.parse(atob(token.split(".")[1])); return d?.id || d?._id || null; }
    catch (_) { return null; }
  })();

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on("connect", () => socket.emit("registerUser", myId));
    socket.on("buddy:connected",      () => loadConnections());
    socket.on("room:request:updated", ({ status, roomDest }) => {
      showToast(
        status === "accepted" ? `Joined ${roomDest}! 🎉` : `Request to ${roomDest} declined`,
        status === "accepted" ? "success" : "info"
      );
      if (tab === "groups") fetchData();
    });
    socket.on("room:member:joined",   ({ roomDest, userName }) => {
      showToast(`${userName} joined ${roomDest}`, "success");
      if (tab === "groups") fetchData();
    });
    socket.on("room:invite:new", ({ roomDest }) => {
      showToast(`You've been invited to a trip to ${roomDest}!`, "info");
      if (tab === "groups") fetchData();
    });
    socket.on("trip:group:created", ({ destination }) => {
      showToast(`Trip group for ${destination} created!`, "success");
      if (tab === "groups") fetchData();
    });
    return () => socket.disconnect();
  }, [myId, tab]);

  // ── Load connections ─────────────────────────────────────────────────────────
  const loadConnections = useCallback(async () => {
    try {
      const res = await getConnections();
      const list = res.data.connections || [];
      setConnections(list);
      setConnectionIds(new Set(list.map(c => c._id)));
    } catch (_) {}
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // ── Load destinations for search suggestions ─────────────────────────────────
  useEffect(() => {
    fetch(`${BASE_URL}/api/destinations`)
      .then(r => r.json())
      .then(d => setDestinations(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Filtered suggestions based on searchTerm
  const destSuggestions = destinations
    .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 8);

  const handleSelectDestination = (dest) => {
    setSearchTerm(dest.name);
    setTripSearch(p => ({ ...p, destination: dest.name }));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || destSuggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightedIndex(p => (p + 1) % destSuggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightedIndex(p => (p - 1 + destSuggestions.length) % destSuggestions.length); }
    else if (e.key === "Enter") { e.preventDefault(); if (highlightedIndex >= 0) handleSelectDestination(destSuggestions[highlightedIndex]); }
    else if (e.key === "Escape") { setShowSuggestions(false); setHighlightedIndex(-1); }
  };

  // ── Fetch tab data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "general") {
        const res = await getGeneralDiscoveryTrips();
        setSuggested(res?.data || []);
      } else if (tab === "trips") {
        const [tripsRes, roomsRes] = await Promise.all([
          getDiscoverTrips(hasSearched ? tripSearch : {}),
          getTripRooms(hasSearched ? { destination: tripSearch.destination } : {}),
        ]);
        setTrips(tripsRes?.data || []);
        setRooms(roomsRes?.data || []);
      } else if (tab === "groups") {
        // ✅ FIX: use getMyTripRooms so only MY groups show, not all groups
        const res = await getMyTripRooms();
        setRooms(res?.data || []);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [tab, hasSearched, tripSearch]);

  useEffect(() => { fetchData(); }, [tab]);

  // ── Connect = instant chat ───────────────────────────────────────────────────
  const handleConnect = async (userId) => {
    if (connectionIds.has(userId)) {
      navigate(`/community/messages?buddy=${userId}`);
      return;
    }
    try {
      await connectUser(userId);
      setConnectionIds(prev => new Set([...prev, userId]));
      loadConnections();
      showToast("Connected! Starting chat...", "success");
      navigate(`/community/messages?buddy=${userId}`);
    } catch (err) {
      showToast(err?.response?.data?.msg || "Failed to connect", "error");
    }
  };

  const handleMessage = (userId) => navigate(`/community/messages?buddy=${userId}`);

  // ── Trip search (all fields optional) ───────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    try {
      const [tripsRes, roomsRes] = await Promise.all([
        getDiscoverTrips(tripSearch),
        getTripRooms({ destination: tripSearch.destination }),
      ]);
      setTrips(tripsRes?.data || []);
      setRooms(roomsRes?.data || []);
    } catch (_) { showToast("Search failed", "error"); }
    finally { setLoading(false); }
  };

  // ── Group actions ────────────────────────────────────────────────────────────
  const handleJoin         = async (roomId) => { try { await joinTripRoom(roomId); showToast("Join request sent!", "success"); fetchData(); } catch (err) { showToast(err?.response?.data?.msg || "Failed", "error"); }};
  const handleAcceptInvite = async (roomId) => { try { await acceptRoomInvite(roomId); showToast("Joined!", "success"); fetchData(); } catch (err) { showToast(err?.response?.data?.msg || "Failed", "error"); }};
  const handleRoomAction   = async (roomId, userId, action) => { try { await respondToRoomRequest({ roomId, userId, action }); showToast(`Request ${action}ed`, "success"); fetchData(); } catch (_) { showToast("Failed", "error"); }};
  const handleInvite       = async (roomId, connId) => { try { await inviteBuddyToRoom({ roomId, buddyId: connId }); showToast("Invited!", "success"); } catch (err) { showToast(err?.response?.data?.msg || "Failed", "error"); }};
  const handleEnterRoom = (roomId) => navigate(`/community/groups?room=${roomId}`);

  const TABS = [
    { id: "general", label: "Suggested"  },
    { id: "trips",   label: "Find Trips" },
    { id: "groups",  label: "Groups"     },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* ── Hero with search bar — matches Hotels.jsx style ─────────────────── */}
      <div
        className="relative w-full h-[260px] md:h-[320px] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1527631746610-bca00a040d60?q=80&w=1470&auto=format&fit=crop')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1.5" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.6)" }}>
            Find Your Travel Buddy
          </h1>
          <p className="text-white/85 text-base mb-6" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}>
            Connect instantly — no requests, no waiting
          </p>

          {/* Tab + search bar */}
          <div className="bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-5 shadow-2xl max-w-4xl mx-auto">
            {/* Tabs inside hero */}
            <div className="flex gap-2 mb-4">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                    tab === t.id
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Trip search (only on trips tab) — Hotels.jsx-style with destination suggestions */}
            {tab === "trips" && (
              <form onSubmit={handleSearch}>
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Destination input with suggestions */}
                  <div className="relative flex-1" ref={searchRef}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Where? (optional)"
                      value={searchTerm}
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setTripSearch(p => ({ ...p, destination: e.target.value }));
                        setShowSuggestions(true);
                        setHighlightedIndex(-1);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full pl-10 pr-8 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/60 focus:bg-white/20 focus:outline-none transition-all"
                    />
                    {searchTerm && (
                      <button type="button"
                        onClick={() => { setSearchTerm(""); setTripSearch(p => ({ ...p, destination: "" })); setShowSuggestions(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                        <X size={13} />
                      </button>
                    )}
                    {/* Destination suggestions dropdown — white card like Hotels.jsx */}
                    {showSuggestions && searchTerm && (
                      <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64">
                        {destSuggestions.length > 0 ? destSuggestions.map((dest, idx) => (
                          <div
                            key={dest._id}
                            onClick={() => handleSelectDestination(dest)}
                            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${idx === highlightedIndex ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          >
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {dest.images?.[0] ? (
                                <img src={`${BASE_URL}${dest.images[0]}`} alt={dest.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="h-4 w-4 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                              <p className="text-xs text-gray-400">{dest.country || "Nepal"}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="px-4 py-5 text-center text-gray-400 text-sm">No destinations found</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input type="date" value={tripSearch.startDate}
                      onChange={e => setTripSearch(p => ({ ...p, startDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white focus:bg-white/20 focus:outline-none transition-all [color-scheme:dark]" />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input type="date" value={tripSearch.endDate} min={tripSearch.startDate}
                      onChange={e => setTripSearch(p => ({ ...p, endDate: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white focus:bg-white/20 focus:outline-none transition-all [color-scheme:dark]" />
                  </div>
                  <button type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 whitespace-nowrap">
                    <Search size={15} /> Search
                  </button>
                  {hasSearched && (
                    <button type="button"
                      onClick={() => { setSearchTerm(""); setTripSearch({ destination: "", startDate: "", endDate: "" }); setHasSearched(false); fetchData(); }}
                      className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition border border-white/10">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Plan a trip button (non-trip tabs) */}
            {tab !== "trips" && (
              <div className="flex justify-end">
                <button onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md">
                  <Plus size={15} /> Plan a Trip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-gray-500 text-sm">Finding matches...</p>
          </div>
        ) : (
          <>
            {/* ── GENERAL: Suggested travelers ──────────────────────────────── */}
            {tab === "general" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {suggested.length === 0 ? "Suggested Travelers" : `${suggested.length} Suggested Travelers`}
                  </h2>
                </div>

                {suggested.filter(u => u?._id).length === 0 ? (
                  <EmptyState icon={Info} title="No suggestions yet"
                    desc="Fill in your travel preferences in your profile to get matched with compatible travelers."
                    action="Update Profile" onAction={() => navigate("/profile")} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggested.filter(u => u?._id).map(user => (
                      <BuddyCard key={user._id} user={user}
                        connectionStatus={connectionIds.has(user._id) ? "connected" : "none"}
                        onConnect={() => handleConnect(user._id)}
                        onMessage={() => handleMessage(user._id)}
                        onView={() => navigate(`/profile/${user._id}`)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TRIPS: Groups first, solo travelers second ─────────────────── */}
            {tab === "trips" && (
              <div className="space-y-10">

                {/* Groups section */}
                {rooms.filter(r => r?._id).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl font-bold text-gray-900">
                        Trip Groups
                        <span className="ml-2 text-sm font-normal text-gray-400">— join an existing group</span>
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rooms.filter(r => r?._id).map(room => (
                        <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                          onJoin={() => handleJoin(room._id)}
                          onAcceptInvite={() => handleAcceptInvite(room._id)}
                          onRespondRequest={(uid, action) => handleRoomAction(room._id, uid, action)}
                          onInviteBuddy={(cid) => handleInvite(room._id, cid)}
                          onEnter={handleEnterRoom} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Solo travelers */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-gray-900">
                      {rooms.filter(r => r?._id).length > 0 ? "Solo Travelers" : hasSearched ? "Search Results" : "Active Trips"}
                      {rooms.filter(r => r?._id).length > 0 && (
                        <span className="ml-2 text-sm font-normal text-gray-400">— connect and plan together</span>
                      )}
                    </h2>
                    <button onClick={() => setShowCreateModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
                      <Plus size={14} /> Plan a Trip
                    </button>
                  </div>

                  {trips.filter(t => t?._id && t?.user).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={28} className="text-gray-300" />
                      </div>
                      <h3 className="font-semibold text-gray-700 mb-2">
                        {hasSearched ? "No trips found for this search" : "No active trips yet"}
                      </h3>
                      <p className="text-gray-400 text-sm mb-6">Be the first to plan a trip!</p>
                      <button onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
                        Plan a Trip
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {trips.filter(t => t?._id && t?.user).map(trip => (
                        <TripCard key={trip._id} trip={trip}
                          connectionStatus={connectionIds.has(trip.user._id) ? "connected" : "none"}
                          onConnect={() => handleConnect(trip.user._id)}
                          onView={() => navigate(`/profile/${trip.user._id}`)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── GROUPS: All groups ─────────────────────────────────────────── */}
            {tab === "groups" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {rooms.filter(r => r?._id).length === 0 ? "Trip Groups" : `${rooms.filter(r => r?._id).length} Trip Groups`}
                  </h2>
                  <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
                    <Plus size={14} /> Create Group
                  </button>
                </div>

                {rooms.filter(r => r?._id).length === 0 ? (
                  <EmptyState icon={Users} title="No groups yet"
                    desc="Create a trip to start a group, or connect with travelers and plan together from chat."
                    action="Create a Group" onAction={() => setShowCreateModal(true)} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.filter(r => r?._id).map(room => (
                      <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                        onJoin={() => handleJoin(room._id)}
                        onAcceptInvite={() => handleAcceptInvite(room._id)}
                        onRespondRequest={(uid, action) => handleRoomAction(room._id, uid, action)}
                        onInviteBuddy={(cid) => handleInvite(room._id, cid)}
                        onEnter={handleEnterRoom} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateTripModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setTab("groups"); fetchData(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action, onAction }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
        <Icon size={40} />
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">{desc}</p>
      {onAction && (
        <button onClick={onAction}
          className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
          {action}
        </button>
      )}
    </div>
  );
}