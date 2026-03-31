// frontend/src/pages/Feed.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PenSquare, Compass, Users, Loader, RefreshCw, SlidersHorizontal, X, UserCircle2 } from 'lucide-react';
import { io } from 'socket.io-client';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getExploreFeed, getFollowingFeed } from '../services/feedApi';

const CATEGORIES = [
  { value: '',       label: 'All' },
  { value: 'story',  label: 'Stories' },
  { value: 'photo',  label: 'Photos' },
  { value: 'review', label: 'Reviews' },
  { value: 'tip',    label: 'Tips' },
];

const EmptyFollowing = ({ onExplore }) => (
  <div className="text-center py-16 px-4">
    <div className="text-5xl mb-4">🌍</div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">Your feed is empty</h3>
    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
      Follow fellow travellers to see their stories, photos, and tips here.
    </p>
    <button
      onClick={onExplore}
      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition shadow"
    >
      Explore Posts
    </button>
  </div>
);

const EmptyExplore = () => (
  <div className="text-center py-16">
    <div className="text-5xl mb-4">🗺️</div>
    <h3 className="text-lg font-semibold text-gray-800 mb-2">No posts yet</h3>
    <p className="text-sm text-gray-500">Be the first to share your travel experience!</p>
  </div>
);

const BASE_URL = 'http://localhost:5000';

export default function Feed() {
  const [tab,           setTab]          = useState('explore');   // 'explore' | 'following'
  const [posts,         setPosts]        = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [loadingMore,   setLoadingMore]  = useState(false);
  const [page,          setPage]         = useState(1);
  const [totalPages,    setTotalPages]   = useState(1);
  const [category,      setCategory]     = useState('');
  const [showCreate,    setShowCreate]   = useState(false);
  const [editingPost,   setEditingPost]  = useState(null);
  const [emptyFollowing, setEmptyFollowing] = useState(false);
  const [showFilter,    setShowFilter]   = useState(false);
  const [hasNewActivity,setHasNewActivity] = useState(false);

  // Stories strip + viewer (Instagram-like)
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [activeStoryImgIdx, setActiveStoryImgIdx] = useState(0);

  const loaderRef = useRef();

  const fetchPosts = useCallback(async (resetPage = true, cat = category) => {
    if (resetPage) setLoading(true);
    else setLoadingMore(true);

    const pg = resetPage ? 1 : page + 1;

    try {
      const fn = tab === 'explore' ? getExploreFeed : getFollowingFeed;
      const res = await fn({ page: pg, limit: 10, ...(cat ? { category: cat } : {}) });
      const data = res.data;
      const incomingPosts = (data.posts || []).filter(p => (cat ? true : p.category !== 'story'));

      if (resetPage && (data.empty || incomingPosts.length === 0)) {
        setEmptyFollowing(true);
        setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (!resetPage && incomingPosts.length === 0) {
        setLoadingMore(false);
        return;
      }

      setEmptyFollowing(false);
      setPosts(prev => resetPage ? incomingPosts : [...prev, ...incomingPosts]);
      setPage(pg);
      setTotalPages(data.totalPages);
    } catch (_) {}

    setLoading(false);
    setLoadingMore(false);
  }, [tab, page, category]);

  // Reset & fetch when tab or category changes
  useEffect(() => {
    fetchPosts(true, category);
    // eslint-disable-next-line
  }, [tab, category]);

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
          fetchPosts(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaderRef, loadingMore, page, totalPages, fetchPosts]);

  // Live feed updates
  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });

    const refreshIfFollowing = () => {
      if (tab === 'following') fetchPosts(true, category);
    };

    socket.on('postCreated', (post) => {
      setHasNewActivity(true);
      if (tab === 'explore') {
        setPosts(prev => {
          if (prev.some(p => p._id === post._id)) {
            return prev.map(p => (p._id === post._id ? post : p));
          }
          return [post, ...prev];
        });
      } else {
        refreshIfFollowing();
      }
    });

    socket.on('postUpdated', (updatedPost) => {
      setHasNewActivity(true);
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    });

    socket.on('postDeleted', ({ postId }) => {
      setHasNewActivity(true);
      setPosts(prev => prev.filter(p => p._id !== postId));
    });

    socket.on('postLiked', ({ postId, likes, likeCount }) => {
      setHasNewActivity(true);
      setPosts(prev =>
        prev.map(p => (p._id === postId ? { ...p, likes, likeCount } : p))
      );
    });

    socket.on('commentAdded', ({ postId, commentCount }) => {
      setHasNewActivity(true);
      setPosts(prev => prev.map(p => (p._id === postId ? { ...p, commentCount } : p)));
    });

    socket.on('commentDeleted', ({ postId, commentCount }) => {
      setHasNewActivity(true);
      setPosts(prev => prev.map(p => (p._id === postId ? { ...p, commentCount } : p)));
    });

    return () => {
      socket.disconnect();
    };
  }, [tab, category, fetchPosts]);

  // Load story posts for the top strip
  useEffect(() => {
    const run = async () => {
      setLoadingStories(true);
      try {
        const fn = tab === 'explore' ? getExploreFeed : getFollowingFeed;
        const res = await fn({ page: 1, limit: 12, category: 'story' });
        setStories(res.data.posts || []);
      } catch (_) {
        setStories([]);
      } finally {
        setLoadingStories(false);
      }
    };
    run();
  }, [tab]);

  const storyCurrent = stories[activeStoryIdx];
  const storyImages = storyCurrent?.images || [];

  const handlePostCreated = (newPost, isEdit) => {
    if (isEdit) {
      setPosts(prev => prev.map(p => p._id === newPost._id ? newPost : p));
    } else {
      setPosts(prev => [newPost, ...prev]);
    }
    setEditingPost(null);
  };

  const handlePostAction = (post, action) => {
    if (action === 'edit') setEditingPost(post);
  };

  const handlePostDeleted = (id) => {
    setPosts(prev => prev.filter(p => p._id !== id));
  };

  const userName = localStorage.getItem('username') || 'Traveler';
  const firstName = userName.trim().split(/\s+/)[0] || 'Traveler';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Traveler<span className="text-blue-600">Gram</span>
            </h1>
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition"
              >
                <UserCircle2 size={16} />
                {firstName}
              </Link>
              <div className="relative">
                <button
                  onClick={() => { setHasNewActivity(false); fetchPosts(true); }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
                  aria-label="Refresh feed"
                >
                  <RefreshCw size={17} />
                </button>
                {hasNewActivity && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                )}
              </div>
              <button
                onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow transition"
              >
                <PenSquare size={15} />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed content */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6">
        <div className="space-y-4">
          {/* Stories strip */}
          {loadingStories ? (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-6 flex items-center justify-center">
              <Loader size={20} className="animate-spin text-blue-600" />
            </div>
          ) : stories.length === 0 ? null : (
            <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4">
              <div className="flex gap-4 overflow-x-auto pb-1">
                {stories.map((s, idx) => {
                  const name = s.author?.fullName || 'Traveller';
                  const avatarUrl = s.author?.avatar ? `http://localhost:5000${s.author.avatar}` : null;
                  const initials = name?.charAt(0).toUpperCase();

                  return (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setActiveStoryIdx(idx);
                        setActiveStoryImgIdx(0);
                        setShowStoryViewer(true);
                      }}
                      className="flex flex-col items-center min-w-[66px] gap-1"
                      aria-label={`Open story by ${name}`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-14 h-14 bg-blue-600 flex items-center justify-center text-white font-bold">
                            {initials}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 max-w-[66px] truncate">
                        {name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => { setEditingPost(null); setShowCreate(true); }}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition"
          >
            <p className="text-sm text-gray-500">Share your travel moments, tips, and reviews...</p>
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Feed</p>
              <button
                onClick={() => setShowFilter(v => !v)}
                className={`p-2 rounded-full transition ${showFilter ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                title="Toggle filters"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {[
                { key: 'explore', label: 'Explore', icon: Compass },
                { key: 'following', label: 'Following', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                    tab === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {showFilter && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Category</p>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                        category === cat.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                  {category && (
                    <button
                      onClick={() => setCategory('')}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
                    >
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader size={24} className="animate-spin text-blue-600" />
            </div>
          ) : emptyFollowing ? (
            <EmptyFollowing onExplore={() => setTab('explore')} />
          ) : posts.length === 0 ? (
            <EmptyExplore />
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  onUpdated={handlePostAction}
                  onDeleted={handlePostDeleted}
                />
              ))}

              <div ref={loaderRef} className="flex justify-center py-4">
                {loadingMore && <Loader size={20} className="animate-spin text-blue-500" />}
                {!loadingMore && page >= totalPages && posts.length > 0 && (
                  <p className="text-xs text-gray-300">You've seen it all ✨</p>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <Link
              to="/profile"
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-gray-500">View my profile</p>
              </div>
            </Link>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Quick View</p>
              <button
                onClick={() => setTab('explore')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  tab === 'explore' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Explore Feed
              </button>
              <button
                onClick={() => setTab('following')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                  tab === 'following' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                Following Feed
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={handlePostCreated}
          editingPost={editingPost}
        />
      )}

      {/* Story viewer */}
      {showStoryViewer && storyCurrent && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setShowStoryViewer(false)}
        >
          <div className="relative w-full max-w-4xl px-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowStoryViewer(false)}
              className="absolute top-6 right-6 z-10 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition text-white"
              aria-label="Close story viewer"
            >
              <X className="h-7 w-7" />
            </button>

            {storyCurrent.author?.fullName && (
              <div className="absolute top-6 left-6 z-10 flex items-center gap-3 text-white">
                {storyCurrent.author?.avatar ? (
                  <img
                    src={`http://localhost:5000${storyCurrent.author.avatar}`}
                    alt={storyCurrent.author.fullName}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-white"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{storyCurrent.author.fullName}</p>
                  <p className="text-xs text-white/80">
                    Story {activeStoryIdx + 1} / {stories.length}
                  </p>
                </div>
              </div>
            )}

            {storyImages.length > 0 && (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 p-4 rounded-full z-10 text-white"
                  aria-label="Previous"
                  onClick={() => {
                    setActiveStoryImgIdx((prev) => {
                      if (prev > 0) return prev - 1;
                      const prevStory = (activeStoryIdx - 1 + stories.length) % stories.length;
                      setActiveStoryIdx(prevStory);
                      const imgs = stories[prevStory]?.images || [];
                      return Math.max(0, imgs.length - 1);
                    });
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 p-4 rounded-full z-10 text-white"
                  aria-label="Next"
                  onClick={() => {
                    setActiveStoryImgIdx((prev) => {
                      if (prev < storyImages.length - 1) return prev + 1;
                      const nextStory = (activeStoryIdx + 1) % stories.length;
                      setActiveStoryIdx(nextStory);
                      return 0;
                    });
                  }}
                >
                  ›
                </button>

                <div className="relative mt-20">
                  <img
                    src={`http://localhost:5000${storyImages[activeStoryImgIdx]}`}
                    alt="story"
                    className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                    loading="lazy"
                  />
                  <p className="text-white text-center mt-5 text-lg font-medium">
                    {activeStoryImgIdx + 1} / {storyImages.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}