// // frontend/src/pages/Profile.jsx  — IMPROVED
// import { useEffect, useState } from "react";
// import {
//   User, Users, Mail, Phone, Edit2, Save, X, Calendar, Trash2,
//   MapPin, LogOut, Plane, Loader2, Camera, CheckCircle2, ChevronRight,
//   TrendingUp, LayoutDashboard, Plus, Search, Bell, Check, Globe,
//   MessageSquare, UserCheck, Clock, Star, Compass, Heart
// } from "lucide-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useToast } from "../context/ToastContext";
// import { getUserPosts } from "../services/feedApi";
// import { getBuddyRequests, respondBuddyRequest } from "../services/api";
// import PostCard from "../components/feed/PostCard";
// import CreatePostModal from "../components/feed/CreatePostModal";

// const BASE_URL = "http://localhost:5000";

// const avatarUrl = (v) => {
//   if (!v) return "";
//   const s = String(v);
//   // Support both local uploads and external (Google) photos
//   return s.startsWith("http") ? s : `${BASE_URL}${s}`;
// };

// const TRAVEL_STYLES = [
//   "Adventure Seeker",
//   "Cultural Explorer",
//   "Backpacker",
//   "Luxury Traveler",
//   "Eco Traveler",
//   "Solo Wanderer",
//   "Food Lover",
//   "Spiritual Seeker",
//   "Urban Explorer",
//   "Wildlife Enthusiast",
// ];
// const TRAVEL_PACES   = ["Slow", "Moderate", "Fast"];
// const BUDGET_RANGES  = [
//   { value: "Budget Traveler",    label: "Budget Traveler",    desc: "NPR 1,000 – 2,000 / day" },
//   { value: "Mid-Range Traveler", label: "Mid-Range Traveler", desc: "NPR 2,500 – 5,000 / day" },
//   { value: "Luxury Traveler",    label: "Luxury Traveler",    desc: "NPR 6,000 – 15,000 / day" },
// ];
// const INTEREST_PRESETS = ["Trekking","Food","Culture","Nightlife","Photography","Wildlife","History","Beach","Mountains","Spirituality","Architecture","Sports"];

// export default function Profile() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { showToast } = useToast();

//   const [activeTab, setActiveTab] = useState("overview"); // overview | posts | requests
//   const [isEditingBasic, setIsEditingBasic] = useState(false);
//   const [isEditingTravel, setIsEditingTravel] = useState(false);
//   const [isEditingDestinations, setIsEditingDestinations] = useState(false);
//   const [loading, setLoading]   = useState(true);
//   const [uploading, setUploading] = useState(false);
//   const [showSetupModal, setShowSetupModal] = useState(false);

//   const [userData, setUserData] = useState({
//     fullName: "", email: "", phone: "", avatar: "", coverImage: "",
//     travelStyle: "", travelBudget: "", preferredDestinations: [], travelInterests: [],
//     travelPace: "", city: "", bio: "", languages: [],
//     gender: "", age: "", intentStatus: "",
//     travelStats: { followersCount: 0, followingCount: 0, buddyCount: 0, totalPosts: 0 },
//   });
//   const [avatarPreview, setAvatarPreview] = useState(null);
//   const [avatarFile, setAvatarFile]       = useState(null);

//   // destinations with photos
//   const [allDestinations, setAllDestinations] = useState([]);
//   const [destQuery, setDestQuery]             = useState("");
//   const [showDestSearch, setShowDestSearch]   = useState(false);
//   const [cityQuery, setCityQuery]             = useState("");
//   const [showCitySuggestions, setShowCitySuggestions] = useState(false);

//   // interests
//   const [interestInput, setInterestInput]         = useState("");
//   const [showInterestInput, setShowInterestInput] = useState(false);

//   // posts
//   const [posts, setPosts]           = useState([]);
//   const [postCount, setPostCount]   = useState(0);
//   const [activeTrips, setActiveTrips] = useState(0);
//   const [completedTrips, setCompletedTrips] = useState(0);
//   const [showCreate, setShowCreate] = useState(false);
//   const [editingPost, setEditingPost] = useState(null);

//   // bookings
//   const [recentBookings, setRecentBookings] = useState([]);
//   const [loadingBookings, setLoadingBookings] = useState(false);

//   // buddy requests
//   const [incomingRequests, setIncomingRequests] = useState([]);
//   const [respondingId, setRespondingId]         = useState(null);
//   const [showPhotoView, setShowPhotoView]       = useState(false);

//   // delete modal
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteText, setDeleteText]           = useState("");
//   const [deleting, setDeleting]               = useState(false);

//   const myId = (() => {
//     const token = localStorage.getItem("token");
//     if (!token) return null;
//     try { const d = JSON.parse(atob(token.split(".")[1])); return d?.id || d?._id || null; }
//     catch (_) { return null; }
//   })();

//   // ── Load everything ────────────────────────────────────────────────────────
//   const loadData = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("No token");

//       const [userRes, destRes, postsRes, reqRes, itinRes, followRes, buddyRes, bookingRes] = await Promise.all([
//         fetch(`${BASE_URL}/api/users/me`,     { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/destinations`),
//         fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/buddies/requests`, { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/itineraries`, { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/buddies/connections`, { headers: { Authorization: `Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/bookings/my`, { headers: { Authorization: `Bearer ${token}` } }),
//       ]);

//       const user  = await userRes.json();
//       const dests = await destRes.json();
//       const postsData = postsRes.ok ? await postsRes.json() : { posts: [], total: 0 };
//       const reqData   = reqRes.ok  ? await reqRes.json()   : { incoming: [] };
//       const itinData  = itinRes.ok ? await itinRes.json()  : [];
//       const followData = followRes.ok ? await followRes.json() : { followersCount: 0, followingCount: 0 };
//       const buddyData = buddyRes.ok ? await buddyRes.json() : { connections: [] };
//       const bookingsData = bookingRes.ok ? await bookingRes.json() : [];

//       setRecentBookings(Array.isArray(bookingsData) ? bookingsData.slice(0, 3) : []);

//       setAllDestinations(Array.isArray(dests) ? dests : dests.destinations || []);
      
//       // Sync localStorage with latest user data
//       if (user.fullName) {
//         localStorage.setItem("username", user.fullName);
//         window.dispatchEvent(new Event('userProfileUpdated'));
//       }

//       setUserData({
//         fullName: user.fullName || "",
//         email: user.email || "",
//         phone: user.phone || "",
//         avatar: user.avatar || "",
//         coverImage: user.coverImage || "",
//         travelStyle: user.travelStyle || "",
//         travelBudget: user.travelBudget || "",
//         preferredDestinations: user.preferredDestinations || [],
//         travelInterests: user.travelInterests || [],
//         travelPace: user.travelPace || "",
//         city: user.city || "",
//         bio: user.bio || "",
//         gender: user.gender || "",
//         age: user.age || "",
//         intentStatus: user.intentStatus || "Exploring",
//         languages: user.languages || [],
//         travelStats: {
//           followersCount: followData.followersCount || 0,
//           followingCount: followData.followingCount || 0,
//           buddyCount: user.travelStats?.buddyCount || buddyData.buddies?.length || 0,
//           totalPosts: postsData.total || 0,
//         },
//       });
//       if (user.avatar) setAvatarPreview(avatarUrl(user.avatar));

//       setPosts(postsData.posts || []);
//       setPostCount(postsData.total ?? (postsData.posts || []).length);
//       setIncomingRequests(reqData.incoming || []);
//       const list = Array.isArray(itinData) ? itinData : [];
//       setActiveTrips(list.filter((t) => t.status === "active").length);
//       setCompletedTrips(list.filter((t) => t.status === "completed").length);

//       // Mandatory profile setup: must have travelStyle and city (bio is optional)
//       if (!user.city || !user.travelStyle) {
//         setIsEditingBasic(true);
//         if (location.state?.fromCommunityRedirect) {
//           setShowSetupModal(true);
//         }
//       }
//     } catch (err) {
//       showToast("Session expired. Please login again.", "error");
//       navigate("/login");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { if (myId) loadData(); }, [myId]);

//   // ── Save ───────────────────────────────────────────────────────────────────
//   const handleSave = async () => {
//     setUploading(true);
//     try {
//       const fd = new FormData();
//       Object.entries({
//         fullName: userData.fullName,
//         phone: userData.phone,
//         travelStyle: userData.travelStyle,
//         travelBudget: userData.travelBudget,
//         travelPace: userData.travelPace,
//         city: userData.city,
//         bio: userData.bio,
//         gender: userData.gender,
//         age: userData.age,
//         intentStatus: userData.intentStatus,
//       }).forEach(([k,v]) => fd.append(k, v));
//       fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
//       fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
//       fd.append("languages",             JSON.stringify(userData.languages));
//       if (avatarFile) fd.append("avatar", avatarFile);

//       const token = localStorage.getItem("token");
//       const res = await fetch(`${BASE_URL}/api/users/profile`, {
//         method: "PATCH",
//         headers: { Authorization: `Bearer ${token}` },
//         body: fd,
//       });
//       if (!res.ok) throw new Error("Failed");
//       const updated = await res.json();
//       setUserData(p => ({ ...p, ...updated }));
      
//       // Update localStorage for Navbar and other components
//       if (updated.fullName) {
//         localStorage.setItem("username", updated.fullName);
//         // Dispatch custom event to notify Navbar
//         window.dispatchEvent(new Event('userProfileUpdated'));
//       }

//       setIsEditingBasic(false);
//       setIsEditingTravel(false);
//       setIsEditingDestinations(false);
//       showToast("Profile updated!", "success");
//     } catch { showToast("Failed to update", "error"); }
//     finally { setUploading(false); }
//   };

//   // ── Buddy request respond ──────────────────────────────────────────────────
//   const handleRespond = async (requestId, action) => {
//     setRespondingId(requestId);
//     try {
//       await respondBuddyRequest(requestId, action);
//       setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
//       showToast(action === "accept" ? "Buddy request accepted!" : "Request declined", action === "accept" ? "success" : "info");
      
//       if (action === "accept") {
//         setUserData(prev => ({
//           ...prev,
//           travelStats: {
//             ...prev.travelStats,
//             buddyCount: (prev.travelStats.buddyCount || 0) + 1
//           }
//         }));
//       }
//     } catch { showToast("Failed to respond", "error"); }
//     finally { setRespondingId(null); }
//   };

//   // ── Destinations helpers ───────────────────────────────────────────────────
//   const filteredDests = allDestinations.filter(d =>
//     d.name.toLowerCase().includes(destQuery.toLowerCase()) &&
//     !userData.preferredDestinations.includes(d.name)
//   );
//   const addDest  = (name) => setUserData(p => ({ ...p, preferredDestinations: [...p.preferredDestinations, name] }));
//   const removeDest = (name) => setUserData(p => ({ ...p, preferredDestinations: p.preferredDestinations.filter(d => d !== name) }));

//   const addInterest = () => {
//     const val = interestInput.trim();
//     if (!val || userData.travelInterests.includes(val)) return;
//     setUserData(p => ({ ...p, travelInterests: [...p.travelInterests, val] }));
//     setInterestInput(""); setShowInterestInput(false);
//   };
//   const addPresetInterest = (tag) => {
//     if (userData.travelInterests.includes(tag)) return;
//     setUserData(p => ({ ...p, travelInterests: [...p.travelInterests, tag] }));
//   };
//   const removeInterest = (tag) => setUserData(p => ({ ...p, travelInterests: p.travelInterests.filter(t => t !== tag) }));

//   // ── Post actions ───────────────────────────────────────────────────────────
//   const handlePostCreated = (newPost, isEdit) => {
//     if (isEdit) { setPosts(prev => prev.map(p => p._id === newPost._id ? newPost : p)); }
//     else { setPosts(prev => [newPost, ...prev]); setPostCount(c => c + 1); }
//     setEditingPost(null);
//   };

//   // ── Delete account ─────────────────────────────────────────────────────────
//   const handleDeleteAccount = async () => {
//     if (deleteText !== "DELETE") return showToast("Type DELETE to confirm", "error");
//     setDeleting(true);
//     try {
//       const token = localStorage.getItem("token");
//       await fetch(`${BASE_URL}/api/users/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
//       localStorage.clear(); showToast("Account deleted", "success"); navigate("/login");
//     } catch { showToast("Failed to delete account", "error"); }
//     finally { setDeleting(false); }
//   };

//   if (loading) return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-50">
//       <Loader2 className="animate-spin text-blue-600" size={40} />
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-slate-50 font-sans">

//       {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
//       <div className="relative h-56 md:h-72 overflow-hidden">
//         {userData.coverImage ? (
//           <img src={avatarUrl(userData.coverImage)} className="w-full h-full object-cover" alt="cover" />
//         ) : (
//           <div className="w-full h-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
//             <div className="absolute inset-0 opacity-10"
//               style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
//             />
//           </div>
//         )}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

//         {/* Top actions */}
//         <div className="absolute top-4 right-4 flex gap-2">
//           <button onClick={() => navigate("/community")}
//             className="flex items-center gap-1.5 px-3 py-2 bg-black/55 backdrop-blur-md text-white rounded-xl text-xs font-semibold border border-white/30 hover:bg-black/65 transition shadow">
//             <LayoutDashboard size={14} /> Community
//           </button>
//           <button onClick={() => { localStorage.clear(); navigate("/login"); }}
//             className="flex items-center gap-1.5 px-3 py-2 bg-black/55 backdrop-blur-md text-white rounded-xl text-xs font-semibold border border-white/30 hover:bg-black/65 transition shadow">
//             <LogOut size={14} /> Logout
//           </button>
//         </div>
//       </div>

//       {/* ── Profile Card (overlapping hero) ────────────────────────────────── */}
//       <div className="max-w-5xl mx-auto px-4 sm:px-6">
//         <div className="relative -mt-20 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
//           <div className="flex flex-col md:flex-row gap-6 items-start">

//             {/* Avatar */}
//             <div className="relative flex-shrink-0 mx-auto md:mx-0 w-32 h-32 md:w-40 md:h-40">
//               <div 
//                 className="w-full h-full rounded-[32px] md:rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-gray-100 cursor-pointer flex items-center justify-center"
//                 onClick={() => (avatarPreview || avatarUrl(userData.avatar)) && setShowPhotoView(true)}
//               >
//                 {avatarPreview ? (
//                   <img src={avatarPreview} className="w-full h-full object-cover hover:opacity-90 transition" alt={userData.fullName} />
//                 ) : avatarUrl(userData.avatar) ? (
//                   <img 
//                     src={avatarUrl(userData.avatar)} 
//                     className="w-full h-full object-cover hover:opacity-90 transition" 
//                     alt={userData.fullName} 
//                   />
//                 ) : (
//                   <User className="w-full h-full p-8 text-gray-300" />
//                 )}
//               </div>
//               {isEditingBasic && (
//                 <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-lg border-2 border-white transition z-20">
//                   <Camera size={18} />
//                   <input type="file" className="hidden" accept="image/*" onChange={e => {
//                     const f = e.target.files[0];
//                     if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
//                   }} />
//                 </label>
//               )}
//             </div>

//             {/* Info */}
//             <div className="flex-1 min-w-0">
//               <div className="flex flex-wrap items-start justify-between gap-4">
//                 <div>
//                   {isEditingBasic ? (
//                     <input value={userData.fullName}
//                       onChange={e => setUserData(p => ({ ...p, fullName: e.target.value }))}
//                       className="text-2xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent w-full mb-1" />
//                   ) : (
//                     <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
//                       {userData.fullName}
//                       <CheckCircle2 size={20} className="text-blue-500 fill-blue-50 flex-shrink-0" />
//                     </h1>
//                   )}
//                   <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
//                     <span className="flex items-center gap-1"><Mail size={13} className="text-blue-400" />{userData.email}</span>
//                     {userData.phone && <span className="flex items-center gap-1"><Phone size={13} className="text-blue-400" />{userData.phone}</span>}
//                     {isEditingBasic ? (
//                       <div className="relative">
//                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-300">
//                           <MapPin size={13} className="text-blue-400" />
//                           <input 
//                             value={cityQuery || userData.city} 
//                             onChange={e => {
//                               setCityQuery(e.target.value);
//                               setShowCitySuggestions(true);
//                             }}
//                             onFocus={() => setShowCitySuggestions(true)}
//                             placeholder="Your City" 
//                             className="bg-transparent outline-none text-xs font-semibold w-24" 
//                           />
//                         </div>

//                         {/* City Suggestions Dropdown */}
//                         {showCitySuggestions && allDestinations.filter(d => d.name.toLowerCase().includes((cityQuery || userData.city).toLowerCase())).length > 0 && (
//                           <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] overflow-hidden p-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-200">
//                             {allDestinations
//                               .filter(d => d.name.toLowerCase().includes((cityQuery || userData.city).toLowerCase()))
//                               .slice(0, 5)
//                               .map(d => (
//                                 <button
//                                   key={d._id}
//                                   onClick={() => {
//                                     setUserData(p => ({ ...p, city: d.name }));
//                                     setCityQuery(d.name);
//                                     setShowCitySuggestions(false);
//                                   }}
//                                   className="w-full flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition-all text-left"
//                                 >
//                                   <div className="w-6 h-6 rounded bg-gray-100 overflow-hidden flex-shrink-0">
//                                     {d.images?.[0] ? (
//                                       <img src={d.images[0].startsWith('http') ? d.images[0] : `${BASE_URL}${d.images[0]}`} alt="" className="w-full h-full object-cover" />
//                                     ) : (
//                                       <MapPin size={10} className="m-auto text-gray-300" />
//                                     )}
//                                   </div>
//                                   <span className="text-xs font-bold text-gray-800 truncate">{d.name}</span>
//                                 </button>
//                               ))}
//                           </div>
//                         )}
//                       </div>
//                     ) : (
//                       userData.city && <span className="flex items-center gap-1"><MapPin size={13} className="text-blue-400" />{userData.city}</span>
//                     )}
//                   </div>

//                   {/* Gender and Age */}
//                   <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-gray-500">
//                     {isEditingBasic ? (
//                       <div className="flex flex-wrap items-center gap-4">
//                         <div className="flex items-center gap-2">
//                           <label className="text-[10px] text-gray-400 uppercase tracking-widest">Gender</label>
//                           <select 
//                             value={userData.gender}
//                             onChange={e => setUserData(p => ({ ...p, gender: e.target.value }))}
//                             className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs"
//                           >
//                             <option value="">Select</option>
//                             <option value="Male">Male</option>
//                             <option value="Female">Female</option>
//                             <option value="Other">Other</option>
//                             <option value="Prefer not to say">N/A</option>
//                           </select>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <label className="text-[10px] text-gray-400 uppercase tracking-widest">Age</label>
//                           <input 
//                             type="number" 
//                             min="1" max="120"
//                             value={userData.age}
//                             onChange={e => setUserData(p => ({ ...p, age: e.target.value }))}
//                             className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs w-16"
//                           />
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <label className="text-[10px] text-gray-400 uppercase tracking-widest">Status</label>
//                           <select 
//                             value={userData.intentStatus}
//                             onChange={e => setUserData(p => ({ ...p, intentStatus: e.target.value }))}
//                             className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs"
//                           >
//                             <option value="Exploring">Exploring</option>
//                             <option value="Planning a trip">Planning a trip</option>
//                             <option value="Looking for buddy">Looking for buddy</option>
//                           </select>
//                         </div>
//                       </div>
//                     ) : (
//                       <>
//                         {userData.gender && (
//                           <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{userData.gender}</span>
//                         )}
//                         {userData.age && (
//                           <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{userData.age} yrs</span>
//                         )}
//                         {userData.intentStatus && (
//                           <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">{userData.intentStatus}</span>
//                         )}
//                       </>
//                     )}
//                   </div>
//                 </div>

//                 {/* Edit/Save buttons */}
//                 <div className="flex gap-2">
//                   {isEditingBasic ? (
//                     <>
//                       <button onClick={handleSave} disabled={uploading}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 shadow transition">
//                         {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
//                       </button>
//                       <button onClick={() => setIsEditingBasic(false)}
//                         className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
//                         Cancel
//                       </button>
//                     </>
//                   ) : (
//                     <button onClick={() => setIsEditingBasic(true)}
//                       className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition border border-gray-200">
//                       <Edit2 size={14} /> Edit Profile
//                     </button>
//                   )}
//                 </div>
//               </div>

//               {/* Bio */}
//               <div className="mt-4">
//                 {isEditingBasic ? (
//                   <textarea value={userData.bio}
//                     onChange={e => setUserData(p => ({ ...p, bio: e.target.value }))}
//                     rows={2} maxLength={300} placeholder="Tell fellow travelers about yourself..."
//                     className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none transition" />
//                 ) : (
//                   <p className="text-sm text-gray-600 leading-relaxed">
//                     {userData.bio || <span className="italic text-gray-400">No bio yet — tell travelers who you are!</span>}
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Stats row */}
//           <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-gray-50">
//             {[
//               { label: "Posts", val: postCount },
//               { label: "Followers", val: userData.travelStats.followersCount },
//               { label: "Following", val: userData.travelStats.followingCount },
//               { label: "Connected", val: userData.travelStats.buddyCount },
//             ].map(s => (
//               <div key={s.label} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-gray-50 transition duration-200">
//                 <p className="text-lg font-bold text-gray-900 leading-none">{s.val}</p>
//                 <p className="text-xs text-gray-500 mt-1">{s.label}</p>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ── Tab Nav ───────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-1.5 flex gap-1">
//           {[
//             { id: "overview", label: "Travel Profile", icon: Compass },
//             { id: "posts",    label: `Posts (${postCount})`, icon: TrendingUp },
//             { id: "requests", label: `Requests${incomingRequests.length ? ` (${incomingRequests.length})` : ""}`, icon: UserCheck },
//           ].map(tab => (
//             <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//               className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
//                 activeTab === tab.id ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-50"
//               }`}>
//               <tab.icon size={15} />{tab.label}
//               {tab.id === "requests" && incomingRequests.length > 0 && (
//                 <span className="w-2 h-2 rounded-full bg-red-500 ml-0.5" />
//               )}
//             </button>
//           ))}
//         </div>

//         {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
//         {activeTab === "overview" && (
//           <div className="grid md:grid-cols-2 gap-6 pb-12">

//             <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
//               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Trips</p>
//                 <p className="text-3xl font-bold text-blue-700 mt-2">{activeTrips}</p>
//               </div>
//               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trips Completed</p>
//                 <p className="text-3xl font-bold text-emerald-700 mt-2">{completedTrips}</p>
//               </div>
//             </div>

//             {/* Travel Identity */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
//               <div className="flex items-center justify-between">
//                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
//                   <Compass size={16} className="text-blue-600" /> Travel Identity
//                 </h3>
//                 {isEditingTravel ? (
//                   <div className="flex gap-2">
//                     <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Save</button>
//                     <button onClick={() => setIsEditingTravel(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">Cancel</button>
//                   </div>
//                 ) : (
//                   <button onClick={() => setIsEditingTravel(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">
//                     Edit
//                   </button>
//                 )}
//               </div>

//               {/* Style */}
//               <div>
//                 <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Style</label>
//                 {isEditingTravel ? (
//                   <div className="flex flex-wrap gap-2">
//                     {TRAVEL_STYLES.map(s => (
//                       <button key={s} onClick={() => setUserData(p => ({ ...p, travelStyle: s }))}
//                         className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
//                           userData.travelStyle === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"
//                         }`}>{s}</button>
//                     ))}
//                   </div>
//                 ) : (
//                   <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
//                     {userData.travelStyle || <span className="text-gray-400 italic text-xs">Not set</span>}
//                   </span>
//                 )}
//               </div>

//               {/* Budget */}
//               <div>
//                 <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Budget</label>
//                 {isEditingTravel ? (
//                   <div className="flex flex-wrap gap-2">
//                     {BUDGET_RANGES.map(b => (
//                       <button key={b.value} onClick={() => setUserData(p => ({ ...p, travelBudget: b.value }))}
//                         className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
//                           userData.travelBudget === b.value
//                             ? "bg-green-600 text-white border-green-600"
//                             : "border-gray-200 text-gray-600 hover:border-green-300"
//                         }`}>
//                         <span>{b.label}</span>
//                         <span className={`text-[10px] ${userData.travelBudget === b.value ? "text-green-100" : "text-gray-400"}`}>{b.desc}</span>
//                       </button>
//                     ))}
//                   </div>
//                 ) : (
//                   <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
//                     {userData.travelBudget
//                       ? <>{userData.travelBudget} — {BUDGET_RANGES.find(b => b.value === userData.travelBudget)?.desc}</>
//                       : <span className="text-gray-400 italic text-xs">Not set</span>}
//                   </span>
//                 )}
//               </div>

//               {/* Pace */}
//               <div>
//                 <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Pace</label>
//                 {isEditingTravel ? (
//                   <div className="flex gap-2">
//                     {TRAVEL_PACES.map(p => (
//                       <button key={p} onClick={() => setUserData(d => ({ ...d, travelPace: p }))}
//                         className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
//                           userData.travelPace === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"
//                         }`}>{p}</button>
//                     ))}
//                   </div>
//                 ) : (
//                   <span className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-100">
//                     {userData.travelPace || <span className="text-gray-400 italic text-xs">Not set</span>}
//                   </span>
//                 )}
//               </div>

//               {/* Languages */}
//               <div>
//                 <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Languages</label>
//                 {isEditingTravel ? (
//                   <input value={userData.languages.join(", ")}
//                     onChange={e => setUserData(p => ({ ...p, languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean) }))}
//                     placeholder="English, Nepali, Hindi..."
//                     className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
//                 ) : (
//                   <div className="flex flex-wrap gap-1.5">
//                     {userData.languages.length ? userData.languages.map(l => (
//                       <span key={l} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">{l}</span>
//                     )) : <span className="text-gray-400 text-sm italic">Not specified</span>}
//                   </div>
//                 )}
//               </div>

//               {/* Interests */}
//               <div>
//                 <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Interests</label>
//                 {isEditingTravel && (
//                   <div className="flex flex-wrap gap-1.5 mb-3">
//                     {INTEREST_PRESETS.filter(t => !userData.travelInterests.includes(t)).map(tag => (
//                       <button key={tag} onClick={() => addPresetInterest(tag)}
//                         className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-500 rounded-full text-xs hover:border-blue-400 hover:text-blue-600 transition">
//                         + {tag}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//                 <div className="flex flex-wrap gap-2">
//                   {userData.travelInterests.map(tag => (
//                     <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold border border-orange-100">
//                       {tag}
//                       {isEditingTravel && (
//                         <button onClick={() => removeInterest(tag)} className="text-orange-400 hover:text-red-500 transition ml-0.5">
//                           <X size={10} />
//                         </button>
//                       )}
//                     </span>
//                   ))}
//                   {isEditingTravel && (
//                     showInterestInput ? (
//                       <div className="flex items-center gap-1">
//                         <input autoFocus value={interestInput} onChange={e => setInterestInput(e.target.value)}
//                           onKeyDown={e => e.key === "Enter" && addInterest()}
//                           placeholder="Type & Enter" className="px-3 py-1.5 border-2 border-blue-300 rounded-full text-xs outline-none w-28 focus:ring-2 focus:ring-blue-200" />
//                         <button onClick={() => setShowInterestInput(false)} className="text-gray-400"><X size={13}/></button>
//                       </div>
//                     ) : (
//                       <button onClick={() => setShowInterestInput(true)}
//                         className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-400 rounded-full text-xs hover:border-blue-400 hover:text-blue-600 transition">
//                         + Custom
//                       </button>
//                     )
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Preferred Destinations — WITH PHOTOS */}
//             <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
//               <div className="flex items-center justify-between mb-6">
//                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
//                   <MapPin size={18} className="text-blue-600" /> Preferred Destinations
//                 </h3>
//                 <div className="flex gap-2">
//                   {isEditingDestinations ? (
//                     <>
//                       <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-100">Save</button>
//                       <button onClick={() => { setIsEditingDestinations(false); setShowDestSearch(false); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold">Cancel</button>
//                     </>
//                   ) : (
//                     <button onClick={() => setIsEditingDestinations(true)} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-100 transition">
//                       Edit
//                     </button>
//                   )}
//                   {isEditingDestinations && (
//                     <button onClick={() => setShowDestSearch(v => !v)}
//                       className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition">
//                       <Plus size={20} />
//                     </button>
//                   )}
//                 </div>
//               </div>

//               {isEditingDestinations && showDestSearch && (
//                 <div className="mb-6 relative animate-in slide-in-from-top-2 duration-300">
//                   <div className="relative">
//                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//                     <input type="text" value={destQuery} onChange={e => setDestQuery(e.target.value)}
//                       placeholder="Search destinations..."
//                       className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[20px] text-sm focus:ring-2 focus:ring-blue-300 outline-none transition" />
//                   </div>
//                   {destQuery && filteredDests.length > 0 && (
//                     <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[24px] shadow-2xl z-20 max-h-60 overflow-y-auto p-2">
//                       {filteredDests.map(d => (
//                         <button key={d._id} onClick={() => { addDest(d.name); setDestQuery(""); setShowDestSearch(false); }}
//                           className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 rounded-xl transition">
//                           {d.images?.[0] && (
//                             <img src={d.images[0].startsWith("http") ? d.images[0] : `${BASE_URL}${d.images[0]}`}
//                               alt={d.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
//                           )}
//                           <div>
//                             <p className="text-xs font-bold text-gray-800">{d.name}</p>
//                             {d.country && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{d.country}</p>}
//                           </div>
//                         </button>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Selected destinations list with photo */}
//               <div className="space-y-1.5">
//                 {userData.preferredDestinations.length === 0 ? (
//                   <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl">
//                     <MapPin size={20} className="text-gray-200 mx-auto mb-1.5" />
//                     <p className="text-sm text-gray-500">No destinations added</p>
//                   </div>
//                 ) : (
//                   userData.preferredDestinations.map(destName => {
//                     const d = allDestinations.find(dest => dest.name === destName);
//                     // Use images[0] from the destination object
//                     const img = d?.images?.[0];
//                     const imgSrc = img ? (img.startsWith("http") ? img : `${BASE_URL}${img}`) : null;
                    
//                     return (
//                       <div key={destName} className="group flex items-center gap-2.5 p-1.5 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-100 transition duration-200">
//                         <div className="w-9 h-9 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white border border-gray-50">
//                           {imgSrc ? (
//                             <img src={imgSrc} alt={destName} className="w-full h-full object-cover" />
//                           ) : (
//                             <div className="w-full h-full flex items-center justify-center text-gray-300">
//                               <MapPin size={14} />
//                             </div>
//                           )}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className="text-sm font-semibold text-gray-800 truncate">{destName}</p>
//                           {d?.country && (
//                             <p className="text-xs text-gray-500">
//                               {d.country}
//                             </p>
//                           )}
//                         </div>
//                         {isEditingDestinations && (
//                           <button 
//                             onClick={(e) => { e.stopPropagation(); removeDest(destName); }}
//                             className="w-6 h-6 bg-white text-gray-400 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100 border border-gray-100"
//                           >
//                             <X size={10} />
//                           </button>
//                         )}
//                       </div>
//                     );
//                   })
//                 )}
//               </div>
//             </div>

//             {/* Recent Bookings — WITH COMPACT LIST */}
//             <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
//               <div className="flex items-center justify-between mb-6">
//                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
//                   <Calendar size={18} className="text-blue-600" /> Recent Bookings
//                 </h3>
//                 <button 
//                   onClick={() => navigate('/my-bookings')}
//                   className="px-4 py-2 bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5"
//                 >
//                   View All <ChevronRight size={14} />
//                 </button>
//               </div>

//               <div className="space-y-3">
//                 {recentBookings.length === 0 ? (
//                   <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
//                     <Calendar size={24} className="text-gray-200 mx-auto mb-2" />
//                     <p className="text-sm text-gray-500">No recent bookings</p>
//                   </div>
//                 ) : (
//                   recentBookings.map(booking => (
//                     <div key={booking._id} className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-100 transition duration-200">
//                       <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white border border-gray-50">
//                         {booking.type === 'flight' ? (
//                           <div className="w-full h-full bg-blue-50 flex items-center justify-center">
//                             <Plane size={20} className="text-blue-500" />
//                           </div>
//                         ) : (
//                           <img 
//                             src={booking.hotel?.images?.[0] ? `${BASE_URL}${booking.hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'} 
//                             alt="" 
//                             className="w-full h-full object-cover"
//                           />
//                         )}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-sm font-bold text-gray-800 truncate">
//                           {booking.type === 'flight' ? `${booking.flight?.airline || 'Flight'} ${booking.flight?.flightNumber || ''}` : booking.hotel?.name || 'Hotel Booking'}
//                         </p>
//                         <div className="flex items-center gap-2 mt-0.5">
//                           <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter ${
//                             booking.status === 'confirmed' ? 'bg-green-50 text-green-600' : 
//                             booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
//                           }`}>
//                             {booking.status}
//                           </span>
//                           <span className="text-[10px] text-gray-400 font-medium">
//                             {booking.type === 'hotel' ? new Date(booking.checkIn).toLocaleDateString() : new Date(booking.flight?.departureDate).toLocaleDateString()}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>

//             {/* Account danger zone */}
//             <div className="md:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm p-6">
//               <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">Account</h3>
//               <button onClick={() => setShowDeleteModal(true)}
//                 className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition border border-red-100">
//                 <Trash2 size={15} /> Delete Account
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ── POSTS TAB ─────────────────────────────────────────────────────── */}
//         {activeTab === "posts" && (
//           <div className="pb-12 space-y-5">
//             <div className="flex items-center justify-between">
//               <p className="text-sm text-gray-500 font-medium">{postCount} post{postCount !== 1 ? "s" : ""}</p>
//               <button onClick={() => { setEditingPost(null); setShowCreate(true); }}
//                 className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow">
//                 <Plus size={14} /> New Post
//               </button>
//             </div>
//             {posts.length === 0 ? (
//               <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
//                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
//                   <Plane size={32} className="text-blue-500" />
//                 </div>
//                 <h3 className="font-semibold text-gray-800 mb-1">No posts yet</h3>
//                 <p className="text-sm text-gray-500">Share your first travel story with the community!</p>
//               </div>
//             ) : (
//               posts.map(post => (
//                 <PostCard key={post._id} post={post}
//                   onUpdated={(p, a) => { if (a === "edit") setEditingPost(p); }}
//                   onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setPostCount(c => c - 1); }} />
//               ))
//             )}
//           </div>
//         )}

//         {/* ── REQUESTS TAB ─────────────────────────────────────────────────── */}
//         {activeTab === "requests" && (
//           <div className="pb-12">
//             {incomingRequests.length === 0 ? (
//               <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
//                 <UserCheck size={40} className="text-gray-200 mx-auto mb-3" />
//                 <h3 className="font-semibold text-gray-700 mb-1">No pending requests</h3>
//                 <p className="text-sm text-gray-400">When travelers send you buddy requests, they'll appear here.</p>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {incomingRequests.map(req => {
//                   const requester = req.requester;
//                   const src = requester?.avatar ? avatarUrl(requester.avatar) : null;
//                   return (
//                     <div key={req._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
//                       {src ? (
//                         <img src={src} alt={requester.fullName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
//                       ) : (
//                         <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 font-bold text-lg flex items-center justify-center flex-shrink-0">
//                           {requester?.fullName?.charAt(0).toUpperCase() || "T"}
//                         </div>
//                       )}
//                       <div className="flex-1 min-w-0">
//                         <p className="font-bold text-gray-900 truncate">{requester?.fullName || "Traveler"}</p>
//                         <div className="flex flex-wrap gap-2 mt-1">
//                           {requester?.travelStyle && (
//                             <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{requester.travelStyle}</span>
//                           )}
//                           {(requester?.travelInterests || []).slice(0, 2).map(i => (
//                             <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{i}</span>
//                           ))}
//                         </div>
//                         <p className="text-xs text-gray-400 mt-1">
//                           Wants to travel with you
//                           {(requester?.preferredDestinations || []).length > 0 && ` • Loves ${requester.preferredDestinations[0]}`}
//                         </p>
//                       </div>
//                       <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
//                         <button onClick={() => handleRespond(req._id, "accept")}
//                           disabled={respondingId === req._id}
//                           className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition">
//                           {respondingId === req._id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
//                         </button>
//                         <button onClick={() => handleRespond(req._id, "reject")}
//                           disabled={respondingId === req._id}
//                           className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-60 transition">
//                           <X size={13} /> Decline
//                         </button>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
//       {(showCreate || editingPost) && (
//         <CreatePostModal
//           onClose={() => { setShowCreate(false); setEditingPost(null); }}
//           onCreated={(np, edit) => {
//             if (edit) setPosts(prev => prev.map(p => p._id === np._id ? np : p));
//             else { setPosts(prev => [np, ...prev]); setPostCount(c => c + 1); }
//             setEditingPost(null);
//             setShowCreate(false);
//           }}
//           editingPost={editingPost}
//         />
//       )}

//       {/* ── Delete account Modal ──────────────────────────────────────────── */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
//           <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
//             <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
//               <Trash2 size={28} />
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
//             <p className="text-sm text-gray-500 mb-6">This is permanent. Type <span className="font-bold text-red-600">DELETE</span> to confirm.</p>
//             <input value={deleteText} onChange={e => setDeleteText(e.target.value)}
//               placeholder="DELETE" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-bold text-gray-900 focus:border-red-400 outline-none mb-5" />
//             <div className="flex gap-3">
//               <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm">Cancel</button>
//               <button onClick={handleDeleteAccount} disabled={deleting || deleteText !== "DELETE"}
//                 className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition">
//                 {deleting ? "Deleting..." : "Delete Forever"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//       {/* Photo Viewer Modal */}
//       {showPhotoView && (avatarPreview || avatarUrl(userData.avatar)) && (
//         <div 
//           className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-300"
//           onClick={() => setShowPhotoView(false)}
//         >
//           <button 
//             className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition"
//             onClick={() => setShowPhotoView(false)}
//           >
//             <X size={32} />
//           </button>
//           <img 
//             src={avatarPreview || avatarUrl(userData.avatar)} 
//             alt={userData.fullName} 
//             className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
//             onClick={(e) => e.stopPropagation()}
//           />
//         </div>
//       )}

//       {/* Profile Setup Dialogue */}
//       {showSetupModal && (
//         <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
//           <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
//             <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 mx-auto">
//               <Compass size={32} className="animate-pulse" />
//             </div>
//             <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">Complete Your Profile</h3>
//             <p className="text-gray-500 text-center mb-8 leading-relaxed">
//               To join the **Ghumna Jau** community, please take a moment to add your **location (city)** and set your **travel style**. This helps fellow travelers connect with you!
//             </p>
//             <button 
//               onClick={() => setShowSetupModal(false)}
//               className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
//             >
//               Let's Go
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// frontend/src/pages/Profile.jsx — cleaned up (no buddy requests tab)
import { useEffect, useState } from "react";
import {
  User, Users, Mail, Phone, Edit2, Save, X, Calendar, Trash2,
  MapPin, LogOut, Plane, Loader2, Camera, CheckCircle2, ChevronRight,
  TrendingUp, LayoutDashboard, Plus, Search, Globe,
  Compass, Bookmark,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getUserPosts, getSavedPosts } from "../services/feedApi";
import PostCard from "../components/feed/PostCard";
import CreatePostModal from "../components/feed/CreatePostModal";

const BASE_URL = "http://localhost:5000";

const avatarUrl = (v) => {
  if (!v) return "";
  const s = String(v);
  return s.startsWith("http") ? s : `${BASE_URL}${s}`;
};

const TRAVEL_STYLES = [
  "Adventure Seeker","Cultural Explorer","Backpacker","Luxury Traveler",
  "Eco Traveler","Solo Wanderer","Food Lover","Spiritual Seeker","Urban Explorer","Wildlife Enthusiast",
];
const TRAVEL_PACES   = ["Slow", "Moderate", "Fast"];
const BUDGET_RANGES  = [
  { value: "Budget Traveler",    label: "Budget Traveler",    desc: "NPR 1,000 – 2,000 / day" },
  { value: "Mid-Range Traveler", label: "Mid-Range Traveler", desc: "NPR 2,500 – 5,000 / day" },
  { value: "Luxury Traveler",    label: "Luxury Traveler",    desc: "NPR 6,000 – 15,000 / day" },
];
const INTEREST_PRESETS = [
  "Trekking","Food","Culture","Nightlife","Photography","Wildlife",
  "History","Beach","Mountains","Spirituality","Architecture","Sports",
];

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // tabs: overview | posts | saved
  const [activeTab, setActiveTab]       = useState("overview");
  const [isEditingBasic, setIsEditingBasic]     = useState(false);
  const [isEditingTravel, setIsEditingTravel]   = useState(false);
  const [isEditingDests, setIsEditingDests]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [showSetupModal, setShowSetupModal]     = useState(false);

  const [userData, setUserData] = useState({
    fullName: "", email: "", phone: "", avatar: "", coverImage: "",
    travelStyle: "", travelBudget: "", preferredDestinations: [], travelInterests: [],
    travelPace: "", city: "", bio: "", languages: [],
    gender: "", age: "", intentStatus: "",
    travelStats: { followersCount: 0, followingCount: 0, buddyCount: 0, totalPosts: 0 },
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);

  const [allDestinations, setAllDestinations] = useState([]);
  const [destQuery, setDestQuery]             = useState("");
  const [showDestSearch, setShowDestSearch]   = useState(false);
  const [cityQuery, setCityQuery]             = useState("");
  const [showCitySugg, setShowCitySugg]       = useState(false);
  const [interestInput, setInterestInput]     = useState("");
  const [showInterestInput, setShowInterestInput] = useState(false);

  const [posts, setPosts]       = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [activeTrips, setActiveTrips]     = useState(0);
  const [completedTrips, setCompletedTrips] = useState(0);
  const [showCreate, setShowCreate]       = useState(false);
  const [editingPost, setEditingPost]     = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText]           = useState("");
  const [deleting, setDeleting]               = useState(false);
  const [showPhotoView, setShowPhotoView]     = useState(false);

  const myId = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try { const d = JSON.parse(atob(token.split(".")[1])); return d?.id || d?._id || null; }
    catch (_) { return null; }
  })();

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");

      const [userRes, destRes, postsRes, itinRes, followRes, buddyRes, bookingRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/destinations`),
        fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/itineraries`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/buddies/connections`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/bookings/my`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const user      = await userRes.json();
      const dests     = await destRes.json();
      const postsData = postsRes.ok ? await postsRes.json() : { posts: [], total: 0 };
      const itinData  = itinRes.ok  ? await itinRes.json()  : [];
      const followData = followRes.ok ? await followRes.json() : { followersCount: 0, followingCount: 0 };
      const buddyData = buddyRes.ok ? await buddyRes.json() : { connections: [] };
      const bookingsData = bookingRes.ok ? await bookingRes.json() : [];

      setRecentBookings(Array.isArray(bookingsData) ? bookingsData.slice(0, 3) : []);
      setAllDestinations(Array.isArray(dests) ? dests : dests.destinations || []);

      if (user.fullName) {
        localStorage.setItem("username", user.fullName);
        window.dispatchEvent(new Event('userProfileUpdated'));
      }

      setUserData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || "",
        coverImage: user.coverImage || "",
        travelStyle: user.travelStyle || "",
        travelBudget: user.travelBudget || "",
        preferredDestinations: user.preferredDestinations || [],
        travelInterests: user.travelInterests || [],
        travelPace: user.travelPace || "",
        city: user.city || "",
        bio: user.bio || "",
        gender: user.gender || "",
        age: user.age || "",
        intentStatus: user.intentStatus || "Exploring",
        languages: user.languages || [],
        travelStats: {
          followersCount: followData.followersCount || 0,
          followingCount: followData.followingCount || 0,
          buddyCount: user.travelStats?.buddyCount || (buddyData.connections || []).length || 0,
          totalPosts: postsData.total || 0,
        },
      });
      if (user.avatar) setAvatarPreview(avatarUrl(user.avatar));

      setPosts(postsData.posts || []);
      setPostCount(postsData.total ?? (postsData.posts || []).length);
      const list = Array.isArray(itinData) ? itinData : [];
      setActiveTrips(list.filter(t => t.status === "active").length);
      setCompletedTrips(list.filter(t => t.status === "completed").length);

      if (!user.city || !user.travelStyle) {
        setIsEditingBasic(true);
        if (location.state?.fromCommunityRedirect) setShowSetupModal(true);
      }
    } catch (err) {
      showToast("Session expired. Please login again.", "error");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (myId) loadData(); }, [myId]);

  // Load saved posts when tab opens
  useEffect(() => {
    if (activeTab !== "saved") return;
    setSavedLoading(true);
    getSavedPosts()
      .then(res => setSavedPosts(res.data.posts || []))
      .catch(() => showToast("Failed to load saved posts", "error"))
      .finally(() => setSavedLoading(false));
  }, [activeTab]);

  const handleSave = async () => {
    setUploading(true);
    try {
      const fd = new FormData();
      Object.entries({
        fullName: userData.fullName, phone: userData.phone,
        travelStyle: userData.travelStyle, travelBudget: userData.travelBudget,
        travelPace: userData.travelPace, city: userData.city, bio: userData.bio,
        gender: userData.gender, age: userData.age, intentStatus: userData.intentStatus,
      }).forEach(([k, v]) => fd.append(k, v));
      fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
      fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
      fd.append("languages",             JSON.stringify(userData.languages));
      if (avatarFile) fd.append("avatar", avatarFile);

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setUserData(p => ({ ...p, ...updated }));
      if (updated.fullName) {
        localStorage.setItem("username", updated.fullName);
        window.dispatchEvent(new Event('userProfileUpdated'));
      }
      setIsEditingBasic(false);
      setIsEditingTravel(false);
      setIsEditingDests(false);
      showToast("Profile updated!", "success");
    } catch { showToast("Failed to update", "error"); }
    finally { setUploading(false); }
  };

  // Destinations
  const filteredDests = allDestinations.filter(d =>
    d.name.toLowerCase().includes(destQuery.toLowerCase()) &&
    !userData.preferredDestinations.includes(d.name)
  );
  const addDest    = (name) => setUserData(p => ({ ...p, preferredDestinations: [...p.preferredDestinations, name] }));
  const removeDest = (name) => setUserData(p => ({ ...p, preferredDestinations: p.preferredDestinations.filter(d => d !== name) }));

  const addInterest    = () => {
    const val = interestInput.trim();
    if (!val || userData.travelInterests.includes(val)) return;
    setUserData(p => ({ ...p, travelInterests: [...p.travelInterests, val] }));
    setInterestInput(""); setShowInterestInput(false);
  };
  const addPreset   = (tag) => {
    if (userData.travelInterests.includes(tag)) return;
    setUserData(p => ({ ...p, travelInterests: [...p.travelInterests, tag] }));
  };
  const removeInterest = (tag) => setUserData(p => ({ ...p, travelInterests: p.travelInterests.filter(t => t !== tag) }));

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return showToast("Type DELETE to confirm", "error");
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${BASE_URL}/api/users/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      localStorage.clear(); showToast("Account deleted", "success"); navigate("/login");
    } catch { showToast("Failed to delete account", "error"); }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {userData.coverImage ? (
          <img src={avatarUrl(userData.coverImage)} className="w-full h-full object-cover" alt="cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => navigate("/community")}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/55 backdrop-blur-md text-white rounded-xl text-xs font-semibold border border-white/30 hover:bg-black/65 transition">
            <LayoutDashboard size={14} /> Community
          </button>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/55 backdrop-blur-md text-white rounded-xl text-xs font-semibold border border-white/30 hover:bg-black/65 transition">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-20 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Avatar */}
            <div className="relative flex-shrink-0 mx-auto md:mx-0 w-32 h-32 md:w-40 md:h-40">
              <div className="w-full h-full rounded-[32px] md:rounded-[40px] overflow-hidden border-4 border-white shadow-xl bg-gray-100 cursor-pointer flex items-center justify-center"
                onClick={() => (avatarPreview || avatarUrl(userData.avatar)) && setShowPhotoView(true)}>
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt={userData.fullName} />
                ) : avatarUrl(userData.avatar) ? (
                  <img src={avatarUrl(userData.avatar)} className="w-full h-full object-cover" alt={userData.fullName} />
                ) : (
                  <User className="w-full h-full p-8 text-gray-300" />
                )}
              </div>
              {isEditingBasic && (
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-lg border-2 border-white transition z-20">
                  <Camera size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
                  }} />
                </label>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  {isEditingBasic ? (
                    <input value={userData.fullName}
                      onChange={e => setUserData(p => ({ ...p, fullName: e.target.value }))}
                      className="text-2xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent w-full mb-1" />
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                      {userData.fullName}
                      <CheckCircle2 size={20} className="text-blue-500 fill-blue-50 flex-shrink-0" />
                    </h1>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Mail size={13} className="text-blue-400" />{userData.email}</span>
                    {userData.phone && <span className="flex items-center gap-1"><Phone size={13} className="text-blue-400" />{userData.phone}</span>}
                    {isEditingBasic ? (
                      <div className="relative">
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-300">
                          <MapPin size={13} className="text-blue-400" />
                          <input value={cityQuery || userData.city}
                            onChange={e => { setCityQuery(e.target.value); setShowCitySugg(true); }}
                            onFocus={() => setShowCitySugg(true)}
                            placeholder="Your City"
                            className="bg-transparent outline-none text-xs font-semibold w-24" />
                        </div>
                        {showCitySugg && allDestinations.filter(d => d.name.toLowerCase().includes((cityQuery || userData.city).toLowerCase())).length > 0 && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[60] overflow-hidden p-1 min-w-[150px]">
                            {allDestinations.filter(d => d.name.toLowerCase().includes((cityQuery || userData.city).toLowerCase())).slice(0, 5).map(d => (
                              <button key={d._id}
                                onClick={() => { setUserData(p => ({ ...p, city: d.name })); setCityQuery(d.name); setShowCitySugg(false); }}
                                className="w-full flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg transition text-left">
                                <span className="text-xs font-bold text-gray-800 truncate">{d.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      userData.city && <span className="flex items-center gap-1"><MapPin size={13} className="text-blue-400" />{userData.city}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs font-bold text-gray-500">
                    {isEditingBasic ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest">Gender</label>
                          <select value={userData.gender} onChange={e => setUserData(p => ({ ...p, gender: e.target.value }))}
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs">
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">N/A</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest">Age</label>
                          <input type="number" min="1" max="120" value={userData.age}
                            onChange={e => setUserData(p => ({ ...p, age: e.target.value }))}
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs w-16" />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-widest">Status</label>
                          <select value={userData.intentStatus} onChange={e => setUserData(p => ({ ...p, intentStatus: e.target.value }))}
                            className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 outline-none text-xs">
                            <option value="Exploring">Exploring</option>
                            <option value="Planning a trip">Planning a trip</option>
                            <option value="Looking for buddy">Looking for buddy</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        {userData.gender && <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{userData.gender}</span>}
                        {userData.age && <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{userData.age} yrs</span>}
                        {userData.intentStatus && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">{userData.intentStatus}</span>}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditingBasic ? (
                    <>
                      <button onClick={handleSave} disabled={uploading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 shadow transition">
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                      <button onClick={() => setIsEditingBasic(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditingBasic(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition border border-gray-200">
                      <Edit2 size={14} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                {isEditingBasic ? (
                  <textarea value={userData.bio}
                    onChange={e => setUserData(p => ({ ...p, bio: e.target.value }))}
                    rows={2} maxLength={300} placeholder="Tell fellow travelers about yourself..."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none transition" />
                ) : (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {userData.bio || <span className="italic text-gray-400">No bio yet</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-gray-50">
            {[
              { label: "Posts",     val: postCount },
              { label: "Followers", val: userData.travelStats.followersCount },
              { label: "Following", val: userData.travelStats.followingCount },
              { label: "Connected", val: userData.travelStats.buddyCount },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center justify-center py-2 rounded-xl hover:bg-gray-50 transition">
                <p className="text-lg font-bold text-gray-900 leading-none">{s.val}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Nav — 3 tabs: overview, posts, saved */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-1.5 flex gap-1">
          {[
            { id: "overview", label: "Travel Profile", icon: Compass },
            { id: "posts",    label: `Posts (${postCount})`, icon: TrendingUp },
            { id: "saved",    label: "Saved",           icon: Bookmark },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-50"
              }`}>
              <tab.icon size={15} />{tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6 pb-12">

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Trips</p>
                <p className="text-3xl font-bold text-blue-700 mt-2">{activeTrips}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trips Completed</p>
                <p className="text-3xl font-bold text-emerald-700 mt-2">{completedTrips}</p>
              </div>
            </div>

            {/* Travel Identity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Compass size={16} className="text-blue-600" /> Travel Identity
                </h3>
                {isEditingTravel ? (
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Save</button>
                    <button onClick={() => setIsEditingTravel(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingTravel(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">Edit</button>
                )}
              </div>

              {/* Style */}
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Style</label>
                {isEditingTravel ? (
                  <div className="flex flex-wrap gap-2">
                    {TRAVEL_STYLES.map(s => (
                      <button key={s} onClick={() => setUserData(p => ({ ...p, travelStyle: s }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          userData.travelStyle === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"
                        }`}>{s}</button>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-100">
                    {userData.travelStyle || <span className="text-gray-400 italic text-xs">Not set</span>}
                  </span>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Budget</label>
                {isEditingTravel ? (
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_RANGES.map(b => (
                      <button key={b.value} onClick={() => setUserData(p => ({ ...p, travelBudget: b.value }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                          userData.travelBudget === b.value ? "bg-green-600 text-white border-green-600" : "border-gray-200 text-gray-600 hover:border-green-300"
                        }`}>
                        <span>{b.label}</span>
                        <span className={`text-[10px] ${userData.travelBudget === b.value ? "text-green-100" : "text-gray-400"}`}>{b.desc}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-100">
                    {userData.travelBudget || <span className="text-gray-400 italic text-xs">Not set</span>}
                  </span>
                )}
              </div>

              {/* Pace */}
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Travel Pace</label>
                {isEditingTravel ? (
                  <div className="flex gap-2">
                    {TRAVEL_PACES.map(p => (
                      <button key={p} onClick={() => setUserData(d => ({ ...d, travelPace: p }))}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                          userData.travelPace === p ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"
                        }`}>{p}</button>
                    ))}
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-100">
                    {userData.travelPace || <span className="text-gray-400 italic text-xs">Not set</span>}
                  </span>
                )}
              </div>

              {/* Languages */}
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Languages</label>
                {isEditingTravel ? (
                  <input value={userData.languages.join(", ")}
                    onChange={e => setUserData(p => ({ ...p, languages: e.target.value.split(",").map(l => l.trim()).filter(Boolean) }))}
                    placeholder="English, Nepali, Hindi..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {userData.languages.length
                      ? userData.languages.map(l => <span key={l} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">{l}</span>)
                      : <span className="text-gray-400 text-sm italic">Not specified</span>}
                  </div>
                )}
              </div>

              {/* Interests */}
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block mb-2">Interests</label>
                {isEditingTravel && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {INTEREST_PRESETS.filter(t => !userData.travelInterests.includes(t)).map(tag => (
                      <button key={tag} onClick={() => addPreset(tag)}
                        className="px-2.5 py-1 border border-dashed border-gray-300 text-gray-500 rounded-full text-xs hover:border-blue-400 hover:text-blue-600 transition">
                        + {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {userData.travelInterests.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold border border-orange-100">
                      {tag}
                      {isEditingTravel && (
                        <button onClick={() => removeInterest(tag)} className="text-orange-400 hover:text-red-500 transition ml-0.5"><X size={10} /></button>
                      )}
                    </span>
                  ))}
                  {isEditingTravel && (
                    showInterestInput ? (
                      <div className="flex items-center gap-1">
                        <input autoFocus value={interestInput} onChange={e => setInterestInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addInterest()}
                          placeholder="Type & Enter"
                          className="px-3 py-1.5 border-2 border-blue-300 rounded-full text-xs outline-none w-28" />
                        <button onClick={() => setShowInterestInput(false)} className="text-gray-400"><X size={13} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setShowInterestInput(true)}
                        className="px-3 py-1.5 border border-dashed border-gray-300 text-gray-400 rounded-full text-xs hover:border-blue-400 hover:text-blue-600 transition">
                        + Custom
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Preferred Destinations */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MapPin size={18} className="text-blue-600" /> Preferred Destinations
                </h3>
                <div className="flex gap-2">
                  {isEditingDests ? (
                    <>
                      <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-100">Save</button>
                      <button onClick={() => { setIsEditingDests(false); setShowDestSearch(false); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl text-xs font-bold">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditingDests(true)} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-100 transition">Edit</button>
                  )}
                  {isEditingDests && (
                    <button onClick={() => setShowDestSearch(v => !v)}
                      className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-100 transition">
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {isEditingDests && showDestSearch && (
                <div className="mb-6 relative">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={destQuery} onChange={e => setDestQuery(e.target.value)}
                      placeholder="Search destinations..."
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-[20px] text-sm focus:ring-2 focus:ring-blue-300 outline-none transition" />
                  </div>
                  {destQuery && filteredDests.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[24px] shadow-2xl z-20 max-h-60 overflow-y-auto p-2">
                      {filteredDests.map(d => (
                        <button key={d._id} onClick={() => { addDest(d.name); setDestQuery(""); setShowDestSearch(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 rounded-xl transition">
                          {d.images?.[0] && (
                            <img src={d.images[0].startsWith("http") ? d.images[0] : `${BASE_URL}${d.images[0]}`}
                              alt={d.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <p className="text-xs font-bold text-gray-800">{d.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {userData.preferredDestinations.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-2xl">
                    <MapPin size={20} className="text-gray-200 mx-auto mb-1.5" />
                    <p className="text-sm text-gray-500">No destinations added</p>
                  </div>
                ) : userData.preferredDestinations.map(destName => {
                  const d = allDestinations.find(dest => dest.name === destName);
                  const img = d?.images?.[0];
                  const imgSrc = img ? (img.startsWith("http") ? img : `${BASE_URL}${img}`) : null;
                  return (
                    <div key={destName} className="group flex items-center gap-2.5 p-1.5 bg-gray-50/50 rounded-xl border border-gray-100 hover:border-blue-100 transition">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white border border-gray-50">
                        {imgSrc ? <img src={imgSrc} alt={destName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={14} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{destName}</p>
                        {d?.country && <p className="text-xs text-gray-500">{d.country}</p>}
                      </div>
                      {isEditingDests && (
                        <button onClick={(e) => { e.stopPropagation(); removeDest(destName); }}
                          className="w-6 h-6 bg-white text-gray-400 rounded-lg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100 border border-gray-100">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" /> Recent Bookings
                </h3>
                <button onClick={() => navigate('/my-bookings')}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-2xl text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5">
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {recentBookings.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                    <Calendar size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No recent bookings</p>
                  </div>
                ) : recentBookings.map(booking => (
                  <div key={booking._id} className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white border border-gray-50">
                      {booking.type === 'flight' ? (
                        <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                          <Plane size={20} className="text-blue-500" />
                        </div>
                      ) : (
                        <img src={booking.hotel?.images?.[0] ? `${BASE_URL}${booking.hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
                          alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">
                        {booking.type === 'flight'
                          ? `${booking.flight?.airline || 'Flight'} ${booking.flight?.flightNumber || ''}`
                          : booking.hotel?.name || 'Hotel Booking'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                          booking.status === 'confirmed' ? 'bg-green-50 text-green-600' :
                          booking.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                        }`}>{booking.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-red-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wider">Account</h3>
              <button onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition border border-red-100">
                <Trash2 size={15} /> Delete Account
              </button>
            </div>
          </div>
        )}

        {/* ── POSTS ────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div className="pb-12 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">{postCount} post{postCount !== 1 ? "s" : ""}</p>
              <button onClick={() => { setEditingPost(null); setShowCreate(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow">
                <Plus size={14} /> New Post
              </button>
            </div>
            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane size={32} className="text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">No posts yet</h3>
                <p className="text-sm text-gray-500">Share your first travel story!</p>
              </div>
            ) : posts.map(post => (
              <PostCard key={post._id} post={post}
                onUpdated={(p, a) => { if (a === "edit") setEditingPost(p); }}
                onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setPostCount(c => c - 1); }} />
            ))}
          </div>
        )}

        {/* ── SAVED ────────────────────────────────────────────── */}
        {activeTab === "saved" && (
          <div className="pb-12 space-y-5">
            <p className="text-sm text-gray-500 font-medium">
              {savedPosts.length} saved post{savedPosts.length !== 1 ? "s" : ""}
            </p>
            {savedLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-blue-600" />
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bookmark size={32} className="text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">No saved posts yet</h3>
                <p className="text-sm text-gray-500">Tap the bookmark on any post to save it here.</p>
              </div>
            ) : savedPosts.map(post => (
              <PostCard key={post._id} post={post}
                onUpdated={() => {}}
                onDeleted={() => setSavedPosts(prev => prev.filter(p => p._id !== post._id))} />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {(showCreate || editingPost) && (
        <CreatePostModal
          onClose={() => { setShowCreate(false); setEditingPost(null); }}
          onCreated={(np, edit) => {
            if (edit) setPosts(prev => prev.map(p => p._id === np._id ? np : p));
            else { setPosts(prev => [np, ...prev]); setPostCount(c => c + 1); }
            setEditingPost(null); setShowCreate(false);
          }}
          editingPost={editingPost}
        />
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-500 mb-6">This is permanent. Type <span className="font-bold text-red-600">DELETE</span> to confirm.</p>
            <input value={deleteText} onChange={e => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-center font-bold text-gray-900 focus:border-red-400 outline-none mb-5" />
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting || deleteText !== "DELETE"}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition">
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {showPhotoView && (avatarPreview || avatarUrl(userData.avatar)) && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition" onClick={() => setShowPhotoView(false)}>
            <X size={32} />
          </button>
          <img src={avatarPreview || avatarUrl(userData.avatar)} alt={userData.fullName}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Setup modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 mx-auto">
              <Compass size={32} className="animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">Complete Your Profile</h3>
            <p className="text-gray-500 text-center mb-8 leading-relaxed">
              Add your location and travel style to join the community.
            </p>
            <button onClick={() => setShowSetupModal(false)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100">
              Let's Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}