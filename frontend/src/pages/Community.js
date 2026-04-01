import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Filter, Heart, LayoutDashboard, MessageCircle, MessageSquare, Search, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import { getBuddyConnections, getBuddyMessages, getBuddyRequests, getMe, sendBuddyMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import Feed from './Feed';
import FindBuddy from './FindBuddy';

const BASE_URL = 'http://localhost:5000';

const Community = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('feed');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeChatBuddy, setActiveChatBuddy] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatContainerRef = useRef(null);

  const scrollToBottom = (instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'messages' && chatMessages.length > 0) {
      // Use instant scroll for initial load, smooth for new messages
      const isInitialLoad = chatMessages.length <= 200 && !chatContainerRef.current?.scrollTop;
      scrollToBottom(isInitialLoad);
    }
  }, [chatMessages, activeTab]);

  const myId = (() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded?.id || decoded?._id || null;
    } catch (_) {
      return null;
    }
  })();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    const p = location.pathname;
    if (p.includes('/community/buddies')) setActiveTab('buddies');
    else if (p.includes('/community/messages')) setActiveTab('messages');
    else setActiveTab('feed');
  }, [location.pathname]);

  const loadBuddyRequestsAsNotifications = async () => {
    try {
      const res = await getBuddyRequests();
      const incoming = res.data.incoming || [];
      const mapped = incoming.map((r) => ({
        id: `req-${r._id}`,
        type: 'request',
        text: `${r.requester?.fullName || 'Traveler'} sent you a buddy request`,
        read: false,
        createdAt: r.createdAt || new Date().toISOString(),
      }));
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        return [...mapped.filter((m) => !existingIds.has(m.id)), ...prev];
      });
    } catch (_) {}
  };

  useEffect(() => {
    if (!myId) return;

    // ── Check Profile Completion ────────────────────────────────────────────
    const checkProfile = async () => {
      try {
        const res = await getMe();
        const u = res.data;
        // If bio or travel style is missing, consider it a new/incomplete profile
        if (!u.bio || !u.travelStyle) {
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
      showToast('You have a new buddy request!', 'info');
    });

    socket.on('buddy:message:new', ({ conversationKey, message }) => {
      // 1. If we are in messages tab and this is the active chat, add to messages
      setChatMessages((prev) => {
        if (prev.some(m => m._id === message._id)) return prev;
        // Only append if the message belongs to the active conversation
        const currentOtherId = activeChatBuddy?._id;
        if (currentOtherId) {
          const expectedKey = [String(myId), String(currentOtherId)].sort().join('_');
          if (conversationKey === expectedKey) {
            return [...prev, message];
          }
        }
        return prev;
      });

      // 2. Add to notifications if not active chat
      const isCurrentChat = activeChatBuddy && conversationKey === [String(myId), String(activeChatBuddy._id)].sort().join('_');
      if (!isCurrentChat) {
        setNotifications((prev) => [
          {
            id: `msg-${message._id || Date.now()}`,
            type: 'message',
            text: `New message from ${message.sender?.fullName || 'Buddy'}`,
            read: false,
            createdAt: message.createdAt || new Date().toISOString(),
          },
          ...prev,
        ]);
        showToast(`New message from ${message.sender?.fullName || 'Buddy'}`, 'info');
      }
    });
    socket.on('follow:new', (p) => {
      setNotifications((prev) => [
        {
          id: `follow-${Date.now()}`,
          type: 'follow',
          text: `${p?.followerName || 'Someone'} started following you`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
    socket.on('post:liked:owner', (p) => {
      setNotifications((prev) => [
        {
          id: `like-${Date.now()}`,
          type: 'like',
          text: `${p?.actorName || 'Someone'} liked your post`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
    socket.on('post:commented:owner', (p) => {
      setNotifications((prev) => [
        {
          id: `comment-${Date.now()}`,
          type: 'comment',
          text: `${p?.actorName || 'Someone'} commented on your post`,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    return () => socket.disconnect();
  }, [myId, activeChatBuddy]);

  useEffect(() => {
    if (activeTab !== 'messages') return;
    getBuddyConnections()
      .then((res) => setConnections(res.data.buddies || []))
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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const navItems = [
    { id: 'feed', path: '/community', label: 'Feed', icon: LayoutDashboard },
    { id: 'buddies', path: '/community/buddies', label: 'Find Buddies', icon: Users },
    { id: 'messages', path: '/community/messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24">
              <nav className="space-y-1">
                {navItems.map((i) => {
                  const Icon = i.icon;
                  const active = activeTab === i.id;
                  return (
                    <button
                      key={i.id}
                      onClick={() => navigate(i.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={18} />
                      {i.label}
                    </button>
                  );
                })}
                <div className="relative pt-2">
                  <button
                    onClick={() => setShowNotifications((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <span className="flex items-center gap-3">
                      <Bell size={18} />
                      Notifications
                    </span>
                    {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </button>
                  {showNotifications && (
                    <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <p className="font-semibold text-gray-900">Activity</p>
                        <button onClick={markAllRead} className="text-xs text-blue-600 font-semibold">Mark all read</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-sm text-gray-500 p-4">No notifications yet.</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${n.read ? 'bg-white' : 'bg-blue-50/30'}`}>
                              <div className="flex items-start gap-2">
                                {n.type === 'like' ? <Heart size={14} className="text-red-500 mt-0.5" /> : <MessageCircle size={14} className="text-blue-500 mt-0.5" />}
                                <p className="text-xs text-gray-700">{n.text}</p>
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

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            {activeTab === 'feed' && <Feed isCommunityView={true} />}
            {activeTab === 'buddies' && <FindBuddy isCommunityView={true} />}

            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[calc(100vh-120px)] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="text-blue-600" />
                    Messages
                  </h2>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  {/* Contacts List */}
                  <div className="w-80 border-r border-gray-100 overflow-y-auto bg-gray-50/30">
                    {connections.length === 0 ? (
                      <div className="p-8 text-center">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-500">No connections yet.</p>
                      </div>
                    ) : (
                      connections.map((buddy) => (
                        <button
                          key={buddy._id}
                          onClick={() => openChat(buddy)}
                          className={`w-full flex items-center gap-3 p-4 transition-colors ${
                            activeChatBuddy?._id === buddy._id 
                              ? 'bg-blue-50 border-r-2 border-blue-600' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {buddy.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-gray-900 truncate">{buddy.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{buddy.travelStyle || 'Traveler'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col bg-white">
                    {!activeChatBuddy ? (
                      <div className="flex-1 flex items-center justify-center text-center p-8">
                        <div>
                          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare size={40} className="text-blue-600" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Select a conversation</h3>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                              {activeChatBuddy.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{activeChatBuddy.fullName}</p>
                              <p className="text-xs text-emerald-500 font-medium">Active now</p>
                            </div>
                          </div>
                        </div>

                        <div 
                          ref={chatContainerRef}
                          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/20"
                        >
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
                            <input
                              value={chatText}
                              onChange={(e) => setChatText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                              placeholder="Type a message..."
                              className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-600"
                            />
                            <button
                              onClick={sendChat}
                              disabled={sendingChat || !chatText.trim()}
                              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
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
          </main>
        </div>
      </div>
    </div>
  );
};

export default Community;
