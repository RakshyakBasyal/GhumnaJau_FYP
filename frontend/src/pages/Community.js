// frontend/src/pages/Community.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Bell, Heart, LayoutDashboard, MessageCircle, MessageSquare, Users, X, Sparkles, Loader2,
  MapPin, Calendar, Share2, Plane, Hotel, ClipboardList, Search, UserPlus, Crown,
  Check, ExternalLink, Send
} from 'lucide-react';
import { io } from 'socket.io-client';
import { getConnections, getBuddyMessages, getBuddyRequests, getMe, sendBuddyMessage, createTripFromChat } from '../services/api';
import { useToast } from '../context/ToastContext';
import Feed from './Feed';
import FindBuddy from './FindBuddy';

const BASE_URL = 'http://localhost:5000';

const avatarUrl = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.startsWith('http') ? s : `${BASE_URL}${s}`;
};

const Community = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [activeTab, setActiveTab]               = useState('feed');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]       = useState([]);
  const [connections, setConnections]           = useState([]);
  const [activeChatBuddy, setActiveChatBuddy]   = useState(null);
  const [chatMessages, setChatMessages]         = useState([]);
  const [chatText, setChatText]                 = useState('');
  const [sendingChat, setSendingChat]           = useState(false);
  const [showPlanModal, setShowPlanModal]       = useState(false);
  const [planForm, setPlanForm]                 = useState({ destination: '', startDate: '', endDate: '', budget: '' });
  const [planLoading, setPlanLoading]           = useState(false);

  // ── Group chat state (My Groups tab) ──────────────────────────────────────
  const [myRooms,        setMyRooms]        = useState([]);
  const [myRoomsLoading, setMyRoomsLoading] = useState(false);
  const [activeRoom,     setActiveRoom]     = useState(null);   // selected TripRoom object
  const [roomMessages,   setRoomMessages]   = useState([]);
  const [roomText,       setRoomText]       = useState('');
  const [sendingRoom,    setSendingRoom]    = useState(false);
  const roomChatRef = useRef(null);

  // Group UI panel state
  const [showRoomMembers, setShowRoomMembers] = useState(false);
  const [showRoomShare,   setShowRoomShare]   = useState(false);
  const [showRoomInvite,  setShowRoomInvite]  = useState(false);
  const [shareTab,        setShareTab]        = useState('hotel');
  const [shareItems,      setShareItems]      = useState([]);
  const [shareLoading,    setShareLoading]    = useState(false);
  const [shareQuery,      setShareQuery]      = useState('');
  const [roomConnections, setRoomConnections] = useState([]);
  const chatContainerRef = useRef(null);
  const notifRef         = useRef(null);  // ref for the notification panel

  const scrollToBottom = (instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'messages' && chatMessages.length > 0) {
      const isInitialLoad = !chatContainerRef.current?.scrollTop;
      scrollToBottom(isInitialLoad);
    }
  }, [chatMessages, activeTab]);

  const myId = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded?.id || decoded?._id || null;
    } catch (_) { return null; }
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // ── Close notification panel on outside click ─────────────────────────────
  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };

    // Small delay so the click that opened it doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/community/buddies'))   setActiveTab('buddies');
    else if (p.includes('/community/messages')) setActiveTab('messages');
    else if (p.includes('/community/groups'))   setActiveTab('groups');
    else setActiveTab('feed');
  }, [location.pathname]);

  const loadBuddyRequestsAsNotifications = useCallback(async () => {
    try {
      const res = await getBuddyRequests();
      const incoming = res.data.incoming || [];
      const mapped = incoming.map(r => ({
        id: `req-${r._id}`,
        type: 'request',
        text: `${r.requester?.fullName || 'Traveler'} sent you a buddy request`,
        read: false,
        createdAt: r.createdAt || new Date().toISOString(),
      }));
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        return [...mapped.filter(m => !existingIds.has(m.id)), ...prev];
      });
    } catch (_) {}
  }, []);

  const pushNotif = useCallback((notif) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
  }, []);

  // ── Group chat functions (defined BEFORE socket useEffect to avoid TDZ) ────
  const loadMyRooms = useCallback(async () => {
    setMyRoomsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/trips/rooms/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const rooms = Array.isArray(data) ? data : [];
      setMyRooms(rooms);

      // Auto-open a room if ?room=<id> is in the URL (navigated from FindBuddy)
      // We call openRoom which fetches the full populated room separately
      const roomIdFromUrl = searchParams.get('room');
      if (roomIdFromUrl) {
        const match = rooms.find(r => r._id === roomIdFromUrl);
        if (match) {
          // Fetch full populated room directly so sender names show correctly
          try {
            const roomRes = await fetch(`${BASE_URL}/api/trips/rooms/${match._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (roomRes.ok) {
              const fullRoom = await roomRes.json();
              setActiveRoom(fullRoom);
              setRoomMessages(fullRoom.messages || []);
            } else {
              setActiveRoom(match);
              setRoomMessages(match.messages || []);
            }
          } catch (_) {
            setActiveRoom(match);
            setRoomMessages(match.messages || []);
          }
          setTimeout(() => {
            if (roomChatRef.current) roomChatRef.current.scrollTop = roomChatRef.current.scrollHeight;
          }, 100);
        }
      }
    } catch (_) {}
    finally { setMyRoomsLoading(false); }
  }, [searchParams]);

  const openRoom = useCallback(async (room) => {
    // Set basic data immediately for fast UI response
    setActiveRoom(room);
    setRoomMessages(room.messages || []);
    setShowRoomMembers(false);
    setShowRoomShare(false);
    setShowRoomInvite(false);

    // Then fetch full room from API so messages.sender is populated (has fullName + avatar)
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/trips/rooms/${room._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const fullRoom = await res.json();
        setActiveRoom(fullRoom);
        setRoomMessages(fullRoom.messages || []);
      }
    } catch (_) {}

    setTimeout(() => {
      if (roomChatRef.current) roomChatRef.current.scrollTop = roomChatRef.current.scrollHeight;
    }, 50);
    // Load connections for invite panel
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/buddies/connections`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRoomConnections(data.connections || []);
    } catch (_) {}
  }, []);

  const sendRoomMsg = async () => {
    if (!activeRoom || !roomText.trim() || sendingRoom) return;
    setSendingRoom(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/trips/rooms/${activeRoom._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: roomText.trim() }),
      });
      if (res.ok) setRoomText('');
    } catch (_) { showToast('Failed to send message', 'error'); }
    finally { setSendingRoom(false); }
  };

  // Load share items (hotels/flights/itineraries) filtered by destination
  const loadShareItems = useCallback(async (tab) => {
    setShareLoading(true);
    setShareQuery('');
    const token = localStorage.getItem('token');
    const dest  = activeRoom?.destination || '';
    try {
      if (tab === 'hotel') {
        const res  = await fetch(`${BASE_URL}/api/hotels`, { headers: { Authorization: `Bearer ${token}` } });
        const all  = await res.json();
        const arr  = Array.isArray(all) ? all : [];
        const filt = dest ? arr.filter(h => h.destination?.name?.toLowerCase().includes(dest.toLowerCase())) : arr;
        setShareItems(filt.length > 0 ? filt : arr);
      } else if (tab === 'flight') {
        const res  = await fetch(`${BASE_URL}/api/flights`, { headers: { Authorization: `Bearer ${token}` } });
        const all  = await res.json();
        const arr  = Array.isArray(all) ? all : [];
        const filt = dest ? arr.filter(f => f.to?.toLowerCase().includes(dest.toLowerCase()) || f.destination?.name?.toLowerCase().includes(dest.toLowerCase())) : arr;
        setShareItems(filt.length > 0 ? filt : arr);
      } else {
        const res = await fetch(`${BASE_URL}/api/itineraries`, { headers: { Authorization: `Bearer ${token}` } });
        const all = await res.json();
        setShareItems(Array.isArray(all) ? all : []);
      }
    } catch (_) { setShareItems([]); }
    finally { setShareLoading(false); }
  }, [activeRoom]);

  const openShareModal = (tab = 'hotel') => {
    setShareTab(tab);
    setShowRoomShare(true);
    loadShareItems(tab);
  };

  const handleShareTabChange = (tab) => {
    setShareTab(tab);
    loadShareItems(tab);
  };

  const sendSharedMsg = async (label, link, details) => {
    const text = `📎 **${label}**${details ? `\n${details}` : ''}${link ? `\n🔗 ${link}` : ''}`;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${BASE_URL}/api/trips/rooms/${activeRoom._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
    } catch (_) { showToast('Failed to share', 'error'); }
    setShowRoomShare(false);
  };

  const handleInviteMember = async (connId) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${BASE_URL}/api/trips/rooms/${activeRoom._id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buddyId: connId }),
      });
      showToast('Invite sent!', 'success');
    } catch (_) { showToast('Failed to invite', 'error'); }
  };

  // Load rooms when groups tab opens
  useEffect(() => {
    if (activeTab === 'groups') loadMyRooms();
  }, [activeTab, loadMyRooms]);

  // Auto-scroll room chat on new messages
  useEffect(() => {
    if (roomChatRef.current) roomChatRef.current.scrollTop = roomChatRef.current.scrollHeight;
  }, [roomMessages]);

  // ── Socket + profile check ─────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;

    // Profile check
    const checkProfile = async () => {
      try {
        const res = await getMe();
        const u = res.data;
        if (!u.city || !u.travelStyle) {
          navigate('/profile', { state: { fromCommunityRedirect: true } });
        }
      } catch (_) {}
    };
    checkProfile();
    loadBuddyRequestsAsNotifications();

    const socket = io(BASE_URL, { withCredentials: true });
    socket.on('connect', () => socket.emit('registerUser', myId));

    socket.on('buddy:request:new', () => {
      loadBuddyRequestsAsNotifications();
      showToast('New buddy request!', 'info');
    });

    socket.on('buddy:message:new', ({ conversationKey, message }) => {
      setChatMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        const currentOtherId = activeChatBuddy?._id;
        if (currentOtherId) {
          const expectedKey = [String(myId), String(currentOtherId)].sort().join('_');
          if (conversationKey === expectedKey) return [...prev, message];
        }
        return prev;
      });

      const isCurrentChat = activeChatBuddy &&
        conversationKey === [String(myId), String(activeChatBuddy._id)].sort().join('_');

      if (!isCurrentChat) {
        pushNotif({
          id: `msg-${message._id || Date.now()}`,
          type: 'message',
          text: `New message from ${message.sender?.fullName || 'Buddy'}`,
          read: false,
          createdAt: message.createdAt || new Date().toISOString(),
        });
        showToast(`New message from ${message.sender?.fullName || 'Buddy'}`, 'info');
      }
    });

    socket.on('follow:new', p => {
      pushNotif({ id: `follow-${Date.now()}`, type: 'follow', text: `${p?.followerName || 'Someone'} started following you`, read: false, createdAt: new Date().toISOString() });
    });
    socket.on('post:liked:owner', p => {
      pushNotif({ id: `like-${Date.now()}`, type: 'like', text: `${p?.actorName || 'Someone'} liked your post`, read: false, createdAt: new Date().toISOString() });
    });
    socket.on('post:commented:owner', p => {
      pushNotif({ id: `comment-${Date.now()}`, type: 'comment', text: `${p?.actorName || 'Someone'} commented on your post`, read: false, createdAt: new Date().toISOString() });
    });

    // ── Trip room notifications ─────────────────────────────────────────────
    socket.on('room:request:new', ({ roomDestination, userName }) => {
      pushNotif({ id: `room-req-${Date.now()}`, type: 'room', text: `${userName} wants to join your trip to ${roomDestination}`, read: false, createdAt: new Date().toISOString() });
      showToast(`${userName} wants to join your trip to ${roomDestination}!`, 'info');
    });
    socket.on('room:invite:new', ({ roomDestination, inviterName }) => {
      pushNotif({ id: `room-inv-${Date.now()}`, type: 'room', text: `${inviterName} invited you to a trip to ${roomDestination}`, read: false, createdAt: new Date().toISOString() });
      showToast(`You've been invited to ${roomDestination}!`, 'info');
    });
    socket.on('room:request:updated', ({ roomDestination, status }) => {
      pushNotif({ id: `room-upd-${Date.now()}`, type: 'room', text: `Your request to join ${roomDestination} was ${status}`, read: false, createdAt: new Date().toISOString() });
      showToast(`Join request for ${roomDestination}: ${status}`, status === 'accepted' ? 'success' : 'info');
    });
    socket.on('room:member:joined', ({ roomDestination, userName }) => {
      pushNotif({ id: `room-join-${Date.now()}`, type: 'room', text: `${userName} joined your trip to ${roomDestination}`, read: false, createdAt: new Date().toISOString() });
      showToast(`${userName} joined your group!`, 'success');
    });

    // Live group chat messages
    socket.on('room:message:new', ({ roomId, message }) => {
      setRoomMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        // Only add if this message is for the currently open room
        setActiveRoom(r => {
          if (r && String(r._id) === String(roomId)) {
            return r; // trigger roomMessages update below
          }
          return r;
        });
        return prev;
      });
      // Append to current room messages if the room is open
      setActiveRoom(currentRoom => {
        if (currentRoom && String(currentRoom._id) === String(roomId)) {
          setRoomMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
        }
        return currentRoom;
      });
    });

    socket.on('trip:group:created', ({ destination }) => {
      showToast(`You've been added to a trip group for ${destination}!`, 'success');
      if (activeTab === 'groups') loadMyRooms();
    });

    return () => socket.disconnect();
  }, [myId, activeChatBuddy, loadBuddyRequestsAsNotifications, pushNotif, activeTab, loadMyRooms]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    // getConnections returns users I have conversations with (chat-based, not request-based)
    getConnections()
      .then(res => setConnections(res.data.connections || []))
      .catch(() => showToast('Failed to load messages', 'error'));
  }, [activeTab, showToast]);

  const openChat = async (buddy) => {
    setActiveChatBuddy(buddy);
    try {
      const res = await getBuddyMessages(buddy._id);
      setChatMessages(res.data.messages || []);
    } catch (_) {
      setChatMessages([]);
      showToast('Failed to load chat', 'error');
    }
  };

  const sendChat = async () => {
    if (!activeChatBuddy || !chatText.trim() || sendingChat) return;
    try {
      setSendingChat(true);
      await sendBuddyMessage(activeChatBuddy._id, chatText.trim());
      setChatText('');
    } catch (_) {
      showToast('Failed to send message', 'error');
    } finally {
      setSendingChat(false);
    }
  };

  const handlePlanTrip = async (e) => {
    e.preventDefault();
    if (!planForm.destination || !planForm.startDate) {
      showToast('Destination and start date are required', 'error');
      return;
    }
    setPlanLoading(true);
    try {
      await createTripFromChat({
        partnerId:   activeChatBuddy._id,
        destination: planForm.destination,
        startDate:   planForm.startDate,
        endDate:     planForm.endDate || planForm.startDate,
        budget:      planForm.budget || '',
      });
      showToast(`Trip to ${planForm.destination} created! Both of you are co-owners.`, 'success');
      setShowPlanModal(false);
      setPlanForm({ destination: '', startDate: '', endDate: '', budget: '' });
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Failed to create trip', 'error');
    } finally {
      setPlanLoading(false);
    }
  };

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // ── Shared message helpers ─────────────────────────────────────────────────
  const isSharedMsg = (text) => text?.startsWith('📎 **');
  const parseShared = (text) => {
    const title   = (text.match(/📎 \*\*(.+?)\*\*/) || [])[1] || '';
    const link    = (text.match(/🔗 (https?:\/\/\S+)/) || [])[1] || null;
    const details = text.split('\n').filter(l => !l.startsWith('📎 **') && !l.startsWith('🔗 ')).join(' ').trim();
    const isHotel  = link?.includes('/hotels/');
    const isFlight = text.includes('✈️');
    return { title, link, details, isHotel, isFlight };
  };

  const navItems = [
    { id: 'feed',     path: '/community',          label: 'Feed',         icon: LayoutDashboard },
    { id: 'buddies',  path: '/community/buddies',   label: 'Find Buddies', icon: Users },
    { id: 'messages', path: '/community/messages',  label: 'Messages',     icon: MessageSquare },
    { id: 'groups',   path: '/community/groups',    label: 'My Groups',    icon: Users },
  ];

  const notifIcon = (type) => {
    if (type === 'like')    return <Heart size={14} className="fill-current" />;
    if (type === 'request') return <Users size={14} />;
    if (type === 'room')    return <Users size={14} />;
    return <MessageCircle size={14} />;
  };

  const notifColor = (type) => {
    if (type === 'like')    return 'bg-red-50 text-red-500';
    if (type === 'request') return 'bg-purple-50 text-purple-500';
    if (type === 'follow')  return 'bg-blue-50 text-blue-500';
    if (type === 'room')    return 'bg-emerald-50 text-emerald-500';
    return 'bg-green-50 text-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 relative z-40">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
              <nav className="space-y-1">
                {navItems.map(i => {
                  const Icon  = i.icon;
                  const active = activeTab === i.id;
                  return (
                    <button key={i.id} onClick={() => navigate(i.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <Icon size={18} /> {i.label}
                    </button>
                  );
                })}

                {/* Notification bell — wrapped in a ref div for outside-click detection */}
                <div ref={notifRef} className="relative pt-2">
                  <button
                    onClick={() => setShowNotifications(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span className="flex items-center gap-3">
                      <Bell size={18} className={unreadCount > 0 ? 'text-blue-600' : 'text-gray-500'} />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <p className="font-bold text-gray-900">Activity</p>
                        <div className="flex items-center gap-3">
                          <button onClick={markAllRead} className="text-xs text-blue-600 font-bold hover:underline">Mark all read</button>
                          <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[500px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-12 px-4 text-center">
                            <Bell className="mx-auto text-gray-200 mb-2" size={32} />
                            <p className="text-sm text-gray-500 font-medium">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id}
                              className={`px-4 py-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${n.read ? 'bg-white' : 'bg-blue-50/40'}`}>
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${notifColor(n.type)}`}>
                                  {notifIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 leading-snug">{n.text}</p>
                                  <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">
                                    {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                {!n.read && <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {activeTab === 'feed'    && <Feed isCommunityView={true} />}
            {activeTab === 'buddies' && <FindBuddy isCommunityView={true} />}

            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="text-blue-600" /> Messages
                  </h2>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Contacts */}
                  <div className="w-80 border-r border-gray-100 overflow-y-auto bg-gray-50/30">
                    {connections.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No connections yet.</p>
                        <button onClick={() => navigate('/community/buddies')} className="mt-3 text-xs text-blue-600 font-bold hover:underline">Find Buddies</button>
                      </div>
                    ) : (
                      connections.map(buddy => (
                        <button key={buddy._id} onClick={() => openChat(buddy)}
                          className={`w-full flex items-center gap-3 p-4 transition-colors ${
                            activeChatBuddy?._id === buddy._id
                              ? 'bg-blue-50 border-r-2 border-blue-600'
                              : 'hover:bg-gray-50'
                          }`}>
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                            {avatarUrl(buddy.avatar)
                              ? <img src={avatarUrl(buddy.avatar)} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{buddy.fullName?.charAt(0)}</div>}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-gray-900 truncate">{buddy.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{buddy.travelStyle || 'Traveler'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Chat */}
                  <div className="flex-1 flex flex-col bg-white">
                    {!activeChatBuddy ? (
                      <div className="flex-1 flex items-center justify-center text-center p-8">
                        <div>
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={40} className="text-blue-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Select a conversation</h3>
                          <p className="text-sm text-gray-400 mt-1">Choose a buddy to start chatting</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                              {avatarUrl(activeChatBuddy.avatar)
                                ? <img src={avatarUrl(activeChatBuddy.avatar)} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{activeChatBuddy.fullName?.charAt(0)}</div>}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{activeChatBuddy.fullName}</p>
                              <p className="text-xs text-emerald-500 font-medium">Connected</p>
                            </div>
                          </div>
                          {/* Plan a Trip Together button */}
                          <button
                            onClick={() => setShowPlanModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition border border-blue-100"
                          >
                            <Sparkles size={13} /> Plan a Trip Together
                          </button>
                        </div>

                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                          {chatMessages.map((msg, idx) => {
                            const isMine = String(msg.sender?._id || msg.sender) === String(myId);
                            return (
                              <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] p-3 rounded-2xl text-sm shadow-sm ${
                                  isMine
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100">
                          <div className="flex gap-2">
                            <input value={chatText} onChange={e => setChatText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && sendChat()}
                              placeholder="Type a message..."
                              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                            <button onClick={sendChat} disabled={sendingChat || !chatText.trim()}
                              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm">
                              Send
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── MY GROUPS TAB — full features inline ─────────────────── */}
            {activeTab === 'groups' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[calc(100vh-120px)] overflow-hidden flex flex-col relative">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="text-blue-600" /> My Groups
                  </h2>
                  <button onClick={() => navigate('/community/buddies?tab=groups')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                    Browse All Groups →
                  </button>
                </div>

                <div className="flex-1 flex overflow-hidden min-h-0">
                  {/* ── Group list ───────────────────────────────────────── */}
                  <div className="w-80 border-r border-gray-100 overflow-y-auto bg-gray-50/30 flex-shrink-0">
                    {myRoomsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={20} className="animate-spin text-blue-500" />
                      </div>
                    ) : myRooms.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">You're not in any groups yet.</p>
                        <button onClick={() => navigate('/community/buddies?tab=groups')}
                          className="mt-3 text-xs text-blue-600 font-bold hover:underline">Find Trip Groups</button>
                      </div>
                    ) : (
                      myRooms.map(room => {
                        const members  = room.members || [];
                        const isActive = activeRoom?._id === room._id;
                        return (
                          <button key={room._id} onClick={() => openRoom(room)}
                            className={`w-full flex items-center gap-3 p-4 transition-colors text-left ${
                              isActive ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-50'
                            }`}>
                            <div className="flex -space-x-2 flex-shrink-0">
                              {members.slice(0, 2).map((m, i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-blue-100">
                                  {avatarUrl(m.avatar)
                                    ? <img src={avatarUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-blue-700 font-bold text-sm">{m.fullName?.charAt(0)}</div>}
                                </div>
                              ))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{room.destination}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {members.length} member{members.length !== 1 ? 's' : ''}
                                {room.startDate ? ` · ${new Date(room.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* ── Chat + side panels ───────────────────────────────── */}
                  <div className="flex-1 flex overflow-hidden min-w-0">
                    {!activeRoom ? (
                      <div className="flex-1 flex items-center justify-center text-center p-8">
                        <div>
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={40} className="text-blue-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Select a group</h3>
                          <p className="text-sm text-gray-400 mt-1">Choose a group to open the chat</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Chat column */}
                        <div className="flex-1 flex flex-col min-w-0">
                          {/* Header */}
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2 flex-shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {activeRoom.destination?.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate">{activeRoom.destination}</p>
                                <p className="text-xs text-gray-400">
                                  {(activeRoom.members || []).length} members
                                  {activeRoom.startDate ? ` · ${new Date(activeRoom.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                </p>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openShareModal('hotel')}
                                className={`p-2 rounded-xl transition ${showRoomShare ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'}`}
                                title="Share hotel / flight / itinerary">
                                <Share2 size={16} />
                              </button>
                              <button onClick={() => setShowRoomInvite(v => !v)}
                                className={`p-2 rounded-xl transition ${showRoomInvite ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'}`}
                                title="Invite a connection">
                                <UserPlus size={16} />
                              </button>
                              <button onClick={() => setShowRoomMembers(v => !v)}
                                className={`p-2 rounded-xl transition ${showRoomMembers ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'}`}
                                title="Members">
                                <Users size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Messages */}
                          <div ref={roomChatRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20">
                            {roomMessages.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                <MessageSquare size={32} className="text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No messages yet. Say something!</p>
                              </div>
                            ) : (
                              roomMessages.map((msg, idx) => {
                                const senderId   = msg.sender?._id || msg.sender;
                                const isMine     = String(senderId) === String(myId);
                                const senderName = msg.sender?.fullName || 'Member';
                                const senderAv   = avatarUrl(msg.sender?.avatar);
                                const shared     = isSharedMsg(msg.text);
                                const parsed     = shared ? parseShared(msg.text) : null;
                                return (
                                  <div key={msg._id || idx} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    {!isMine && (
                                      <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mb-0.5">
                                        {senderAv
                                          ? <img src={senderAv} alt={senderName} className="w-full h-full object-cover" />
                                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{senderName?.charAt(0)}</div>}
                                      </div>
                                    )}
                                    <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
                                      {!isMine && <span className="text-[10px] text-gray-400 font-medium mb-0.5 ml-0.5">{senderName}</span>}
                                      {shared && parsed ? (
                                        <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm max-w-[220px] ${isMine ? 'rounded-tr-none border-blue-100' : 'rounded-tl-none border-gray-100'}`}>
                                          <div className={`flex items-center gap-2 px-3 py-2 border-b ${parsed.isHotel ? 'bg-blue-50 border-blue-100' : parsed.isFlight ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                                              {parsed.isHotel ? <Hotel size={12} className="text-blue-600" /> : parsed.isFlight ? <Plane size={12} className="text-indigo-600" /> : <ClipboardList size={12} className="text-emerald-600" />}
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-800 truncate">{parsed.title}</span>
                                          </div>
                                          <div className="px-3 py-2">
                                            {parsed.details && <p className="text-[10px] text-gray-500 mb-1.5 line-clamp-2">{parsed.details}</p>}
                                            {parsed.link && (
                                              <a href={parsed.link} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
                                                View <ExternalLink size={9} />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMine ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                                          {msg.text}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Input */}
                          <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                            <div className="flex gap-2">
                              <button onClick={() => openShareModal('hotel')}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition flex-shrink-0" title="Share">
                                <Share2 size={16} />
                              </button>
                              <input value={roomText} onChange={e => setRoomText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendRoomMsg()}
                                placeholder="Message the group..."
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                              <button onClick={sendRoomMsg} disabled={sendingRoom || !roomText.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 text-sm">
                                Send
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Members panel */}
                        {showRoomMembers && (
                          <div className="w-64 border-l border-gray-100 flex flex-col bg-white flex-shrink-0">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">Members ({(activeRoom.members || []).length})</p>
                              <button onClick={() => setShowRoomMembers(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><X size={14} className="text-gray-400" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                              {(activeRoom.members || []).filter(Boolean).map(m => {
                                const isOwner   = (activeRoom.createdBy?._id || activeRoom.createdBy || '').toString() === (m._id || m).toString();
                                const isCoOwner = (activeRoom.coOwners || []).some(o => o.toString() === (m._id || m).toString());
                                return (
                                  <div key={m._id || m} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-xl transition">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
                                      {avatarUrl(m.avatar) ? <img src={avatarUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-blue-700">{m.fullName?.charAt(0)}</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <Link to={`/profile/${m._id}`} className="text-xs font-semibold text-gray-900 hover:text-blue-600 transition truncate block">
                                        {m.fullName}{String(m._id || m) === String(myId) && <span className="text-gray-400 font-normal"> (you)</span>}
                                      </Link>
                                      {m.travelStyle && <p className="text-[10px] text-gray-400">{m.travelStyle}</p>}
                                    </div>
                                    {(isOwner || isCoOwner) && (
                                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100 flex-shrink-0">
                                        <Crown size={8} /> {isOwner ? 'Owner' : 'Co'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Invite panel */}
                        {showRoomInvite && (
                          <div className="w-64 border-l border-gray-100 flex flex-col bg-white flex-shrink-0">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                              <p className="text-sm font-bold text-gray-900">Invite Connections</p>
                              <button onClick={() => setShowRoomInvite(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><X size={14} className="text-gray-400" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                              {roomConnections.filter(c => !(activeRoom.members || []).some(m => (m._id || m).toString() === c._id)).length === 0
                                ? <p className="text-xs text-gray-400 text-center py-4">No connections to invite</p>
                                : roomConnections.filter(c => !(activeRoom.members || []).some(m => (m._id || m).toString() === c._id)).map(c => (
                                    <div key={c._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl">
                                      <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
                                        {avatarUrl(c.avatar) ? <img src={avatarUrl(c.avatar)} alt="" className="w-full h-full object-cover" />
                                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-blue-700">{c.fullName?.charAt(0)}</div>}
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 flex-1 truncate">{c.fullName}</span>
                                      <button onClick={() => handleInviteMember(c._id)}
                                        className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex-shrink-0">
                                        Invite
                                      </button>
                                    </div>
                                  ))
                              }
                            </div>
                          </div>
                        )}

                        {/* Share modal overlay */}
                        {showRoomShare && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-gray-100">
                              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">Share to Group</p>
                                  {activeRoom.destination && <p className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5"><MapPin size={9} /> Filtered for {activeRoom.destination}</p>}
                                </div>
                                <button onClick={() => setShowRoomShare(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><X size={15} className="text-gray-500" /></button>
                              </div>
                              <div className="flex border-b border-gray-100">
                                {[{id:'hotel',label:'Hotels',Icon:Hotel},{id:'flight',label:'Flights',Icon:Plane},{id:'itinerary',label:'Itinerary',Icon:ClipboardList}].map(t => (
                                  <button key={t.id} onClick={() => handleShareTabChange(t.id)}
                                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition ${shareTab === t.id ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-gray-400 hover:text-gray-600'}`}>
                                    <t.Icon size={12} /> {t.label}
                                  </button>
                                ))}
                              </div>
                              <div className="px-3 py-2 border-b border-gray-50">
                                <div className="relative">
                                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input value={shareQuery} onChange={e => setShareQuery(e.target.value)} placeholder="Search..."
                                    className="w-full pl-7 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto">
                                {shareLoading ? (
                                  <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-600" /></div>
                                ) : shareItems.filter(i => !shareQuery || (i.name||i.title||i.airline||''  ).toLowerCase().includes(shareQuery.toLowerCase())).length === 0 ? (
                                  <p className="text-center text-gray-400 text-xs py-6">No items found</p>
                                ) : shareItems.filter(i => !shareQuery || (i.name||i.title||i.airline||''  ).toLowerCase().includes(shareQuery.toLowerCase())).map(item => {
                                  if (shareTab === 'hotel') {
                                    const min = item.roomTypes?.length ? Math.min(...item.roomTypes.map(r => r.pricePerNight)) : 0;
                                    return (
                                      <button key={item._id} onClick={() => sendSharedMsg(item.name, `${window.location.origin}/hotels/${item._id}`, `📍 ${item.destination?.name||''} ${min?`· From NPR ${min.toLocaleString()}/night`:''}`)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                                          {item.images?.[0] ? <img src={`${BASE_URL}${item.images[0]}`} alt="" className="w-full h-full object-cover" /> : <Hotel size={14} className="text-blue-600 m-auto mt-2" />}
                                        </div>
                                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p><p className="text-[10px] text-gray-400">{item.destination?.name}{min?` · NPR ${min.toLocaleString()}/n`:''}</p></div>
                                        <Share2 size={12} className="text-gray-300 flex-shrink-0" />
                                      </button>
                                    );
                                  }
                                  if (shareTab === 'flight') {
                                    return (
                                      <button key={item._id} onClick={() => sendSharedMsg(`${item.airline} ${item.flightNumber}`, null, `✈️ ${item.from} → ${item.to} · ${item.departureTime} · NPR ${Number(item.price).toLocaleString()}`)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex-shrink-0 flex items-center justify-center"><Plane size={13} className="text-indigo-600" /></div>
                                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900">{item.airline} · {item.flightNumber}</p><p className="text-[10px] text-gray-400">{item.from} → {item.to} · {item.departureTime}</p></div>
                                        <p className="text-[10px] font-bold text-blue-600 flex-shrink-0">NPR {Number(item.price).toLocaleString()}</p>
                                      </button>
                                    );
                                  }
                                  return (
                                    <button key={item._id} onClick={() => sendSharedMsg(item.title, `${window.location.origin}/itinerary/public/${item._id}`, `📍 ${item.destinationName||''} ${item.startDate?`· ${new Date(item.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}`:''}`)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0">
                                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-emerald-50 flex-shrink-0 flex items-center justify-center">
                                        {item.destinationImage ? <img src={`${BASE_URL}${item.destinationImage}`} alt="" className="w-full h-full object-cover" /> : <ClipboardList size={14} className="text-emerald-600" />}
                                      </div>
                                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>{item.destinationName&&<p className="text-[10px] text-gray-400 truncate">{item.destinationName}</p>}</div>
                                      <Share2 size={12} className="text-gray-300 flex-shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* ── Plan a Trip Together modal ──────────────────────────────────────── */}
      {showPlanModal && activeChatBuddy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Plan a Trip Together</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  with {activeChatBuddy.fullName} — both of you become co-owners
                </p>
              </div>
              <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition">
                <X size={17} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handlePlanTrip} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Destination *
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required type="text" placeholder="e.g. Pokhara, Nepal"
                    value={planForm.destination}
                    onChange={e => setPlanForm(p => ({ ...p, destination: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Start *</label>
                  <input
                    required type="date"
                    value={planForm.startDate}
                    onChange={e => setPlanForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">End</label>
                  <input
                    type="date" min={planForm.startDate}
                    value={planForm.endDate}
                    onChange={e => setPlanForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Budget</label>
                <select
                  value={planForm.budget}
                  onChange={e => setPlanForm(p => ({ ...p, budget: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                >
                  <option value="">Optional</option>
                  <option value="Budget">Budget</option>
                  <option value="Mid-range">Mid-range</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={planLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {planLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Creating...</>
                    : <><Sparkles size={14} /> Create Trip & Group</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;