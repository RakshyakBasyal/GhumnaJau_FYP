import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import {
  getUserPosts,
  getFollowStats,
  followUser,
  unfollowUser,
} from '../services/feedApi';

const BASE_URL = 'http://localhost:5000';

const Avatar = ({ name, avatar, size = 16 }) => {
  const sizePxNum = size * 4; // ~ Tailwind-like sizing (e.g. 16 -> 64px)
  if (avatar) {
    return (
      <img
        src={`${BASE_URL}${avatar}`}
        alt={name}
        className="rounded-full object-cover flex-shrink-0 ring-2 ring-white"
        style={{ width: sizePxNum, height: sizePxNum }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white"
      style={{ width: sizePxNum, height: sizePxNum }}
    >
      {name?.charAt(0).toUpperCase() || <span>U</span>}
    </div>
  );
};

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const token = localStorage.getItem('token');
  const myId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return decoded?.id || decoded?._id || null;
    } catch (_) {
      return null;
    }
  }, [token]);

  const isSelf = Boolean(myId && userId && String(myId) === String(userId));

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);

  const [header, setHeader] = useState({ fullName: 'Traveler', avatar: '' });

  const [stats, setStats] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });

  const [followingBusy, setFollowingBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const fetchPosts = async () => {
    if (!userId) return;
    const res = await getUserPosts(userId, { page: 1, limit: 12 });
    const data = res.data;
    setPosts(data.posts || []);
    setPostCount(data.total ?? (data.posts || []).length);

    const firstAuthor = data.posts?.[0]?.author;
    if (firstAuthor) {
      setHeader({
        fullName: firstAuthor.fullName || 'Traveler',
        avatar: firstAuthor.avatar || '',
      });
    }
  };

  const fetchStats = async () => {
    if (!userId) return;
    const res = await getFollowStats(userId);
    setStats({
      followersCount: res.data.followersCount ?? 0,
      followingCount: res.data.followingCount ?? 0,
      isFollowing: Boolean(res.data.isFollowing),
    });
  };

  useEffect(() => {
    const run = async () => {
      if (!token) {
        navigate('/login');
        return;
      }
      setLoading(true);
      try {
        await Promise.all([fetchPosts(), fetchStats()]);
      } catch (err) {
        showToast(err?.response?.data?.msg || 'Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handlePostAction = (post, action) => {
    if (action === 'edit') setEditingPost(post);
  };

  const handlePostCreated = (newPost, isEdit) => {
    if (isEdit) {
      setPosts(prev => prev.map(p => p._id === newPost._id ? newPost : p));
    } else {
      setPosts(prev => [newPost, ...prev]);
      setPostCount(prev => prev + 1);
    }
    setEditingPost(null);
  };

  const handlePostDeleted = (id) => {
    setPosts(prev => prev.filter(p => p._id !== id));
    setPostCount(prev => Math.max(0, prev - 1));
  };

  const handleToggleFollow = async () => {
    if (!userId || isSelf) return;
    if (followingBusy) return;
    setFollowingBusy(true);
    try {
      if (stats.isFollowing) {
        await unfollowUser(userId);
        setStats(prev => ({ ...prev, isFollowing: false }));
        showToast('Unfollowed', 'info');
      } else {
        await followUser(userId);
        setStats(prev => ({ ...prev, isFollowing: true }));
        showToast('Followed!', 'success');
      }
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Follow action failed', 'error');
    } finally {
      setFollowingBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <Avatar name={header.fullName} avatar={header.avatar} />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  {header.fullName}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{postCount} post{postCount === 1 ? '' : 's'}</p>
              </div>
            </div>

            {isSelf ? (
              <button
                onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow transition flex items-center gap-2 justify-center"
              >
                Post
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={followingBusy}
                className={`px-5 py-2.5 text-sm font-semibold rounded-full shadow transition flex items-center gap-2 justify-center ${
                  stats.isFollowing
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${followingBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {followingBusy ? 'Working…' : stats.isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span><span className="font-semibold text-gray-900">{stats.followersCount}</span> Followers</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span><span className="font-semibold text-gray-900">{stats.followingCount}</span> Following</span>
            </span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <p className="text-4xl mb-2">🧳</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
            <p className="text-sm text-gray-500">
              {isSelf ? 'Create your first post to start your travel story.' : 'This traveler has not posted yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post._id}
                post={post}
                onUpdated={handlePostAction}
                onDeleted={handlePostDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {(isSelf && (showCreate || editingPost)) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={handlePostCreated}
          editingPost={editingPost}
        />
      )}
    </div>
  );
}

