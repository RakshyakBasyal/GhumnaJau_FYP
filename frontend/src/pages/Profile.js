// // // frontend/src/pages/Profile.jsx
// // import { useEffect, useState, useMemo } from "react";
// // import {
// //   Mail, MapPin, LogOut, Loader2, Camera, Plus, Search,
// //   X, Save, Edit2, Trash2, ChevronRight, Plane, Bookmark,
// //   Compass, Check, Grid3X3,
// // } from "lucide-react";
// // import { useNavigate, useLocation } from "react-router-dom";
// // import { useToast } from "../context/ToastContext";
// // import { getUserPosts, getSavedPosts } from "../services/feedApi";
// // import PostCard from "../components/feed/PostCard";
// // import CreatePostModal from "../components/feed/CreatePostModal";

// // const BASE_URL = "http://localhost:5000";
// // const av = (v) => { if (!v) return ""; const s = String(v); return s.startsWith("http") ? s : `${BASE_URL}${s}`; };

// // const STYLES  = ["Adventure Seeker","Cultural Explorer","Backpacker","Luxury Traveler","Eco Traveler","Solo Wanderer","Food Lover","Spiritual Seeker","Urban Explorer","Wildlife Enthusiast"];
// // const PACES   = ["Slow","Moderate","Fast"];
// // const BUDGETS = [
// //   { value:"Budget Traveler",    label:"Budget",    desc:"NPR 1–2k/day" },
// //   { value:"Mid-Range Traveler", label:"Mid-Range", desc:"NPR 2.5–5k/day" },
// //   { value:"Luxury Traveler",    label:"Luxury",    desc:"NPR 6–15k/day" },
// // ];
// // const PRESETS = ["Trekking","Food","Culture","Nightlife","Photography","Wildlife","History","Beach","Mountains","Spirituality","Architecture","Sports"];

// // export default function Profile() {
// //   const navigate = useNavigate();
// //   const location = useLocation();
// //   const { showToast } = useToast();

// //   const [editingBasic,  setEditingBasic]  = useState(false);
// //   const [editingTravel, setEditingTravel] = useState(false);
// //   const [editingDests,  setEditingDests]  = useState(false);
// //   const [loading,       setLoading]       = useState(true);
// //   const [saving,        setSaving]        = useState(false);
// //   const [postsTab,      setPostsTab]      = useState("posts");
// //   const [showSetupModal,  setShowSetupModal]  = useState(false);
// //   const [showDeleteModal, setShowDeleteModal] = useState(false);
// //   const [deleteText,      setDeleteText]      = useState("");
// //   const [deleting,        setDeleting]        = useState(false);
// //   const [showPhotoView,   setShowPhotoView]   = useState(false);
// //   const [expandedPost,    setExpandedPost]    = useState(null);
// //   const [editingPost,     setEditingPost]     = useState(null);
// //   const [showCreate,      setShowCreate]      = useState(false);

// //   const [userData, setUserData] = useState({
// //     fullName:"", email:"", phone:"", avatar:"", coverImage:"",
// //     travelStyle:"", travelBudget:"", preferredDestinations:[],
// //     travelInterests:[], travelPace:"", city:"", bio:"",
// //     languages:[], gender:"", age:"", intentStatus:"Exploring",
// //     travelStats:{ followersCount:0, followingCount:0, buddyCount:0 },
// //   });
// //   const [avatarPreview, setAvatarPreview] = useState(null);
// //   const [avatarFile,    setAvatarFile]    = useState(null);

// //   const [allDests,     setAllDests]     = useState([]);
// //   const [destQuery,    setDestQuery]    = useState("");
// //   const [cityQuery,    setCityQuery]    = useState("");
// //   const [showCitySugg, setShowCitySugg] = useState(false);
// //   const [langInput,    setLangInput]    = useState("");
// //   const [showLangInp,  setShowLangInp]  = useState(false);
// //   const [intInput,     setIntInput]     = useState("");
// //   const [showIntInp,   setShowIntInp]   = useState(false);

// //   const [posts,        setPosts]        = useState([]);
// //   const [postCount,    setPostCount]    = useState(0);
// //   const [savedPosts,   setSavedPosts]   = useState([]);
// //   const [savedLoading, setSavedLoading] = useState(false);
// //   const [recentBkgs,   setRecentBkgs]   = useState([]);

// //   const myId = useMemo(() => {
// //     const t = localStorage.getItem("token");
// //     if (!t) return null;
// //     try { const d = JSON.parse(atob(t.split(".")[1])); return d?.id || d?._id || null; } catch { return null; }
// //   }, []);

// //   const load = async () => {
// //     try {
// //       const token = localStorage.getItem("token");
// //       if (!token) throw new Error();
// //       const [uRes, dRes, pRes, fRes, buddyRes, bkgRes] = await Promise.all([
// //         fetch(`${BASE_URL}/api/users/me`,              { headers:{ Authorization:`Bearer ${token}` } }),
// //         fetch(`${BASE_URL}/api/destinations`),
// //         fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=30`, { headers:{ Authorization:`Bearer ${token}` } }),
// //         fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers:{ Authorization:`Bearer ${token}` } }),
// //         fetch(`${BASE_URL}/api/buddies/connections`,   { headers:{ Authorization:`Bearer ${token}` } }),
// //         fetch(`${BASE_URL}/api/bookings/my`,           { headers:{ Authorization:`Bearer ${token}` } }),
// //       ]);
// //       const u   = await uRes.json();
// //       const dst = await dRes.json();
// //       const p   = pRes.ok   ? await pRes.json()    : { posts:[],total:0 };
// //       const f   = fRes.ok   ? await fRes.json()    : {};
// //       const bud = buddyRes.ok ? await buddyRes.json() : { connections:[] };
// //       const bkg = bkgRes.ok   ? await bkgRes.json()   : [];

// //       setAllDests(Array.isArray(dst) ? dst : []);
// //       setRecentBkgs(Array.isArray(bkg) ? bkg.slice(0,3) : []);
// //       if (u.fullName) { localStorage.setItem("username", u.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
// //       setUserData({
// //         fullName:u.fullName||"", email:u.email||"", phone:u.phone||"",
// //         avatar:u.avatar||"", coverImage:u.coverImage||"",
// //         travelStyle:u.travelStyle||"", travelBudget:u.travelBudget||"",
// //         preferredDestinations:u.preferredDestinations||[], travelInterests:u.travelInterests||[],
// //         travelPace:u.travelPace||"", city:u.city||"", bio:u.bio||"",
// //         languages:u.languages||[], gender:u.gender||"", age:u.age||"",
// //         intentStatus:u.intentStatus||"Exploring",
// //         travelStats:{ followersCount:f.followersCount||0, followingCount:f.followingCount||0, buddyCount:(bud.connections||[]).length },
// //       });
// //       if (u.avatar) setAvatarPreview(av(u.avatar));
// //       setPosts(p.posts||[]);
// //       setPostCount(p.total ?? (p.posts||[]).length);
// //       if (!u.city || !u.travelStyle) { setEditingBasic(true); if (location.state?.fromCommunityRedirect) setShowSetupModal(true); }
// //     } catch { showToast("Session expired","error"); navigate("/login"); }
// //     finally { setLoading(false); }
// //   };

// //   useEffect(() => { if (myId) load(); }, [myId]);

// //   useEffect(() => {
// //     if (postsTab !== "saved") return;
// //     setSavedLoading(true);
// //     getSavedPosts().then(r=>setSavedPosts(r.data.posts||[])).catch(()=>{}).finally(()=>setSavedLoading(false));
// //   }, [postsTab]);

// //   const handleSave = async () => {
// //     setSaving(true);
// //     try {
// //       const fd = new FormData();
// //       const fields = { fullName:userData.fullName, phone:userData.phone, travelStyle:userData.travelStyle,
// //         travelBudget:userData.travelBudget, travelPace:userData.travelPace, city:userData.city,
// //         bio:userData.bio, gender:userData.gender, age:userData.age, intentStatus:userData.intentStatus };
// //       Object.entries(fields).forEach(([k,v]) => fd.append(k, v??''));
// //       fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
// //       fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
// //       fd.append("languages",             JSON.stringify(userData.languages));
// //       if (avatarFile) fd.append("avatar", avatarFile);
// //       const res = await fetch(`${BASE_URL}/api/users/profile`, { method:"PATCH", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }, body:fd });
// //       if (!res.ok) throw new Error();
// //       const updated = await res.json();
// //       setUserData(p => ({ ...p, ...updated,
// //         languages: updated.languages||p.languages,
// //         travelInterests: updated.travelInterests||p.travelInterests,
// //         preferredDestinations: updated.preferredDestinations||p.preferredDestinations,
// //       }));
// //       if (updated.fullName) { localStorage.setItem("username", updated.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
// //       setEditingBasic(false); setEditingTravel(false); setEditingDests(false);
// //       showToast("Profile updated!", "success");
// //     } catch { showToast("Failed to update","error"); }
// //     finally { setSaving(false); }
// //   };

// //   const filteredDests = useMemo(() =>
// //     destQuery.trim() ? allDests.filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()) && !userData.preferredDestinations.includes(d.name)).slice(0,5) : []
// //   , [destQuery, allDests, userData.preferredDestinations]);

// //   const handleDelete = async () => {
// //     if (deleteText !== "DELETE") return showToast("Type DELETE to confirm","error");
// //     setDeleting(true);
// //     try {
// //       await fetch(`${BASE_URL}/api/users/me`, { method:"DELETE", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } });
// //       localStorage.clear(); showToast("Account deleted","success"); navigate("/login");
// //     } catch { showToast("Failed","error"); }
// //     finally { setDeleting(false); }
// //   };

// //   if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={28}/></div>;

// //   const avatarSrc = avatarPreview || av(userData.avatar);

// //   return (
// //     <div className="min-h-screen bg-gray-50 pb-16">

// //       {/* ══ COVER ══════════════════════════════════════════════════════════ */}
// //       <div className="relative h-44 bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
// //         {userData.coverImage && <img src={av(userData.coverImage)} className="w-full h-full object-cover opacity-70" alt=""/>}
// //         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"/>
// //         <div className="absolute top-4 right-5 flex gap-2">
// //           <button onClick={() => navigate("/community")} className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm">Community</button>
// //           <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm flex items-center gap-1"><LogOut size={11}/> Logout</button>
// //         </div>
// //       </div>

// //       {/* ══ IDENTITY — fully below cover ══════════════════════════════════ */}
// //       <div className="bg-white border-b border-gray-100 shadow-sm">
// //         <div className="max-w-7xl mx-auto px-6">
// //           <div className="flex items-start gap-5 pt-0 pb-5">

// //             {/* Avatar — overlaps cover via negative margin, but identity text stays below */}
// //             <div className="relative flex-shrink-0 -mt-10">
// //               <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white bg-blue-600 shadow-lg cursor-pointer"
// //                 onClick={() => avatarSrc && setShowPhotoView(true)}>
// //                 {avatarSrc
// //                   ? <img src={avatarSrc} className="w-full h-full object-cover" alt=""/>
// //                   : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userData.fullName?.charAt(0)}</div>}
// //               </div>
// //               <div className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"/>
// //               {editingBasic && (
// //                 <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow border-2 border-white z-10">
// //                   <Camera size={13}/>
// //                   <input type="file" className="hidden" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f){ setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}}/>
// //                 </label>
// //               )}
// //             </div>

// //             {/* Name + info — all below cover level */}
// //             <div className="flex-1 min-w-0 pt-3">
// //               <div className="flex items-start justify-between gap-4">
// //                 <div className="min-w-0 flex-1">
// //                   {/* Name */}
// //                   {editingBasic
// //                     ? <input value={userData.fullName} onChange={e=>setUserData(p=>({...p,fullName:e.target.value}))}
// //                         className="text-xl font-semibold text-gray-900 border-b border-gray-300 outline-none bg-transparent w-full max-w-xs focus:border-blue-500 mb-1"/>
// //                     : <h1 className="text-xl font-semibold text-gray-900">{userData.fullName}</h1>}

// //                   {/* Meta */}
// //                   <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
// //                     <span className="flex items-center gap-1"><Mail size={11}/>{userData.email}</span>
// //                     {editingBasic ? (
// //                       <div className="relative">
// //                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:border-blue-400">
// //                           <MapPin size={11} className="text-blue-500"/>
// //                           <input value={userData.city} onChange={e=>{ setUserData(p=>({...p,city:e.target.value})); setCityQuery(e.target.value); setShowCitySugg(true); }}
// //                             onFocus={()=>setShowCitySugg(true)} placeholder="City"
// //                             className="bg-transparent outline-none text-xs w-24"/>
// //                         </div>
// //                         {showCitySugg && allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).length > 0 && (
// //                           <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
// //                             {allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).slice(0,5).map(d=>(
// //                               <button key={d._id} onClick={()=>{ setUserData(p=>({...p,city:d.name})); setCityQuery(d.name); setShowCitySugg(false); }}
// //                                 className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-0">{d.name}</button>
// //                             ))}
// //                           </div>
// //                         )}
// //                       </div>
// //                     ) : userData.city && <span className="flex items-center gap-1 text-blue-500"><MapPin size={11}/>{userData.city}</span>}
// //                     {!editingBasic && userData.age   && <span>{userData.age} yrs</span>}
// //                     {!editingBasic && userData.gender && <span>{userData.gender}</span>}
// //                   </div>

// //                   {/* Bio */}
// //                   {editingBasic
// //                     ? <textarea value={userData.bio} onChange={e=>setUserData(p=>({...p,bio:e.target.value}))} rows={2} maxLength={300} placeholder="Short bio..."
// //                         className="mt-2 w-full max-w-lg px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
// //                     : userData.bio && <p className="text-xs text-gray-500 mt-1.5 max-w-lg leading-relaxed">"{userData.bio}"</p>}

// //                   {/* Edit extra fields */}
// //                   {editingBasic && (
// //                     <div className="flex flex-wrap gap-3 mt-3">
// //                       {[
// //                         { label:"Status", node:<select value={userData.intentStatus} onChange={e=>setUserData(p=>({...p,intentStatus:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option>Exploring</option><option>Planning a trip</option><option>Looking for buddy</option></select> },
// //                         { label:"Gender", node:<select value={userData.gender} onChange={e=>setUserData(p=>({...p,gender:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option><option value="Prefer not to say">N/A</option></select> },
// //                         { label:"Age",    node:<input type="number" min="1" max="120" value={userData.age} onWheel={e=>e.target.blur()} onChange={e=>setUserData(p=>({...p,age:e.target.value}))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
// //                         { label:"Phone",  node:<input value={userData.phone} onChange={e=>setUserData(p=>({...p,phone:e.target.value}))} className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
// //                       ].map(f=>(
// //                         <div key={f.label}><p className="text-[10px] text-gray-400 mb-1">{f.label}</p>{f.node}</div>
// //                       ))}
// //                     </div>
// //                   )}

// //                   {/* Badges */}
// //                   {!editingBasic && (
// //                     <div className="flex flex-wrap gap-2 mt-2">
// //                       {userData.intentStatus && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">{userData.intentStatus}</span>}
// //                       {userData.gender && userData.age && <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{userData.gender} · {userData.age}yrs</span>}
// //                     </div>
// //                   )}
// //                 </div>

// //                 {/* Edit button */}
// //                 <div className="flex gap-2 flex-shrink-0">
// //                   {editingBasic ? (
// //                     <>
// //                       <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
// //                         {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
// //                       </button>
// //                       <button onClick={()=>{ setEditingBasic(false); load(); }} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition">Cancel</button>
// //                     </>
// //                   ) : (
// //                     <button onClick={()=>setEditingBasic(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition shadow-sm">
// //                       <Edit2 size={12}/> Edit Profile
// //                     </button>
// //                   )}
// //                 </div>
// //               </div>
// //             </div>
// //           </div>

// //           {/* Stats */}
// //           <div className="flex gap-8 py-3 border-t border-gray-50">
// //             {[
// //               { label:"Posts",     val: postCount },
// //               { label:"Followers", val: userData.travelStats.followersCount },
// //               { label:"Following", val: userData.travelStats.followingCount },
// //               { label:"Connected", val: userData.travelStats.buddyCount },
// //             ].map(s => (
// //               <div key={s.label}>
// //                 <p className="text-base font-semibold text-gray-900 leading-none">{s.val}</p>
// //                 <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       </div>

// //       {/* ══ THREE COLUMNS ══════════════════════════════════════════════════ */}
// //       <div className="max-w-7xl mx-auto px-6 mt-5">
// //         <div className="grid grid-cols-12 gap-5">

// //           {/* ── LEFT (3 cols) ─────────────────────────────────────────────── */}
// //           <div className="col-span-12 lg:col-span-3 space-y-4">

// //             {/* Travel Identity */}
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
// //               <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
// //                 <p className="text-xs font-medium text-gray-700">Travel Identity</p>
// //                 {editingTravel ? (
// //                   <div className="flex gap-1.5">
// //                     <button onClick={handleSave} disabled={saving} className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <Loader2 size={11} className="animate-spin"/> : <Check size={11}/>}</button>
// //                     <button onClick={()=>setEditingTravel(false)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={11}/></button>
// //                   </div>
// //                 ) : (
// //                   <button onClick={()=>setEditingTravel(true)} className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition"><Edit2 size={12}/></button>
// //                 )}
// //               </div>
// //               <div className="p-4 space-y-4">

// //                 {/* Style / Pace / Budget rows */}
// //                 {[
// //                   { key:"travelStyle",  label:"Style",  options: STYLES,  color:"bg-blue-50 text-blue-700 border-blue-100" },
// //                   { key:"travelPace",   label:"Pace",   options: PACES,   color:"bg-purple-50 text-purple-700 border-purple-100" },
// //                   { key:"travelBudget", label:"Budget", options: BUDGETS.map(b=>b.value), color:"bg-emerald-50 text-emerald-700 border-emerald-100" },
// //                 ].map(row => (
// //                   <div key={row.key}>
// //                     <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{row.label}</p>
// //                     {editingTravel ? (
// //                       <select value={userData[row.key]} onChange={e=>setUserData(p=>({...p,[row.key]:e.target.value}))}
// //                         className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white">
// //                         <option value="">Not set</option>
// //                         {row.options.map(o=><option key={o} value={o}>{o.replace(" Traveler","")}</option>)}
// //                       </select>
// //                     ) : (
// //                       <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${userData[row.key] ? row.color : "bg-gray-50 text-gray-300 border-gray-100"}`}>
// //                         {userData[row.key]?.replace(" Traveler","") || "Not set"}
// //                       </span>
// //                     )}
// //                   </div>
// //                 ))}

// //                 {/* Interests */}
// //                 <div>
// //                   <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Interests</p>
// //                   {editingTravel && (
// //                     <div className="flex flex-wrap gap-1 mb-1.5">
// //                       {PRESETS.filter(t=>!userData.travelInterests.includes(t)).map(t=>(
// //                         <button key={t} onClick={()=>setUserData(p=>({...p,travelInterests:[...p.travelInterests,t]}))}
// //                           className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-400 rounded-full text-[9px] hover:border-orange-300 hover:text-orange-500 transition">+{t}</button>
// //                       ))}
// //                     </div>
// //                   )}
// //                   <div className="flex flex-wrap gap-1">
// //                     {userData.travelInterests.map(t=>(
// //                       <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] border border-orange-100">
// //                         {t}{editingTravel && <button onClick={()=>setUserData(p=>({...p,travelInterests:p.travelInterests.filter(i=>i!==t)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
// //                       </span>
// //                     ))}
// //                     {editingTravel && (showIntInp
// //                       ? <div className="flex items-center gap-1"><input autoFocus value={intInput} onChange={e=>setIntInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&intInput.trim()){ setUserData(p=>({...p,travelInterests:[...p.travelInterests,intInput.trim()]})); setIntInput(""); setShowIntInp(false); }}} placeholder="Custom" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/><button onClick={()=>setShowIntInp(false)}><X size={9} className="text-gray-300"/></button></div>
// //                       : <button onClick={()=>setShowIntInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-blue-500 hover:border-blue-300">+custom</button>
// //                     )}
// //                     {!editingTravel && userData.travelInterests.length===0 && <span className="text-[10px] text-gray-300 italic">None</span>}
// //                   </div>
// //                 </div>

// //                 {/* Languages */}
// //                 <div>
// //                   <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Languages</p>
// //                   <div className="flex flex-wrap gap-1">
// //                     {userData.languages.map(l=>(
// //                       <span key={l} className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] border border-indigo-100">
// //                         {l}{editingTravel && <button onClick={()=>setUserData(p=>({...p,languages:p.languages.filter(x=>x!==l)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
// //                       </span>
// //                     ))}
// //                     {editingTravel && (showLangInp
// //                       ? <div className="flex items-center gap-1"><input autoFocus value={langInput} onChange={e=>setLangInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&langInput.trim()){ setUserData(p=>({...p,languages:[...p.languages,langInput.trim()]})); setLangInput(""); setShowLangInp(false); }}} placeholder="Language" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/><button onClick={()=>setShowLangInp(false)}><X size={9} className="text-gray-300"/></button></div>
// //                       : <button onClick={()=>setShowLangInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-indigo-500 hover:border-indigo-300">+add</button>
// //                     )}
// //                     {!editingTravel && userData.languages.length===0 && <span className="text-[10px] text-gray-300 italic">None</span>}
// //                   </div>
// //                 </div>
// //               </div>
// //             </div>

// //             {/* Recent Bookings */}
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
// //               <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
// //                 <p className="text-xs font-medium text-gray-700">Recent Bookings</p>
// //                 <button onClick={()=>navigate("/my-bookings")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">All <ChevronRight size={10}/></button>
// //               </div>
// //               <div className="p-2">
// //                 {recentBkgs.length===0
// //                   ? <p className="text-[10px] text-gray-300 italic text-center py-4">No bookings yet</p>
// //                   : recentBkgs.map(b=>(
// //                     <div key={b._id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition">
// //                       <div className="w-8 h-8 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
// //                         {b.type==="flight" ? <Plane size={13} className="text-indigo-400"/> : b.hotel?.images?.[0] ? <img src={`${BASE_URL}${b.hotel.images[0]}`} className="w-full h-full object-cover" alt=""/> : <MapPin size={13} className="text-blue-400"/>}
// //                       </div>
// //                       <div className="flex-1 min-w-0">
// //                         <p className="text-xs text-gray-700 truncate">{b.type==="flight" ? `${b.flight?.airline||"Flight"}` : b.hotel?.name||"Booking"}</p>
// //                         <span className={`text-[9px] font-medium uppercase ${b.status==="confirmed"?"text-green-500":b.status==="cancelled"?"text-red-400":"text-amber-500"}`}>{b.status}</span>
// //                       </div>
// //                     </div>
// //                   ))}
// //               </div>
// //             </div>

// //             {/* Account */}
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
// //               <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Account</p>
// //               <button onClick={()=>setShowDeleteModal(true)} className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-xs border border-red-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-1.5">
// //                 <Trash2 size={12}/> Delete Account
// //               </button>
// //             </div>
// //           </div>

// //           {/* ── CENTRE (6 cols) — Posts photo grid ────────────────────────── */}
// //           <div className="col-span-12 lg:col-span-6">
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
// //               {/* Tab bar */}
// //               <div className="flex items-center justify-between px-5 pt-4 pb-0">
// //                 <div className="flex gap-6">
// //                   {[{id:"posts",label:"Posts"},{id:"saved",label:"Saved"}].map(t=>(
// //                     <button key={t.id} onClick={()=>setPostsTab(t.id)}
// //                       className={`pb-3 text-sm border-b-2 transition ${postsTab===t.id?"border-blue-600 text-gray-900 font-medium":"border-transparent text-gray-400 hover:text-gray-600 font-normal"}`}>
// //                       {t.label} {t.id==="posts" && <span className="text-xs text-gray-400">({postCount})</span>}
// //                     </button>
// //                   ))}
// //                 </div>
// //                 {postsTab==="posts" && (
// //                   <button onClick={()=>{ setEditingPost(null); setShowCreate(true); }}
// //                     className="mb-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition">
// //                     <Plus size={13}/> New
// //                   </button>
// //                 )}
// //               </div>
// //               <div className="border-b border-gray-100"/>

// //               {/* Posts — photo grid */}
// //               {postsTab==="posts" && (
// //                 <div className="p-4">
// //                   {posts.length===0 ? (
// //                     <div className="text-center py-16 border border-dashed border-gray-100 rounded-2xl">
// //                       <Grid3X3 size={24} className="text-gray-200 mx-auto mb-2"/>
// //                       <p className="text-sm text-gray-300">No posts yet</p>
// //                       <button onClick={()=>setShowCreate(true)} className="mt-3 text-blue-500 text-xs hover:underline">Create first post</button>
// //                     </div>
// //                   ) : (
// //                     <div className="grid grid-cols-3 gap-1">
// //                       {posts.map(post => {
// //                         const img = post.images?.[0] || post.image;
// //                         return (
// //                           <button key={post._id} onClick={()=>setExpandedPost(post)}
// //                             className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group hover:opacity-90 transition">
// //                             {img
// //                               ? <img src={`${BASE_URL}${img}`} className="w-full h-full object-cover" alt=""/>
// //                               : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
// //                                   <span className="text-xs text-gray-400 text-center px-2 leading-tight line-clamp-3">{post.content?.slice(0,40)}</span>
// //                                 </div>}
// //                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
// //                               <span className="text-white text-xs font-medium">View</span>
// //                             </div>
// //                           </button>
// //                         );
// //                       })}
// //                     </div>
// //                   )}
// //                 </div>
// //               )}

// //               {/* Saved — full PostCards */}
// //               {postsTab==="saved" && (
// //                 <div className="p-4 space-y-5">
// //                   {savedLoading ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-600"/></div>
// //                     : savedPosts.length===0
// //                     ? <div className="text-center py-16 border border-dashed border-gray-100 rounded-2xl"><Bookmark size={24} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-300">Nothing saved yet</p></div>
// //                     : savedPosts.map(post=><PostCard key={post._id} post={post} onUpdated={()=>{}} onDeleted={()=>setSavedPosts(p=>p.filter(x=>x._id!==post._id))}/>)}
// //                 </div>
// //               )}
// //             </div>
// //           </div>

// //           {/* ── RIGHT (3 cols) ─────────────────────────────────────────────── */}
// //           <div className="col-span-12 lg:col-span-3 space-y-4">

// //             {/* Preferred Destinations */}
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
// //               <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
// //                 <p className="text-xs font-medium text-gray-700">Preferred Destinations</p>
// //                 {editingDests ? (
// //                   <div className="flex gap-1.5">
// //                     <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] disabled:opacity-50">{saving?"…":"Save"}</button>
// //                     <button onClick={()=>{ setEditingDests(false); setDestQuery(""); }} className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px]">Cancel</button>
// //                   </div>
// //                 ) : (
// //                   <button onClick={()=>setEditingDests(true)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"><Plus size={10}/> Add</button>
// //                 )}
// //               </div>

// //               <div className="p-3">
// //                 {editingDests && (
// //                   <div className="relative mb-3">
// //                     <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-xl border border-gray-200 focus-within:border-blue-400">
// //                       <Search size={12} className="text-gray-400 flex-shrink-0"/>
// //                       <input value={destQuery} onChange={e=>setDestQuery(e.target.value)} placeholder="Search destinations…" className="bg-transparent outline-none text-xs flex-1"/>
// //                     </div>
// //                     {filteredDests.length>0 && (
// //                       <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
// //                         {filteredDests.map(d=>(
// //                           <button key={d._id} onClick={()=>{ setUserData(p=>({...p,preferredDestinations:[...p.preferredDestinations,d.name]})); setDestQuery(""); }}
// //                             className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
// //                             {d.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" alt=""/>}
// //                             <div><p className="text-xs text-gray-800">{d.name}</p><p className="text-[10px] text-gray-400">{d.country||"Nepal"}</p></div>
// //                           </button>
// //                         ))}
// //                       </div>
// //                     )}
// //                   </div>
// //                 )}

// //                 {userData.preferredDestinations.length===0 ? (
// //                   <div className="text-center py-6">
// //                     <MapPin size={16} className="text-gray-200 mx-auto mb-1"/>
// //                     <p className="text-[10px] text-gray-300">No destinations added</p>
// //                   </div>
// //                 ) : (
// //                   <div className="space-y-1.5">
// //                     {userData.preferredDestinations.map(name=>{
// //                       const d = allDests.find(x=>x.name===name);
// //                       return (
// //                         <div key={name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition group">
// //                           <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
// //                             {d?.images?.[0]
// //                               ? <img src={`${BASE_URL}${d.images[0]}`} className="w-full h-full object-cover" alt={name}/>
// //                               : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300"/></div>}
// //                           </div>
// //                           <div className="flex-1 min-w-0">
// //                             <p className="text-xs text-gray-700 truncate">{name}</p>
// //                             {d?.country && <p className="text-[10px] text-gray-400">{d.country}</p>}
// //                           </div>
// //                           {editingDests && (
// //                             <button onClick={()=>setUserData(p=>({...p,preferredDestinations:p.preferredDestinations.filter(x=>x!==name)}))}
// //                               className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-500">
// //                               <X size={12}/>
// //                             </button>
// //                           )}
// //                         </div>
// //                       );
// //                     })}
// //                   </div>
// //                 )}
// //               </div>
// //             </div>

// //             {/* Activity summary */}
// //             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
// //               <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Activity</p>
// //               <div className="grid grid-cols-2 gap-2">
// //                 {[
// //                   { label:"Posts",     val: postCount,                          color:"text-blue-600",   bg:"bg-blue-50" },
// //                   { label:"Followers", val: userData.travelStats.followersCount, color:"text-indigo-600", bg:"bg-indigo-50" },
// //                   { label:"Following", val: userData.travelStats.followingCount, color:"text-purple-600", bg:"bg-purple-50" },
// //                   { label:"Connected", val: userData.travelStats.buddyCount,     color:"text-teal-600",   bg:"bg-teal-50" },
// //                 ].map(s=>(
// //                   <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
// //                     <p className={`text-base font-semibold ${s.color}`}>{s.val}</p>
// //                     <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       </div>

// //       {/* ── Expanded post modal ─────────────────────────────────────────── */}
// //       {expandedPost && (
// //         <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setExpandedPost(null)}>
// //           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
// //             <div className="flex items-center justify-between px-5 py-4 border-b">
// //               <p className="text-sm font-medium text-gray-900">Post</p>
// //               <div className="flex items-center gap-2">
// //                 <button onClick={()=>{ setEditingPost(expandedPost); setExpandedPost(null); setShowCreate(true); }} className="text-xs text-blue-500 hover:underline">Edit</button>
// //                 <button onClick={()=>{ setPosts(prev=>prev.filter(p=>p._id!==expandedPost._id)); setPostCount(c=>c-1); setExpandedPost(null); }} className="text-xs text-red-400 hover:underline">Delete</button>
// //                 <button onClick={()=>setExpandedPost(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={15} className="text-gray-400"/></button>
// //               </div>
// //             </div>
// //             <PostCard post={expandedPost} onUpdated={(p,a)=>{ if(a==="edit"){ setEditingPost(p); setExpandedPost(null); setShowCreate(true); }}} onDeleted={id=>{ setPosts(prev=>prev.filter(p=>p._id!==id)); setPostCount(c=>c-1); setExpandedPost(null); }}/>
// //           </div>
// //         </div>
// //       )}

// //       {/* Create/Edit modal */}
// //       {(showCreate||editingPost) && (
// //         <CreatePostModal onClose={()=>{ setShowCreate(false); setEditingPost(null); }}
// //           onCreated={(np,edit)=>{ if(edit) setPosts(prev=>prev.map(p=>p._id===np._id?np:p)); else{ setPosts(prev=>[np,...prev]); setPostCount(c=>c+1); } setEditingPost(null); setShowCreate(false); }}
// //           editingPost={editingPost}/>
// //       )}

// //       {/* Delete modal */}
// //       {showDeleteModal && (
// //         <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
// //           <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
// //             <Trash2 size={24} className="text-red-400 mx-auto mb-3"/>
// //             <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Account?</h3>
// //             <p className="text-xs text-gray-400 mb-4">Type <span className="font-bold text-red-500">DELETE</span> to confirm.</p>
// //             <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"
// //               className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm focus:border-red-400 outline-none mb-4"/>
// //             <div className="flex gap-3">
// //               <button onClick={()=>setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm">Cancel</button>
// //               <button onClick={handleDelete} disabled={deleting||deleteText!=="DELETE"} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm disabled:opacity-50">{deleting?"Deleting…":"Delete"}</button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Photo viewer */}
// //       {showPhotoView && avatarSrc && (
// //         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={()=>setShowPhotoView(false)}>
// //           <button className="absolute top-6 right-6 text-white/60 hover:text-white" onClick={()=>setShowPhotoView(false)}><X size={26}/></button>
// //           <img src={avatarSrc} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>
// //         </div>
// //       )}

// //       {/* Setup modal */}
// //       {showSetupModal && (
// //         <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
// //           <div className="bg-white rounded-2xl max-w-sm w-full p-7 shadow-2xl text-center">
// //             <Compass size={28} className="text-blue-600 mx-auto mb-4"/>
// //             <h3 className="text-base font-semibold text-gray-900 mb-2">Complete Your Profile</h3>
// //             <p className="text-sm text-gray-400 mb-5">Add your city and travel style to join the community.</p>
// //             <button onClick={()=>setShowSetupModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Let's Go</button>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // frontend/src/pages/Profile.jsx
// import { useEffect, useState, useMemo } from "react";
// import {
//   Mail, MapPin, LogOut, Loader2, Camera, Plus, Search,
//   X, Save, Edit2, Trash2, ChevronRight, Plane, Bookmark,
//   Compass, Check, Grid3X3, Map, Navigation, CheckCircle2,
// } from "lucide-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useToast } from "../context/ToastContext";
// import { getUserPosts, getSavedPosts } from "../services/feedApi";
// import PostCard from "../components/feed/PostCard";
// import CreatePostModal from "../components/feed/CreatePostModal";

// const BASE_URL = "http://localhost:5000";
// const av = (v) => { if (!v) return ""; const s = String(v); return s.startsWith("http") ? s : `${BASE_URL}${s}`; };

// const STYLES  = ["Adventure Seeker","Cultural Explorer","Backpacker","Luxury Traveler","Eco Traveler","Solo Wanderer","Food Lover","Spiritual Seeker","Urban Explorer","Wildlife Enthusiast"];
// const PACES   = ["Slow","Moderate","Fast"];
// const BUDGETS = [
//   { value:"Budget Traveler",    label:"Budget",    desc:"NPR 1–2k/day" },
//   { value:"Mid-Range Traveler", label:"Mid-Range", desc:"NPR 2.5–5k/day" },
//   { value:"Luxury Traveler",    label:"Luxury",    desc:"NPR 6–15k/day" },
// ];
// const PRESETS = ["Trekking","Food","Culture","Nightlife","Photography","Wildlife","History","Beach","Mountains","Spirituality","Architecture","Sports"];

// export default function Profile() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { showToast } = useToast();

//   const [editingBasic,    setEditingBasic]    = useState(false);
//   const [editingTravel,   setEditingTravel]   = useState(false);
//   const [editingDests,    setEditingDests]    = useState(false);
//   const [loading,         setLoading]         = useState(true);
//   const [saving,          setSaving]          = useState(false);
//   const [postsTab,        setPostsTab]        = useState("posts");
//   const [showSetupModal,  setShowSetupModal]  = useState(false);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteText,      setDeleteText]      = useState("");
//   const [deleting,        setDeleting]        = useState(false);
//   const [showPhotoView,   setShowPhotoView]   = useState(false);
//   const [expandedPost,    setExpandedPost]    = useState(null);
//   const [editingPost,     setEditingPost]     = useState(null);
//   const [showCreate,      setShowCreate]      = useState(false);
//   const [tripStats,       setTripStats]       = useState({ planning: 0, active: 0, completed: 0 });

//   const [userData, setUserData] = useState({
//     fullName:"", email:"", phone:"", avatar:"", coverImage:"",
//     travelStyle:"", travelBudget:"", preferredDestinations:[],
//     travelInterests:[], travelPace:"", city:"", bio:"",
//     languages:[], gender:"", age:"", intentStatus:"Exploring",
//     travelStats:{ followersCount:0, followingCount:0, buddyCount:0 },
//   });
//   const [avatarPreview, setAvatarPreview] = useState(null);
//   const [avatarFile,    setAvatarFile]    = useState(null);

//   const [allDests,     setAllDests]     = useState([]);
//   const [destQuery,    setDestQuery]    = useState("");
//   const [cityQuery,    setCityQuery]    = useState("");
//   const [showCitySugg, setShowCitySugg] = useState(false);
//   const [langInput,    setLangInput]    = useState("");
//   const [showLangInp,  setShowLangInp]  = useState(false);
//   const [intInput,     setIntInput]     = useState("");
//   const [showIntInp,   setShowIntInp]   = useState(false);

//   const [posts,        setPosts]        = useState([]);
//   const [postCount,    setPostCount]    = useState(0);
//   const [savedPosts,   setSavedPosts]   = useState([]);
//   const [savedLoading, setSavedLoading] = useState(false);
//   const [recentBkgs,   setRecentBkgs]   = useState([]);

//   const myId = useMemo(() => {
//     const t = localStorage.getItem("token");
//     if (!t) return null;
//     try { const d = JSON.parse(atob(t.split(".")[1])); return d?.id || d?._id || null; } catch { return null; }
//   }, []);

//   const load = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error();
//       const [uRes, dRes, pRes, fRes, buddyRes, bkgRes, iRes] = await Promise.all([
//         fetch(`${BASE_URL}/api/users/me`,              { headers:{ Authorization:`Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/destinations`),
//         fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=30`, { headers:{ Authorization:`Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers:{ Authorization:`Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/buddies/connections`,   { headers:{ Authorization:`Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/bookings/my`,           { headers:{ Authorization:`Bearer ${token}` } }),
//         fetch(`${BASE_URL}/api/itineraries`,           { headers:{ Authorization:`Bearer ${token}` } }),
//       ]);
//       const u   = await uRes.json();
//       const dst = await dRes.json();
//       const p   = pRes.ok     ? await pRes.json()     : { posts:[], total:0 };
//       const f   = fRes.ok     ? await fRes.json()     : {};
//       const bud = buddyRes.ok ? await buddyRes.json() : { connections:[] };
//       const bkg = bkgRes.ok   ? await bkgRes.json()   : [];
//       const itins = iRes.ok   ? await iRes.json()     : [];

//       setAllDests(Array.isArray(dst) ? dst : []);
//       setRecentBkgs(Array.isArray(bkg) ? bkg.slice(0,3) : []);

//       const arr = Array.isArray(itins) ? itins : [];
//       setTripStats({
//         planning:  arr.filter(i => i.status === "planning").length,
//         active:    arr.filter(i => i.status === "active").length,
//         completed: arr.filter(i => i.status === "completed").length,
//       });

//       if (u.fullName) { localStorage.setItem("username", u.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }

//       setUserData({
//         fullName:u.fullName||"", email:u.email||"", phone:u.phone||"",
//         avatar:u.avatar||"", coverImage:u.coverImage||"",
//         travelStyle:u.travelStyle||"", travelBudget:u.travelBudget||"",
//         preferredDestinations:u.preferredDestinations||[], travelInterests:u.travelInterests||[],
//         travelPace:u.travelPace||"", city:u.city||"", bio:u.bio||"",
//         languages:u.languages||[], gender:u.gender||"", age:u.age||"",
//         intentStatus:u.intentStatus||"Exploring",
//         travelStats:{
//           followersCount: f.followersCount||0,
//           followingCount: f.followingCount||0,
//           buddyCount: (bud.connections||[]).length,
//         },
//       });
//       if (u.avatar) setAvatarPreview(av(u.avatar));
//       setPosts(p.posts||[]);
//       setPostCount(p.total ?? (p.posts||[]).length);
//       if (!u.city || !u.travelStyle) { setEditingBasic(true); if (location.state?.fromCommunityRedirect) setShowSetupModal(true); }
//     } catch { showToast("Session expired","error"); navigate("/login"); }
//     finally { setLoading(false); }
//   };

//   useEffect(() => { if (myId) load(); }, [myId]);

//   useEffect(() => {
//     if (postsTab !== "saved") return;
//     setSavedLoading(true);
//     getSavedPosts().then(r=>setSavedPosts(r.data.posts||[])).catch(()=>{}).finally(()=>setSavedLoading(false));
//   }, [postsTab]);

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       const fd = new FormData();
//       const fields = {
//         fullName:userData.fullName, phone:userData.phone, travelStyle:userData.travelStyle,
//         travelBudget:userData.travelBudget, travelPace:userData.travelPace, city:userData.city,
//         bio:userData.bio, gender:userData.gender, age:userData.age, intentStatus:userData.intentStatus,
//       };
//       Object.entries(fields).forEach(([k,v]) => fd.append(k, v??''));
//       fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
//       fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
//       fd.append("languages",             JSON.stringify(userData.languages));
//       if (avatarFile) fd.append("avatar", avatarFile);
//       const res = await fetch(`${BASE_URL}/api/users/profile`, {
//         method:"PATCH",
//         headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` },
//         body:fd,
//       });
//       if (!res.ok) throw new Error();
//       const updated = await res.json();
//       // FIX: preserve travelStats — API doesn't return them
//       setUserData(p => ({
//         ...p,
//         ...updated,
//         languages:             updated.languages             || p.languages,
//         travelInterests:       updated.travelInterests       || p.travelInterests,
//         preferredDestinations: updated.preferredDestinations || p.preferredDestinations,
//         travelStats:           p.travelStats,
//       }));
//       if (updated.fullName) { localStorage.setItem("username", updated.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
//       setEditingBasic(false); setEditingTravel(false); setEditingDests(false);
//       showToast("Profile updated!", "success");
//     } catch { showToast("Failed to update","error"); }
//     finally { setSaving(false); }
//   };

//   const filteredDests = useMemo(() =>
//     destQuery.trim()
//       ? allDests.filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()) && !userData.preferredDestinations.includes(d.name)).slice(0,5)
//       : []
//   , [destQuery, allDests, userData.preferredDestinations]);

//   const handleDeleteAccount = async () => {
//     if (deleteText !== "DELETE") return showToast("Type DELETE to confirm","error");
//     setDeleting(true);
//     try {
//       await fetch(`${BASE_URL}/api/users/me`, { method:"DELETE", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } });
//       localStorage.clear(); showToast("Account deleted","success"); navigate("/login");
//     } catch { showToast("Failed","error"); }
//     finally { setDeleting(false); }
//   };

//   if (loading) return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-50">
//       <Loader2 className="animate-spin text-blue-600" size={28}/>
//     </div>
//   );

//   const avatarSrc = avatarPreview || av(userData.avatar);

//   return (
//     <div className="min-h-screen bg-gray-50 pb-16">

//       {/* ── COVER ─────────────────────────────────────────────────────────── */}
//       <div className="relative h-44 bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
//         {userData.coverImage && <img src={av(userData.coverImage)} className="w-full h-full object-cover opacity-70" alt=""/>}
//         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"/>
//         <div className="absolute top-4 right-5 flex gap-2">
//           <button onClick={() => navigate("/community")}
//             className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm">
//             Community
//           </button>
//           <button onClick={() => { localStorage.clear(); navigate("/login"); }}
//             className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm flex items-center gap-1">
//             <LogOut size={11}/> Logout
//           </button>
//         </div>
//       </div>

//       {/* ── IDENTITY HEADER ───────────────────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-100 shadow-sm">
//         <div className="max-w-7xl mx-auto px-6">
//           <div className="flex items-start gap-5 pt-0 pb-5">

//             {/* Avatar */}
//             <div className="relative flex-shrink-0 -mt-10">
//               <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white bg-blue-600 shadow-lg cursor-pointer"
//                 onClick={() => avatarSrc && setShowPhotoView(true)}>
//                 {avatarSrc
//                   ? <img src={avatarSrc} className="w-full h-full object-cover" alt=""/>
//                   : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userData.fullName?.charAt(0)}</div>}
//               </div>
//               <div className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"/>
//               {editingBasic && (
//                 <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow border-2 border-white z-10">
//                   <Camera size={13}/>
//                   <input type="file" className="hidden" accept="image/*" onChange={e => {
//                     const f = e.target.files[0];
//                     if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
//                   }}/>
//                 </label>
//               )}
//             </div>

//             {/* Name + meta */}
//             <div className="flex-1 min-w-0 pt-3">
//               <div className="flex items-start justify-between gap-4">
//                 <div className="min-w-0 flex-1">
//                   {editingBasic
//                     ? <input value={userData.fullName} onChange={e=>setUserData(p=>({...p,fullName:e.target.value}))}
//                         className="text-xl font-semibold text-gray-900 border-b border-gray-300 outline-none bg-transparent w-full max-w-xs focus:border-blue-500 mb-1"/>
//                     : <h1 className="text-xl font-semibold text-gray-900">{userData.fullName}</h1>}

//                   <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
//                     <span className="flex items-center gap-1"><Mail size={11}/>{userData.email}</span>
//                     {editingBasic ? (
//                       <div className="relative">
//                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:border-blue-400">
//                           <MapPin size={11} className="text-blue-500"/>
//                           <input value={userData.city}
//                             onChange={e=>{ setUserData(p=>({...p,city:e.target.value})); setCityQuery(e.target.value); setShowCitySugg(true); }}
//                             onFocus={()=>setShowCitySugg(true)} placeholder="City"
//                             className="bg-transparent outline-none text-xs w-24"/>
//                         </div>
//                         {showCitySugg && allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).length > 0 && (
//                           <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
//                             {allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).slice(0,5).map(d=>(
//                               <button key={d._id} onClick={()=>{ setUserData(p=>({...p,city:d.name})); setCityQuery(d.name); setShowCitySugg(false); }}
//                                 className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-0">{d.name}</button>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     ) : userData.city && <span className="flex items-center gap-1 text-blue-500"><MapPin size={11}/>{userData.city}</span>}
//                     {!editingBasic && userData.age    && <span>{userData.age} yrs</span>}
//                     {!editingBasic && userData.gender && <span>{userData.gender}</span>}
//                   </div>

//                   {editingBasic
//                     ? <textarea value={userData.bio} onChange={e=>setUserData(p=>({...p,bio:e.target.value}))} rows={2} maxLength={300} placeholder="Short bio..."
//                         className="mt-2 w-full max-w-lg px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
//                     : userData.bio && <p className="text-xs text-gray-500 mt-1.5 max-w-lg leading-relaxed">"{userData.bio}"</p>}

//                   {editingBasic && (
//                     <div className="flex flex-wrap gap-3 mt-3">
//                       {[
//                         { label:"Status", node:<select value={userData.intentStatus} onChange={e=>setUserData(p=>({...p,intentStatus:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option>Exploring</option><option>Planning a trip</option><option>Looking for buddy</option></select> },
//                         { label:"Gender", node:<select value={userData.gender} onChange={e=>setUserData(p=>({...p,gender:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option><option value="Prefer not to say">N/A</option></select> },
//                         { label:"Age",    node:<input type="number" min="1" max="120" value={userData.age} onWheel={e=>e.target.blur()} onChange={e=>setUserData(p=>({...p,age:e.target.value}))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
//                         { label:"Phone",  node:<input value={userData.phone} onChange={e=>setUserData(p=>({...p,phone:e.target.value}))} className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
//                       ].map(f=>(
//                         <div key={f.label}><p className="text-[10px] text-gray-400 mb-1">{f.label}</p>{f.node}</div>
//                       ))}
//                     </div>
//                   )}

//                   {!editingBasic && (
//                     <div className="flex flex-wrap gap-2 mt-2">
//                       {userData.intentStatus && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">{userData.intentStatus}</span>}
//                       {userData.gender && userData.age && <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{userData.gender} · {userData.age}yrs</span>}
//                     </div>
//                   )}
//                 </div>

//                 <div className="flex gap-2 flex-shrink-0">
//                   {editingBasic ? (
//                     <>
//                       <button onClick={handleSave} disabled={saving}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
//                         {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
//                       </button>
//                       <button onClick={()=>{ setEditingBasic(false); load(); }}
//                         className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition">Cancel</button>
//                     </>
//                   ) : (
//                     <button onClick={()=>setEditingBasic(true)}
//                       className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition shadow-sm">
//                       <Edit2 size={12}/> Edit Profile
//                     </button>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Stats bar */}
//           <div className="flex gap-8 py-3 border-t border-gray-100">
//             {[
//               { label:"Posts",     val: postCount },
//               { label:"Followers", val: userData.travelStats.followersCount },
//               { label:"Following", val: userData.travelStats.followingCount },
//               { label:"Connected", val: userData.travelStats.buddyCount },
//             ].map(s => (
//               <div key={s.label}>
//                 <p className="text-base font-semibold text-gray-900 leading-none">{s.val}</p>
//                 <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* ── THREE COLUMNS ─────────────────────────────────────────────────── */}
//       <div className="max-w-7xl mx-auto px-6 mt-5">
//         <div className="grid grid-cols-12 gap-5">

//           {/* ── LEFT ──────────────────────────────────────────────────────── */}
//           <div className="col-span-12 lg:col-span-3 space-y-4">

//             {/* Travel Identity */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//               <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
//                 <p className="text-xs font-semibold text-gray-700">Travel Identity</p>
//                 {editingTravel ? (
//                   <div className="flex gap-1.5">
//                     <button onClick={handleSave} disabled={saving} className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
//                       {saving ? <Loader2 size={11} className="animate-spin"/> : <Check size={11}/>}
//                     </button>
//                     <button onClick={()=>setEditingTravel(false)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={11}/></button>
//                   </div>
//                 ) : (
//                   <button onClick={()=>setEditingTravel(true)} className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition"><Edit2 size={12}/></button>
//                 )}
//               </div>
//               <div className="p-4 space-y-4">
//                 {[
//                   { key:"travelStyle",  label:"Style",  options: STYLES,              color:"bg-blue-50 text-blue-700 border-blue-100" },
//                   { key:"travelPace",   label:"Pace",   options: PACES,               color:"bg-purple-50 text-purple-700 border-purple-100" },
//                   { key:"travelBudget", label:"Budget", options: BUDGETS.map(b=>b.value), color:"bg-emerald-50 text-emerald-700 border-emerald-100" },
//                 ].map(row => (
//                   <div key={row.key}>
//                     <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">{row.label}</p>
//                     {editingTravel ? (
//                       <select value={userData[row.key]} onChange={e=>setUserData(p=>({...p,[row.key]:e.target.value}))}
//                         className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-blue-400">
//                         <option value="">Not set</option>
//                         {row.options.map(o=><option key={o} value={o}>{o.replace(" Traveler","")}</option>)}
//                       </select>
//                     ) : (
//                       <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border font-medium ${userData[row.key] ? row.color : "bg-gray-50 text-gray-300 border-gray-100"}`}>
//                         {userData[row.key]?.replace(" Traveler","") || "Not set"}
//                       </span>
//                     )}
//                   </div>
//                 ))}

//                 {/* Interests */}
//                 <div>
//                   <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Interests</p>
//                   {editingTravel && (
//                     <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-50 rounded-xl">
//                       {PRESETS.filter(t=>!userData.travelInterests.includes(t)).map(t=>(
//                         <button key={t} onClick={()=>setUserData(p=>({...p,travelInterests:[...p.travelInterests,t]}))}
//                           className="px-1.5 py-0.5 border border-dashed border-gray-300 text-gray-400 rounded-full text-[9px] hover:border-orange-300 hover:text-orange-500 transition">+{t}</button>
//                       ))}
//                     </div>
//                   )}
//                   <div className="flex flex-wrap gap-1">
//                     {userData.travelInterests.map(t=>(
//                       <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] border border-orange-100 font-medium">
//                         {t}{editingTravel && <button onClick={()=>setUserData(p=>({...p,travelInterests:p.travelInterests.filter(i=>i!==t)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
//                       </span>
//                     ))}
//                     {editingTravel && (showIntInp
//                       ? <div className="flex items-center gap-1">
//                           <input autoFocus value={intInput} onChange={e=>setIntInput(e.target.value)}
//                             onKeyDown={e=>{ if(e.key==="Enter"&&intInput.trim()){ setUserData(p=>({...p,travelInterests:[...p.travelInterests,intInput.trim()]})); setIntInput(""); setShowIntInp(false); }}}
//                             placeholder="Custom" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/>
//                           <button onClick={()=>setShowIntInp(false)}><X size={9} className="text-gray-300"/></button>
//                         </div>
//                       : <button onClick={()=>setShowIntInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-blue-500 hover:border-blue-300">+custom</button>
//                     )}
//                     {!editingTravel && userData.travelInterests.length===0 && <span className="text-[10px] text-gray-300 italic">None added</span>}
//                   </div>
//                 </div>

//                 {/* Languages */}
//                 <div>
//                   <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Languages</p>
//                   <div className="flex flex-wrap gap-1">
//                     {userData.languages.map(l=>(
//                       <span key={l} className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] border border-indigo-100 font-medium">
//                         {l}{editingTravel && <button onClick={()=>setUserData(p=>({...p,languages:p.languages.filter(x=>x!==l)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
//                       </span>
//                     ))}
//                     {editingTravel && (showLangInp
//                       ? <div className="flex items-center gap-1">
//                           <input autoFocus value={langInput} onChange={e=>setLangInput(e.target.value)}
//                             onKeyDown={e=>{ if(e.key==="Enter"&&langInput.trim()){ setUserData(p=>({...p,languages:[...p.languages,langInput.trim()]})); setLangInput(""); setShowLangInp(false); }}}
//                             placeholder="Language" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/>
//                           <button onClick={()=>setShowLangInp(false)}><X size={9} className="text-gray-300"/></button>
//                         </div>
//                       : <button onClick={()=>setShowLangInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-indigo-500 hover:border-indigo-300">+add</button>
//                     )}
//                     {!editingTravel && userData.languages.length===0 && <span className="text-[10px] text-gray-300 italic">None added</span>}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Recent Bookings */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//               <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
//                 <p className="text-xs font-semibold text-gray-700">Recent Bookings</p>
//                 <button onClick={()=>navigate("/my-bookings")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">All <ChevronRight size={10}/></button>
//               </div>
//               <div className="p-2">
//                 {recentBkgs.length===0
//                   ? <p className="text-[10px] text-gray-300 italic text-center py-4">No bookings yet</p>
//                   : recentBkgs.map(b=>(
//                     <div key={b._id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition">
//                       <div className="w-8 h-8 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
//                         {b.type==="flight"
//                           ? <Plane size={13} className="text-indigo-400"/>
//                           : b.hotel?.images?.[0]
//                             ? <img src={`${BASE_URL}${b.hotel.images[0]}`} className="w-full h-full object-cover" alt=""/>
//                             : <MapPin size={13} className="text-blue-400"/>}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-xs font-medium text-gray-700 truncate">
//                           {b.type==="flight" ? (b.flight?.airline||"Flight") : (b.hotel?.name||"Booking")}
//                         </p>
//                         <span className={`text-[9px] font-semibold uppercase ${b.status==="confirmed"?"text-green-500":b.status==="cancelled"?"text-red-400":"text-amber-500"}`}>{b.status}</span>
//                       </div>
//                     </div>
//                   ))}
//               </div>
//             </div>

//             {/* Account */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
//               <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3 font-medium">Account</p>
//               <button onClick={()=>setShowDeleteModal(true)}
//                 className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-xs border border-red-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-1.5 font-medium">
//                 <Trash2 size={12}/> Delete Account
//               </button>
//             </div>
//           </div>

//           {/* ── CENTRE ────────────────────────────────────────────────────── */}
//           <div className="col-span-12 lg:col-span-6">
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//               <div className="flex items-center justify-between px-5 pt-4 pb-0">
//                 <div className="flex gap-6">
//                   {[{id:"posts",label:"Posts"},{id:"saved",label:"Saved"}].map(t=>(
//                     <button key={t.id} onClick={()=>setPostsTab(t.id)}
//                       className={`pb-3 text-sm border-b-2 transition ${postsTab===t.id?"border-blue-600 text-gray-900 font-semibold":"border-transparent text-gray-400 hover:text-gray-600"}`}>
//                       {t.label} {t.id==="posts" && <span className="text-xs text-gray-400 font-normal">({postCount})</span>}
//                     </button>
//                   ))}
//                 </div>
//                 {postsTab==="posts" && (
//                   <button onClick={()=>{ setEditingPost(null); setShowCreate(true); }}
//                     className="mb-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition">
//                     <Plus size={13}/> New
//                   </button>
//                 )}
//               </div>
//               <div className="border-b border-gray-100"/>

//               {postsTab==="posts" && (
//                 <div className="p-4">
//                   {posts.length===0 ? (
//                     <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl">
//                       <Grid3X3 size={28} className="text-gray-200 mx-auto mb-3"/>
//                       <p className="text-sm text-gray-400 font-medium">No posts yet</p>
//                       <p className="text-xs text-gray-300 mt-1">Share your first travel moment</p>
//                       <button onClick={()=>setShowCreate(true)} className="mt-3 text-blue-500 text-xs hover:underline font-medium">Create post</button>
//                     </div>
//                   ) : (
//                     <div className="grid grid-cols-3 gap-1">
//                       {posts.map(post => {
//                         const img = post.images?.[0] || post.image;
//                         return (
//                           <button key={post._id} onClick={()=>setExpandedPost(post)}
//                             className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group hover:opacity-90 transition">
//                             {img
//                               ? <img src={`${BASE_URL}${img}`} className="w-full h-full object-cover" alt=""/>
//                               : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-2">
//                                   <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-3">{post.content?.slice(0,40)}</span>
//                                 </div>}
//                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
//                               <span className="text-white text-xs font-semibold">View</span>
//                             </div>
//                           </button>
//                         );
//                       })}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {postsTab==="saved" && (
//                 <div className="p-4 space-y-5">
//                   {savedLoading
//                     ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-600"/></div>
//                     : savedPosts.length===0
//                     ? <div className="text-center py-16 border-2 border-dashed border-gray-100 rounded-2xl">
//                         <Bookmark size={28} className="text-gray-200 mx-auto mb-3"/>
//                         <p className="text-sm text-gray-400 font-medium">Nothing saved yet</p>
//                       </div>
//                     : savedPosts.map(post=>(
//                         <PostCard key={post._id} post={post} onUpdated={()=>{}}
//                           onDeleted={()=>setSavedPosts(p=>p.filter(x=>x._id!==post._id))}/>
//                       ))}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ── RIGHT ─────────────────────────────────────────────────────── */}
//           <div className="col-span-12 lg:col-span-3 space-y-4">

//             {/* Preferred Destinations */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//               <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
//                 <p className="text-xs font-semibold text-gray-700">Preferred Destinations</p>
//                 {editingDests ? (
//                   <div className="flex gap-1.5">
//                     <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-medium disabled:opacity-50">{saving?"…":"Save"}</button>
//                     <button onClick={()=>{ setEditingDests(false); setDestQuery(""); }} className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px]">Cancel</button>
//                   </div>
//                 ) : (
//                   <button onClick={()=>setEditingDests(true)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline font-medium"><Plus size={10}/> Add</button>
//                 )}
//               </div>
//               <div className="p-3">
//                 {editingDests && (
//                   <div className="relative mb-3">
//                     <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-xl border border-gray-200 focus-within:border-blue-400">
//                       <Search size={12} className="text-gray-400 flex-shrink-0"/>
//                       <input value={destQuery} onChange={e=>setDestQuery(e.target.value)} placeholder="Search destinations…" className="bg-transparent outline-none text-xs flex-1"/>
//                     </div>
//                     {filteredDests.length>0 && (
//                       <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
//                         {filteredDests.map(d=>(
//                           <button key={d._id} onClick={()=>{ setUserData(p=>({...p,preferredDestinations:[...p.preferredDestinations,d.name]})); setDestQuery(""); }}
//                             className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
//                             {d.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" alt=""/>}
//                             <div>
//                               <p className="text-xs text-gray-800 font-medium">{d.name}</p>
//                               <p className="text-[10px] text-gray-400">{d.country||"Nepal"}</p>
//                             </div>
//                           </button>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 )}
//                 {userData.preferredDestinations.length===0 ? (
//                   <div className="text-center py-6">
//                     <MapPin size={16} className="text-gray-200 mx-auto mb-1"/>
//                     <p className="text-[10px] text-gray-300">No destinations added</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-1.5">
//                     {userData.preferredDestinations.map(name=>{
//                       const d = allDests.find(x=>x.name===name);
//                       return (
//                         <div key={name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition group">
//                           <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
//                             {d?.images?.[0]
//                               ? <img src={`${BASE_URL}${d.images[0]}`} className="w-full h-full object-cover" alt={name}/>
//                               : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300"/></div>}
//                           </div>
//                           <div className="flex-1 min-w-0">
//                             <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
//                             {d?.country && <p className="text-[10px] text-gray-400">{d.country}</p>}
//                           </div>
//                           {editingDests && (
//                             <button onClick={()=>setUserData(p=>({...p,preferredDestinations:p.preferredDestinations.filter(x=>x!==name)}))}
//                               className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-500">
//                               <X size={12}/>
//                             </button>
//                           )}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Trips */}
//             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//               <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
//                 <p className="text-xs font-semibold text-gray-700">My Trips</p>
//                 <button onClick={()=>navigate("/my-trips")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-medium">View all <ChevronRight size={10}/></button>
//               </div>
//               <div className="p-3 space-y-2">
//                 {[
//                   { label:"Planning",  val: tripStats.planning,  bg:"bg-amber-50",   text:"text-amber-600",   dot:"bg-amber-400",   icon: <Map size={12} className="text-amber-400"/> },
//                   { label:"Active",    val: tripStats.active,    bg:"bg-blue-50",    text:"text-blue-600",    dot:"bg-blue-500",    icon: <Navigation size={12} className="text-blue-500"/> },
//                   { label:"Completed", val: tripStats.completed, bg:"bg-emerald-50", text:"text-emerald-600", dot:"bg-emerald-500", icon: <CheckCircle2 size={12} className="text-emerald-500"/> },
//                 ].map(s=>(
//                   <div key={s.label} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${s.bg} border border-transparent hover:border-current/10 transition`}>
//                     <div className="flex items-center gap-2">
//                       {s.icon}
//                       <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
//                     </div>
//                     <span className={`text-sm font-bold ${s.text}`}>{s.val}</span>
//                   </div>
//                 ))}
//                 {(tripStats.planning + tripStats.active + tripStats.completed) === 0 && (
//                   <p className="text-[10px] text-gray-300 italic text-center py-2">No trips yet</p>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ── Expanded post modal ───────────────────────────────────────────── */}
//       {expandedPost && (
//         <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setExpandedPost(null)}>
//           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
//             <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
//               <p className="text-sm font-semibold text-gray-900">Post</p>
//               <div className="flex items-center gap-2">
//                 <button onClick={()=>{ setEditingPost(expandedPost); setExpandedPost(null); setShowCreate(true); }} className="text-xs text-blue-500 hover:underline font-medium">Edit</button>
//                 <button onClick={()=>setExpandedPost(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={15} className="text-gray-400"/></button>
//               </div>
//             </div>
//             <PostCard post={expandedPost}
//               onUpdated={(p,a)=>{ if(a==="edit"){ setEditingPost(p); setExpandedPost(null); setShowCreate(true); }}}
//               onDeleted={id=>{ setPosts(prev=>prev.filter(p=>p._id!==id)); setPostCount(c=>c-1); setExpandedPost(null); }}/>
//           </div>
//         </div>
//       )}

//       {/* Create/Edit modal */}
//       {(showCreate||editingPost) && (
//         <CreatePostModal
//           onClose={()=>{ setShowCreate(false); setEditingPost(null); }}
//           onCreated={(np,edit)=>{ if(edit) setPosts(prev=>prev.map(p=>p._id===np._id?np:p)); else{ setPosts(prev=>[np,...prev]); setPostCount(c=>c+1); } setEditingPost(null); setShowCreate(false); }}
//           editingPost={editingPost}/>
//       )}

//       {/* Delete account modal */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
//           <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
//             <Trash2 size={24} className="text-red-400 mx-auto mb-3"/>
//             <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Account?</h3>
//             <p className="text-xs text-gray-400 mb-4">Type <span className="font-bold text-red-500">DELETE</span> to confirm.</p>
//             <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"
//               className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm focus:border-red-400 outline-none mb-4"/>
//             <div className="flex gap-3">
//               <button onClick={()=>setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Cancel</button>
//               <button onClick={handleDeleteAccount} disabled={deleting||deleteText!=="DELETE"}
//                 className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
//                 {deleting?"Deleting…":"Delete"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Photo viewer */}
//       {showPhotoView && avatarSrc && (
//         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={()=>setShowPhotoView(false)}>
//           <button className="absolute top-6 right-6 text-white/60 hover:text-white" onClick={()=>setShowPhotoView(false)}><X size={26}/></button>
//           <img src={avatarSrc} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>
//         </div>
//       )}

//       {/* Setup modal */}
//       {showSetupModal && (
//         <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
//           <div className="bg-white rounded-2xl max-w-sm w-full p-7 shadow-2xl text-center">
//             <Compass size={28} className="text-blue-600 mx-auto mb-4"/>
//             <h3 className="text-base font-semibold text-gray-900 mb-2">Complete Your Profile</h3>
//             <p className="text-sm text-gray-400 mb-5">Add your city and travel style to join the community.</p>
//             <button onClick={()=>setShowSetupModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Let's Go</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// frontend/src/pages/Profile.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Mail, MapPin, LogOut, Loader2, Camera, Plus, Search,
  X, Save, Edit2, Trash2, ChevronRight, Plane, Bookmark,
  Compass, Check, Grid3X3, Map, Navigation, CheckCircle2,
  Users, Heart, FileText,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getSavedPosts } from "../services/feedApi";
import PostCard from "../components/feed/PostCard";
import CreatePostModal from "../components/feed/CreatePostModal";

const BASE_URL = "http://localhost:5000";
const av = (v) => { if (!v) return ""; const s = String(v); return s.startsWith("http") ? s : `${BASE_URL}${s}`; };

const STYLES  = ["Adventure Seeker","Cultural Explorer","Backpacker","Luxury Traveler","Eco Traveler","Solo Wanderer","Food Lover","Spiritual Seeker","Urban Explorer","Wildlife Enthusiast"];
const PACES   = ["Slow","Moderate","Fast"];
const BUDGETS = [
  { value:"Budget Traveler",    label:"Budget",    desc:"NPR 1–2k/day" },
  { value:"Mid-Range Traveler", label:"Mid-Range", desc:"NPR 2.5–5k/day" },
  { value:"Luxury Traveler",    label:"Luxury",    desc:"NPR 6–15k/day" },
];
const PRESETS = ["Trekking","Food","Culture","Nightlife","Photography","Wildlife","History","Beach","Mountains","Spirituality","Architecture","Sports"];

// ── Section header component for visual consistency ──────────────────────────
const SectionHeader = ({ title, accent = "blue", action }) => {
  const accents = {
    blue:    "from-blue-500 to-blue-600",
    purple:  "from-purple-500 to-indigo-500",
    emerald: "from-emerald-500 to-teal-500",
    amber:   "from-amber-400 to-orange-400",
    rose:    "from-rose-400 to-red-500",
  };
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
      <div className="flex items-center gap-2.5">
        <div className={`w-0.5 h-4 rounded-full bg-gradient-to-b ${accents[accent]}`}/>
        <p className="text-xs font-semibold text-gray-800">{title}</p>
      </div>
      {action}
    </div>
  );
};

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [editingBasic,    setEditingBasic]    = useState(false);
  const [editingTravel,   setEditingTravel]   = useState(false);
  const [editingDests,    setEditingDests]    = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [saving,          setSaving]          = useState(false);
  const [postsTab,        setPostsTab]        = useState("posts");
  const [showSetupModal,  setShowSetupModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText,      setDeleteText]      = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [showPhotoView,   setShowPhotoView]   = useState(false);
  const [expandedPost,    setExpandedPost]    = useState(null);
  const [editingPost,     setEditingPost]     = useState(null);
  const [showCreate,      setShowCreate]      = useState(false);
  const [tripStats,       setTripStats]       = useState({ planning: 0, active: 0, completed: 0 });

  const [userData, setUserData] = useState({
    fullName:"", email:"", phone:"", avatar:"", coverImage:"",
    travelStyle:"", travelBudget:"", preferredDestinations:[],
    travelInterests:[], travelPace:"", city:"", bio:"",
    languages:[], gender:"", age:"", intentStatus:"Exploring",
    travelStats:{ followersCount:0, followingCount:0, buddyCount:0 },
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);

  const [allDests,     setAllDests]     = useState([]);
  const [destQuery,    setDestQuery]    = useState("");
  const [cityQuery,    setCityQuery]    = useState("");
  const [showCitySugg, setShowCitySugg] = useState(false);
  const [langInput,    setLangInput]    = useState("");
  const [showLangInp,  setShowLangInp]  = useState(false);
  const [intInput,     setIntInput]     = useState("");
  const [showIntInp,   setShowIntInp]   = useState(false);

  const [posts,        setPosts]        = useState([]);
  const [postCount,    setPostCount]    = useState(0);
  const [savedPosts,   setSavedPosts]   = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [recentBkgs,   setRecentBkgs]   = useState([]);

  const myId = useMemo(() => {
    const t = localStorage.getItem("token");
    if (!t) return null;
    try { const d = JSON.parse(atob(t.split(".")[1])); return d?.id || d?._id || null; } catch { return null; }
  }, []);

  const load = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error();
      const [uRes, dRes, pRes, fRes, buddyRes, bkgRes, iRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users/me`,              { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/destinations`),
        fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=30`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/buddies/connections`,   { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/bookings/my`,           { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/itineraries`,           { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      const u      = await uRes.json();
      const dst    = await dRes.json();
      const p      = pRes.ok     ? await pRes.json()     : { posts:[], total:0 };
      const f      = fRes.ok     ? await fRes.json()     : {};
      const bud    = buddyRes.ok ? await buddyRes.json() : { connections:[] };
      const bkg    = bkgRes.ok   ? await bkgRes.json()   : [];
      const itins  = iRes.ok     ? await iRes.json()     : [];

      setAllDests(Array.isArray(dst) ? dst : []);
      setRecentBkgs(Array.isArray(bkg) ? bkg.slice(0,3) : []);

      const arr = Array.isArray(itins) ? itins : [];
      setTripStats({
        planning:  arr.filter(i => i.status === "planning").length,
        active:    arr.filter(i => i.status === "active").length,
        completed: arr.filter(i => i.status === "completed").length,
      });

      if (u.fullName) { localStorage.setItem("username", u.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }

      setUserData({
        fullName:u.fullName||"", email:u.email||"", phone:u.phone||"",
        avatar:u.avatar||"", coverImage:u.coverImage||"",
        travelStyle:u.travelStyle||"", travelBudget:u.travelBudget||"",
        preferredDestinations:u.preferredDestinations||[], travelInterests:u.travelInterests||[],
        travelPace:u.travelPace||"", city:u.city||"", bio:u.bio||"",
        languages:u.languages||[], gender:u.gender||"", age:u.age||"",
        intentStatus:u.intentStatus||"Exploring",
        travelStats:{
          followersCount: f.followersCount||0,
          followingCount: f.followingCount||0,
          buddyCount: (bud.connections||[]).length,
        },
      });
      if (u.avatar) setAvatarPreview(av(u.avatar));
      setPosts(p.posts||[]);
      setPostCount(p.total ?? (p.posts||[]).length);
      if (!u.city || !u.travelStyle) { setEditingBasic(true); if (location.state?.fromCommunityRedirect) setShowSetupModal(true); }
    } catch { showToast("Session expired","error"); navigate("/login"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (myId) load(); }, [myId]);

  useEffect(() => {
    if (postsTab !== "saved") return;
    setSavedLoading(true);
    getSavedPosts().then(r=>setSavedPosts(r.data.posts||[])).catch(()=>{}).finally(()=>setSavedLoading(false));
  }, [postsTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      const fields = {
        fullName:userData.fullName, phone:userData.phone, travelStyle:userData.travelStyle,
        travelBudget:userData.travelBudget, travelPace:userData.travelPace, city:userData.city,
        bio:userData.bio, gender:userData.gender, age:userData.age, intentStatus:userData.intentStatus,
      };
      Object.entries(fields).forEach(([k,v]) => fd.append(k, v??''));
      fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
      fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
      fd.append("languages",             JSON.stringify(userData.languages));
      if (avatarFile) fd.append("avatar", avatarFile);
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method:"PATCH",
        headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` },
        body:fd,
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUserData(p => ({
        ...p, ...updated,
        languages:             updated.languages             || p.languages,
        travelInterests:       updated.travelInterests       || p.travelInterests,
        preferredDestinations: updated.preferredDestinations || p.preferredDestinations,
        travelStats:           p.travelStats, // preserve — API doesn't return stats
      }));
      if (updated.fullName) { localStorage.setItem("username", updated.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
      setEditingBasic(false); setEditingTravel(false); setEditingDests(false);
      showToast("Profile updated!", "success");
    } catch { showToast("Failed to update","error"); }
    finally { setSaving(false); }
  };

  const filteredDests = useMemo(() =>
    destQuery.trim()
      ? allDests.filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()) && !userData.preferredDestinations.includes(d.name)).slice(0,5)
      : []
  , [destQuery, allDests, userData.preferredDestinations]);

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return showToast("Type DELETE to confirm","error");
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/users/me`, { method:"DELETE", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } });
      localStorage.clear(); showToast("Account deleted","success"); navigate("/login");
    } catch { showToast("Failed","error"); }
    finally { setDeleting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={28}/>
    </div>
  );

  const avatarSrc = avatarPreview || av(userData.avatar);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ── COVER ─────────────────────────────────────────────────────────── */}
      <div className="relative h-52 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 overflow-hidden">
        {userData.coverImage && <img src={av(userData.coverImage)} className="w-full h-full object-cover opacity-60" alt=""/>}
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize:"40px 40px"}}/>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"/>
        <div className="absolute top-4 right-5 flex gap-2">
          <button onClick={() => navigate("/community")}
            className="px-3 py-1.5 bg-white/15 text-white text-xs font-medium rounded-lg border border-white/25 hover:bg-white/25 transition backdrop-blur-sm">
            Community
          </button>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="px-3 py-1.5 bg-white/15 text-white text-xs font-medium rounded-lg border border-white/25 hover:bg-white/25 transition backdrop-blur-sm flex items-center gap-1">
            <LogOut size={11}/> Logout
          </button>
        </div>
      </div>

      {/* ── IDENTITY HEADER ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-start gap-5 pt-0 pb-5">

            {/* Avatar — overlaps cover */}
            <div className="relative flex-shrink-0 -mt-12">
              <div className="w-28 h-28 rounded-2xl overflow-hidden ring-4 ring-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl cursor-pointer"
                onClick={() => avatarSrc && setShowPhotoView(true)}>
                {avatarSrc
                  ? <img src={avatarSrc} className="w-full h-full object-cover" alt=""/>
                  : <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">{userData.fullName?.charAt(0)}</div>}
              </div>
              <div className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-white shadow-sm"/>
              {editingBasic && (
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-lg border-2 border-white z-10 transition">
                  <Camera size={14}/>
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    const f = e.target.files[0];
                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
                  }}/>
                </label>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editingBasic
                    ? <input value={userData.fullName} onChange={e=>setUserData(p=>({...p,fullName:e.target.value}))}
                        className="text-2xl font-bold text-gray-900 border-b-2 border-gray-200 outline-none bg-transparent w-full max-w-xs focus:border-blue-500 mb-1 pb-1"/>
                    : <h1 className="text-2xl font-bold text-gray-900 leading-tight">{userData.fullName}</h1>}

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1.5">
                    <span className="flex items-center gap-1.5"><Mail size={11} className="text-gray-300"/>{userData.email}</span>
                    {editingBasic ? (
                      <div className="relative">
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 focus-within:border-blue-400">
                          <MapPin size={11} className="text-blue-400"/>
                          <input value={userData.city}
                            onChange={e=>{ setUserData(p=>({...p,city:e.target.value})); setCityQuery(e.target.value); setShowCitySugg(true); }}
                            onFocus={()=>setShowCitySugg(true)} placeholder="City"
                            className="bg-transparent outline-none text-xs w-24 text-blue-700"/>
                        </div>
                        {showCitySugg && allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).length > 0 && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
                            {allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).slice(0,5).map(d=>(
                              <button key={d._id} onClick={()=>{ setUserData(p=>({...p,city:d.name})); setCityQuery(d.name); setShowCitySugg(false); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-0">{d.name}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : userData.city && (
                      <span className="flex items-center gap-1 text-blue-500 font-medium">
                        <MapPin size={11}/>{userData.city}
                      </span>
                    )}
                    {!editingBasic && userData.age    && <span className="text-gray-400">{userData.age} yrs</span>}
                    {!editingBasic && userData.gender && <span className="text-gray-400">{userData.gender}</span>}
                  </div>

                  {/* Bio — with left accent */}
                  {editingBasic
                    ? <textarea value={userData.bio} onChange={e=>setUserData(p=>({...p,bio:e.target.value}))} rows={2} maxLength={300} placeholder="Short bio about yourself as a traveler..."
                        className="mt-2 w-full max-w-lg px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
                    : userData.bio && (
                      <p className="text-xs text-gray-500 mt-2 max-w-lg leading-relaxed pl-3 border-l-2 border-blue-300 italic">
                        "{userData.bio}"
                      </p>
                    )}

                  {/* Edit extra fields */}
                  {editingBasic && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {[
                        { label:"Status", node:<select value={userData.intentStatus} onChange={e=>setUserData(p=>({...p,intentStatus:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option>Exploring</option><option>Planning a trip</option><option>Looking for buddy</option></select> },
                        { label:"Gender", node:<select value={userData.gender} onChange={e=>setUserData(p=>({...p,gender:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option><option value="Prefer not to say">N/A</option></select> },
                        { label:"Age",    node:<input type="number" min="1" max="120" value={userData.age} onWheel={e=>e.target.blur()} onChange={e=>setUserData(p=>({...p,age:e.target.value}))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
                        { label:"Phone",  node:<input value={userData.phone} onChange={e=>setUserData(p=>({...p,phone:e.target.value}))} className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
                      ].map(f=>(
                        <div key={f.label}><p className="text-[10px] text-gray-400 mb-1 font-medium uppercase tracking-wide">{f.label}</p>{f.node}</div>
                      ))}
                    </div>
                  )}

                  {/* Status badges */}
                  {!editingBasic && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {userData.intentStatus && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-medium shadow-sm">
                          {userData.intentStatus}
                        </span>
                      )}
                      {userData.gender && userData.age && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          {userData.gender} · {userData.age}yrs
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Edit/Save buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {editingBasic ? (
                    <>
                      <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                        {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                      </button>
                      <button onClick={()=>{ setEditingBasic(false); load(); }}
                        className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition">Cancel</button>
                    </>
                  ) : (
                    <button onClick={()=>setEditingBasic(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition shadow-sm">
                      <Edit2 size={12}/> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar — colored numbers */}
          <div className="flex gap-8 py-3 border-t border-gray-100">
            {[
              { label:"Posts",     val: postCount,                           color:"text-blue-600",   bg:"" },
              { label:"Followers", val: userData.travelStats.followersCount, color:"text-indigo-600", bg:"" },
              { label:"Following", val: userData.travelStats.followingCount, color:"text-purple-600", bg:"" },
              { label:"Connected", val: userData.travelStats.buddyCount,     color:"text-teal-600",   bg:"" },
            ].map(s => (
              <div key={s.label} className="group cursor-default">
                <p className={`text-lg font-bold leading-none ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── THREE COLUMNS ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-5">
        <div className="grid grid-cols-12 gap-5">

          {/* ── LEFT ──────────────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3 space-y-4">

            {/* Travel Identity card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader
                title="Travel Identity"
                accent="blue"
                action={editingTravel ? (
                  <div className="flex gap-1.5">
                    <button onClick={handleSave} disabled={saving} className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50 shadow-sm">
                      {saving ? <Loader2 size={11} className="animate-spin"/> : <Check size={11}/>}
                    </button>
                    <button onClick={()=>setEditingTravel(false)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={11}/></button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingTravel(true)} className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition"><Edit2 size={12}/></button>
                )}
              />
              <div className="p-4 space-y-5">
                {/* Style / Pace / Budget — each visually distinct */}
                {[
                  { key:"travelStyle",  label:"Style",  options: STYLES,                 accent:"bg-blue-600",   color:"bg-blue-50 text-blue-700 border-blue-200" },
                  { key:"travelPace",   label:"Pace",   options: PACES,                  accent:"bg-purple-500", color:"bg-purple-50 text-purple-700 border-purple-200" },
                  { key:"travelBudget", label:"Budget", options: BUDGETS.map(b=>b.value), accent:"bg-emerald-500",color:"bg-emerald-50 text-emerald-700 border-emerald-200" },
                ].map(row => (
                  <div key={row.key}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">{row.label}</p>
                    {editingTravel ? (
                      <select value={userData[row.key]} onChange={e=>setUserData(p=>({...p,[row.key]:e.target.value}))}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                        <option value="">Not set</option>
                        {row.options.map(o=><option key={o} value={o}>{o.replace(" Traveler","")}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs border font-semibold ${userData[row.key] ? row.color : "bg-gray-50 text-gray-300 border-gray-100"}`}>
                        {userData[row.key]?.replace(" Traveler","") || "Not set"}
                      </span>
                    )}
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t border-gray-100"/>

                {/* Interests */}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">Interests</p>
                  {editingTravel && (
                    <div className="flex flex-wrap gap-1 mb-2 p-2.5 bg-orange-50/50 rounded-xl border border-orange-100">
                      {PRESETS.filter(t=>!userData.travelInterests.includes(t)).map(t=>(
                        <button key={t} onClick={()=>setUserData(p=>({...p,travelInterests:[...p.travelInterests,t]}))}
                          className="px-1.5 py-0.5 border border-dashed border-orange-200 text-orange-400 rounded-full text-[9px] hover:bg-orange-100 hover:border-orange-300 transition">+{t}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {userData.travelInterests.map(t=>(
                      <span key={t} className="flex items-center gap-0.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-[10px] border border-orange-200 font-semibold">
                        {t}{editingTravel && <button onClick={()=>setUserData(p=>({...p,travelInterests:p.travelInterests.filter(i=>i!==t)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
                      </span>
                    ))}
                    {editingTravel && (showIntInp
                      ? <div className="flex items-center gap-1">
                          <input autoFocus value={intInput} onChange={e=>setIntInput(e.target.value)}
                            onKeyDown={e=>{ if(e.key==="Enter"&&intInput.trim()){ setUserData(p=>({...p,travelInterests:[...p.travelInterests,intInput.trim()]})); setIntInput(""); setShowIntInp(false); }}}
                            placeholder="Custom" className="px-2 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-20 focus:ring-1 focus:ring-blue-400"/>
                          <button onClick={()=>setShowIntInp(false)}><X size={9} className="text-gray-300"/></button>
                        </div>
                      : <button onClick={()=>setShowIntInp(true)} className="px-2 py-1 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-orange-500 hover:border-orange-300 transition">+ custom</button>
                    )}
                    {!editingTravel && userData.travelInterests.length===0 && <span className="text-[10px] text-gray-300 italic">None added yet</span>}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {userData.languages.map(l=>(
                      <span key={l} className="flex items-center gap-0.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] border border-indigo-200 font-semibold">
                        {l}{editingTravel && <button onClick={()=>setUserData(p=>({...p,languages:p.languages.filter(x=>x!==l)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
                      </span>
                    ))}
                    {editingTravel && (showLangInp
                      ? <div className="flex items-center gap-1">
                          <input autoFocus value={langInput} onChange={e=>setLangInput(e.target.value)}
                            onKeyDown={e=>{ if(e.key==="Enter"&&langInput.trim()){ setUserData(p=>({...p,languages:[...p.languages,langInput.trim()]})); setLangInput(""); setShowLangInp(false); }}}
                            placeholder="Language" className="px-2 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-20 focus:ring-1 focus:ring-blue-400"/>
                          <button onClick={()=>setShowLangInp(false)}><X size={9} className="text-gray-300"/></button>
                        </div>
                      : <button onClick={()=>setShowLangInp(true)} className="px-2 py-1 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-indigo-500 hover:border-indigo-300 transition">+ add</button>
                    )}
                    {!editingTravel && userData.languages.length===0 && <span className="text-[10px] text-gray-300 italic">None added yet</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader
                title="Recent Bookings"
                accent="purple"
                action={<button onClick={()=>navigate("/my-bookings")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-medium">All <ChevronRight size={10}/></button>}
              />
              <div className="p-2">
                {recentBkgs.length===0
                  ? <div className="text-center py-6">
                      <Plane size={18} className="text-gray-200 mx-auto mb-2"/>
                      <p className="text-[10px] text-gray-300 italic">No bookings yet</p>
                    </div>
                  : recentBkgs.map(b=>(
                    <div key={b._id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-blue-100">
                        {b.type==="flight"
                          ? <Plane size={14} className="text-indigo-500"/>
                          : b.hotel?.images?.[0]
                            ? <img src={`${BASE_URL}${b.hotel.images[0]}`} className="w-full h-full object-cover" alt=""/>
                            : <MapPin size={14} className="text-blue-400"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {b.type==="flight" ? (b.flight?.airline||"Flight") : (b.hotel?.name||"Booking")}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${b.status==="confirmed"?"text-green-500":b.status==="cancelled"?"text-red-400":"text-amber-500"}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Account — danger zone */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Account" accent="rose" />
              <div className="p-4">
                <button onClick={()=>setShowDeleteModal(true)}
                  className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-xs border border-red-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-1.5 font-semibold">
                  <Trash2 size={12}/> Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* ── CENTRE ────────────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex items-center justify-between px-5 pt-4 pb-0 bg-gray-50/40">
                <div className="flex gap-6">
                  {[{id:"posts",label:"Posts"},{id:"saved",label:"Saved"}].map(t=>(
                    <button key={t.id} onClick={()=>setPostsTab(t.id)}
                      className={`pb-3 text-sm border-b-2 transition font-medium ${postsTab===t.id?"border-blue-600 text-blue-600":"border-transparent text-gray-400 hover:text-gray-600"}`}>
                      {t.label}
                      {t.id==="posts" && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${postsTab==="posts"?"bg-blue-100 text-blue-600":"bg-gray-100 text-gray-400"}`}>{postCount}</span>}
                    </button>
                  ))}
                </div>
                {postsTab==="posts" && (
                  <button onClick={()=>{ setEditingPost(null); setShowCreate(true); }}
                    className="mb-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm">
                    <Plus size={13}/> New Post
                  </button>
                )}
              </div>
              <div className="border-b border-gray-100"/>

              {/* Posts grid */}
              {postsTab==="posts" && (
                <div className="p-4">
                  {posts.length===0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                      <Grid3X3 size={32} className="text-gray-200 mx-auto mb-3"/>
                      <p className="text-sm font-semibold text-gray-400">No posts yet</p>
                      <p className="text-xs text-gray-300 mt-1">Share your first travel moment</p>
                      <button onClick={()=>setShowCreate(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition">Create Post</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {posts.map(post => {
                        const img = post.images?.[0] || post.image;
                        return (
                          <button key={post._id} onClick={()=>setExpandedPost(post)}
                            className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 group transition-transform hover:scale-[0.98]">
                            {img
                              ? <img src={`${BASE_URL}${img}`} className="w-full h-full object-cover" alt=""/>
                              : <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3">
                                  <FileText size={16} className="text-indigo-300 mb-1.5"/>
                                  <span className="text-[10px] text-gray-500 text-center leading-tight line-clamp-3">{post.content?.slice(0,50)}</span>
                                </div>}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <div className="flex items-center gap-2 text-white">
                                <span className="flex items-center gap-1 text-[10px] font-semibold">
                                  <Heart size={10} className="fill-white"/> {post.likeCount || 0}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Saved posts */}
              {postsTab==="saved" && (
                <div className="p-4 space-y-5">
                  {savedLoading
                    ? <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-blue-500"/></div>
                    : savedPosts.length===0
                    ? <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <Bookmark size={32} className="text-gray-200 mx-auto mb-3"/>
                        <p className="text-sm font-semibold text-gray-400">Nothing saved yet</p>
                        <p className="text-xs text-gray-300 mt-1">Save posts from the community feed</p>
                      </div>
                    : savedPosts.map(post=>(
                        <PostCard key={post._id} post={post} onUpdated={()=>{}}
                          onDeleted={()=>setSavedPosts(p=>p.filter(x=>x._id!==post._id))}/>
                      ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT ─────────────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3 space-y-4">

            {/* Preferred Destinations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader
                title="Preferred Destinations"
                accent="emerald"
                action={editingDests ? (
                  <div className="flex gap-1.5">
                    <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 shadow-sm">{saving?"…":"Save"}</button>
                    <button onClick={()=>{ setEditingDests(false); setDestQuery(""); }} className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px]">Cancel</button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingDests(true)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline font-semibold"><Plus size={10}/> Add</button>
                )}
              />
              <div className="p-3">
                {editingDests && (
                  <div className="relative mb-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:bg-blue-50/30 transition">
                      <Search size={12} className="text-gray-400 flex-shrink-0"/>
                      <input value={destQuery} onChange={e=>setDestQuery(e.target.value)} placeholder="Search destinations…" className="bg-transparent outline-none text-xs flex-1"/>
                    </div>
                    {filteredDests.length>0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                        {filteredDests.map(d=>(
                          <button key={d._id} onClick={()=>{ setUserData(p=>({...p,preferredDestinations:[...p.preferredDestinations,d.name]})); setDestQuery(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0 transition">
                            {d.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt=""/>}
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{d.name}</p>
                              <p className="text-[10px] text-gray-400">{d.country||"Nepal"}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {userData.preferredDestinations.length===0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <MapPin size={18} className="text-gray-200"/>
                    </div>
                    <p className="text-[10px] text-gray-300 font-medium">No destinations added</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {userData.preferredDestinations.map(name=>{
                      const d = allDests.find(x=>x.name===name);
                      return (
                        <div key={name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition group">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 flex-shrink-0 border border-gray-100 shadow-sm">
                            {d?.images?.[0]
                              ? <img src={`${BASE_URL}${d.images[0]}`} className="w-full h-full object-cover" alt={name}/>
                              : <div className="w-full h-full flex items-center justify-center"><MapPin size={13} className="text-indigo-300"/></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
                            {d?.country && <p className="text-[10px] text-gray-400 mt-0.5">{d.country}</p>}
                          </div>
                          {editingDests && (
                            <button onClick={()=>setUserData(p=>({...p,preferredDestinations:p.preferredDestinations.filter(x=>x!==name)}))}
                              className="opacity-0 group-hover:opacity-100 transition p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                              <X size={12}/>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* My Trips — with correct navigate route */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader
                title="My Trips"
                accent="amber"
                action={
                  <button onClick={()=>navigate("/itinerary")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-semibold">
                    View all <ChevronRight size={10}/>
                  </button>
                }
              />
              <div className="p-3 space-y-2">
                {[
                  {
                    label:"Planning",
                    val: tripStats.planning,
                    bg:"bg-amber-50", text:"text-amber-700", border:"border-amber-100",
                    icon: <Map size={13} className="text-amber-500"/>,
                    dot: "bg-amber-400",
                  },
                  {
                    label:"Active",
                    val: tripStats.active,
                    bg:"bg-blue-50", text:"text-blue-700", border:"border-blue-100",
                    icon: <Navigation size={13} className="text-blue-500"/>,
                    dot: "bg-blue-500",
                  },
                  {
                    label:"Completed",
                    val: tripStats.completed,
                    bg:"bg-emerald-50", text:"text-emerald-700", border:"border-emerald-100",
                    icon: <CheckCircle2 size={13} className="text-emerald-500"/>,
                    dot: "bg-emerald-500",
                  },
                ].map(s=>(
                  <button key={s.label} onClick={()=>navigate("/itinerary")}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl ${s.bg} border ${s.border} hover:opacity-80 transition text-left`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        {s.icon}
                      </div>
                      <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold ${s.text}`}>{s.val}</span>
                      {s.val > 0 && <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`}/>}
                    </div>
                  </button>
                ))}
                {(tripStats.planning + tripStats.active + tripStats.completed) === 0 && (
                  <div className="text-center py-4">
                    <Map size={20} className="text-gray-200 mx-auto mb-1"/>
                    <p className="text-[10px] text-gray-300 italic">No trips yet — plan your first!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SectionHeader title="Activity" accent="purple"/>
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
                {[
                  { label:"Posts",     val: postCount,                           color:"text-blue-600",   bg:"bg-blue-50/50",   icon:<FileText size={14} className="text-blue-400"/> },
                  { label:"Followers", val: userData.travelStats.followersCount, color:"text-indigo-600", bg:"bg-indigo-50/50", icon:<Users size={14} className="text-indigo-400"/> },
                  { label:"Following", val: userData.travelStats.followingCount, color:"text-purple-600", bg:"bg-purple-50/50", icon:<Users size={14} className="text-purple-400"/> },
                  { label:"Connected", val: userData.travelStats.buddyCount,     color:"text-teal-600",   bg:"bg-teal-50/50",   icon:<Heart size={14} className="text-teal-400"/> },
                ].map(s=>(
                  <div key={s.label} className={`${s.bg} p-4 text-center`}>
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded post modal ───────────────────────────────────────────── */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setExpandedPost(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-900">Post</p>
              <div className="flex items-center gap-2">
                <button onClick={()=>{ setEditingPost(expandedPost); setExpandedPost(null); setShowCreate(true); }} className="text-xs text-blue-500 hover:underline font-medium">Edit</button>
                <button onClick={()=>setExpandedPost(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={15} className="text-gray-400"/></button>
              </div>
            </div>
            <PostCard post={expandedPost}
              onUpdated={(p,a)=>{ if(a==="edit"){ setEditingPost(p); setExpandedPost(null); setShowCreate(true); }}}
              onDeleted={id=>{ setPosts(prev=>prev.filter(p=>p._id!==id)); setPostCount(c=>c-1); setExpandedPost(null); }}/>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate||editingPost) && (
        <CreatePostModal
          onClose={()=>{ setShowCreate(false); setEditingPost(null); }}
          onCreated={(np,edit)=>{ if(edit) setPosts(prev=>prev.map(p=>p._id===np._id?np:p)); else{ setPosts(prev=>[np,...prev]); setPostCount(c=>c+1); } setEditingPost(null); setShowCreate(false); }}
          editingPost={editingPost}/>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500"/>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete Account?</h3>
            <p className="text-xs text-gray-400 mb-4">This cannot be undone. Type <span className="font-bold text-red-500">DELETE</span> to confirm.</p>
            <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm focus:border-red-400 outline-none mb-4 font-mono tracking-widest"/>
            <div className="flex gap-3">
              <button onClick={()=>setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting||deleteText!=="DELETE"}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-red-700 transition">
                {deleting?"Deleting…":"Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {showPhotoView && avatarSrc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={()=>setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition" onClick={()=>setShowPhotoView(false)}>
            <X size={20}/>
          </button>
          <img src={avatarSrc} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      {/* Setup modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Compass size={28} className="text-blue-600"/>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Complete Your Profile</h3>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">Add your city and travel style to get matched with compatible travel buddies.</p>
            <button onClick={()=>setShowSetupModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              Let's Go →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}