import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Loader2, MapPin, CheckCircle2, MessageSquare, 
  Settings, Grid, Info, UserPlus, UserCheck, 
  Globe, Plane, Star, Zap, X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getBuddyStatus, getMe, getUserProfileById, sendBuddyRequest } from '../services/api';
import {
  getUserPosts,
  getFollowStats,
  followUser,
  unfollowUser,
} from '../services/feedApi';

const BASE_URL = 'http://localhost:5000';

const avatarUrl = (v) => {
  if (!v) return '';
  const s = String(v);
  // Support both local uploads and external (Google) photos
  return s.startsWith('http') ? s : `${BASE_URL}${s}`;
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
    } catch (_) { return null; }
  }, [token]);

  const isSelf = Boolean(myId && userId && String(myId) === String(userId));

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'about'
  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  });

  const [allDestinations, setAllDestinations] = useState([]);
  const [followingBusy, setFollowingBusy] = useState(false);
  const [buddyStatus, setBuddyStatus] = useState("none");
  const [buddyBusy, setBuddyBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showPhotoView, setShowPhotoView] = useState(false);

  const fetchAllData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profileRes, postsRes, statsRes, destsRes] = await Promise.all([
        getUserProfileById(userId),
        getUserPosts(userId, { page: 1, limit: 20 }),
        getFollowStats(userId),
        fetch(`${BASE_URL}/api/destinations`).then(r => r.json())
      ]);

      setUser(profileRes.data);
      setPosts(postsRes.data.posts || []);
      setPostCount(postsRes.data.total || (postsRes.data.posts || []).length);
      setStats({
        followersCount: statsRes.data.followersCount ?? 0,
        followingCount: statsRes.data.followingCount ?? 0,
        isFollowing: Boolean(statsRes.data.isFollowing),
      });
      setAllDestinations(Array.isArray(destsRes) ? destsRes : destsRes.destinations || []);

      if (!isSelf) {
        const buddyRes = await getBuddyStatus(userId);
        setBuddyStatus(buddyRes.data.status || "none");
      }
    } catch (err) {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userId, isSelf]);

  const handleToggleFollow = async () => {
    if (!userId || isSelf || followingBusy) return;
    setFollowingBusy(true);
    try {
      if (stats.isFollowing) {
        await unfollowUser(userId);
        setStats(prev => ({ ...prev, isFollowing: false, followersCount: Math.max(0, prev.followersCount - 1) }));
        showToast('Unfollowed', 'info');
      } else {
        await followUser(userId);
        setStats(prev => ({ ...prev, isFollowing: true, followersCount: prev.followersCount + 1 }));
        showToast('Followed!', 'success');
      }
    } catch (err) {
      showToast('Action failed', 'error');
    } finally {
      setFollowingBusy(false);
    }
  };

  const handleConnectBuddy = async () => {
    if (isSelf || !userId || buddyBusy) return;
    if (buddyStatus === "sent" || buddyStatus === "connected") return;
    setBuddyBusy(true);
    try {
      await sendBuddyRequest(userId);
      setBuddyStatus("sent");
      showToast('Connection request sent', 'success');
    } catch (err) {
      showToast('Failed to send request', 'error');
    } finally {
      setBuddyBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 pb-20">
      {/* ── Profile Header with Travel Cover ───────────────────────────────── */}
      <div className="max-w-5xl mx-auto pt-6 px-4">
        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm relative">
          {/* Cover Area - Using a vibrant travel-themed gradient */}
          <div className="h-48 md:h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <Globe className="absolute -top-10 -right-10 w-64 h-64 text-white rotate-12" />
              <Plane className="absolute top-20 left-10 w-24 h-24 text-white -rotate-12" />
            </div>
            {isSelf && (
              <button onClick={() => navigate('/settings')} 
                className="absolute top-6 right-6 p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/30 transition border border-white/20 shadow-lg">
                <Settings size={20} />
              </button>
            )}
          </div>

          {/* Profile Details Container */}
          <div className="px-6 pb-8 -mt-16 md:-mt-20 relative z-10">
            <div className="flex flex-col md:flex-row items-end md:items-center gap-6 mb-8">
              {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0 w-32 h-32 md:w-40 md:h-40">
              <div 
                className="w-full h-full rounded-[32px] md:rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-gray-100 cursor-pointer flex items-center justify-center"
                onClick={() => avatarUrl(user.avatar) && setShowPhotoView(true)}
              >
                {avatarUrl(user.avatar) ? (
                  <img src={avatarUrl(user.avatar)} className="w-full h-full object-cover hover:opacity-90 transition" alt={user.fullName} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

              {/* Main Info Area */}
              <div className="flex-1 pt-6 md:pt-20">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">{user.fullName}</h1>
                        <CheckCircle2 size={24} className="text-blue-500 fill-blue-50 flex-shrink-0" />
                      </div>
                      
                      {user.city && (
                        <div className="flex items-center gap-1.5 text-blue-600">
                          <MapPin size={14} className="fill-blue-50" />
                          <span className="text-sm font-bold uppercase tracking-widest">{user.city}</span>
                        </div>
                      )}
                    </div>

                    <div className="max-w-2xl">
                      <p className="text-gray-600 text-base leading-relaxed">
                        {user.bio || "Adventuring through Nepal, one moment at a time. 🏔️"}
                      </p>
                    </div>
                  </div>

                  {/* Actions - Grouped pill buttons */}
                  <div className="flex items-center gap-3 mt-2 md:mt-2">
                    {isSelf ? (
                      <button onClick={() => navigate('/settings')} 
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        <button onClick={handleToggleFollow} disabled={followingBusy}
                          className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-md ${
                            stats.isFollowing 
                              ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                          }`}>
                          {stats.isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button onClick={() => navigate('/community/messages')}
                          className="p-3 bg-white text-gray-600 rounded-2xl border border-gray-100 hover:bg-gray-50 transition shadow-sm">
                          <MessageSquare size={20} />
                        </button>
                        {buddyStatus !== 'connected' && (
                          <button onClick={handleConnectBuddy} disabled={buddyBusy || buddyStatus === 'sent'}
                            className={`p-3 rounded-2xl border transition shadow-sm ${
                              buddyStatus === 'sent' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}>
                            {buddyStatus === 'sent' ? <UserCheck size={20} /> : <UserPlus size={20} />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Stats Grid - Simple and focused */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 border-t border-gray-50 pt-8">
              {[
                { label: 'Posts', value: postCount },
                { label: 'Followers', value: stats.followersCount },
                { label: 'Following', value: stats.followingCount },
                { label: 'Trips', value: user.travelStats?.tripsCount || 0 },
                { label: 'Connected', value: user.travelStats?.buddyCount || 0 },
              ].map((stat, i) => (
                <div key={i} className="text-center group cursor-default">
                  <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stat.value}</p>
                  <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs - Posts ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 mt-10">
        <div className="flex justify-center md:justify-start gap-4 mb-8">
          <div className="flex items-center gap-2.5 px-8 py-3 rounded-2xl text-xs font-bold bg-blue-600 text-white shadow-lg shadow-blue-100">
            <Grid size={14} /> {isSelf ? 'My Posts' : 'Posts'}
          </div>
        </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {posts.map(post => (
              <PostCard 
                key={post._id} 
                post={post}
                onUpdated={(p, a) => { if (a === 'edit') setEditingPost(p); }}
                onDeleted={id => setPosts(prev => prev.filter(p => p._id !== id))} 
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center bg-white rounded-[32px] border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Grid size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isSelf ? 'Share your journey' : 'No posts yet'}
            </h3>
            <p className="text-gray-500 max-w-xs mx-auto">
              {isSelf ? 'Post your first travel moment and inspire others!' : 'This traveler has not posted any travel logs yet.'}
            </p>
            {isSelf && (
              <button onClick={() => setShowCreate(true)}
                className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                Create First Post
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={(newPost, isEdit) => {
            if (isEdit) setPosts(prev => prev.map(p => p._id === newPost._id ? newPost : p));
            else { setPosts(prev => [newPost, ...prev]); setPostCount(prev => prev + 1); }
            setEditingPost(null);
            setShowCreate(false);
          }}
          editingPost={editingPost}
        />
      )}

      {/* Photo Viewer Modal */}
      {showPhotoView && avatarUrl(user.avatar) && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowPhotoView(false)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition"
            onClick={() => setShowPhotoView(false)}
          >
            <X size={32} />
          </button>
          <img 
            src={avatarUrl(user.avatar)} 
            alt={user.fullName} 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
