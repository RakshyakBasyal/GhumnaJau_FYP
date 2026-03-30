// frontend/src/pages/Feed.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { PenSquare, Compass, Users, Loader, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { io } from 'socket.io-client';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getExploreFeed, getFollowingFeed } from '../services/feedApi';

const CATEGORIES = [
  { value: '',       label: 'All' },
  { value: 'story',  label: '✈️ Stories' },
  { value: 'photo',  label: '📷 Photos' },
  { value: 'review', label: '⭐ Reviews' },
  { value: 'tip',    label: '💡 Tips' },
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
      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-full transition shadow"
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
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              <span className="text-amber-500">Travel</span> Feed
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilter(p => !p)}
                className={`p-2 rounded-full transition ${showFilter ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <SlidersHorizontal size={18} />
              </button>
              <button
                onClick={() => fetchPosts(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
              >
                <RefreshCw size={17} />
              </button>
              <button
                onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-semibold rounded-full shadow transition"
              >
                <PenSquare size={15} />
                Post
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-1">
            {[
              { key: 'explore',   label: 'Explore',   icon: Compass },
              { key: 'following', label: 'Following',  icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition ${
                  tab === key
                    ? 'text-amber-600 bg-amber-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {showFilter && (
            <div className="py-2 pb-3 flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setShowFilter(false); }}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                    category === cat.value
                      ? 'bg-amber-500 text-white border-amber-500'
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
          )}
        </div>
      </div>

      {/* Feed content */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader size={24} className="animate-spin text-amber-500" />
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

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} className="flex justify-center py-4">
              {loadingMore && <Loader size={20} className="animate-spin text-amber-400" />}
              {!loadingMore && page >= totalPages && posts.length > 0 && (
                <p className="text-xs text-gray-300">You've seen it all ✨</p>
              )}
            </div>
          </>
        )}
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