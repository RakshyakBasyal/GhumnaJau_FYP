// frontend/src/pages/Profile.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Mail, MapPin, LogOut, Loader2, Camera, Plus, Search,
  X, Save, Edit2, Trash2, ChevronRight, Plane, Bookmark,
  Compass, Check, Grid3X3,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { getUserPosts, getSavedPosts } from "../services/feedApi";
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

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [editingBasic,  setEditingBasic]  = useState(false);
  const [editingTravel, setEditingTravel] = useState(false);
  const [editingDests,  setEditingDests]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [postsTab,      setPostsTab]      = useState("posts");
  const [showSetupModal,  setShowSetupModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText,      setDeleteText]      = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [showPhotoView,   setShowPhotoView]   = useState(false);
  const [expandedPost,    setExpandedPost]    = useState(null);
  const [editingPost,     setEditingPost]     = useState(null);
  const [showCreate,      setShowCreate]      = useState(false);

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
      const [uRes, dRes, pRes, fRes, buddyRes, bkgRes] = await Promise.all([
        fetch(`${BASE_URL}/api/users/me`,              { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/destinations`),
        fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=30`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/follows/${myId}/stats`, { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/buddies/connections`,   { headers:{ Authorization:`Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/bookings/my`,           { headers:{ Authorization:`Bearer ${token}` } }),
      ]);
      const u   = await uRes.json();
      const dst = await dRes.json();
      const p   = pRes.ok   ? await pRes.json()    : { posts:[],total:0 };
      const f   = fRes.ok   ? await fRes.json()    : {};
      const bud = buddyRes.ok ? await buddyRes.json() : { connections:[] };
      const bkg = bkgRes.ok   ? await bkgRes.json()   : [];

      setAllDests(Array.isArray(dst) ? dst : []);
      setRecentBkgs(Array.isArray(bkg) ? bkg.slice(0,3) : []);
      if (u.fullName) { localStorage.setItem("username", u.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
      setUserData({
        fullName:u.fullName||"", email:u.email||"", phone:u.phone||"",
        avatar:u.avatar||"", coverImage:u.coverImage||"",
        travelStyle:u.travelStyle||"", travelBudget:u.travelBudget||"",
        preferredDestinations:u.preferredDestinations||[], travelInterests:u.travelInterests||[],
        travelPace:u.travelPace||"", city:u.city||"", bio:u.bio||"",
        languages:u.languages||[], gender:u.gender||"", age:u.age||"",
        intentStatus:u.intentStatus||"Exploring",
        travelStats:{ followersCount:f.followersCount||0, followingCount:f.followingCount||0, buddyCount:(bud.connections||[]).length },
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
      const fields = { fullName:userData.fullName, phone:userData.phone, travelStyle:userData.travelStyle,
        travelBudget:userData.travelBudget, travelPace:userData.travelPace, city:userData.city,
        bio:userData.bio, gender:userData.gender, age:userData.age, intentStatus:userData.intentStatus };
      Object.entries(fields).forEach(([k,v]) => fd.append(k, v??''));
      fd.append("preferredDestinations", JSON.stringify(userData.preferredDestinations));
      fd.append("travelInterests",       JSON.stringify(userData.travelInterests));
      fd.append("languages",             JSON.stringify(userData.languages));
      if (avatarFile) fd.append("avatar", avatarFile);
      const res = await fetch(`${BASE_URL}/api/users/profile`, { method:"PATCH", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` }, body:fd });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUserData(p => ({ ...p, ...updated,
        languages: updated.languages||p.languages,
        travelInterests: updated.travelInterests||p.travelInterests,
        preferredDestinations: updated.preferredDestinations||p.preferredDestinations,
      }));
      if (updated.fullName) { localStorage.setItem("username", updated.fullName); window.dispatchEvent(new Event("userProfileUpdated")); }
      setEditingBasic(false); setEditingTravel(false); setEditingDests(false);
      showToast("Profile updated!", "success");
    } catch { showToast("Failed to update","error"); }
    finally { setSaving(false); }
  };

  const filteredDests = useMemo(() =>
    destQuery.trim() ? allDests.filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()) && !userData.preferredDestinations.includes(d.name)).slice(0,5) : []
  , [destQuery, allDests, userData.preferredDestinations]);

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return showToast("Type DELETE to confirm","error");
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/users/me`, { method:"DELETE", headers:{ Authorization:`Bearer ${localStorage.getItem("token")}` } });
      localStorage.clear(); showToast("Account deleted","success"); navigate("/login");
    } catch { showToast("Failed","error"); }
    finally { setDeleting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={28}/></div>;

  const avatarSrc = avatarPreview || av(userData.avatar);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ══ COVER ══════════════════════════════════════════════════════════ */}
      <div className="relative h-44 bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden">
        {userData.coverImage && <img src={av(userData.coverImage)} className="w-full h-full object-cover opacity-70" alt=""/>}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"/>
        <div className="absolute top-4 right-5 flex gap-2">
          <button onClick={() => navigate("/community")} className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm">Community</button>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="px-3 py-1.5 bg-black/25 text-white text-xs font-medium rounded-lg border border-white/20 hover:bg-black/40 transition backdrop-blur-sm flex items-center gap-1"><LogOut size={11}/> Logout</button>
        </div>
      </div>

      {/* ══ IDENTITY — fully below cover ══════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-start gap-5 pt-0 pb-5">

            {/* Avatar — overlaps cover via negative margin, but identity text stays below */}
            <div className="relative flex-shrink-0 -mt-10">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white bg-blue-600 shadow-lg cursor-pointer"
                onClick={() => avatarSrc && setShowPhotoView(true)}>
                {avatarSrc
                  ? <img src={avatarSrc} className="w-full h-full object-cover" alt=""/>
                  : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userData.fullName?.charAt(0)}</div>}
              </div>
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 bg-green-400 rounded-full ring-2 ring-white"/>
              {editingBasic && (
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow border-2 border-white z-10">
                  <Camera size={13}/>
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f){ setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}}/>
                </label>
              )}
            </div>

            {/* Name + info — all below cover level */}
            <div className="flex-1 min-w-0 pt-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Name */}
                  {editingBasic
                    ? <input value={userData.fullName} onChange={e=>setUserData(p=>({...p,fullName:e.target.value}))}
                        className="text-xl font-semibold text-gray-900 border-b border-gray-300 outline-none bg-transparent w-full max-w-xs focus:border-blue-500 mb-1"/>
                    : <h1 className="text-xl font-semibold text-gray-900">{userData.fullName}</h1>}

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Mail size={11}/>{userData.email}</span>
                    {editingBasic ? (
                      <div className="relative">
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:border-blue-400">
                          <MapPin size={11} className="text-blue-500"/>
                          <input value={userData.city} onChange={e=>{ setUserData(p=>({...p,city:e.target.value})); setCityQuery(e.target.value); setShowCitySugg(true); }}
                            onFocus={()=>setShowCitySugg(true)} placeholder="City"
                            className="bg-transparent outline-none text-xs w-24"/>
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
                    ) : userData.city && <span className="flex items-center gap-1 text-blue-500"><MapPin size={11}/>{userData.city}</span>}
                    {!editingBasic && userData.age   && <span>{userData.age} yrs</span>}
                    {!editingBasic && userData.gender && <span>{userData.gender}</span>}
                  </div>

                  {/* Bio */}
                  {editingBasic
                    ? <textarea value={userData.bio} onChange={e=>setUserData(p=>({...p,bio:e.target.value}))} rows={2} maxLength={300} placeholder="Short bio..."
                        className="mt-2 w-full max-w-lg px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
                    : userData.bio && <p className="text-xs text-gray-500 mt-1.5 max-w-lg leading-relaxed">"{userData.bio}"</p>}

                  {/* Edit extra fields */}
                  {editingBasic && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      {[
                        { label:"Status", node:<select value={userData.intentStatus} onChange={e=>setUserData(p=>({...p,intentStatus:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option>Exploring</option><option>Planning a trip</option><option>Looking for buddy</option></select> },
                        { label:"Gender", node:<select value={userData.gender} onChange={e=>setUserData(p=>({...p,gender:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option><option value="Prefer not to say">N/A</option></select> },
                        { label:"Age",    node:<input type="number" min="1" max="120" value={userData.age} onWheel={e=>e.target.blur()} onChange={e=>setUserData(p=>({...p,age:e.target.value}))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
                        { label:"Phone",  node:<input value={userData.phone} onChange={e=>setUserData(p=>({...p,phone:e.target.value}))} className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/> },
                      ].map(f=>(
                        <div key={f.label}><p className="text-[10px] text-gray-400 mb-1">{f.label}</p>{f.node}</div>
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  {!editingBasic && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {userData.intentStatus && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">{userData.intentStatus}</span>}
                      {userData.gender && userData.age && <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{userData.gender} · {userData.age}yrs</span>}
                    </div>
                  )}
                </div>

                {/* Edit button */}
                <div className="flex gap-2 flex-shrink-0">
                  {editingBasic ? (
                    <>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                        {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                      </button>
                      <button onClick={()=>{ setEditingBasic(false); load(); }} className="px-4 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-200 transition">Cancel</button>
                    </>
                  ) : (
                    <button onClick={()=>setEditingBasic(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition shadow-sm">
                      <Edit2 size={12}/> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 py-3 border-t border-gray-50">
            {[
              { label:"Posts",     val: postCount },
              { label:"Followers", val: userData.travelStats.followersCount },
              { label:"Following", val: userData.travelStats.followingCount },
              { label:"Connected", val: userData.travelStats.buddyCount },
            ].map(s => (
              <div key={s.label}>
                <p className="text-base font-semibold text-gray-900 leading-none">{s.val}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ THREE COLUMNS ══════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 mt-5">
        <div className="grid grid-cols-12 gap-5">

          {/* ── LEFT (3 cols) ─────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3 space-y-4">

            {/* Travel Identity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Travel Identity</p>
                {editingTravel ? (
                  <div className="flex gap-1.5">
                    <button onClick={handleSave} disabled={saving} className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? <Loader2 size={11} className="animate-spin"/> : <Check size={11}/>}</button>
                    <button onClick={()=>setEditingTravel(false)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={11}/></button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingTravel(true)} className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg transition"><Edit2 size={12}/></button>
                )}
              </div>
              <div className="p-4 space-y-4">

                {/* Style / Pace / Budget rows */}
                {[
                  { key:"travelStyle",  label:"Style",  options: STYLES,  color:"bg-blue-50 text-blue-700 border-blue-100" },
                  { key:"travelPace",   label:"Pace",   options: PACES,   color:"bg-purple-50 text-purple-700 border-purple-100" },
                  { key:"travelBudget", label:"Budget", options: BUDGETS.map(b=>b.value), color:"bg-emerald-50 text-emerald-700 border-emerald-100" },
                ].map(row => (
                  <div key={row.key}>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">{row.label}</p>
                    {editingTravel ? (
                      <select value={userData[row.key]} onChange={e=>setUserData(p=>({...p,[row.key]:e.target.value}))}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white">
                        <option value="">Not set</option>
                        {row.options.map(o=><option key={o} value={o}>{o.replace(" Traveler","")}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${userData[row.key] ? row.color : "bg-gray-50 text-gray-300 border-gray-100"}`}>
                        {userData[row.key]?.replace(" Traveler","") || "Not set"}
                      </span>
                    )}
                  </div>
                ))}

                {/* Interests */}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Interests</p>
                  {editingTravel && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {PRESETS.filter(t=>!userData.travelInterests.includes(t)).map(t=>(
                        <button key={t} onClick={()=>setUserData(p=>({...p,travelInterests:[...p.travelInterests,t]}))}
                          className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-400 rounded-full text-[9px] hover:border-orange-300 hover:text-orange-500 transition">+{t}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {userData.travelInterests.map(t=>(
                      <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] border border-orange-100">
                        {t}{editingTravel && <button onClick={()=>setUserData(p=>({...p,travelInterests:p.travelInterests.filter(i=>i!==t)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
                      </span>
                    ))}
                    {editingTravel && (showIntInp
                      ? <div className="flex items-center gap-1"><input autoFocus value={intInput} onChange={e=>setIntInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&intInput.trim()){ setUserData(p=>({...p,travelInterests:[...p.travelInterests,intInput.trim()]})); setIntInput(""); setShowIntInp(false); }}} placeholder="Custom" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/><button onClick={()=>setShowIntInp(false)}><X size={9} className="text-gray-300"/></button></div>
                      : <button onClick={()=>setShowIntInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-blue-500 hover:border-blue-300">+custom</button>
                    )}
                    {!editingTravel && userData.travelInterests.length===0 && <span className="text-[10px] text-gray-300 italic">None</span>}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {userData.languages.map(l=>(
                      <span key={l} className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] border border-indigo-100">
                        {l}{editingTravel && <button onClick={()=>setUserData(p=>({...p,languages:p.languages.filter(x=>x!==l)}))}><X size={8} className="ml-0.5 hover:text-red-500"/></button>}
                      </span>
                    ))}
                    {editingTravel && (showLangInp
                      ? <div className="flex items-center gap-1"><input autoFocus value={langInput} onChange={e=>setLangInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&langInput.trim()){ setUserData(p=>({...p,languages:[...p.languages,langInput.trim()]})); setLangInput(""); setShowLangInp(false); }}} placeholder="Language" className="px-1.5 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-16"/><button onClick={()=>setShowLangInp(false)}><X size={9} className="text-gray-300"/></button></div>
                      : <button onClick={()=>setShowLangInp(true)} className="px-1.5 py-0.5 border border-dashed border-gray-200 text-gray-300 rounded-full text-[9px] hover:text-indigo-500 hover:border-indigo-300">+add</button>
                    )}
                    {!editingTravel && userData.languages.length===0 && <span className="text-[10px] text-gray-300 italic">None</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Recent Bookings</p>
                <button onClick={()=>navigate("/my-bookings")} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">All <ChevronRight size={10}/></button>
              </div>
              <div className="p-2">
                {recentBkgs.length===0
                  ? <p className="text-[10px] text-gray-300 italic text-center py-4">No bookings yet</p>
                  : recentBkgs.map(b=>(
                    <div key={b._id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                        {b.type==="flight" ? <Plane size={13} className="text-indigo-400"/> : b.hotel?.images?.[0] ? <img src={`${BASE_URL}${b.hotel.images[0]}`} className="w-full h-full object-cover" alt=""/> : <MapPin size={13} className="text-blue-400"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{b.type==="flight" ? `${b.flight?.airline||"Flight"}` : b.hotel?.name||"Booking"}</p>
                        <span className={`text-[9px] font-medium uppercase ${b.status==="confirmed"?"text-green-500":b.status==="cancelled"?"text-red-400":"text-amber-500"}`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Account */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Account</p>
              <button onClick={()=>setShowDeleteModal(true)} className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-xs border border-red-100 hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-1.5">
                <Trash2 size={12}/> Delete Account
              </button>
            </div>
          </div>

          {/* ── CENTRE (6 cols) — Posts photo grid ────────────────────────── */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center justify-between px-5 pt-4 pb-0">
                <div className="flex gap-6">
                  {[{id:"posts",label:"Posts"},{id:"saved",label:"Saved"}].map(t=>(
                    <button key={t.id} onClick={()=>setPostsTab(t.id)}
                      className={`pb-3 text-sm border-b-2 transition ${postsTab===t.id?"border-blue-600 text-gray-900 font-medium":"border-transparent text-gray-400 hover:text-gray-600 font-normal"}`}>
                      {t.label} {t.id==="posts" && <span className="text-xs text-gray-400">({postCount})</span>}
                    </button>
                  ))}
                </div>
                {postsTab==="posts" && (
                  <button onClick={()=>{ setEditingPost(null); setShowCreate(true); }}
                    className="mb-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition">
                    <Plus size={13}/> New
                  </button>
                )}
              </div>
              <div className="border-b border-gray-100"/>

              {/* Posts — photo grid */}
              {postsTab==="posts" && (
                <div className="p-4">
                  {posts.length===0 ? (
                    <div className="text-center py-16 border border-dashed border-gray-100 rounded-2xl">
                      <Grid3X3 size={24} className="text-gray-200 mx-auto mb-2"/>
                      <p className="text-sm text-gray-300">No posts yet</p>
                      <button onClick={()=>setShowCreate(true)} className="mt-3 text-blue-500 text-xs hover:underline">Create first post</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {posts.map(post => {
                        const img = post.images?.[0] || post.image;
                        return (
                          <button key={post._id} onClick={()=>setExpandedPost(post)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group hover:opacity-90 transition">
                            {img
                              ? <img src={`${BASE_URL}${img}`} className="w-full h-full object-cover" alt=""/>
                              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                                  <span className="text-xs text-gray-400 text-center px-2 leading-tight line-clamp-3">{post.content?.slice(0,40)}</span>
                                </div>}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <span className="text-white text-xs font-medium">View</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Saved — full PostCards */}
              {postsTab==="saved" && (
                <div className="p-4 space-y-5">
                  {savedLoading ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-600"/></div>
                    : savedPosts.length===0
                    ? <div className="text-center py-16 border border-dashed border-gray-100 rounded-2xl"><Bookmark size={24} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-300">Nothing saved yet</p></div>
                    : savedPosts.map(post=><PostCard key={post._id} post={post} onUpdated={()=>{}} onDeleted={()=>setSavedPosts(p=>p.filter(x=>x._id!==post._id))}/>)}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT (3 cols) ─────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3 space-y-4">

            {/* Preferred Destinations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Preferred Destinations</p>
                {editingDests ? (
                  <div className="flex gap-1.5">
                    <button onClick={handleSave} disabled={saving} className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] disabled:opacity-50">{saving?"…":"Save"}</button>
                    <button onClick={()=>{ setEditingDests(false); setDestQuery(""); }} className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px]">Cancel</button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingDests(true)} className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"><Plus size={10}/> Add</button>
                )}
              </div>

              <div className="p-3">
                {editingDests && (
                  <div className="relative mb-3">
                    <div className="flex items-center gap-2 bg-gray-50 px-2.5 py-2 rounded-xl border border-gray-200 focus-within:border-blue-400">
                      <Search size={12} className="text-gray-400 flex-shrink-0"/>
                      <input value={destQuery} onChange={e=>setDestQuery(e.target.value)} placeholder="Search destinations…" className="bg-transparent outline-none text-xs flex-1"/>
                    </div>
                    {filteredDests.length>0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                        {filteredDests.map(d=>(
                          <button key={d._id} onClick={()=>{ setUserData(p=>({...p,preferredDestinations:[...p.preferredDestinations,d.name]})); setDestQuery(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0">
                            {d.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" alt=""/>}
                            <div><p className="text-xs text-gray-800">{d.name}</p><p className="text-[10px] text-gray-400">{d.country||"Nepal"}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {userData.preferredDestinations.length===0 ? (
                  <div className="text-center py-6">
                    <MapPin size={16} className="text-gray-200 mx-auto mb-1"/>
                    <p className="text-[10px] text-gray-300">No destinations added</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {userData.preferredDestinations.map(name=>{
                      const d = allDests.find(x=>x.name===name);
                      return (
                        <div key={name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition group">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            {d?.images?.[0]
                              ? <img src={`${BASE_URL}${d.images[0]}`} className="w-full h-full object-cover" alt={name}/>
                              : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300"/></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 truncate">{name}</p>
                            {d?.country && <p className="text-[10px] text-gray-400">{d.country}</p>}
                          </div>
                          {editingDests && (
                            <button onClick={()=>setUserData(p=>({...p,preferredDestinations:p.preferredDestinations.filter(x=>x!==name)}))}
                              className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-500">
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

            {/* Activity summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-3">Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label:"Posts",     val: postCount,                          color:"text-blue-600",   bg:"bg-blue-50" },
                  { label:"Followers", val: userData.travelStats.followersCount, color:"text-indigo-600", bg:"bg-indigo-50" },
                  { label:"Following", val: userData.travelStats.followingCount, color:"text-purple-600", bg:"bg-purple-50" },
                  { label:"Connected", val: userData.travelStats.buddyCount,     color:"text-teal-600",   bg:"bg-teal-50" },
                ].map(s=>(
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <p className={`text-base font-semibold ${s.color}`}>{s.val}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded post modal ─────────────────────────────────────────── */}
      {expandedPost && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setExpandedPost(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="text-sm font-medium text-gray-900">Post</p>
              <div className="flex items-center gap-2">
                <button onClick={()=>{ setEditingPost(expandedPost); setExpandedPost(null); setShowCreate(true); }} className="text-xs text-blue-500 hover:underline">Edit</button>
                <button onClick={()=>{ setPosts(prev=>prev.filter(p=>p._id!==expandedPost._id)); setPostCount(c=>c-1); setExpandedPost(null); }} className="text-xs text-red-400 hover:underline">Delete</button>
                <button onClick={()=>setExpandedPost(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={15} className="text-gray-400"/></button>
              </div>
            </div>
            <PostCard post={expandedPost} onUpdated={(p,a)=>{ if(a==="edit"){ setEditingPost(p); setExpandedPost(null); setShowCreate(true); }}} onDeleted={id=>{ setPosts(prev=>prev.filter(p=>p._id!==id)); setPostCount(c=>c-1); setExpandedPost(null); }}/>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate||editingPost) && (
        <CreatePostModal onClose={()=>{ setShowCreate(false); setEditingPost(null); }}
          onCreated={(np,edit)=>{ if(edit) setPosts(prev=>prev.map(p=>p._id===np._id?np:p)); else{ setPosts(prev=>[np,...prev]); setPostCount(c=>c+1); } setEditingPost(null); setShowCreate(false); }}
          editingPost={editingPost}/>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <Trash2 size={24} className="text-red-400 mx-auto mb-3"/>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Delete Account?</h3>
            <p className="text-xs text-gray-400 mb-4">Type <span className="font-bold text-red-500">DELETE</span> to confirm.</p>
            <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm focus:border-red-400 outline-none mb-4"/>
            <div className="flex gap-3">
              <button onClick={()=>setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting||deleteText!=="DELETE"} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm disabled:opacity-50">{deleting?"Deleting…":"Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {showPhotoView && avatarSrc && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={()=>setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 text-white/60 hover:text-white" onClick={()=>setShowPhotoView(false)}><X size={26}/></button>
          <img src={avatarSrc} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      {/* Setup modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-7 shadow-2xl text-center">
            <Compass size={28} className="text-blue-600 mx-auto mb-4"/>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Complete Your Profile</h3>
            <p className="text-sm text-gray-400 mb-5">Add your city and travel style to join the community.</p>
            <button onClick={()=>setShowSetupModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">Let's Go</button>
          </div>
        </div>
      )}
    </div>
  );
}