// frontend/src/pages/FindBuddy.jsx
// FIXES:
// 1. Groups tab now calls getTripRooms() (all public rooms) not getMyTripRooms()
// 2. Trip search empty state shows "Create a Trip" CTA + solo travelers by preference
// 3. No-results state shows both "Create" button and profile-matched travelers
import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Loader2, MapPin, Search, Calendar, Users, Plus, X,
  CheckCircle2, MessageSquare, Check, UserCheck,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useToast } from '../context/ToastContext';
import {
  connectUser, getConnections, getGeneralDiscoveryTrips,
  getDiscoverTrips, getTripRooms, getMyTripRooms, joinTripRoom,
  respondToRoomRequest, inviteBuddyToRoom, acceptRoomInvite, createTrip,
  getMe,
} from '../services/api';

const BASE_URL = 'http://localhost:5000';

const avatarUrl = (v) => {
  if (!v) return '';
  var s = String(v);
  return s.startsWith('http') ? s : (BASE_URL + s);
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Buddy Card ────────────────────────────────────────────────────────────────
function BuddyCard({ user, connectionStatus, onConnect, onMessage, onView }) {
  var av          = avatarUrl(user.avatar);
  var isConnected = connectionStatus === 'connected';
  var scoreColor  =
    user.compatibilityScore >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : user.compatibilityScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col" onClick={onView}>
      <div className="relative h-52 overflow-hidden">
        {av
          ? <img src={av} alt={user.fullName} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          : <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-5xl font-bold">{user.fullName && user.fullName.charAt(0).toUpperCase()}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {user.compatibilityScore > 0 && (
          <div className={'absolute top-3 right-3 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-md backdrop-blur-sm ' + scoreColor}>
            {user.compatibilityScore}% match
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-base font-bold leading-tight mb-0.5">{user.fullName}</h3>
          {(user.preferredDestinations && user.preferredDestinations.length > 0 || user.city) && (
            <p className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {user.preferredDestinations && user.preferredDestinations.length > 0
                ? user.preferredDestinations.slice(0, 2).join(', ')
                : user.city}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1" onClick={function (e) { e.stopPropagation(); }}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {user.travelStyle && <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">{user.travelStyle}</span>}
          {user.travelBudget && <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">{user.travelBudget.replace(' Traveler', '')}</span>}
          {user.travelPace && <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">{user.travelPace} pace</span>}
        </div>
        {user.matchReasons && user.matchReasons.length > 0 && (
          <div className="space-y-0.5 mb-2">
            {user.matchReasons.slice(0, 2).map(function (r) {
              return (
                <div key={r} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" /> {r}
                </div>
              );
            })}
          </div>
        )}
        {user.travelInterests && user.travelInterests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {user.travelInterests.slice(0, 3).map(function (i) {
              return <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full">{i}</span>;
            })}
          </div>
        )}
        {user.bio && <p className="text-xs text-gray-400 line-clamp-2 italic mb-2">"{user.bio}"</p>}
        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {user.preferredDestinations && user.preferredDestinations.slice(0, 1).join(', ') || user.city || 'Traveler'}
          </p>
          {isConnected
            ? <button onClick={function (e) { e.stopPropagation(); onMessage(); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"><MessageSquare size={12} /> Message</button>
            : <button onClick={function (e) { e.stopPropagation(); onConnect(); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"><UserCheck size={12} /> Connect</button>}
        </div>
      </div>
    </div>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ room, myId, connections, onJoin, onAcceptInvite, onRespondRequest, onInviteBuddy, onEnter }) {
  var isMember     = (room.members     || []).some(function (m) { return (m._id || m).toString() === myId; });
  var isOwner      = ((room.createdBy && (room.createdBy._id || room.createdBy)) || '').toString() === myId;
  var isCoOwner    = (room.coOwners    || []).some(function (m) { return m.toString() === myId; });
  var hasRequested = (room.pendingRequests || []).some(function (m) { return (m._id || m).toString() === myId; });
  var isInvited    = (room.invitedBuddies  || []).some(function (m) { return (m._id || m).toString() === myId; });
  var canManage    = isOwner || isCoOwner;
  var spotsLeft    = (room.maxMembers || 10) - (room.members || []).length;
  var [showInvite, setShowInvite] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg leading-tight">{room.destination}</h3>
            <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1.5">
              <Calendar size={12} />
              {fmtDate(room.startDate)}{room.endDate && room.startDate !== room.endDate ? ' \u2192 ' + fmtDate(room.endDate) : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs font-medium">{(room.members || []).length}/{room.maxMembers || 10} members</p>
            {spotsLeft > 0 && <p className="text-emerald-300 text-xs font-bold mt-0.5">{spotsLeft} spots left</p>}
          </div>
        </div>
        <div className="flex items-center -space-x-2 mt-3">
          {(room.members || []).filter(Boolean).slice(0, 5).map(function (m, i) {
            var av = avatarUrl(m.avatar);
            return (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-blue-400 flex-shrink-0">
                {av ? <img src={av} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">{m.fullName && m.fullName.charAt(0)}</div>}
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

      <div className="p-5 flex flex-col flex-1">
        {room.description && <p className="text-xs text-gray-400 italic mb-3 line-clamp-2">"{room.description}"</p>}
        {room.budget && <span className="self-start px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full mb-3">{room.budget}</span>}

        {canManage && (room.pendingRequests || []).filter(Boolean).length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3 space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              {room.pendingRequests.length} Join Request{room.pendingRequests.length !== 1 ? 's' : ''}
            </p>
            {(room.pendingRequests || []).filter(Boolean).map(function (u) {
              return (
                <div key={u._id} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{u.fullName}</span>
                  <div className="flex gap-1">
                    <button onClick={function () { onRespondRequest(u._id, 'accept'); }} className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"><Check size={11} /></button>
                    <button onClick={function () { onRespondRequest(u._id, 'reject'); }} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"><X size={11} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 flex gap-2">
          {isMember || isOwner || isCoOwner
            ? <button onClick={function () { onEnter(room._id); }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1.5"><MessageSquare size={14} /> Open Chat</button>
            : isInvited
            ? <button onClick={onAcceptInvite} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition">Accept Invitation</button>
            : hasRequested
            ? <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200">Request Pending</div>
            : spotsLeft > 0
            ? <button onClick={onJoin} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition">Request to Join</button>
            : <div className="flex-1 bg-gray-50 text-gray-400 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200">Group Full</div>}

          {canManage && connections.length > 0 && (
            <div className="relative">
              <button onClick={function () { setShowInvite(function (v) { return !v; }); }} className="h-full px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition" title="Invite connections">
                <Users size={14} />
              </button>
              {showInvite && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-100 shadow-xl rounded-2xl p-3 z-20 w-52 max-h-52 overflow-y-auto">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">Your Connections</p>
                  {connections.filter(function (c) { return !(room.members || []).some(function (m) { return (m._id || m).toString() === c._id; }); }).map(function (c) {
                    var alreadyInvited = (room.invitedBuddies || []).some(function (i) { return i.toString() === c._id; });
                    return (
                      <div key={c._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl">
                        <span className="text-xs font-medium text-gray-700 truncate flex-1">{c.fullName}</span>
                        <button onClick={function () { onInviteBuddy(c._id); setShowInvite(false); }} disabled={alreadyInvited}
                          className={'ml-2 text-xs px-2 py-1 rounded-lg font-medium transition ' + (alreadyInvited ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                          {alreadyInvited ? 'Sent' : 'Invite'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Trip Modal ─────────────────────────────────────────────────────────
function CreateTripModal({ onClose, onCreated, defaultDestination }) {
  var [form, setForm]         = useState({ destination: defaultDestination || '', startDate: '', endDate: '', budget: '', description: '' });
  var [loading, setLoading]   = useState(false);
  var [dests, setDests]       = useState([]);
  var [showSugg, setShowSugg] = useState(false);
  var [hiIdx, setHiIdx]       = useState(-1);
  var destRef                 = useRef(null);
  var { showToast }           = useToast();

  useEffect(function () {
    fetch(BASE_URL + '/api/destinations').then(function (r) { return r.json(); }).then(function (d) { setDests(Array.isArray(d) ? d : []); }).catch(function () {});
  }, []);
  useEffect(function () {
    function h(e) { if (destRef.current && !destRef.current.contains(e.target)) setShowSugg(false); }
    document.addEventListener('mousedown', h);
    return function () { document.removeEventListener('mousedown', h); };
  }, []);

  var filtered = dests.filter(function (d) { return form.destination && d.name.toLowerCase().includes(form.destination.toLowerCase()); }).slice(0, 6);

  function handleKeyDown(e) {
    if (!showSugg || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(function (p) { return (p + 1) % filtered.length; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHiIdx(function (p) { return (p - 1 + filtered.length) % filtered.length; }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hiIdx >= 0) selectDest(filtered[hiIdx]); }
    else if (e.key === 'Escape') setShowSugg(false);
  }

  function selectDest(dest) {
    setForm(function (p) { return Object.assign({}, p, { destination: dest.name }); });
    setShowSugg(false); setHiIdx(-1);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.destination || !form.startDate) { showToast('Destination and start date are required', 'error'); return; }
    setLoading(true);
    try {
      var res = await createTrip(Object.assign({}, form, { createGroup: true }));
      showToast('Trip created! Your group is now live.', 'success');
      onCreated(res.data); onClose();
    } catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed to create trip', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Plan a Trip</h3>
            <p className="text-xs text-gray-400 mt-0.5">A group is created automatically for others to join</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={17} className="text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Destination *</label>
            <div className="relative" ref={destRef}>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input required type="text" placeholder="Search or type destination..."
                value={form.destination}
                onChange={function (e) { setForm(function (p) { return Object.assign({}, p, { destination: e.target.value }); }); setShowSugg(true); setHiIdx(-1); }}
                onFocus={function () { setShowSugg(true); }} onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
              {showSugg && form.destination && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52">
                  {filtered.length > 0 ? filtered.map(function (dest, idx) {
                    return (
                      <div key={dest._id} onClick={function () { selectDest(dest); }}
                        className={'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-gray-50 last:border-0 ' + (idx === hiIdx ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {dest.images && dest.images[0] ? <img src={BASE_URL + dest.images[0]} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300" /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                          <p className="text-[10px] text-gray-400">{dest.country || 'Nepal'}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="px-3 py-3 text-xs text-gray-400 text-center">No match — you can still type any destination</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Start Date *</label>
              <input required type="date" value={form.startDate} onChange={function (e) { setForm(function (p) { return Object.assign({}, p, { startDate: e.target.value }); }); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">End Date</label>
              <input type="date" value={form.endDate} min={form.startDate} onChange={function (e) { setForm(function (p) { return Object.assign({}, p, { endDate: e.target.value }); }); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Budget</label>
            <select value={form.budget} onChange={function (e) { setForm(function (p) { return Object.assign({}, p, { budget: e.target.value }); }); }}
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
              value={form.description} onChange={function (e) { setForm(function (p) { return Object.assign({}, p, { description: e.target.value }); }); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Trip & Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action, onAction }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
        <Icon size={36} />
      </div>
      <h3 className="text-base font-bold text-gray-700 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6 leading-relaxed">{desc}</p>
      {onAction && (
        <button onClick={onAction} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
          {action}
        </button>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function FindBuddy() {
  var navigate      = useNavigate();
  var location      = useLocation();
  var { showToast } = useToast();
  var searchRef     = useRef(null);

  var [tab, setTab]                   = useState(function () {
    var p = new URLSearchParams(location.search);
    var t = p.get('tab');
    return (t && ['general', 'trips', 'groups'].includes(t)) ? t : 'general';
  });
  var [loading, setLoading]           = useState(true);
  var [me,           setMe]           = useState(null);
  var [suggested,    setSuggested]    = useState([]);
  var [soloTravelers, setSoloTravelers] = useState([]);
  var [trips,        setTrips]        = useState([]);
  var [rooms,        setRooms]        = useState([]);
  var [myRooms,      setMyRooms]      = useState([]);
  var [connections,  setConnections]  = useState([]);
  var [connectionIds, setConnectionIds] = useState(new Set());
  var [showCreateModal, setShowCreateModal] = useState(false);

  var [searchTerm,       setSearchTerm]       = useState('');
  var [destinations,     setDestinations]     = useState([]);
  var [showSuggestions,  setShowSuggestions]  = useState(false);
  var [highlightedIndex, setHighlightedIndex] = useState(-1);
  var [tripSearch, setTripSearch]   = useState({ destination: '', startDate: '', endDate: '' });
  var [hasSearched, setHasSearched] = useState(false);

  var myId = (function () {
    var token = localStorage.getItem('token');
    if (!token) return null;
    try { var d = JSON.parse(atob(token.split('.')[1])); return d && (d.id || d._id) || null; }
    catch (e) { return null; }
  }());

  useEffect(function () {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) { setShowSuggestions(false); setHighlightedIndex(-1); }
    }
    document.addEventListener('mousedown', handler);
    return function () { document.removeEventListener('mousedown', handler); };
  }, []);

  useEffect(function () {
    var p = new URLSearchParams(location.search);
    if (p.get('tab') !== tab) {
      p.set('tab', tab);
      navigate({ search: p.toString() }, { replace: true });
    }
  }, [tab]);

  useEffect(function () {
    if (!myId) return;
    var socket = io(BASE_URL, { withCredentials: true });
    socket.on('connect', function () { socket.emit('registerUser', myId); });
    socket.on('buddy:connected', function () { loadConnections(); });
    socket.on('trip:group:created', function (data) {
      showToast('Trip group for ' + data.destination + ' created!', 'success');
      if (tab === 'groups') fetchData();
    });
    return function () { socket.disconnect(); };
  }, [myId, tab]);

  useEffect(function () {
    getMe().then(function (res) { setMe(res.data); }).catch(function () {});
  }, []);

  var loadConnections = useCallback(async function () {
    try {
      var res = await getConnections();
      var list = res.data.connections || [];
      setConnections(list);
      setConnectionIds(new Set(list.map(function (c) { return c._id; })));
    } catch (e) {}
  }, []);

  useEffect(function () { loadConnections(); }, [loadConnections]);

  useEffect(function () {
    fetch(BASE_URL + '/api/destinations').then(function (r) { return r.json(); }).then(function (d) { setDestinations(Array.isArray(d) ? d : []); }).catch(function () {});
  }, []);

  var destSuggestions = destinations.filter(function (d) { return d.name.toLowerCase().includes(searchTerm.toLowerCase()); }).slice(0, 8);

  function handleSelectDestination(dest) {
    setSearchTerm(dest.name);
    setTripSearch(function (p) { return Object.assign({}, p, { destination: dest.name }); });
    setShowSuggestions(false); setHighlightedIndex(-1);
  }

  function handleSearchKeyDown(e) {
    if (!showSuggestions || destSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(function (p) { return (p + 1) % destSuggestions.length; }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(function (p) { return (p - 1 + destSuggestions.length) % destSuggestions.length; }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (highlightedIndex >= 0) handleSelectDestination(destSuggestions[highlightedIndex]); }
    else if (e.key === 'Escape') { setShowSuggestions(false); setHighlightedIndex(-1); }
  }

  var fetchData = useCallback(async function () {
    setLoading(true);
    try {
      if (tab === 'general') {
        var res = await getGeneralDiscoveryTrips();
        setSuggested(res && res.data || []);
      } else if (tab === 'trips') {
        if (!hasSearched) {
          // Suggested trips: groups for user's preferred destinations
          const dests = me?.preferredDestinations || [];
          if (dests.length > 0) {
            const roomResults = await Promise.all(
              dests.slice(0, 3).map(d => getTripRooms({ destination: d }))
            );
            const allRooms = roomResults.flatMap(r => r.data || []);
            const uniqueRooms = allRooms.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
            setRooms(uniqueRooms);
          } else {
            setRooms([]);
          }
          setSoloTravelers([]); // Only show after search
          setTrips([]);
        } else {
          // Searched results
          const results = await Promise.all([
            getTripRooms({ destination: tripSearch.destination }),
            getGeneralDiscoveryTrips({ destination: tripSearch.destination }),
          ]);
          setRooms(results[0]?.data || []);
          setSoloTravelers(results[1]?.data || []);
          setTrips([]);
        }
      } else if (tab === 'groups') {
        // FIX: show ALL public trip rooms, not just mine
        var roomsRes = await getTripRooms({});
        setRooms(roomsRes && roomsRes.data || []);
        // Also fetch my rooms for "Open Chat" button state
        var myRoomsRes = await getMyTripRooms();
        setMyRooms(myRoomsRes && myRoomsRes.data || []);
      }
    } catch (e) {}
    setLoading(false);
  }, [tab, hasSearched, tripSearch]);

  useEffect(function () { fetchData(); }, [tab]);

  async function handleConnect(userId) {
    if (connectionIds.has(userId)) { navigate('/community/messages?buddy=' + userId); return; }
    try {
      await connectUser(userId);
      setConnectionIds(function (prev) { var s = new Set(prev); s.add(userId); return s; });
      loadConnections();
      showToast('Connected!', 'success');
      navigate('/community/messages?buddy=' + userId);
    } catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed to connect', 'error'); }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    try {
      var results = await Promise.all([
        getTripRooms({ destination: tripSearch.destination }),
        getGeneralDiscoveryTrips({ destination: tripSearch.destination }),
      ]);
      setRooms(results[0]?.data || []);
      setSoloTravelers(results[1]?.data || []);
      setTrips([]); // Clear trips
    } catch (e) { showToast('Search failed', 'error'); }
    setLoading(false);
  }

  async function handleJoin(roomId) {
    try { await joinTripRoom(roomId); showToast('Join request sent!', 'success'); fetchData(); }
    catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed', 'error'); }
  }
  async function handleAcceptInvite(roomId) {
    try { await acceptRoomInvite(roomId); showToast('Joined!', 'success'); fetchData(); }
    catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed', 'error'); }
  }
  async function handleRoomAction(roomId, userId, action) {
    try { await respondToRoomRequest({ roomId: roomId, userId: userId, action: action }); showToast('Request ' + action + 'ed', 'success'); fetchData(); }
    catch (e) { showToast('Failed', 'error'); }
  }
  async function handleInvite(roomId, connId) {
    try { await inviteBuddyToRoom({ roomId: roomId, buddyId: connId }); showToast('Invited!', 'success'); }
    catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed', 'error'); }
  }
  function handleEnterRoom(roomId) { navigate('/community/groups?room=' + roomId); }

  // Check if a room is one I belong to (for "Open Chat" vs "Join")
  function amMemberOf(roomId) {
    return myRooms.some(function (r) { return r._id === roomId; });
  }

  var TABS = [
    { id: 'general', label: 'Suggested'  },
    { id: 'trips',   label: 'Find Trips' },
    { id: 'groups',  label: 'Groups'     },
  ];

  var hasNoResults = trips.filter(function (t) { return t && t._id && t.user; }).length === 0
    && rooms.filter(function (r) { return r && r._id; }).length === 0
    && soloTravelers.filter(function (u) { return u && u._id; }).length === 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="relative w-full h-[260px] md:h-[320px] flex items-center justify-center text-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1613756505541-bf172d3cb8de?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1.5">Find Your Travel Buddy</h1>
          <p className="text-white/85 text-base mb-6">Connect instantly — no requests, no waiting</p>

          <div className="bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-5 shadow-2xl max-w-4xl mx-auto">
            <div className="flex gap-2 mb-4">
              {TABS.map(function (t) {
                return (
                  <button key={t.id} onClick={function () { setTab(t.id); }}
                    className={'flex-1 py-2 rounded-xl text-sm font-semibold transition ' + (tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10')}>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === 'trips' && (
              <form onSubmit={handleSearch}>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1" ref={searchRef}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input type="text" placeholder="Search destination..."
                      value={searchTerm}
                      onChange={function (e) { setSearchTerm(e.target.value); setTripSearch(function (p) { return Object.assign({}, p, { destination: e.target.value }); }); setShowSuggestions(true); setHighlightedIndex(-1); }}
                      onFocus={function () { setShowSuggestions(true); }}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full pl-10 pr-8 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white placeholder-white/60 focus:bg-white/20 focus:outline-none transition-all" />
                    {searchTerm && (
                      <button type="button" onClick={function () { setSearchTerm(''); setTripSearch(function (p) { return Object.assign({}, p, { destination: '' }); }); setShowSuggestions(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                        <X size={13} />
                      </button>
                    )}
                    {showSuggestions && searchTerm && (
                      <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64">
                        {destSuggestions.length > 0 ? destSuggestions.map(function (dest, idx) {
                          return (
                            <div key={dest._id} onClick={function () { handleSelectDestination(dest); }}
                              className={'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ' + (idx === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                {dest.images && dest.images[0] ? <img src={BASE_URL + dest.images[0]} alt={dest.name} className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-gray-300" /></div>}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                                <p className="text-xs text-gray-400">{dest.country || 'Nepal'}</p>
                              </div>
                            </div>
                          );
                        }) : <div className="px-4 py-5 text-center text-gray-400 text-sm">No destinations found</div>}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input type="date" value={tripSearch.startDate} onChange={function (e) { setTripSearch(function (p) { return Object.assign({}, p, { startDate: e.target.value }); }); }}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white focus:bg-white/20 focus:outline-none transition-all" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                    <input type="date" value={tripSearch.endDate} min={tripSearch.startDate} onChange={function (e) { setTripSearch(function (p) { return Object.assign({}, p, { endDate: e.target.value }); }); }}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-sm text-white focus:bg-white/20 focus:outline-none transition-all" style={{ colorScheme: 'dark' }} />
                  </div>
                  <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 whitespace-nowrap">
                    <Search size={15} /> Search
                  </button>
                  {hasSearched && (
                    <button type="button" onClick={function () { setSearchTerm(''); setTripSearch({ destination: '', startDate: '', endDate: '' }); setHasSearched(false); setSoloTravelers([]); fetchData(); }}
                      className="px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition border border-white/10">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </form>
            )}

            {tab !== 'trips' && (
              <div className="flex justify-end">
                <button onClick={function () { setShowCreateModal(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md">
                  <Plus size={15} /> Plan a Trip
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-gray-500 text-sm">Finding matches...</p>
          </div>
        ) : (
          <div className="space-y-10">

            {/* GENERAL tab */}
            {tab === 'general' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{suggested.filter(function (u) { return u && u._id; }).length} Suggested Travelers</h2>
                </div>
                {suggested.filter(function (u) { return u && u._id; }).length === 0
                  ? <EmptyState icon={Users} title="No suggestions yet" desc="Fill in your travel preferences and destinations in your profile to get matched." action="Update Profile" onAction={function () { navigate('/profile'); }} />
                  : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {suggested.filter(function (u) { return u && u._id; }).map(function (user) {
                        return (
                          <BuddyCard key={user._id} user={user}
                            connectionStatus={connectionIds.has(user._id) ? 'connected' : 'none'}
                            onConnect={function () { handleConnect(user._id); }}
                            onMessage={function () { navigate('/community/messages?buddy=' + user._id); }}
                            onView={function () { navigate('/profile/' + user._id); }} />
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* TRIPS tab */}
            {tab === 'trips' && (
              <div className="space-y-10">
                {/* Suggested Trips (Before Search) */}
                {!hasSearched && rooms.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-5">
                      Suggested Trips
                      <span className="ml-2 text-sm font-normal text-gray-400">— based on your preferred destinations</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rooms.map(function (room) {
                        return (
                          <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                            onJoin={function () { handleJoin(room._id); }}
                            onAcceptInvite={function () { handleAcceptInvite(room._id); }}
                            onRespondRequest={function (uid, action) { handleRoomAction(room._id, uid, action); }}
                            onInviteBuddy={function (cid) { handleInvite(room._id, cid); }}
                            onEnter={handleEnterRoom} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Searched Trip Groups */}
                {hasSearched && rooms.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-5">
                      Trip Groups
                      <span className="ml-2 text-sm font-normal text-gray-400">— groups heading to {tripSearch.destination}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rooms.map(function (room) {
                        return (
                          <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                            onJoin={function () { handleJoin(room._id); }}
                            onAcceptInvite={function () { handleAcceptInvite(room._id); }}
                            onRespondRequest={function (uid, action) { handleRoomAction(room._id, uid, action); }}
                            onInviteBuddy={function (cid) { handleInvite(room._id, cid); }}
                            onEnter={handleEnterRoom} />
                        );
                      })}
                    </div>
                  </div>
                )}

                 {/* No groups but travelers exist — show Create Group CTA */}
                 {hasSearched && rooms.length === 0 && soloTravelers.length > 0 && (
                   <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                     <div className="flex items-center justify-between gap-3">
                       <div>
                         <h3 className="font-bold text-gray-900">No groups for {tripSearch.destination} yet</h3>
                         <p className="text-xs text-gray-400 mt-0.5">Create a group so interested travelers can join you</p>
                       </div>
                       <button onClick={function () { setShowCreateModal(true); }}
                         className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
                         Create Group
                       </button>
                     </div>
                   </div>
                 )}

                {/* Searched Solo Travelers (After Search Only) */}
                {hasSearched && soloTravelers.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-5">
                      Travelers Interested in <span className="text-blue-600">{tripSearch.destination}</span>
                      <span className="ml-2 text-sm font-normal text-gray-400">— from their profile preferences</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {soloTravelers.filter(function (u) { return u && u._id; }).map(function (user) {
                        return (
                          <BuddyCard key={user._id} user={user}
                            connectionStatus={connectionIds.has(user._id) ? 'connected' : 'none'}
                            onConnect={function () { handleConnect(user._id); }}
                            onMessage={function () { navigate('/community/messages?buddy=' + user._id); }}
                            onView={function () { navigate('/profile/' + user._id); }} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty states */}
                {hasSearched && rooms.length === 0 && soloTravelers.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={28} className="text-blue-400" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">No groups or travelers heading to {tripSearch.destination}</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Be the first to plan a trip there!</p>
                    <button onClick={function () { setShowCreateModal(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">Plan a Trip</button>
                  </div>
                )}

                {!hasSearched && rooms.length === 0 && (
                  <EmptyState icon={Users} title="Find your next trip" desc="Search for a destination to find trip groups and travelers, or plan your own trip!" action="Plan a Trip" onAction={function () { setShowCreateModal(true); }} />
                )}
              </div>
            )}

            {/* GROUPS tab — all public rooms */}
            {tab === 'groups' && (
              <div className="space-y-10">
                {/* My Groups */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">
                    My Groups
                    <span className="ml-2 text-sm font-normal text-gray-400">— groups you are a member of</span>
                  </h2>
                  {myRooms.length === 0
                    ? <EmptyState icon={Users} title="You haven't joined any groups yet" desc="Join a group from the active groups below or create your own!" />
                    : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myRooms.map(function (room) {
                          return (
                            <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                              onJoin={function () { handleJoin(room._id); }}
                              onAcceptInvite={function () { handleAcceptInvite(room._id); }}
                              onRespondRequest={function (uid, action) { handleRoomAction(room._id, uid, action); }}
                              onInviteBuddy={function (cid) { handleInvite(room._id, cid); }}
                              onEnter={handleEnterRoom} />
                          );
                        })}
                      </div>
                    )}
                </div>

                {/* Active Groups (excluding my groups) */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-5">
                    Active Groups
                    <span className="ml-2 text-sm font-normal text-gray-400">— public groups you can join</span>
                  </h2>
                  {rooms.filter(function (r) { return r && r._id && !amMemberOf(r._id); }).length === 0
                    ? <EmptyState icon={Users} title="No other active groups" desc="No public groups available to join at the moment. Why not create one?" action="Create a Group" onAction={function () { setShowCreateModal(true); }} />
                    : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.filter(function (r) { return r && r._id && !amMemberOf(r._id); }).map(function (room) {
                          return (
                            <GroupCard key={room._id} room={room} myId={myId} connections={connections}
                              onJoin={function () { handleJoin(room._id); }}
                              onAcceptInvite={function () { handleAcceptInvite(room._id); }}
                              onRespondRequest={function (uid, action) { handleRoomAction(room._id, uid, action); }}
                              onInviteBuddy={function (cid) { handleInvite(room._id, cid); }}
                              onEnter={handleEnterRoom} />
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTripModal
          onClose={function () { setShowCreateModal(false); }}
          onCreated={function () { setTab('groups'); fetchData(); }}
          defaultDestination={hasSearched ? tripSearch.destination : ''}
        />
      )}
    </div>
  );
}