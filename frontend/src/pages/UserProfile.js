// frontend/src/pages/UserProfile.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, MapPin, MessageSquare, UserPlus, X,
  Camera, CheckCircle2, Heart, Clock,
  Languages as LangIcon, ChevronLeft,
  Image, Star, HelpCircle, Zap,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getBuddyStatus, getUserProfileById, connectUser } from '../services/api';
import { getUserPosts, getFollowStats, followUser, unfollowUser } from '../services/feedApi';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const av = (v) => { if (!v) return ''; const s = String(v); return s.startsWith('http') ? s : `${BASE_URL}${s}`; };

// Photos → grid. Everything else → list of full PostCards
const POST_TABS = [
  { key: 'photo',    label: 'Photos',    Icon: Image,      layout: 'grid' },
  { key: 'review',   label: 'Reviews',   Icon: Star,       layout: 'list' },
  { key: 'question', label: 'Questions', Icon: HelpCircle, layout: 'list' },
  { key: 'tip',      label: 'Tips',      Icon: Zap,        layout: 'list' },
];

// ── Follow list modal ──────────────────────────────────────────────────────────
function FollowListModal({ userId, type, onClose }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BASE_URL}/api/follows/${userId}/${type === 'followers' ? 'followers' : 'following'}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(d => setList(type === 'followers' ? d.followers || [] : d.following || []))
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [userId, type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 capitalize text-sm">{type}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={15} className="text-gray-400" /></button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {busy
            ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-600" /></div>
            : list.length === 0
            ? <p className="text-center text-sm text-gray-400 py-8">No {type} yet</p>
            : list.map(u => (
              <button key={u._id} onClick={() => { navigate(`/profile/${u._id}`); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {av(u.avatar)
                    ? <img src={av(u.avatar)} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm">{u.fullName?.charAt(0)}</div>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.fullName}</p>
                  {u.travelStyle && <p className="text-xs text-gray-400">{u.travelStyle}</p>}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { userId }    = useParams();
  const navigate      = useNavigate();
  const { showToast } = useToast();

  const myId = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try { const d = JSON.parse(atob(token.split('.')[1])); return d?.id || d?._id || null; }
    catch (_) { return null; }
  }, []);

  const isSelf = Boolean(myId && userId && String(myId) === String(userId));

  const [loading,       setLoading]       = useState(true);
  const [user,          setUser]          = useState(null);
  const [posts,         setPosts]         = useState([]);
  const [postCount,     setPostCount]     = useState(0);
  const [stats,         setStats]         = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
  const [isConnected,   setIsConnected]   = useState(false);
  const [followBusy,    setFollowBusy]    = useState(false);
  const [connectBusy,   setConnectBusy]   = useState(false);
  const [showPhotoView, setShowPhotoView] = useState(false);
  const [followModal,   setFollowModal]   = useState(null);
  const [editingPost,   setEditingPost]   = useState(null);
  const [showCreate,    setShowCreate]    = useState(false);
  const [expandedPost,  setExpandedPost]  = useState(null);
  const [activeTab,     setActiveTab]     = useState('photo');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getUserProfileById(userId),
      getUserPosts(userId, { page: 1, limit: 50 }),
      getFollowStats(userId),
      !isSelf ? getBuddyStatus(userId) : Promise.resolve({ data: { status: 'self' } }),
    ]).then(([profileRes, postsRes, statsRes, buddyRes]) => {
      setUser(profileRes.data);
      // Hide stories on other user's profile
      const allPosts = postsRes.data.posts || [];
      setPosts(isSelf ? allPosts : allPosts.filter(p => p.category !== 'story'));
      setPostCount(postsRes.data.total || 0);
      setStats({
        followersCount: statsRes.data.followersCount ?? 0,
        followingCount: statsRes.data.followingCount ?? 0,
        isFollowing:    Boolean(statsRes.data.isFollowing),
      });
      setIsConnected(buddyRes.data.status === 'connected');
    })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [userId, isSelf]);

  const handleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (stats.isFollowing) {
        await unfollowUser(userId);
        setStats(p => ({ ...p, isFollowing: false, followersCount: Math.max(0, p.followersCount - 1) }));
        showToast('Unfollowed', 'info');
      } else {
        await followUser(userId);
        setStats(p => ({ ...p, isFollowing: true, followersCount: p.followersCount + 1 }));
        showToast('Followed!', 'success');
      }
    } catch { showToast('Failed', 'error'); }
    finally { setFollowBusy(false); }
  };

  const handleConnect = async () => {
    if (connectBusy || isConnected) return;
    setConnectBusy(true);
    try {
      await connectUser(userId);
      setIsConnected(true);
      showToast('Connected! You can now message each other.', 'success');
      navigate('/community/messages');
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Failed', 'error');
    } finally { setConnectBusy(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );
  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <p className="font-semibold text-gray-700">User not found</p>
      <button onClick={() => navigate(-1)} className="mt-3 text-blue-600 text-sm hover:underline">Go back</button>
    </div>
  );

  const displayAvatar = av(user.avatar);
  const scoreColor    = user.compatibilityScore >= 75 ? 'bg-emerald-500' : user.compatibilityScore >= 50 ? 'bg-blue-500' : 'bg-amber-500';

  const activeTabDef = POST_TABS.find(t => t.key === activeTab) || POST_TABS[0];
  const tabPosts     = posts.filter(p => p.category === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative h-[220px] md:h-[260px] overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 25%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <button onClick={() => navigate(-1)}
          className="absolute top-5 left-5 bg-black/30 backdrop-blur-sm text-white p-2 rounded-xl border border-white/10 hover:bg-black/50 transition z-10">
          <ChevronLeft size={18} />
        </button>
        {user.compatibilityScore > 0 && (
          <div className={`absolute top-5 right-5 ${scoreColor} text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg z-10`}>
            {user.compatibilityScore}% match
          </div>
        )}
      </div>

      {/* ── Identity header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex items-end gap-4 -mt-14 pb-4">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-4 ring-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl cursor-pointer"
                onClick={() => displayAvatar && setShowPhotoView(true)}>
                {displayAvatar
                  ? <img src={displayAvatar} className="w-full h-full object-cover" alt={user.fullName} />
                  : <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black select-none">{user.fullName?.charAt(0)}</div>}
              </div>
              {displayAvatar && (
                <button onClick={() => setShowPhotoView(true)}
                  className="absolute -bottom-1 -right-1 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-lg flex items-center gap-1 border border-white/20 hover:bg-black/80 transition">
                  <Camera size={9} /> View
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1 pt-14">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight truncate">{user.fullName}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {user.city && (
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <MapPin size={11} className="text-blue-500 flex-shrink-0" /> {user.city}
                      </span>
                    )}
                    {user.intentStatus && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">{user.intentStatus}</span>}
                    {user.travelStyle  && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">{user.travelStyle}</span>}
                    {(user.gender || user.age) && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">
                        {user.gender}{user.age ? ` · ${user.age}yrs` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {!isSelf && (
                  <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                    <button onClick={handleFollow} disabled={followBusy}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                        stats.isFollowing
                          ? 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}>
                      {followBusy ? <Loader2 size={11} className="animate-spin" /> : null}
                      {stats.isFollowing ? 'Following' : 'Follow'}
                    </button>
                    {isConnected ? (
                      <button onClick={() => navigate('/community/messages')}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm">
                        <MessageSquare size={12} /> Message
                      </button>
                    ) : (
                      <button onClick={handleConnect} disabled={connectBusy}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition flex items-center gap-1 disabled:opacity-60 shadow-sm">
                        {connectBusy ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                        Connect
                      </button>
                    )}
                  </div>
                )}
                {isSelf && (
                  <button onClick={() => navigate('/profile')}
                    className="px-3 py-1.5 bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-200 transition mt-1">
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-0 border-t border-gray-100 pt-1 pb-1">
            {[
              { val: postCount,                         label: 'Posts',     onClick: null },
              { val: stats.followersCount,               label: 'Followers', onClick: () => setFollowModal('followers') },
              { val: stats.followingCount,               label: 'Following', onClick: () => setFollowModal('following') },
              { val: user.travelStats?.buddyCount || 0,  label: 'Connected', onClick: null },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="w-px h-6 bg-gray-200 mx-1" />}
                <button onClick={s.onClick || undefined} disabled={!s.onClick}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl transition ${s.onClick ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}>
                  <span className="text-base font-bold text-gray-900 leading-none">{s.val}</span>
                  <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">{s.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-6">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {user.bio && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-600 leading-relaxed italic">"{user.bio}"</p>
              </div>
            )}
            {user.matchReasons?.length > 0 && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-widest mb-3">Why you match</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.matchReasons.map(r => (
                    <span key={r} className="flex items-center gap-1 text-[10px] text-emerald-700 bg-white px-2.5 py-1 rounded-full font-medium border border-emerald-100">
                      <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" /> {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(user.travelStyle || user.travelPace || user.travelBudget) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Travel Style</p>
                <div className="flex flex-wrap gap-2">
                  {user.travelStyle  && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">{user.travelStyle}</span>}
                  {user.travelPace   && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">{user.travelPace} pace</span>}
                  {user.travelBudget && <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">{user.travelBudget.replace(' Traveler','')}</span>}
                </div>
              </div>
            )}
            {user.travelInterests?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Heart size={11} className="text-orange-400" /> Interests
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.travelInterests.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-100">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {user.languages?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <LangIcon size={11} className="text-indigo-400" /> Languages
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.languages.map(l => (
                    <span key={l} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100">{l}</span>
                  ))}
                </div>
              </div>
            )}
            {(user.travelDateStart || user.travelDateEnd) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Travel Window</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    {user.travelDateStart ? new Date(user.travelDateStart).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'Flexible'}
                    {' — '}
                    {user.travelDateEnd ? new Date(user.travelDateEnd).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'Flexible'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: destinations + posts */}
          <div className="lg:col-span-2 space-y-6">
            {user.preferredDestinations?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <MapPin size={11} className="text-blue-400" /> Dream Destinations
                </p>
                <div className="flex flex-wrap gap-2">
                  {user.preferredDestinations.slice(0, 8).map(d => (
                    <span key={d} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-xl border border-blue-100 hover:bg-blue-100 transition">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Posts panel ─────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex items-center justify-between border-b border-gray-100">
                <div className="flex overflow-x-auto">
                  {POST_TABS.map(({ key, label, Icon }) => {
                    const count = posts.filter(p => p.category === key).length;
                    return (
                      <button key={key} onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                          activeTab === key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}>
                        <Icon size={13} />
                        {label}
                        {count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {isSelf && (
                  <button onClick={() => setShowCreate(true)}
                    className="mr-3 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex-shrink-0">
                    + New
                  </button>
                )}
              </div>

              {/* Content */}
              {tabPosts.length === 0 ? (
                <div className="p-12 text-center">
                  <Camera size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No {activeTab}s yet</p>
                </div>
              ) : activeTabDef.layout === 'grid' ? (
                /* ── Photo grid ── */
                <div className="grid grid-cols-3 gap-0.5 p-0.5">
                  {tabPosts.map(post => {
                    const img = post.images?.[0];
                    return (
                      <button key={post._id} onClick={() => setExpandedPost(post)}
                        className="relative aspect-square overflow-hidden group focus:outline-none bg-gray-100">
                        {img ? (
                          <>
                            <img src={av(img)} alt=""
                              className="w-full h-full object-cover group-hover:brightness-90 transition-[filter] duration-200" />
                            {post.images?.length > 1 && (
                              <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                +{post.images.length}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center p-2 text-center">
                            <span className="text-2xl mb-1">📸</span>
                            <p className="text-white text-[9px] font-medium line-clamp-3">{post.content?.slice(0, 55)}</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-white text-xs font-semibold">
                            <Heart size={13} className="fill-white" /> {post.likeCount || 0}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* ── List layout for Questions, Tips, Reviews ── */
                <div className="divide-y divide-gray-50">
                  {tabPosts.map(post => (
                    <div key={post._id} className="p-0">
                      <PostCard
                        post={post}
                        onUpdated={(p, a) => { if (a === 'edit') { setEditingPost(p); } }}
                        onDeleted={id => {
                          setPosts(prev => prev.filter(p => p._id !== id));
                          setPostCount(c => c - 1);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded photo modal ─────────────────────────────────── */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setExpandedPost(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Post</p>
              <button onClick={() => setExpandedPost(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <PostCard post={expandedPost}
              onUpdated={(p, a) => { if (a === 'edit') { setEditingPost(p); setExpandedPost(null); } }}
              onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setPostCount(c => c - 1); setExpandedPost(null); }} />
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={(np, isEdit) => {
            const updated = isEdit ? posts.map(x => x._id === np._id ? np : x) : [np, ...posts];
            setPosts(isSelf ? updated : updated.filter(p => p.category !== 'story'));
            if (!isEdit) setPostCount(c => c + 1);
            setEditingPost(null); setShowCreate(false);
          }}
          editingPost={editingPost} />
      )}

      {showPhotoView && displayAvatar && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 text-white/60 hover:text-white" onClick={() => setShowPhotoView(false)}><X size={26} /></button>
          <img src={displayAvatar} alt={user.fullName} className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {followModal && <FollowListModal userId={userId} type={followModal} onClose={() => setFollowModal(null)} />}
    </div>
  );
}