// frontend/src/pages/Feed.jsx  — IMPROVED (lively, Instagram-like)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PenSquare, Compass, Users, Loader, RefreshCw, SlidersHorizontal, X,
  UserCircle2, MapPin, CheckCircle2, Sparkles,
  Bell, Heart, UserCheck, Flame, Zap, Globe, Star
} from 'lucide-react';
import { io } from 'socket.io-client';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getExploreFeed, getFollowingFeed } from '../services/feedApi';
import { getMe, getDiscoverUsers, sendBuddyRequest, getBuddyRequests, getBuddyConnections, getDestinations } from '../services/api';
import { useToast } from '../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const CATEGORIES = [
  { value: '',       label: 'All' },
  { value: 'story',  label: 'Stories' },
  { value: 'photo',  label: 'Photos' },
  { value: 'review', label: 'Reviews' },
  { value: 'tip',    label: 'Tips' },
];

const avatarUrl = (v) => {
  if (!v) return '';
  return String(v).startsWith('http') ? v : `${BASE_URL}${v}`;
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const EmptyFollowing = ({ onExplore }) => (
  <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100">
    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
      <Globe size={32} className="text-blue-500" />
    </div>
    <h3 className="text-lg font-bold text-gray-800 mb-2">Your feed is empty</h3>
    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
      Follow travelers to see their stories, photos, and tips here.
    </p>
    <button onClick={onExplore}
      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition shadow">
      Explore Posts
    </button>
  </div>
);

export default function Feed({ isCommunityView = false }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tab,             setTab]             = useState('explore');
  const [posts,           setPosts]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [loadingMore,     setLoadingMore]      = useState(false);
  const [page,            setPage]            = useState(1);
  const [totalPages,      setTotalPages]      = useState(1);
  const [category,        setCategory]        = useState('');
  const [showCreate,      setShowCreate]      = useState(false);
  const [editingPost,     setEditingPost]     = useState(null);
  const [presetCategory,  setPresetCategory]  = useState('');
  const [emptyFollowing,  setEmptyFollowing]  = useState(false);
  const [showFilter,      setShowFilter]      = useState(false);
  const [hasNew,          setHasNew]          = useState(false);

  const [stories,         setStories]         = useState([]);
  const [showStory,       setShowStory]       = useState(false);
  const [storyIdx,        setStoryIdx]        = useState(0);
  const [storyImgIdx,     setStoryImgIdx]     = useState(0);
  const [currentUser,     setCurrentUser]     = useState(null);

  const [suggested,       setSuggested]       = useState([]);
  const [connectMap,      setConnectMap]      = useState({});
  const [trendingDestinations, setTrendingDestinations] = useState([]);

  const loaderRef = useRef();

  const myId = (() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { const d = JSON.parse(atob(token.split('.')[1])); return d?.id || d?._id || null; }
    catch (_) { return null; }
  })();

  // ── Fetch posts ────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (reset = true, cat = category) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const pg = reset ? 1 : page + 1;
    try {
      const fn = tab === 'explore' ? getExploreFeed : getFollowingFeed;
      const res = await fn({ page: pg, limit: 10, ...(cat ? { category: cat } : {}) });
      const data = res.data;
      // Filter out 'story' from main feed when no category selected (they go in stories strip)
      const incoming = (data.posts || []).filter(p => cat ? true : p.category !== 'story');

      if (reset && (data.empty || incoming.length === 0)) {
        setEmptyFollowing(true); setPosts([]); setLoading(false); setLoadingMore(false); return;
      }
      if (!reset && incoming.length === 0) { setLoadingMore(false); return; }

      setEmptyFollowing(false);
      setPosts(prev => reset ? incoming : [...prev, ...incoming]);
      setPage(pg); setTotalPages(data.totalPages);
    } catch (_) {}
    setLoading(false); setLoadingMore(false);
  }, [tab, page, category]);

  useEffect(() => { fetchPosts(true, category); }, [tab, category]);

  // ── Infinite scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && page < totalPages) fetchPosts(false);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loaderRef, loadingMore, page, totalPages, fetchPosts]);

  // ── Socket live updates ────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });
    
    socket.on('postCreated', post => {
      setHasNew(true);
      if (post.category === 'story') {
        setStories(prev => {
          if (prev.some(s => s._id === post._id)) return prev;
          return [post, ...prev];
        });
      } else {
        if (tab === 'explore' || (tab === 'following' && post.author?._id !== myId)) {
          setPosts(prev => {
            if (prev.some(p => p._id === post._id)) return prev;
            return [post, ...prev];
          });
        }
      }
    });

    socket.on('postUpdated', up => {
      setPosts(prev => prev.map(p => p._id === up._id ? { ...p, ...up } : p));
      setStories(prev => prev.map(s => s._id === up._id ? { ...s, ...up } : s));
    });

    socket.on('postDeleted', ({ postId }) => {
      setPosts(prev => prev.filter(p => p._id !== postId));
      setStories(prev => prev.filter(s => s._id !== postId));
    });

    socket.on('postLiked', ({ postId, likes, likeCount }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes, likeCount } : p));
    });

    socket.on('commentAdded', ({ postId, commentCount }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentCount } : p));
    });

    socket.on('commentDeleted', ({ postId, commentCount }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentCount } : p));
    });

    return () => socket.disconnect();
  }, [tab, category, myId]);

  // ── Stories strip ──────────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const fn = tab === 'explore' ? getExploreFeed : getFollowingFeed;
        const res = await fn({ page: 1, limit: 12, category: 'story' });
        setStories(res.data.posts || []);
      } catch (_) {}
    };
    run();
  }, [tab]);

  // ── User data + suggestions + destinations ──────────────────────────────────
  useEffect(() => {
    const run = async () => {
      // 1. Current User
      getMe().then(res => setCurrentUser(res.data)).catch(() => {});

      // 2. Discover Users (Suggestions)
      getDiscoverUsers({ limit: 5 }).then(res => {
        const users = res.data.users || [];
        setSuggested(users.filter(u => String(u._id) !== String(myId)).slice(0, 5));
      }).catch(() => {});

      // 3. Buddy Status (for follow/connect status)
      Promise.all([getBuddyRequests(), getBuddyConnections()]).then(([reqRes, connRes]) => {
        const map = {};
        (connRes.data.buddies || []).forEach(u => u?._id && (map[u._id] = 'connected'));
        (reqRes.data.incoming || []).forEach(r => r?.requester?._id && (map[r.requester._id] = 'received'));
        (reqRes.data.outgoing || []).forEach(r => r?.recipient?._id && (map[r.recipient._id] = 'sent'));
        setConnectMap(map);
      }).catch(() => {});

      // 4. Trending Destinations
      getDestinations().then(res => {
        setTrendingDestinations((res.data || []).slice(0, 3));
      }).catch(() => {});
    };
    run();
  }, [myId]);

  const handleConnect = async (userId) => {
    try {
      await sendBuddyRequest(userId);
      showToast('Buddy request sent!', 'success');
      setConnectMap(prev => ({ ...prev, [userId]: 'sent' }));
    } catch (err) { showToast(err?.response?.data?.msg || 'Failed to send request', 'error'); }
  };

  const handlePostCreated = (newPost, isEdit) => {
    if (isEdit) setPosts(prev => prev.map(p => p._id === newPost._id ? newPost : p));
    else setPosts(prev => [newPost, ...prev]);
    setEditingPost(null);
  };

  const storyCurrent = stories[storyIdx];
  const storyImages  = storyCurrent?.images || [];
  const userName     = currentUser?.fullName || localStorage.getItem('username') || 'Traveler';
  const firstName    = userName.split(' ')[0];
  const userAvatar   = currentUser?.avatar ? avatarUrl(currentUser.avatar) : null;
  
  const groupedStories = useMemo(() => {
    const groups = {};
    
    stories.forEach(s => {
      const authorId = s.author?._id;
      if (!authorId) return;
      
      if (!groups[authorId]) {
        groups[authorId] = {
          ...s,
          images: [...(s.images || [])],
          // Keep a list of all posts in this group to handle content/timestamp per image if needed
          allPosts: [s] 
        };
      } else {
        // Append images to existing group
        groups[authorId].images = [...groups[authorId].images, ...(s.images || [])];
        groups[authorId].allPosts.push(s);
        // Update to latest content/timestamp if newer
        if (new Date(s.createdAt) > new Date(groups[authorId].createdAt)) {
          groups[authorId].createdAt = s.createdAt;
          groups[authorId].content = s.content;
        }
      }
    });

    const result = Object.values(groups).sort((a, b) => {
      // Put "My Story" first
      if (String(a.author?._id) === String(myId)) return -1;
      if (String(b.author?._id) === String(myId)) return 1;
      // Then sort by most recent
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [stories, myId]);

  const storyCurrentGrouped = groupedStories[storyIdx];
  const storyImagesGrouped = storyCurrentGrouped?.images || [];

  // ── Keyboard Navigation for Story ──────────────────────────────────────────
  useEffect(() => {
    if (!showStory) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        // Next image or next story
        if (storyImgIdx < storyImagesGrouped.length - 1) {
          setStoryImgIdx(p => p + 1);
        } else if (storyIdx < groupedStories.length - 1) {
          setStoryIdx(i => i + 1);
          setStoryImgIdx(0);
        } else {
          setShowStory(false);
        }
      } else if (e.key === 'ArrowLeft') {
        // Previous image or previous story
        if (storyImgIdx > 0) {
          setStoryImgIdx(p => p - 1);
        } else if (storyIdx > 0) {
          const prevIdx = storyIdx - 1;
          setStoryIdx(prevIdx);
          setStoryImgIdx(groupedStories[prevIdx].images.length - 1);
        }
      } else if (e.key === 'Escape') {
        setShowStory(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStory, storyImgIdx, storyIdx, storyImagesGrouped.length, groupedStories.length, groupedStories]);

  return (
    <div className={`${isCommunityView ? '' : 'min-h-screen bg-slate-50'}`}>

      {/* Unified Header - ONLY show if standalone */}
      {!isCommunityView && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Travel Feed</h2>
              <p className="text-sm text-gray-500 mt-1">Explore stories and moments from fellow travelers</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all"
              >
                <PenSquare size={18} />
                Share Moment
              </button>
              <button
                onClick={() => { setHasNew(false); fetchPosts(true); }}
                className="p-2.5 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-100"
                aria-label="Refresh feed"
              >
                <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Bar (standalone only) ───────────────────────────────────── */}
      {!isCommunityView && (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Traveler<span className="text-blue-600">Gram</span>
              </h1>
              <div className="flex items-center gap-2">
                <Link to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-semibold transition">
                  {userAvatar
                    ? <img src={userAvatar} alt={firstName} className="w-5 h-5 rounded-full object-cover" />
                    : <UserCircle2 size={16} />}
                  {firstName}
                </Link>
                <div className="relative">
                  <button onClick={() => { setHasNew(false); fetchPosts(true); }}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition" aria-label="Refresh">
                    <RefreshCw size={17} />
                  </button>
                  {hasNew && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />}
                </div>
                <button onClick={() => { setEditingPost(null); setShowCreate(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow transition">
                  <PenSquare size={14} /> Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className={`${isCommunityView ? 'max-w-full' : 'max-w-7xl mx-auto'} px-4 py-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8`}>

        {/* ── Left column (feed) ─────────────────────────────────────── */}
        <div className="space-y-5 max-w-2xl w-full mx-auto lg:mx-0">

          {/* Stories strip */}
          {(stories.length > 0 || myId) && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm">
              <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                  {/* Create Story Button (always visible at start if no own stories) */}
                  {(!groupedStories.length || String(groupedStories[0]?.author?._id || '') !== String(myId)) && (
                    <button type="button" onClick={() => { setEditingPost(null); setPresetCategory('story'); setShowCreate(true); }}
                      className="flex flex-col items-center min-w-[66px] gap-1.5">
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center text-blue-600">
                        <PenSquare size={20} />
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold">Post Story</span>
                    </button>
                  )}

                  {groupedStories.map((s, idx) => {
                  const isMine = String(s.author?._id || '') === String(myId);
                  const name = isMine ? 'Your Story' : (s.author?.fullName || 'Traveller');
                  const av   = s.author?.avatar ? avatarUrl(s.author.avatar) : null;
                  
                  return (
                    <button key={s._id} type="button"
                      onClick={() => { setStoryIdx(idx); setStoryImgIdx(0); setShowStory(true); }}
                      className="flex flex-col items-center min-w-[66px] gap-1.5">
                      <div className={`w-14 h-14 rounded-full p-0.5 ${isMine ? 'bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                          {av ? (
                            <img src={av} alt={name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[11px] max-w-[66px] truncate font-medium ${isMine ? 'text-blue-600' : 'text-gray-600'}`}>
                        {isMine ? 'Your story' : name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create post prompt */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
            <button onClick={() => { setEditingPost(null); setPresetCategory(''); setShowCreate(true); }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50/80 transition rounded-t-2xl">
              {userAvatar
                ? <img src={userAvatar} alt={firstName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{firstName.charAt(0).toUpperCase()}</div>}
              <span className="text-sm text-gray-400 text-left flex-1">Share a travel moment, tip, or review, {firstName}...</span>
            </button>
            <div className="flex border-t border-gray-100">
              {[
                { icon: <Compass size={14} />, label: 'Explore', category: 'photo' },
                { icon: <MapPin size={14} />,  label: 'Story',   category: 'story' },
                { icon: <Zap size={14} />,     label: 'Tip',     category: 'tip' },
                { icon: <Star size={14} />,    label: 'Review',  category: 'review' },
              ].map(item => (
                <button key={item.label} onClick={() => { setEditingPost(null); setPresetCategory(item.category); setShowCreate(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition rounded-b-2xl last:rounded-br-2xl first:rounded-bl-2xl">
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed controls */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Flame size={15} className="text-orange-500" /> Feed
              </p>
              <button onClick={() => setShowFilter(v => !v)}
                className={`p-1.5 rounded-lg transition ${showFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <SlidersHorizontal size={15} />
              </button>
            </div>

            <div className="flex gap-2">
              {[
                { key: 'explore',   label: 'Explore',   icon: Compass },
                { key: 'following', label: 'Following',  icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                    tab === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {showFilter && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} onClick={() => setCategory(cat.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
                        category === cat.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}>
                      {cat.label}
                    </button>
                  ))}
                  {category && (
                    <button onClick={() => setCategory('')}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2">
                      <X size={11} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Posts */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader size={24} className="animate-spin text-blue-600" />
            </div>
          ) : emptyFollowing ? (
            <EmptyFollowing onExplore={() => setTab('explore')} />
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">No posts yet</h3>
              <p className="text-sm text-gray-500">Be the first to share your travel experience!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map(post => (
                <PostCard key={post._id} post={post}
                  onUpdated={(p, a) => { if (a === 'edit') setEditingPost(p); }}
                  onDeleted={id => setPosts(prev => prev.filter(p => p._id !== id))} />
              ))}
              <div ref={loaderRef} className="flex justify-center py-4">
                {loadingMore && <Loader size={20} className="animate-spin text-blue-400" />}
                {!loadingMore && page >= totalPages && posts.length > 0 && (
                  <p className="text-xs text-gray-300 font-medium">You've seen it all</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ─────────────────── */}
        <aside className="space-y-7 hidden lg:block pt-2">

          {/* Minimal Profile Card */}
          <div className="flex items-center justify-between mb-8 px-1">
            <Link to="/profile" className="flex items-center gap-3 group">
              {userAvatar ? (
                <img src={userAvatar} alt={firstName}
                  className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 group-hover:text-gray-600 transition">{userName.split(' ')[0]}</span>
                <span className="text-xs text-gray-500">{userName}</span>
              </div>
            </Link>
            <Link to="/profile" className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">Switch</Link>
          </div>

          {/* Suggested for you */}
          <div className="space-y-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-500 text-sm">Suggested for you</h3>
              <button onClick={() => navigate('/community/buddies')}
                className="text-xs font-bold text-gray-900 hover:text-gray-500 transition">See All</button>
            </div>
            {suggested.length > 0 ? (
              <div className="space-y-4">
                {suggested.map(person => {
                  const status = connectMap[person._id] || 'none';
                  return (
                    <div key={person._id} className="flex items-center justify-between group">
                      <Link to={`/profile/${person._id}`} className="flex items-center gap-3">
                        {person.avatar ? (
                          <img src={avatarUrl(person.avatar)} alt={person.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-xs">
                            {person.fullName?.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-gray-600 transition">{person.fullName.split(' ')[0]}</span>
                          <span className="text-xs text-gray-500 truncate">Suggested for you</span>
                        </div>
                      </Link>
                      <button onClick={() => status === 'none' && handleConnect(person._id)}
                        disabled={status !== 'none'}
                        className={`text-xs font-bold transition ${
                          status === 'none' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-300'
                        }`}>
                        {status === 'none' ? 'Follow' : status === 'sent' ? 'Sent' : status === 'connected' ? 'Following' : 'Review'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic px-1">No suggestions available</p>
            )}
          </div>

          {/* Trending Now */}
          <div className="space-y-4 px-1 mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-500 text-sm">Trending Now</h3>
              <Link to="/destinations" className="text-xs font-bold text-gray-900 hover:text-gray-500 transition">Explore</Link>
            </div>
            {trendingDestinations.length > 0 ? (
              <div className="space-y-4">
                {trendingDestinations.map(dest => (
                  <Link key={dest._id} to={`/destinations/${dest._id}`} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                        {dest.images?.[0] ? (
                          <img src={avatarUrl(dest.images[0])} alt={dest.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <MapPin size={12} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate group-hover:text-gray-600 transition">{dest.name}</span>
                        <span className="text-xs text-gray-500 truncate">{dest.country || 'Global'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Hot</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic px-1">No trending spots yet</p>
            )}
          </div>
        </aside>
        </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={handlePostCreated}
          editingPost={editingPost}
          initialCategory={presetCategory} />
      )}

      {/* ── Story Viewer ──────────────────────────────────────────────────── */}
      {showStory && storyCurrentGrouped && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden"
          onClick={() => setShowStory(false)}>
          
          {/* Background Gradients for text readability */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

          <div className="relative w-full max-w-md mx-auto h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
              {storyImagesGrouped.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < storyImgIdx ? 'bg-white' : i === storyImgIdx ? 'bg-white/80' : 'bg-white/30'}`} />
              ))}
            </div>

            {/* Author & Info */}
            <div className="absolute top-8 left-4 z-20 flex items-center gap-3 text-white drop-shadow-md">
              <div className="relative">
                {storyCurrentGrouped.author?.avatar ? (
                  <img src={avatarUrl(storyCurrentGrouped.author.avatar)} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500 shadow-lg" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold ring-2 ring-blue-500 shadow-lg">
                    {storyCurrentGrouped.author?.fullName?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black tracking-wide">{storyCurrentGrouped.author?.fullName}</p>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <p className="text-[11px] font-medium text-white/80">{timeAgo(storyCurrentGrouped.createdAt)}</p>
                </div>
                <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Story {storyIdx + 1} of {groupedStories.length}</p>
              </div>
            </div>

            <button onClick={() => setShowStory(false)}
              className="absolute top-7 right-4 z-20 bg-white/10 hover:bg-white/20 backdrop-blur-md p-2 rounded-full text-white transition-all shadow-xl border border-white/10">
              <X size={20} />
            </button>

            {storyImagesGrouped.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center px-2">
                <button 
                  onClick={() => {
                    if (storyImgIdx > 0) setStoryImgIdx(p => p - 1);
                    else if (storyIdx > 0) {
                      const prevIdx = storyIdx - 1;
                      setStoryIdx(prevIdx);
                      setStoryImgIdx(groupedStories[prevIdx].images.length - 1);
                    }
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-4 text-white/40 hover:text-white transition-colors text-3xl font-light">‹</button>
                
                <button 
                  onClick={() => {
                    if (storyImgIdx < storyImagesGrouped.length - 1) setStoryImgIdx(p => p + 1);
                    else if (storyIdx < groupedStories.length - 1) { setStoryIdx(i => i + 1); setStoryImgIdx(0); }
                    else setShowStory(false);
                  }} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-4 text-white/40 hover:text-white transition-colors text-3xl font-light">›</button>
                
                <img 
                  src={`${BASE_URL}${storyImagesGrouped[storyImgIdx]}`} 
                  alt="story"
                  className="w-full max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] mt-4" 
                />
                
                {storyCurrentGrouped.content && (
                  <div className="absolute bottom-10 left-4 right-4 z-20">
                    <div className="bg-black/40 backdrop-blur-md text-white text-sm px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
                      {storyCurrentGrouped.content}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white text-center py-20 px-8 mt-16 z-20">
                <p className="text-xl font-medium leading-relaxed drop-shadow-lg">{storyCurrentGrouped.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}