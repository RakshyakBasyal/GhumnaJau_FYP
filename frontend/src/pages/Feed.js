// frontend/src/pages/Feed.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { PenSquare, Compass, Users, Loader, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
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

  const loaderRef = useRef();

  const fetchPosts = useCallback(async (resetPage = true, cat = category) => {
    if (resetPage) setLoading(true);
    else setLoadingMore(true);

    const pg = resetPage ? 1 : page + 1;

    try {
      const fn = tab === 'explore' ? getExploreFeed : getFollowingFeed;
      const res = await fn({ page: pg, limit: 10, ...(cat ? { category: cat } : {}) });
      const data = res.data;

      if (data.empty) {
        setEmptyFollowing(true);
        setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setEmptyFollowing(false);
      setPosts(prev => resetPage ? data.posts : [...prev, ...data.posts]);
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
      setPosts(prev => prev.map(p => (p._id === updatedPost._id ? updatedPost : p)));
    });

    socket.on('postDeleted', ({ postId }) => {
      setPosts(prev => prev.filter(p => p._id !== postId));
    });

    socket.on('postLiked', ({ postId, likes, likeCount }) => {
      setPosts(prev =>
        prev.map(p => (p._id === postId ? { ...p, likes, likeCount } : p))
      );
    });

    socket.on('commentAdded', ({ postId, commentCount }) => {
      setPosts(prev => prev.map(p => (p._id === postId ? { ...p, commentCount } : p)));
    });

    socket.on('commentDeleted', ({ postId, commentCount }) => {
      setPosts(prev => prev.map(p => (p._id === postId ? { ...p, commentCount } : p)));
    });

    return () => {
      socket.disconnect();
    };
  }, [tab, category, fetchPosts]);

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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              <span className="text-blue-600">Travel</span> Feed
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchPosts(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <RefreshCw size={17} />
              </button>
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
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_320px] gap-6">
        <div className="space-y-4">
          <button
            onClick={() => { setEditingPost(null); setShowCreate(true); }}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-left hover:border-blue-300 hover:shadow-sm transition"
          >
            <p className="text-sm text-gray-500">Share your travel moments, tips, and reviews...</p>
          </button>

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
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Feed Controls</p>
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
    </div>
  );
}