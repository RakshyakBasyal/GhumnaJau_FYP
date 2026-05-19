// frontend/src/pages/Feed.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PenSquare, Compass, Users, Loader, RefreshCw, SlidersHorizontal, X,
  UserCircle2, MapPin, Flame, Zap, Globe, Star, Camera, HelpCircle,
} from 'lucide-react';
import { io } from 'socket.io-client';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getExploreFeed, getFollowingFeed } from '../services/feedApi';
import {
  getMe, getDiscoverUsers, sendBuddyRequest,
  getBuddyRequests, getBuddyConnections, getDestinations,
} from '../services/api';
import { useToast } from '../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const CATEGORIES = [
  { value: '',         label: 'All'       },
  { value: 'photo',    label: 'Photos'    },
  { value: 'story',    label: 'Stories'   },
  { value: 'question', label: 'Questions' },
  { value: 'review',   label: 'Reviews'   },
  { value: 'tip',      label: 'Tips'      },
];

const QUICK_CREATE = [
  { label: 'Photo',  category: 'photo',    Icon: Camera    },
  { label: 'Story',  category: 'story',    Icon: MapPin    },
  { label: 'Ask',    category: 'question', Icon: HelpCircle },
  { label: 'Tip',    category: 'tip',      Icon: Zap       },
  { label: 'Review', category: 'review',   Icon: Star      },
];

const avatarUrl = (v) => {
  if (!v) return '';
  if (String(v).includes('googleusercontent.com')) return '';
  return String(v).startsWith('http') ? v : (BASE_URL + v);
};

const timeAgo = (date) => {
  if (!date) return '';
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function EmptyFollowing({ onExplore }) {
  return (
    <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Globe size={32} className="text-blue-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Your feed is empty</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
        Follow travelers to see their stories, photos, and tips here.
      </p>
      <button
        onClick={onExplore}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition shadow"
      >
        Explore Posts
      </button>
    </div>
  );
}

export default function Feed({ isCommunityView = false }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tab,            setTab]            = useState('explore');
  const [posts,          setPosts]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [page,           setPage]           = useState(1);
  const [totalPages,     setTotalPages]     = useState(1);
  const [category,       setCategory]       = useState('');
  const [showCreate,     setShowCreate]     = useState(false);
  const [editingPost,    setEditingPost]    = useState(null);
  const [presetCategory, setPresetCategory] = useState('');
  const [emptyFollowing, setEmptyFollowing] = useState(false);
  const [showFilter,     setShowFilter]     = useState(false);
  const [hasNew,         setHasNew]         = useState(false);

  const [stories,     setStories]     = useState([]);
  const [showStory,   setShowStory]   = useState(false);
  const [storyIdx,    setStoryIdx]    = useState(0);
  const [storyImgIdx, setStoryImgIdx] = useState(0);
  const [storyTimer,  setStoryTimer]  = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const STORY_DURATION = 5000;

  const [suggested,            setSuggested]            = useState([]);
  const [connectMap,           setConnectMap]           = useState({});
  const [trendingDestinations, setTrendingDestinations] = useState([]);

  const loaderRef     = useRef();
  const tabRef        = useRef(tab);
  const categoryRef   = useRef(category);
  const connectMapRef = useRef(connectMap);

  useEffect(() => { tabRef.current = tab; },            [tab]);
  useEffect(() => { categoryRef.current = category; },  [category]);
  useEffect(() => { connectMapRef.current = connectMap; }, [connectMap]);

  const myId = (function () {
    var token = localStorage.getItem('token');
    if (!token) return null;
    try {
      var d = JSON.parse(atob(token.split('.')[1]));
      return d && (d.id || d._id) || null;
    } catch (e) { return null; }
  }());

  const fetchPosts = useCallback(async function (reset, cat) {
    if (reset === undefined) reset = true;
    if (cat === undefined) cat = category;
    if (reset) setLoading(true); else setLoadingMore(true);
    var pg = reset ? 1 : page + 1;
    try {
      var fn  = tab === 'explore' ? getExploreFeed : getFollowingFeed;
      var res = await fn({ page: pg, limit: 10, category: cat || undefined });
      var data = res.data;
      var incoming = (data.posts || []).filter(function (p) {
        return cat ? true : p.category !== 'story';
      });
      if (reset && (data.empty || incoming.length === 0)) {
        setEmptyFollowing(true);
        setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      if (!reset && incoming.length === 0) { setLoadingMore(false); return; }
      setEmptyFollowing(false);
      setPosts(function (prev) { return reset ? incoming : prev.concat(incoming); });
      setPage(pg);
      setTotalPages(data.totalPages || 1);
    } catch (e) {}
    setLoading(false);
    setLoadingMore(false);
  }, [tab, page, category]);

  useEffect(function () { fetchPosts(true, category); }, [tab, category]);

  useEffect(function () {
    var el = loaderRef.current;
    if (!el) return;
    var obs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !loadingMore && page < totalPages) fetchPosts(false);
    }, { threshold: 0.1 });
    obs.observe(el);
    return function () { obs.disconnect(); };
  }, [loaderRef, loadingMore, page, totalPages, fetchPosts]);

  useEffect(function () {
    var socket = io(BASE_URL, { withCredentials: true });

    socket.on('postCreated', function (post) {
      if (post.category === 'story') {
        setStories(function (prev) {
          return prev.some(function (s) { return s._id === post._id; }) ? prev : [post].concat(prev);
        });
        return;
      }
      setPosts(function (prev) {
        if (prev.some(function (p) { return p._id === post._id; })) return prev;
        var currentCat = categoryRef.current;
        if (currentCat && post.category !== currentCat) return prev;
        if (tabRef.current === 'explore') {
          setHasNew(true);
          return [post].concat(prev);
        }
        if (tabRef.current === 'following') {
          var isMe = String(post.author && (post.author._id || post.author)) === String(myId);
          var isFollowing = !!connectMapRef.current[String(post.author && (post.author._id || post.author))];
          if (isMe || isFollowing) { setHasNew(true); return [post].concat(prev); }
        }
        return prev;
      });
    });

    socket.on('postUpdated', function (up) {
      setPosts(function (prev) { return prev.map(function (p) { return p._id === up._id ? Object.assign({}, p, up) : p; }); });
      setStories(function (prev) { return prev.map(function (s) { return s._id === up._id ? Object.assign({}, s, up) : s; }); });
    });

    socket.on('postDeleted', function (data) {
      var postId = data.postId;
      setPosts(function (prev) { return prev.filter(function (p) { return p._id !== postId; }); });
      setStories(function (prev) { return prev.filter(function (s) { return s._id !== postId; }); });
    });

    socket.on('postLiked', function (data) {
      var postId = data.postId; var likes = data.likes; var likeCount = data.likeCount;
      setPosts(function (prev) { return prev.map(function (p) { return p._id === postId ? Object.assign({}, p, { likes: likes, likeCount: likeCount }) : p; }); });
    });

    socket.on('commentAdded', function (data) {
      var postId = data.postId; var commentCount = data.commentCount;
      setPosts(function (prev) { return prev.map(function (p) { return p._id === postId ? Object.assign({}, p, { commentCount: commentCount }) : p; }); });
    });

    socket.on('commentDeleted', function (data) {
      var postId = data.postId; var commentCount = data.commentCount;
      setPosts(function (prev) { return prev.map(function (p) { return p._id === postId ? Object.assign({}, p, { commentCount: commentCount }) : p; }); });
    });

    return function () { socket.disconnect(); };
  }, [myId]);

  useEffect(function () {
    async function run() {
      try {
        var fn  = tab === 'explore' ? getExploreFeed : getFollowingFeed;
        var res = await fn({ page: 1, limit: 12, category: 'story' });
        setStories(res.data.posts || []);
      } catch (e) {}
    }
    run();
  }, [tab]);

  useEffect(function () {
    getMe().then(function (res) { setCurrentUser(res.data); }).catch(function () {});
    getDiscoverUsers({ limit: 15 }).then(function (res) {
      const users = (res.data.users || []).filter(function (u) { return String(u._id) !== String(myId); });
      // Sort by compatibilityScore descending
      const sorted = users.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
      setSuggested(sorted.slice(0, 5));
    }).catch(function () {});
    Promise.all([getBuddyRequests(), getBuddyConnections()]).then(function (results) {
      var reqRes = results[0]; var connRes = results[1];
      var map = {};
      (connRes.data.buddies || []).forEach(function (u) { if (u && u._id) map[u._id] = 'connected'; });
      (reqRes.data.incoming || []).forEach(function (r) { if (r && r.requester && r.requester._id) map[r.requester._id] = 'received'; });
      (reqRes.data.outgoing || []).forEach(function (r) { if (r && r.recipient && r.recipient._id) map[r.recipient._id] = 'sent'; });
      setConnectMap(map);
    }).catch(function () {});
    getDestinations().then(function (res) { setTrendingDestinations((res.data || []).slice(0, 3)); }).catch(function () {});
  }, [myId]);

  async function handleConnect(userId) {
    try {
      await sendBuddyRequest(userId);
      showToast('Buddy request sent!', 'success');
      setConnectMap(function (prev) { return Object.assign({}, prev, { [userId]: 'sent' }); });
    } catch (err) { showToast((err.response && err.response.data && err.response.data.msg) || 'Failed', 'error'); }
  }

  function handlePostCreated(newPost, isEdit) {
    if (isEdit) {
      setPosts(function (prev)   { return prev.map(function (p) { return p._id === newPost._id ? Object.assign({}, p, newPost) : p; }); });
      setStories(function (prev) { return prev.map(function (s) { return s._id === newPost._id ? Object.assign({}, s, newPost) : s; }); });
    } else {
      if (newPost.category === 'story') {
        setStories(function (prev) { return [newPost].concat(prev.filter(function (s) { return s._id !== newPost._id; })); });
      } else {
        var matchesCat = !category || newPost.category === category;
        if (matchesCat) {
          setPosts(function (prev) { return [newPost].concat(prev.filter(function (p) { return p._id !== newPost._id; })); });
        }
      }
    }
    setEditingPost(null);
    setShowCreate(false);
  }

  const groupedStories = useMemo(function () {
    var groups = {};
    stories.forEach(function (s) {
      var authorId = s.author && s.author._id;
      if (!authorId) return;
      if (!groups[authorId]) {
        groups[authorId] = Object.assign({}, s, { images: (s.images || []).slice(), allPosts: [s] });
      } else {
        groups[authorId].images = groups[authorId].images.concat(s.images || []);
        groups[authorId].allPosts.push(s);
        if (new Date(s.createdAt) > new Date(groups[authorId].createdAt)) {
          groups[authorId].createdAt = s.createdAt;
          groups[authorId].content   = s.content;
        }
      }
    });
    return Object.values(groups).sort(function (a, b) {
      if (String(a.author && a.author._id) === String(myId)) return -1;
      if (String(b.author && b.author._id) === String(myId)) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [stories, myId]);

  var storyCurrentGrouped = groupedStories[storyIdx];
  var storyImagesGrouped  = (storyCurrentGrouped && storyCurrentGrouped.images) || [];

  const nextStory = useCallback(function () {
    if (storyImgIdx < storyImagesGrouped.length - 1) {
      setStoryImgIdx(function (p) { return p + 1; });
    } else if (storyIdx < groupedStories.length - 1) {
      setStoryIdx(function (i) { return i + 1; });
      setStoryImgIdx(0);
    } else {
      setShowStory(false);
    }
    setStoryTimer(0);
  }, [storyImgIdx, storyIdx, storyImagesGrouped.length, groupedStories.length]);

  const prevStory = useCallback(function () {
    if (storyImgIdx > 0) {
      setStoryImgIdx(function (p) { return p - 1; });
    } else if (storyIdx > 0) {
      var prev = storyIdx - 1;
      setStoryIdx(prev);
      setStoryImgIdx(groupedStories[prev].images.length - 1);
    }
    setStoryTimer(0);
  }, [storyImgIdx, storyIdx, groupedStories]);

  useEffect(function () {
    if (!showStory) { setStoryTimer(0); return; }
    var interval = setInterval(function () {
      setStoryTimer(function (prev) {
        if (prev >= 100) { nextStory(); return 0; }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);
    return function () { clearInterval(interval); };
  }, [showStory, nextStory]);

  useEffect(function () {
    if (!showStory) return;
    function h(e) {
      if (e.key === 'ArrowRight') nextStory();
      else if (e.key === 'ArrowLeft') prevStory();
      else if (e.key === 'Escape') setShowStory(false);
    }
    window.addEventListener('keydown', h);
    return function () { window.removeEventListener('keydown', h); };
  }, [showStory, nextStory, prevStory]);

  var userName   = (currentUser && currentUser.fullName) || localStorage.getItem('username') || 'Traveler';
  var firstName  = userName.split(' ')[0];
  var userAvatar = (currentUser && currentUser.avatar) ? avatarUrl(currentUser.avatar) : null;

  return (
    <div className={isCommunityView ? '' : 'min-h-screen bg-slate-50'}>

      {!isCommunityView && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Community Feed</h2>
              <p className="text-xs text-gray-500 mt-0.5">Explore stories and moments from fellow travelers</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={function () { setEditingPost(null); setShowCreate(true); }}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-100 transition-all">
                <PenSquare size={16} /> Share Moment
              </button>
              <button onClick={function () { setHasNew(false); fetchPosts(true); }}
                className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-100">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCommunityView && (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Traveler<span className="text-blue-600">Gram</span>
              </h1>
              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-semibold transition">
                  {userAvatar
                    ? <img src={userAvatar} alt={firstName} className="w-5 h-5 rounded-full object-cover" />
                    : <UserCircle2 size={16} />}
                  {firstName}
                </Link>
                <div className="relative">
                  <button onClick={function () { setHasNew(false); fetchPosts(true); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition">
                    <RefreshCw size={17} />
                  </button>
                  {hasNew && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />}
                </div>
                <button onClick={function () { setEditingPost(null); setShowCreate(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow transition">
                  <PenSquare size={14} /> Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={(isCommunityView ? 'max-w-full' : 'max-w-6xl mx-auto') + ' px-4 py-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8'}>

        <div className="space-y-4 max-w-2xl w-full mx-auto lg:mx-0">

          {(groupedStories.length > 0 || myId) && (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm">
              <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                {(!groupedStories.length || String((groupedStories[0].author && groupedStories[0].author._id) || '') !== String(myId)) && (
                  <button type="button" onClick={function () { setEditingPost(null); setPresetCategory('story'); setShowCreate(true); }}
                    className="flex flex-col items-center min-w-[66px] gap-1.5">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-blue-400 bg-blue-50 flex items-center justify-center text-blue-600">
                      <PenSquare size={20} />
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold">Post Story</span>
                  </button>
                )}
                {groupedStories.map(function (s, idx) {
                  var isMine = String((s.author && s.author._id) || '') === String(myId);
                  var name   = isMine ? 'Your Story' : ((s.author && s.author.fullName) || 'Traveller');
                  var av     = (s.author && s.author.avatar) ? avatarUrl(s.author.avatar) : null;
                  return (
                    <button key={s._id} type="button" onClick={function () { setStoryIdx(idx); setStoryImgIdx(0); setShowStory(true); }}
                      className="flex flex-col items-center min-w-[66px] gap-1.5">
                      <div className={'w-14 h-14 rounded-full p-0.5 ' + (isMine ? 'bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500' : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500')}>
                        <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                          {av
                            ? <img src={av} alt={name} className="w-full h-full object-cover" loading="lazy" />
                            : <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">{name.charAt(0).toUpperCase()}</div>}
                        </div>
                      </div>
                      <span className={'text-[11px] max-w-[66px] truncate font-medium ' + (isMine ? 'text-blue-600' : 'text-gray-600')}>
                        {isMine ? 'Your story' : name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <button onClick={function () { setEditingPost(null); setPresetCategory(''); setShowCreate(true); }}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50/80 transition">
              {userAvatar
                ? <img src={userAvatar} alt={firstName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{firstName.charAt(0).toUpperCase()}</div>}
              <span className="text-sm text-gray-400 text-left flex-1">Share a travel moment, {firstName}...</span>
            </button>
            <div className="flex border-t border-gray-100">
              {QUICK_CREATE.map(function (item) {
                var Icon = item.Icon;
                return (
                  <button key={item.label}
                    onClick={function () { setEditingPost(null); setPresetCategory(item.category); setShowCreate(true); }}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition">
                    <Icon size={14} /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                <Flame size={15} className="text-orange-500" /> Feed
              </p>
              <button onClick={function () { setShowFilter(function (v) { return !v; }); }}
                className={'p-1.5 rounded-lg transition ' + (showFilter ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100')}>
                <SlidersHorizontal size={15} />
              </button>
            </div>
            <div className="flex gap-2">
              {[
                { key: 'explore',   label: 'Explore',  Icon: Compass },
                { key: 'following', label: 'Following', Icon: Users   },
              ].map(function (item) {
                var Icon = item.Icon;
                return (
                  <button key={item.key} onClick={function () { setTab(item.key); }}
                    className={'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ' + (tab === item.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100')}>
                    <Icon size={14} /> {item.label}
                  </button>
                );
              })}
            </div>
            {showFilter && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(function (cat) {
                    return (
                      <button key={cat.value} onClick={function () { setCategory(cat.value); }}
                        className={'text-xs px-3 py-1.5 rounded-full border font-semibold transition ' + (category === cat.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}>
                        {cat.label}
                      </button>
                    );
                  })}
                  {category && (
                    <button onClick={function () { setCategory(''); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2">
                      <X size={11} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader size={24} className="animate-spin text-blue-600" />
            </div>
          ) : emptyFollowing ? (
            <EmptyFollowing onExplore={function () { setTab('explore'); }} />
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">No posts yet</h3>
              <p className="text-sm text-gray-500">Be the first to share your travel experience!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {posts.map(function (post) {
                return (
                  <PostCard key={post._id} post={post}
                    onUpdated={function (p, a) { if (a === 'edit') setEditingPost(p); }}
                    onDeleted={function (id) { setPosts(function (prev) { return prev.filter(function (p) { return p._id !== id; }); }); }} />
                );
              })}
              <div ref={loaderRef} className="flex justify-center py-4">
                {loadingMore && <Loader size={20} className="animate-spin text-blue-400" />}
                {!loadingMore && page >= totalPages && posts.length > 0 && (
                  <p className="text-xs text-gray-300 font-medium">You've seen it all</p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 hidden lg:block pt-2">
          <div className="flex items-center justify-between mb-6 px-1">
            <Link to="/profile" className="flex items-center gap-3 group">
              {userAvatar
                ? <img src={userAvatar} alt={firstName} className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                : <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">{firstName.charAt(0).toUpperCase()}</div>}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition">{firstName}</span>
                <span className="text-[10px] text-gray-400">{userName}</span>
              </div>
            </Link>
            <Link to="/profile" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition">Switch</Link>
          </div>

          <div className="space-y-4 px-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Suggested for you</h3>
              <button onClick={function () { navigate('/community/buddies'); }} className="text-[10px] font-bold text-gray-900 hover:text-gray-500 transition">See All</button>
            </div>
            {suggested.length > 0 ? (
              <div className="space-y-4">
                {suggested.map(function (person) {
                  var status = connectMap[person._id] || 'none';
                  return (
                    <div key={person._id} className="flex items-center justify-between group px-1">
                      <Link to={'/profile/' + person._id} className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          {person.avatar
                            ? <img src={avatarUrl(person.avatar)} alt={person.fullName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
                            : <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">{person.fullName && person.fullName.charAt(0)}</div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition">{person.fullName.split(' ')[0]}</span>
                          <span className="text-[10px] text-gray-400 truncate">{person.city || 'Traveler'}</span>
                        </div>
                      </Link>
                      <button onClick={function () { if (status === 'none') handleConnect(person._id); }} disabled={status !== 'none'}
                        className={'text-xs font-bold transition px-3 py-1 rounded-lg ' + (status === 'none' ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400')}>
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

          <div className="space-y-4 px-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Trending Now</h3>
              <Link to="/destinations" className="text-[10px] font-bold text-gray-900 hover:text-gray-500 transition">Explore</Link>
            </div>
            {trendingDestinations.length > 0 ? (
              <div className="space-y-4">
                {trendingDestinations.map(function (dest) {
                  return (
                    <Link key={dest._id} to={'/destinations/' + dest._id} className="flex items-center justify-between group px-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                          {dest.images && dest.images[0]
                            ? <img src={BASE_URL + dest.images[0]} alt={dest.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={10} /></div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-gray-900 truncate group-hover:text-blue-600 transition">{dest.name}</span>
                          <span className="text-[10px] text-gray-400 truncate">{dest.country || 'Nepal'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-full flex-shrink-0">
                        <span className="text-[8px] font-black text-blue-600 uppercase">Hot</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic px-1">No trending spots yet</p>
            )}
          </div>
        </aside>
      </div>

      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={function () { setShowCreate(false); setEditingPost(null); setPresetCategory(''); }}
          onCreated={handlePostCreated}
          editingPost={editingPost}
          initialCategory={presetCategory}
        />
      )}

      {showStory && storyCurrentGrouped && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center overflow-hidden" onClick={function () { setShowStory(false); }}>
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />
          <div className="relative w-full max-w-md mx-auto h-full flex flex-col items-center justify-center" onClick={function (e) { e.stopPropagation(); }}>
            <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-20">
              {storyImagesGrouped.map(function (_, i) {
                return (
                  <div key={i} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                    <div className="h-full bg-white transition-all duration-100 ease-linear"
                      style={{ width: i < storyImgIdx ? '100%' : i === storyImgIdx ? (storyTimer + '%') : '0%' }} />
                  </div>
                );
              })}
            </div>
            <div className="absolute top-8 left-4 z-20 flex items-center gap-3 text-white">
              {storyCurrentGrouped.author && storyCurrentGrouped.author.avatar
                ? <img src={avatarUrl(storyCurrentGrouped.author.avatar)} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500" />
                : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold ring-2 ring-blue-500">
                    {storyCurrentGrouped.author && storyCurrentGrouped.author.fullName && storyCurrentGrouped.author.fullName.charAt(0)}
                  </div>}
              <div>
                <p className="text-sm font-black">{storyCurrentGrouped.author && storyCurrentGrouped.author.fullName}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Story {storyIdx + 1} of {groupedStories.length}</p>
              </div>
            </div>
            <button onClick={function () { setShowStory(false); }} className="absolute top-7 right-4 z-20 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white border border-white/10">
              <X size={20} />
            </button>
            {storyImagesGrouped.length > 0 ? (
              <div className="relative w-full h-full flex items-center justify-center px-2">
                <button onClick={prevStory} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-4 text-white text-4xl font-bold">&#8249;</button>
                <button onClick={nextStory} className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-4 text-white text-4xl font-bold">&#8250;</button>
                <img src={BASE_URL + storyImagesGrouped[storyImgIdx]} alt="story" className="w-full max-h-[85vh] object-contain rounded-xl mt-4" />
                {storyCurrentGrouped.content && (
                  <div className="absolute bottom-10 left-4 right-4 z-20">
                    <div className="bg-black/40 backdrop-blur-md text-white text-sm px-5 py-3 rounded-2xl border border-white/10">
                      {storyCurrentGrouped.content}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-white text-center py-20 px-8 mt-16 z-20">
                <p className="text-xl font-medium leading-relaxed">{storyCurrentGrouped.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}