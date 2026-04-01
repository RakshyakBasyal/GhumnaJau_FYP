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
import { getMe, getDiscoverUsers, sendBuddyRequest, getBuddyRequests, getBuddyConnections } from '../services/api';
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
      if (tab === 'explore') setPosts(prev => prev.some(p => p._id === post._id) ? prev : [post, ...prev]);
    });
    socket.on('postUpdated',  up  => { setHasNew(true); setPosts(prev => prev.map(p => p._id === up._id ? up : p)); });
    socket.on('postDeleted',  ({ postId }) => { setHasNew(true); setPosts(prev => prev.filter(p => p._id !== postId)); });
    socket.on('postLiked',    ({ postId, likes, likeCount }) => {
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes, likeCount } : p));
    });
    socket.on('commentAdded',   ({ postId, commentCount }) => setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentCount } : p)));
    socket.on('commentDeleted', ({ postId, commentCount }) => setPosts(prev => prev.map(p => p._id === postId ? { ...p, commentCount } : p)));
    return () => socket.disconnect();
  }, [tab, category]);

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

  // ── User data + suggestions ────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      try {
        const [meRes, suggestRes, reqRes, connRes] = await Promise.all([
          getMe(), getDiscoverUsers({ limit: 5 }), getBuddyRequests(), getBuddyConnections(),
        ]);
        setCurrentUser(meRes.data);
        const users = suggestRes.data.users || [];
        setSuggested(users.filter(u => String(u._id) !== String(myId)).slice(0, 5));
        const map = {};
        (connRes.data.buddies || []).forEach(u => u?._id && (map[u._id] = 'connected'));
        (reqRes.data.incoming || []).forEach(r => r?.requester?._id && (map[r.requester._id] = 'received'));
        (reqRes.data.outgoing || []).forEach(r => r?.recipient?._id && (map[r.recipient._id] = 'sent'));
        setConnectMap(map);
      } catch (_) {}
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
    const mine = stories.filter((s) => String(s.author?._id || '') === String(myId));
    const others = stories.filter((s) => String(s.author?._id || '') !== String(myId));
    if (mine.length > 0) {
      const mergedMine = {
        ...mine[0],
        _id: `mine-${myId}`,
        images: mine.flatMap((s) => s.images || []),
        content: mine[mine.length - 1]?.content || mine[0]?.content || '',
      };
      return [mergedMine, ...others];
    }
    return others;
  }, [stories, myId]);

  const storyCurrentGrouped = groupedStories[storyIdx];
  const storyImagesGrouped = storyCurrentGrouped?.images || [];

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
                {/* Add your story button */}
                {groupedStories.length > 0 && String(groupedStories[0]?.author?._id || '') === String(myId) ? (
                  <button type="button"
                    onClick={() => { setStoryIdx(0); setStoryImgIdx(0); setShowStory(true); }}
                    className="flex flex-col items-center min-w-[66px] gap-1.5">
                    <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                        {userAvatar ? (
                          <img src={userAvatar} alt="Your story" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {firstName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold">Your Story</span>
                  </button>
                ) : (
                  <button type="button" onClick={() => { setEditingPost(null); setPresetCategory('story'); setShowCreate(true); }}
                    className="flex flex-col items-center min-w-[66px] gap-1.5">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center text-blue-600">
                      <PenSquare size={20} />
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold">Your story</span>
                  </button>
                )}
                {groupedStories.map((s, idx) => {
                  if (String(s.author?._id || '') === String(myId) && idx === 0) return null;
                  const name = s.author?.fullName || 'Traveller';
                  const av   = s.author?.avatar ? avatarUrl(s.author.avatar) : null;
                  return (
                    <button key={s._id} type="button"
                      onClick={() => { setStoryIdx(idx); setStoryImgIdx(0); setShowStory(true); }}
                      className="flex flex-col items-center min-w-[66px] gap-1.5">
                      <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500">
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
                      <span className="text-[11px] text-gray-600 max-w-[66px] truncate font-medium">{name.split(' ')[0]}</span>
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

        {/* ── Right Sidebar - ONLY show if standalone ─────────────────── */}
        {!isCommunityView && (
          <aside className="space-y-5 hidden lg:block">

            {/* Profile mini card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <Link to="/profile" className="flex-shrink-0">
                {userAvatar ? (
                  <img src={userAvatar} alt={firstName}
                    className="w-14 h-14 rounded-xl object-cover ring-2 ring-blue-100 hover:ring-blue-400 transition" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-xl flex items-center justify-center">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate flex items-center gap-1">
                  {userName} <CheckCircle2 size={14} className="text-blue-500 fill-blue-50 flex-shrink-0" />
                </p>
                {currentUser?.bio && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{currentUser.bio.substring(0, 40)}...</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/profile"
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold text-center hover:bg-blue-700 transition">
                View Profile
              </Link>
              <Link to="/community/buddies"
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold text-center hover:bg-gray-200 transition">
                Find Buddies
              </Link>
            </div>
          </div>

          {/* Suggested travel buddies */}
          {suggested.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                  <Zap size={14} className="text-yellow-500 fill-yellow-500" /> Suggested Buddies
                </h3>
                <button onClick={() => navigate('/community/buddies')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">See all</button>
              </div>
              <div className="space-y-3">
                {suggested.map(person => {
                  const status = connectMap[person._id] || 'none';
                  return (
                    <div key={person._id} className="flex items-center gap-3 group">
                      <button onClick={() => navigate(`/profile/${person._id}`)} className="flex-shrink-0">
                        {person.avatar ? (
                          <img src={avatarUrl(person.avatar)} alt={person.fullName}
                            className="w-10 h-10 rounded-xl object-cover group-hover:ring-2 group-hover:ring-blue-300 transition" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm">
                            {person.fullName?.charAt(0)}
                          </div>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => navigate(`/profile/${person._id}`)}
                          className="text-xs font-bold text-gray-900 truncate block hover:text-blue-600 transition">
                          {person.fullName}
                        </button>
                        <p className="text-[10px] text-gray-400 truncate">{person.travelStyle || 'Traveler'} · {person.compatibilityScore || 85}% match</p>
                      </div>
                      <button onClick={() => status === 'none' && handleConnect(person._id)}
                        disabled={status !== 'none'}
                        className={`text-[11px] font-bold transition ${
                          status === 'none' ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400'
                        }`}>
                        {status === 'none' ? 'Follow' : status === 'sent' ? 'Sent' : status === 'connected' ? '✓' : 'Review'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Removed non-feed decorative widgets for cleaner, focused feed UI */}
        </aside>
        )}
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
        <div className="fixed inset-0 z-50 bg-black/96 flex items-center justify-center"
          onClick={() => setShowStory(false)}>
          <div className="relative w-full max-w-md mx-auto" onClick={e => e.stopPropagation()}>
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
              {storyImagesGrouped.map((_, i) => (
                <div key={i} className={`h-0.5 flex-1 rounded-full ${i < storyImgIdx ? 'bg-white' : i === storyImgIdx ? 'bg-white/80' : 'bg-white/30'}`} />
              ))}
            </div>

            {/* Author */}
            <div className="absolute top-8 left-4 z-20 flex items-center gap-2 text-white">
              {storyCurrentGrouped.author?.avatar ? (
                <img src={avatarUrl(storyCurrentGrouped.author.avatar)} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
              ) : null}
              <div>
                <p className="text-sm font-bold">{storyCurrentGrouped.author?.fullName}</p>
                <p className="text-[10px] text-white/70">Story {storyIdx + 1} of {groupedStories.length}</p>
              </div>
            </div>

            <button onClick={() => setShowStory(false)}
              className="absolute top-4 right-4 z-20 bg-white/20 backdrop-blur-sm p-2.5 rounded-full text-white hover:bg-white/30 transition">
              <X size={18} />
            </button>

            {storyImagesGrouped.length > 0 ? (
              <>
                <button onClick={() => setStoryImgIdx(p => p > 0 ? p - 1 : Math.max(0, storyIdx - 1) !== storyIdx ? (setStoryIdx(i => i - 1), storyImagesGrouped.length - 1) : 0)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 p-3 rounded-full text-white hover:bg-white/30 transition text-xl font-bold">‹</button>
                <button onClick={() => {
                  if (storyImgIdx < storyImagesGrouped.length - 1) setStoryImgIdx(p => p + 1);
                  else if (storyIdx < groupedStories.length - 1) { setStoryIdx(i => i + 1); setStoryImgIdx(0); }
                  else setShowStory(false);
                }} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/20 p-3 rounded-full text-white hover:bg-white/30 transition text-xl font-bold">›</button>
                <img src={`${BASE_URL}${storyImagesGrouped[storyImgIdx]}`} alt="story"
                  className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl mt-16" />
                {storyCurrentGrouped.content && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/55 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg">
                    {storyCurrentGrouped.content}
                  </div>
                )}
              </>
            ) : (
              <div className="text-white text-center py-20 mt-16">
                <p className="text-lg font-semibold">{storyCurrent.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}