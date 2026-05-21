// // frontend/src/pages/UserProfile.jsx
// import { useEffect, useMemo, useState } from 'react';
// import { useNavigate, useParams, Link } from 'react-router-dom';
// import {
//   Loader2, MapPin, MessageSquare, UserPlus, UserCheck,
//   Globe, Plane, X, Users, Heart, Star, Clock, Languages,
//   CheckCircle2, Camera, Grid3X3,
// } from 'lucide-react';
// import { useToast } from '../context/ToastContext';
// import PostCard from '../components/feed/PostCard';
// import CreatePostModal from '../components/feed/CreatePostModal';
// import { getBuddyStatus, getUserProfileById, connectUser } from '../services/api';
// import { getUserPosts, getFollowStats, followUser, unfollowUser } from '../services/feedApi';

// const BASE_URL = 'http://localhost:5000';

// const avatarUrl = (v) => {
//   if (!v) return '';
//   const s = String(v);
//   return s.startsWith('http') ? s : `${BASE_URL}${s}`;
// };

// // ── Followers / Following modal ────────────────────────────────────────────────
// const FollowListModal = ({ userId, type, onClose }) => {
//   const [list, setList]       = useState([]);
//   const [loading, setLoading] = useState(true);
//   const navigate              = useNavigate();

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const endpoint = type === 'followers'
//           ? `${BASE_URL}/api/follows/${userId}/followers`
//           : `${BASE_URL}/api/follows/${userId}/following`;
//         const res = await fetch(endpoint, {
//           headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
//         });
//         const data = await res.json();
//         setList(type === 'followers' ? (data.followers || []) : (data.following || []));
//       } catch (_) {}
//       setLoading(false);
//     };
//     load();
//   }, [userId, type]);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
//       <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
//         <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
//           <h3 className="font-bold text-gray-900 capitalize">{type}</h3>
//           <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
//         </div>
//         <div className="max-h-80 overflow-y-auto">
//           {loading ? (
//             <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-blue-600" /></div>
//           ) : list.length === 0 ? (
//             <p className="text-center text-sm text-gray-400 py-8">No {type} yet</p>
//           ) : (
//             list.map(u => (
//               <button key={u._id} onClick={() => { navigate(`/profile/${u._id}`); onClose(); }}
//                 className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left">
//                 <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
//                   {avatarUrl(u.avatar)
//                     ? <img src={avatarUrl(u.avatar)} alt="" className="w-full h-full object-cover" />
//                     : <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{u.fullName?.charAt(0)}</div>}
//                 </div>
//                 <div>
//                   <p className="font-semibold text-gray-900 text-sm">{u.fullName}</p>
//                   {u.travelStyle && <p className="text-xs text-gray-400">{u.travelStyle}</p>}
//                 </div>
//               </button>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// // ── Stat pill ──────────────────────────────────────────────────────────────────
// const StatPill = ({ value, label, onClick }) => (
//   <button onClick={onClick || undefined} disabled={!onClick}
//     className={`flex flex-col items-center gap-0.5 px-5 py-3 rounded-2xl transition ${onClick ? 'hover:bg-white/20 cursor-pointer' : 'cursor-default'}`}>
//     <span className="text-2xl font-bold text-white leading-none">{value}</span>
//     <span className="text-xs text-white/70 font-medium uppercase tracking-wide">{label}</span>
//   </button>
// );

// // ── Main ──────────────────────────────────────────────────────────────────────
// export default function UserProfile() {
//   const { userId } = useParams();
//   const navigate   = useNavigate();
//   const { showToast } = useToast();

//   const token = localStorage.getItem('token');
//   const myId  = useMemo(() => {
//     if (!token) return null;
//     try {
//       const decoded = JSON.parse(atob(token.split('.')[1]));
//       return decoded?.id || decoded?._id || null;
//     } catch (_) { return null; }
//   }, [token]);

//   const isSelf = Boolean(myId && userId && String(myId) === String(userId));

//   const [loading,        setLoading]        = useState(true);
//   const [posts,          setPosts]          = useState([]);
//   const [postCount,      setPostCount]      = useState(0);
//   const [user,           setUser]           = useState(null);
//   const [stats,          setStats]          = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
//   const [followingBusy,  setFollowingBusy]  = useState(false);
//   const [isConnected,    setIsConnected]    = useState(false);
//   const [connectBusy,    setConnectBusy]    = useState(false);
//   const [showPhotoView,  setShowPhotoView]  = useState(false);
//   const [followModal,    setFollowModal]    = useState(null);
//   const [editingPost,    setEditingPost]    = useState(null);
//   const [showCreate,     setShowCreate]     = useState(false);

//   useEffect(() => {
//     if (!userId) return;
//     setLoading(true);
//     Promise.all([
//       getUserProfileById(userId),
//       getUserPosts(userId, { page: 1, limit: 20 }),
//       getFollowStats(userId),
//       !isSelf ? getBuddyStatus(userId) : Promise.resolve({ data: { status: 'self' } }),
//     ]).then(([profileRes, postsRes, statsRes, buddyRes]) => {
//       setUser(profileRes.data);
//       setPosts(postsRes.data.posts || []);
//       setPostCount(postsRes.data.total || (postsRes.data.posts || []).length);
//       setStats({
//         followersCount: statsRes.data.followersCount ?? 0,
//         followingCount: statsRes.data.followingCount ?? 0,
//         isFollowing:    Boolean(statsRes.data.isFollowing),
//       });
//       setIsConnected(buddyRes.data.status === 'connected');
//     }).catch(() => showToast('Failed to load profile', 'error'))
//       .finally(() => setLoading(false));
//   }, [userId, isSelf]);

//   const handleToggleFollow = async () => {
//     if (isSelf || followingBusy) return;
//     setFollowingBusy(true);
//     try {
//       if (stats.isFollowing) {
//         await unfollowUser(userId);
//         setStats(p => ({ ...p, isFollowing: false, followersCount: Math.max(0, p.followersCount - 1) }));
//         showToast('Unfollowed', 'info');
//       } else {
//         await followUser(userId);
//         setStats(p => ({ ...p, isFollowing: true, followersCount: p.followersCount + 1 }));
//         showToast('Followed!', 'success');
//       }
//     } catch { showToast('Action failed', 'error'); }
//     finally { setFollowingBusy(false); }
//   };

//   const handleConnect = async () => {
//     if (isSelf || connectBusy || isConnected) return;
//     setConnectBusy(true);
//     try {
//       await connectUser(userId);
//       setIsConnected(true);
//       showToast('Connected! You can now message each other.', 'success');
//       navigate('/community/messages');
//     } catch (err) {
//       showToast(err?.response?.data?.msg || 'Failed to connect', 'error');
//     } finally { setConnectBusy(false); }
//   };

//   const handleMessage = () => navigate('/community/messages');

//   if (loading) return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//       <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
//     </div>
//   );

//   if (!user) return (
//     <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
//       <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
//       <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-bold">Go Back</button>
//     </div>
//   );

//   const displayAvatar    = avatarUrl(user.avatar);
//   const scoreColor =
//     user.compatibilityScore >= 75 ? 'bg-emerald-500'
//     : user.compatibilityScore >= 50 ? 'bg-blue-500'
//     : 'bg-amber-500';

//   return (
//     <div className="min-h-screen bg-gray-50 pb-20">

//       {/* ── Hero card — BuddyCard style but full-width ─────────────────────── */}
//       <div className="relative h-[380px] md:h-[440px] overflow-hidden">
//         {/* Background: avatar image or gradient */}
//         {displayAvatar
//           ? <img src={displayAvatar} alt={user.fullName} className="w-full h-full object-cover" />
//           : <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center">
//               <span className="text-white text-[120px] font-black opacity-20 select-none">{user.fullName?.charAt(0).toUpperCase()}</span>
//             </div>}

//         {/* Overlay gradient */}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

//         {/* Compatibility score badge */}
//         {user.compatibilityScore > 0 && (
//           <div className={`absolute top-4 right-4 ${scoreColor} text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg`}>
//             {user.compatibilityScore}% match
//           </div>
//         )}

//         {/* Photo viewer trigger */}
//         {displayAvatar && (
//           <button onClick={() => setShowPhotoView(true)}
//             className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-black/60 transition">
//             <Camera size={13} /> View Photo
//           </button>
//         )}

//         {/* Profile info overlay */}
//         <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
//           {/* Name + verified */}
//           <div className="flex items-end justify-between gap-4 mb-4">
//             <div className="flex-1 min-w-0">
//               <h1 className="text-3xl md:text-4xl font-black text-white leading-tight truncate">
//                 {user.fullName}
//               </h1>
//               {user.city && (
//                 <p className="text-white/80 flex items-center gap-1.5 mt-1 text-sm font-medium">
//                   <MapPin size={14} className="flex-shrink-0" /> {user.city}
//                 </p>
//               )}
//             </div>

//             {/* Action buttons */}
//             {!isSelf && (
//               <div className="flex items-center gap-2 flex-shrink-0">
//                 {/* Follow / Unfollow */}
//                 <button onClick={handleToggleFollow} disabled={followingBusy}
//                   className={`px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg flex items-center gap-2 ${
//                     stats.isFollowing
//                       ? 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
//                       : 'bg-white text-blue-700 hover:bg-blue-50'
//                   }`}>
//                   {followingBusy ? <Loader2 size={14} className="animate-spin" /> : null}
//                   {stats.isFollowing ? 'Following' : 'Follow'}
//                 </button>

//                 {/* Connect or Message */}
//                 {isConnected ? (
//                   <button onClick={handleMessage}
//                     className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2">
//                     <MessageSquare size={15} /> Message
//                   </button>
//                 ) : (
//                   <button onClick={handleConnect} disabled={connectBusy}
//                     className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2 disabled:opacity-60">
//                     {connectBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={15} />}
//                     Connect
//                   </button>
//                 )}
//               </div>
//             )}

//             {isSelf && (
//               <button onClick={() => navigate('/profile')}
//                 className="px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl text-sm font-bold hover:bg-white/30 transition shadow-lg">
//                 Edit Profile
//               </button>
//             )}
//           </div>

//           {/* Intent status + tags */}
//           <div className="flex flex-wrap items-center gap-2 mb-5">
//             {user.intentStatus && (
//               <span className="px-3 py-1 bg-blue-500/80 backdrop-blur-sm text-white text-xs font-bold rounded-full">{user.intentStatus}</span>
//             )}
//             {(user.gender || user.age) && (
//               <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
//                 {user.gender}{user.age ? ` · ${user.age} yrs` : ''}
//               </span>
//             )}
//             {user.travelStyle && (
//               <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">{user.travelStyle}</span>
//             )}
//             {user.travelBudget && (
//               <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">{user.travelBudget}</span>
//             )}
//             {user.travelPace && (
//               <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">{user.travelPace} pace</span>
//             )}
//           </div>

//           {/* Stats row */}
//           <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-2xl px-2 py-1 self-start w-fit">
//             <StatPill value={postCount} label="Posts" />
//             <div className="w-px h-8 bg-white/20" />
//             <StatPill value={stats.followersCount} label="Followers" onClick={() => setFollowModal('followers')} />
//             <div className="w-px h-8 bg-white/20" />
//             <StatPill value={stats.followingCount} label="Following" onClick={() => setFollowModal('following')} />
//             <div className="w-px h-8 bg-white/20" />
//             <StatPill value={user.travelStats?.buddyCount || 0} label="Connected" />
//           </div>
//         </div>
//       </div>

//       {/* ── Info cards ────────────────────────────────────────────────────────── */}
//       <div className="max-w-5xl mx-auto px-4 mt-6 space-y-4">

//         {/* Bio */}
//         {user.bio && (
//           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
//             <p className="text-gray-700 text-sm leading-relaxed">"{user.bio}"</p>
//           </div>
//         )}

//         {/* Match reasons */}
//         {user.matchReasons?.length > 0 && (
//           <div className="bg-emerald-50 rounded-2xl border border-emerald-100 px-5 py-4">
//             <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">Why you match</p>
//             <div className="flex flex-wrap gap-2">
//               {user.matchReasons.map(r => (
//                 <span key={r} className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-semibold">
//                   <CheckCircle2 size={11} className="text-emerald-500" /> {r}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Travel details grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

//           {/* Interests */}
//           {user.travelInterests?.length > 0 && (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
//                 <Heart size={12} className="text-orange-400" /> Interests
//               </p>
//               <div className="flex flex-wrap gap-1.5">
//                 {user.travelInterests.map(t => (
//                   <span key={t} className="px-2.5 py-1 bg-orange-50 text-orange-700 text-xs font-semibold rounded-full border border-orange-100">{t}</span>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Preferred destinations */}
//           {user.preferredDestinations?.length > 0 && (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
//                 <MapPin size={12} className="text-blue-400" /> Dream Destinations
//               </p>
//               <div className="flex flex-wrap gap-1.5">
//                 {user.preferredDestinations.slice(0, 8).map(d => (
//                   <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{d}</span>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Languages */}
//           {user.languages?.length > 0 && (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
//                 <Languages size={12} className="text-indigo-400" /> Languages
//               </p>
//               <div className="flex flex-wrap gap-1.5">
//                 {user.languages.map(l => (
//                   <span key={l} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">{l}</span>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Travel dates */}
//           {(user.travelDateStart || user.travelDateEnd) && (
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
//                 <Clock size={12} className="text-green-400" /> Travel Window
//               </p>
//               <p className="text-sm font-semibold text-gray-700">
//                 {user.travelDateStart ? new Date(user.travelDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
//                 {' → '}
//                 {user.travelDateEnd   ? new Date(user.travelDateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })   : '—'}
//               </p>
//             </div>
//           )}
//         </div>

//         {/* ── Posts section ──────────────────────────────────────────────────── */}
//         <div className="pt-4">
//           <div className="flex items-center justify-between mb-5">
//             <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
//               <Grid3X3 size={17} className="text-blue-600" />
//               Posts
//               {postCount > 0 && <span className="text-sm font-normal text-gray-400">({postCount})</span>}
//             </h2>
//             {isSelf && (
//               <button onClick={() => setShowCreate(true)}
//                 className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow">
//                 + New Post
//               </button>
//             )}
//           </div>

//           {posts.length === 0 ? (
//             <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
//               <Camera size={36} className="text-gray-200 mx-auto mb-3" />
//               <p className="font-semibold text-gray-600 mb-1">{isSelf ? 'Share your journey' : 'No posts yet'}</p>
//               <p className="text-sm text-gray-400">
//                 {isSelf ? 'Post your first travel moment!' : 'This traveler has not posted yet.'}
//               </p>
//               {isSelf && (
//                 <button onClick={() => setShowCreate(true)}
//                   className="mt-5 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition">
//                   Create First Post
//                 </button>
//               )}
//             </div>
//           ) : (
//             <div className="space-y-5">
//               {posts.map(post => (
//                 <PostCard key={post._id} post={post}
//                   onUpdated={(p, a) => { if (a === 'edit') setEditingPost(p); }}
//                   onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setPostCount(c => c - 1); }} />
//               ))}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Modals */}
//       {(showCreate || editingPost) && (
//         <CreatePostModal
//           onClose={() => { setShowCreate(false); setEditingPost(null); }}
//           onCreated={(np, isEdit) => {
//             if (isEdit) setPosts(prev => prev.map(p => p._id === np._id ? np : p));
//             else { setPosts(prev => [np, ...prev]); setPostCount(c => c + 1); }
//             setEditingPost(null); setShowCreate(false);
//           }}
//           editingPost={editingPost}
//         />
//       )}

//       {showPhotoView && displayAvatar && (
//         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPhotoView(false)}>
//           <button className="absolute top-6 right-6 p-2 text-white/70 hover:text-white" onClick={() => setShowPhotoView(false)}><X size={32} /></button>
//           <img src={displayAvatar} alt={user.fullName}
//             className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
//         </div>
//       )}

//       {followModal && (
//         <FollowListModal userId={userId} type={followModal} onClose={() => setFollowModal(null)} />
//       )}
//     </div>
//   );
// }


// frontend/src/pages/UserProfile.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, MapPin, MessageSquare, UserPlus,
  X, Camera, CheckCircle2, Grid3X3, Heart,
  Clock, Languages as LangIcon,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import { getBuddyStatus, getUserProfileById, connectUser } from '../services/api';
import { getUserPosts, getFollowStats, followUser, unfollowUser } from '../services/feedApi';

const BASE_URL = 'http://localhost:5000';
const av = (v) => { if (!v) return ''; const s = String(v); return s.startsWith('http') ? s : `${BASE_URL}${s}`; };
const CHIP = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border';

// ── Followers / Following list modal ──────────────────────────────────────────
function FollowListModal({ userId, type, onClose }) {
  const [list, setList]   = useState([]);
  const [busy, setBusy]   = useState(true);
  const navigate          = useNavigate();
  useEffect(() => {
    fetch(`${BASE_URL}/api/follows/${userId}/${type === 'followers' ? 'followers' : 'following'}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(d => setList(type === 'followers' ? d.followers || [] : d.following || []))
      .catch(() => {}).finally(() => setBusy(false));
  }, [userId, type]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900 capitalize text-sm">{type}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X size={15} className="text-gray-500" /></button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {busy ? <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-blue-600" /></div>
            : list.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No {type} yet</p>
            : list.map(u => (
              <button key={u._id} onClick={() => { navigate(`/profile/${u._id}`); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {av(u.avatar) ? <img src={av(u.avatar)} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">{u.fullName?.charAt(0)}</div>}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserProfile() {
  const { userId }     = useParams();
  const navigate       = useNavigate();
  const { showToast }  = useToast();

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

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getUserProfileById(userId),
      getUserPosts(userId, { page: 1, limit: 20 }),
      getFollowStats(userId),
      !isSelf ? getBuddyStatus(userId) : Promise.resolve({ data: { status: 'self' } }),
    ]).then(([profileRes, postsRes, statsRes, buddyRes]) => {
      setUser(profileRes.data);
      setPosts(postsRes.data.posts || []);
      setPostCount(postsRes.data.total || 0);
      setStats({ followersCount: statsRes.data.followersCount ?? 0, followingCount: statsRes.data.followingCount ?? 0, isFollowing: Boolean(statsRes.data.isFollowing) });
      setIsConnected(buddyRes.data.status === 'connected');
    }).catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [userId, isSelf]);

  const handleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (stats.isFollowing) { await unfollowUser(userId); setStats(p => ({ ...p, isFollowing: false, followersCount: Math.max(0, p.followersCount - 1) })); showToast('Unfollowed', 'info'); }
      else { await followUser(userId); setStats(p => ({ ...p, isFollowing: true, followersCount: p.followersCount + 1 })); showToast('Followed!', 'success'); }
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
    } catch (err) { showToast(err?.response?.data?.msg || 'Failed', 'error'); }
    finally { setConnectBusy(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!user)   return <div className="min-h-screen flex flex-col items-center justify-center"><p className="font-bold text-gray-800">User not found</p><button onClick={() => navigate(-1)} className="mt-3 text-blue-600 text-sm">Go back</button></div>;

  const displayAvatar = av(user.avatar);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {displayAvatar
          ? <img src={displayAvatar} className="w-full h-full object-cover" alt={user.fullName} />
          : <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center"><span className="text-white text-[120px] font-black opacity-20 select-none">{user.fullName?.charAt(0)}</span></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {displayAvatar && (
          <button onClick={() => setShowPhotoView(true)}
            className="absolute top-4 left-4 bg-black/40 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-black/60 transition">
            <Camera size={12} /> View Photo
          </button>
        )}

        {/* Name + location + actions */}
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight truncate">{user.fullName}</h1>
              {user.city && <p className="text-white/75 text-sm flex items-center gap-1.5 mt-1"><MapPin size={13} />{user.city}</p>}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {user.intentStatus && <span className="px-2.5 py-1 bg-blue-500/80 text-white text-xs font-bold rounded-full">{user.intentStatus}</span>}
                {user.travelStyle  && <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">{user.travelStyle}</span>}
                {user.travelBudget && <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">{user.travelBudget}</span>}
                {user.travelPace   && <span className="px-2.5 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">{user.travelPace} pace</span>}
              </div>
            </div>

            {/* Action buttons */}
            {!isSelf && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={handleFollow} disabled={followBusy}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-1.5 ${stats.isFollowing ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30' : 'bg-white text-blue-700 hover:bg-blue-50'}`}>
                  {followBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                  {stats.isFollowing ? 'Following' : 'Follow'}
                </button>
                {isConnected
                  ? <button onClick={() => navigate('/community/messages')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5">
                      <MessageSquare size={14} /> Message
                    </button>
                  : <button onClick={handleConnect} disabled={connectBusy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-60">
                      {connectBusy ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={14} />} Connect
                    </button>}
              </div>
            )}
            {isSelf && (
              <button onClick={() => navigate('/profile')} className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-xl text-sm font-bold hover:bg-white/30">Edit Profile</button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1 mt-4 bg-black/30 rounded-xl px-2 py-1 w-fit">
            {[
              { val: postCount,                    label: 'Posts',     onClick: null },
              { val: stats.followersCount,          label: 'Followers', onClick: () => setFollowModal('followers') },
              { val: stats.followingCount,          label: 'Following', onClick: () => setFollowModal('following') },
              { val: user.travelStats?.buddyCount || 0, label: 'Connected', onClick: null },
            ].map((s, i) => (
              <div key={s.label} className="flex items-center">
                {i > 0 && <div className="w-px h-6 bg-white/20 mx-1" />}
                <button onClick={s.onClick || undefined} disabled={!s.onClick}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition ${s.onClick ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'}`}>
                  <span className="text-base font-bold text-white leading-none">{s.val}</span>
                  <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wide mt-0.5">{s.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info section ─────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 mt-5 space-y-4">

        {/* Bio */}
        {user.bio && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-sm text-gray-600 leading-relaxed italic">"{user.bio}"</p>
          </div>
        )}

        {/* Match reasons */}
        {user.matchReasons?.length > 0 && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 px-5 py-4">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-2">Why you match</p>
            <div className="flex flex-wrap gap-2">
              {user.matchReasons.map(r => (
                <span key={r} className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full font-semibold">
                  <CheckCircle2 size={10} /> {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Travel details */}
        {(user.travelInterests?.length > 0 || user.preferredDestinations?.length > 0 || user.languages?.length > 0 || user.travelDateStart) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {user.travelInterests?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Heart size={11} className="text-orange-400" /> Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.travelInterests.map(t => <span key={t} className={CHIP + " bg-orange-50 text-orange-700 border-orange-100"}>{t}</span>)}
                </div>
              </div>
            )}

            {user.preferredDestinations?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><MapPin size={11} className="text-blue-400" /> Preferred Destinations</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.preferredDestinations.slice(0, 6).map(d => <span key={d} className={CHIP + " bg-blue-50 text-blue-700 border-blue-100"}>{d}</span>)}
                </div>
              </div>
            )}

            {user.languages?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><LangIcon size={11} className="text-indigo-400" /> Languages</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.languages.map(l => <span key={l} className={CHIP + " bg-indigo-50 text-indigo-700 border-indigo-100"}>{l}</span>)}
                </div>
              </div>
            )}

            {(user.travelDateStart || user.travelDateEnd) && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Clock size={11} className="text-green-400" /> Travel Window</p>
                <p className="text-sm font-semibold text-gray-700">
                  {user.travelDateStart ? new Date(user.travelDateStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  {' → '}
                  {user.travelDateEnd   ? new Date(user.travelDateEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })   : '—'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Posts ──────────────────────────────────────────────────── */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Grid3X3 size={15} className="text-blue-600" /> Posts {postCount > 0 && <span className="text-xs font-normal text-gray-400">({postCount})</span>}
            </h2>
            {isSelf && <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">+ New Post</button>}
          </div>
          {posts.length === 0
            ? <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center"><Camera size={28} className="text-gray-200 mx-auto mb-2" /><p className="text-sm font-semibold text-gray-500">{isSelf ? 'Share your first moment!' : 'No posts yet'}</p></div>
            : <div className="space-y-5">{posts.map(post => <PostCard key={post._id} post={post} onUpdated={(p, a) => { if (a === 'edit') setEditingPost(p); }} onDeleted={id => { setPosts(p => p.filter(x => x._id !== id)); setPostCount(c => c - 1); }} />)}</div>}
        </div>
      </div>

      {/* Modals */}
      {(showCreate || editingPost) && (
        <CreatePostModal onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={(np, isEdit) => { if (isEdit) setPosts(p => p.map(x => x._id === np._id ? np : x)); else { setPosts(p => [np, ...p]); setPostCount(c => c + 1); } setEditingPost(null); setShowCreate(false); }}
          editingPost={editingPost} />
      )}
      {showPhotoView && displayAvatar && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white" onClick={() => setShowPhotoView(false)}><X size={28} /></button>
          <img src={displayAvatar} alt={user.fullName} className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
      {followModal && <FollowListModal userId={userId} type={followModal} onClose={() => setFollowModal(null)} />}
    </div>
  );
}