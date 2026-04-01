import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import TravelProfileSection from '../components/profile/TravelProfileSection';
import ProfileHeader from '../components/profile/ProfileHeader';
import StatsSection from '../components/profile/StatsSection';
import { getBuddyStatus, getMe, getUserProfileById, sendBuddyRequest } from '../services/api';
import {
  getUserPosts,
  getFollowStats,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
} from '../services/feedApi';

const BASE_URL = 'http://localhost:5000';
const normalizeList = (arr) => (Array.isArray(arr) ? arr : []);

const Avatar = ({ name, avatar, size = 16 }) => {
  const sizePxNum = size * 4; // ~ Tailwind-like sizing (e.g. 16 -> 64px)
  if (avatar) {
    const src = String(avatar).startsWith("http://") || String(avatar).startsWith("https://")
      ? avatar
      : `${BASE_URL}${avatar}`;
    return (
      <img
        src={src}
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
  const [travelProfile, setTravelProfile] = useState({
    travelStyle: '',
    preferredDestinations: [],
    travelInterests: [],
    travelPace: '',
    bio: '',
    languages: [],
    travelStats: { tripsCount: 0, countriesVisited: 0, totalPosts: 0 },
  });
  const [myTravelProfile, setMyTravelProfile] = useState({
    travelStyle: '',
    preferredDestinations: [],
    travelInterests: [],
    travelPace: '',
    bio: '',
    languages: [],
    travelStats: { tripsCount: 0, countriesVisited: 0, totalPosts: 0 },
  });

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

  const [followListTab, setFollowListTab] = useState('followers'); // 'followers' | 'following'
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingFollowLists, setLoadingFollowLists] = useState(false);

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

  const fetchProfile = async () => {
    if (!userId) return;
    const res = await getUserProfileById(userId);
    const user = res.data;
    setHeader({
      fullName: user.fullName || 'Traveler',
      avatar: user.avatar || '',
    });
    setTravelProfile({
      travelStyle: user.travelStyle || '',
      preferredDestinations: normalizeList(user.preferredDestinations),
      travelInterests: normalizeList(user.travelInterests),
      travelPace: user.travelPace || '',
      bio: user.bio || '',
      languages: normalizeList(user.languages),
      travelStats: user.travelStats || { tripsCount: 0, countriesVisited: 0, totalPosts: 0 },
    });
  };

  const fetchMyProfile = async () => {
    const res = await getMe();
    const me = res.data;
    setMyTravelProfile({
      travelStyle: me.travelStyle || '',
      preferredDestinations: normalizeList(me.preferredDestinations),
      travelInterests: normalizeList(me.travelInterests),
      travelPace: me.travelPace || '',
      bio: me.bio || '',
      languages: normalizeList(me.languages),
      travelStats: me.travelStats || { tripsCount: 0, countriesVisited: 0, totalPosts: 0 },
    });
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
        await Promise.all([fetchPosts(), fetchStats(), fetchProfile(), fetchMyProfile()]);
        if (!isSelf) {
          const statusRes = await getBuddyStatus(userId);
          setBuddyStatus(statusRes.data.status || "none");
        }
      } catch (err) {
        showToast(err?.response?.data?.msg || 'Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isSelf]);

  const compatibilityScore = useMemo(() => {
    const myInterests = new Set((myTravelProfile.travelInterests || []).map((i) => String(i).toLowerCase()));
    const otherInterests = (travelProfile.travelInterests || []).map((i) => String(i).toLowerCase());
    const overlap = otherInterests.filter((i) => myInterests.has(i)).length;

    let score = 40;
    if (otherInterests.length > 0) {
      score += Math.min(35, Math.round((overlap / otherInterests.length) * 35));
    }
    if (
      myTravelProfile.travelStyle &&
      travelProfile.travelStyle &&
      myTravelProfile.travelStyle.toLowerCase() === travelProfile.travelStyle.toLowerCase()
    ) {
      score += 15;
    }
    if (
      myTravelProfile.travelPace &&
      travelProfile.travelPace &&
      myTravelProfile.travelPace.toLowerCase() === travelProfile.travelPace.toLowerCase()
    ) {
      score += 10;
    }
    return Math.max(0, Math.min(100, score));
  }, [myTravelProfile, travelProfile]);

  useEffect(() => {
    const run = async () => {
      if (!userId) return;
      setLoadingFollowLists(true);
      try {
        const [followersRes, followingRes] = await Promise.all([
          getFollowers(userId),
          getFollowing(userId),
        ]);
        setFollowers(followersRes.data.followers || []);
        setFollowing(followingRes.data.following || []);
      } catch (_) {
        setFollowers([]);
        setFollowing([]);
      } finally {
        setLoadingFollowLists(false);
      }
    };
    run();
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

  const handleConnectBuddy = async () => {
    if (isSelf || !userId || buddyBusy) return;
    if (buddyStatus === "sent" || buddyStatus === "connected") return;
    if (buddyStatus === "received") {
      showToast("This user already sent you a request. Check your profile dashboard.", "info");
      return;
    }
    setBuddyBusy(true);
    try {
      await sendBuddyRequest(userId);
      setBuddyStatus("sent");
      showToast('Travel buddy request sent', 'success');
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Failed to send buddy request', 'error');
    } finally {
      setBuddyBusy(false);
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
          <ProfileHeader
            name={header.fullName}
            bio={travelProfile.bio}
            avatar={header.avatar}
            editable={false}
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/find-buddy')}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
              >
                Find Travel Buddies
              </button>
            </div>
          </ProfileHeader>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-5">
            <p className="text-sm text-gray-500">{postCount} post{postCount === 1 ? '' : 's'}</p>
            {isSelf ? (
              <button
                onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow transition flex items-center gap-2 justify-center"
              >
                Post
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
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
                <button
                  onClick={handleConnectBuddy}
                  disabled={buddyBusy || buddyStatus === "sent" || buddyStatus === "connected"}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-full shadow transition ${
                    buddyStatus === "connected"
                      ? "bg-emerald-100 text-emerald-700"
                      : buddyStatus === "sent"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  } ${buddyBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {buddyBusy
                    ? "Sending..."
                    : buddyStatus === "connected"
                    ? "Connected"
                    : buddyStatus === "sent"
                    ? "Request Sent"
                    : buddyStatus === "received"
                    ? "Check Requests"
                    : "Connect as Travel Buddy"}
                </button>
              </div>
            )}
          </div>

          {!isSelf && (
            <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-emerald-900">
                Travel Compatibility: {compatibilityScore}%
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Preview based on travel interests, style, and pace (mock logic).
              </p>
            </div>
          )}

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

          {/* Followers / Following lists (Instagram-style tabs) */}
          <div className="mt-5 bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFollowListTab('followers')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  followListTab === 'followers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Followers ({stats.followersCount})
              </button>
              <button
                type="button"
                onClick={() => setFollowListTab('following')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  followListTab === 'following'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Following ({stats.followingCount})
              </button>
            </div>

            <div className="mt-3 max-h-52 overflow-y-auto">
              {loadingFollowLists ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : followListTab === 'followers' ? (
                followers.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2 text-center">No followers yet</div>
                ) : (
                  followers.slice(0, 10).map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => navigate(`/profile/${u._id}`)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition"
                    >
                      <Avatar name={u.fullName} avatar={u.avatar} size={10} />
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.fullName || 'User'}</p>
                      </div>
                    </button>
                  ))
                )
              ) : following.length === 0 ? (
                <div className="text-sm text-gray-500 py-2 text-center">Not following anyone yet</div>
              ) : (
                following.slice(0, 10).map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => navigate(`/profile/${u._id}`)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition"
                  >
                    <Avatar name={u.fullName} avatar={u.avatar} size={10} />
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.fullName || 'User'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-6">
            <TravelProfileSection profile={travelProfile} editable={false} />
          </div>

          <div className="mt-6">
            <StatsSection
              stats={{
                ...(travelProfile.travelStats || {}),
                totalPosts: travelProfile.travelStats?.totalPosts || postCount,
              }}
            />
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

