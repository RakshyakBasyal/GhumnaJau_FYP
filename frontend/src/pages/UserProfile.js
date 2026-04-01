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
  // Only show photo if it's NOT from Google (meaning it's an uploaded one)
  const s = String(v);
  if (s.includes('googleusercontent.com') || s.includes('lh3.googleusercontent.com')) return '';
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
      const [profileRes, postsRes, statsRes] = await Promise.all([
        getUserProfileById(userId),
        getUserPosts(userId, { page: 1, limit: 20 }),
        getFollowStats(userId)
      ]);

      setUser(profileRes.data);
      setPosts(postsRes.data.posts || []);
      setPostCount(postsRes.data.total || (postsRes.data.posts || []).length);
      setStats({
        followersCount: statsRes.data.followersCount ?? 0,
        followingCount: statsRes.data.followingCount ?? 0,
        isFollowing: Boolean(statsRes.data.isFollowing),
      });

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
      showToast('Travel buddy request sent', 'success');
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
              <div 
            className="relative flex-shrink-0 ml-4 md:ml-0 cursor-pointer w-32 h-32 md:w-44 md:h-44" 
            onClick={() => avatarUrl(user.avatar) && setShowPhotoView(true)}
          >
            <div className="w-full h-full rounded-[40px] overflow-hidden border-[6px] border-white shadow-2xl bg-gray-50 flex items-center justify-center">
              {avatarUrl(user.avatar) ? (
                <img 
                  src={avatarUrl(user.avatar)} 
                  alt={user.fullName} 
                  className="w-full h-full object-cover hover:opacity-90 transition"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                  {user.fullName?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white shadow-sm z-20" />
          </div>

              {/* Main Info Area */}
              <div className="flex-1 pt-4 md:pt-16">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-3xl font-bold text-gray-900">{user.fullName}</h1>
                      <CheckCircle2 size={22} className="text-blue-500 fill-blue-50 flex-shrink-0" />
                    </div>
                    <p className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
                      <Zap size={14} className="fill-blue-600" /> {user.travelStyle || 'Traveler'}
                    </p>
                  </div>

                  {/* Actions - Grouped pill buttons */}
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
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

            {/* Travel Stats Grid - Unique layout */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 border-t border-gray-50 pt-8">
              {[
                { label: 'Posts', value: postCount },
                { label: 'Followers', value: stats.followersCount },
                { label: 'Following', value: stats.followingCount },
                { label: 'Trips', value: user.travelStats?.tripsCount || 0 },
                { label: 'Countries', value: user.travelStats?.countriesVisited || 0 },
                { label: 'Score', value: '85%' },
              ].map((stat, i) => (
                <div key={i} className="text-center group cursor-default">
                  <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stat.value}</p>
                  <p className="text-xs text-gray-400 font-bold mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Bio Section - Simple and clean */}
            <div className="mt-8 max-w-2xl">
              <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                {user.bio || "Adventuring through Nepal, one moment at a time. 🏔️"}
              </p>
              {user.preferredDestinations?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {user.preferredDestinations.map(dest => (
                    <span key={dest} className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-lg border border-gray-100 flex items-center gap-1.5">
                      <MapPin size={12} className="text-blue-500" /> {dest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs - Pill-style Navigation ──────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 mt-10">
        <div className="flex justify-center md:justify-start gap-4 mb-8">
          <button onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2.5 px-8 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'posts' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100 shadow-sm'
            }`}>
            <Grid size={14} /> My Moments
          </button>
          <button onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2.5 px-8 py-3 rounded-2xl text-xs font-bold transition-all ${
              activeTab === 'about' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100 shadow-sm'
            }`}>
            <Info size={14} /> Travel Profile
          </button>
        </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4">
        {activeTab === 'posts' ? (
          posts.length > 0 ? (
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Share your journey</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                {isSelf ? 'Post your first travel moment and inspire others!' : 'This traveler is still preparing their logs.'}
              </p>
              {isSelf && (
                <button onClick={() => setShowCreate(true)}
                  className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                  Create First Post
                </button>
              )}
            </div>
          )
        ) : (
          /* Travel Identity - Unique Design */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Travel Identity Details */}
            <div className="md:col-span-8 space-y-8">
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-8 flex items-center gap-2">
                  <Globe size={18} className="text-blue-500" /> Travel Persona
                </h3>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400">Travel Style</p>
                      <p className="text-lg font-bold text-gray-800">{user.travelStyle || 'Explorer'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-400">Pace Preference</p>
                      <p className="text-lg font-bold text-gray-800">{user.travelPace || 'Moderate'} Pace</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400">Passions & Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {(user.travelInterests || ['Adventure', 'Nature', 'Local Food']).map(tag => (
                        <span key={tag} className="px-4 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl border border-blue-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400">Languages Spoken</p>
                    <div className="flex flex-wrap gap-4">
                      {(user.languages || ['English', 'Nepali']).map(lang => (
                        <div key={lang} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm font-bold text-gray-700">{lang}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Stats/Achievements */}
            <div className="md:col-span-4 space-y-8">
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                <Star className="absolute -bottom-4 -right-4 w-24 h-24 opacity-20 rotate-12" />
                <h3 className="text-base font-bold mb-6">Achievements</h3>
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                      {user.travelStats?.tripsCount || 0}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-100">Total Trips</p>
                      <p className="text-sm font-bold">Adventure Logged</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                      {user.travelStats?.countriesVisited || 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-100">Countries</p>
                      <p className="text-sm font-bold">Regions Explored</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-bold text-xl shadow-inner">
                      85
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-100">Trust Score</p>
                      <p className="text-sm font-bold">Community Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
      {showPhotoView && (avatarUrl(user.avatar) || avatarPreview) && (
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
            src={avatarPreview || avatarUrl(user.avatar)} 
            alt={user.fullName} 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
