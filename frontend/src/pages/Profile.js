// frontend/src/pages/Profile.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import {
  Mail, MapPin, LogOut, Loader2, Camera, Plus, Search,
  X, Save, Edit2, Trash2, ChevronRight, Plane, Bookmark,
  Compass, Check,
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

const INP = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // edit toggles — all inline
  const [editingBasic,  setEditingBasic]  = useState(false);
  const [editingTravel, setEditingTravel] = useState(false);
  const [editingDests,  setEditingDests]  = useState(false);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [postsTab, setPostsTab] = useState("posts"); // posts | saved
  const [showSetupModal,  setShowSetupModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText,      setDeleteText]      = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [showPhotoView,   setShowPhotoView]   = useState(false);

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

  const [posts,      setPosts]      = useState([]);
  const [postCount,  setPostCount]  = useState(0);
  const [savedPosts, setSavedPosts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [recentBkgs, setRecentBkgs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

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
        fetch(`${BASE_URL}/api/posts/user/${myId}?page=1&limit=20`, { headers:{ Authorization:`Bearer ${token}` } }),
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={28}/></div>;

  const avatarSrc = avatarPreview || av(userData.avatar);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ── Cover + identity ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        {/* Cover */}
        <div className="relative h-36 bg-gradient-to-r from-blue-600 to-indigo-700">
          {userData.coverImage && <img src={av(userData.coverImage)} className="w-full h-full object-cover opacity-60" alt=""/>}
          <div className="absolute top-3 right-4 flex gap-2">
            <button onClick={() => navigate("/community")} className="px-3 py-1.5 bg-black/25 text-white text-xs font-semibold rounded-lg border border-white/20 hover:bg-black/40 transition">Community</button>
            <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="px-3 py-1.5 bg-black/25 text-white text-xs font-semibold rounded-lg border border-white/20 hover:bg-black/40 transition flex items-center gap-1"><LogOut size={11}/> Logout</button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end gap-5 -mt-10 pb-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white bg-blue-600 shadow-lg cursor-pointer" onClick={() => avatarSrc && setShowPhotoView(true)}>
                {avatarSrc
                  ? <img src={avatarSrc} className="w-full h-full object-cover" alt=""/>
                  : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">{userData.fullName?.charAt(0)}</div>}
              </div>
              {editingBasic && (
                <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-700 shadow-md border-2 border-white z-10">
                  <Camera size={13}/>
                  <input type="file" className="hidden" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f){ setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }}}/>
                </label>
              )}
            </div>

            {/* Name / info */}
            <div className="flex-1 min-w-0 mb-1">
              {editingBasic ? (
                <input value={userData.fullName} onChange={e=>setUserData(p=>({...p,fullName:e.target.value}))}
                  className="text-xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent w-full max-w-xs mb-1"/>
              ) : (
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{userData.fullName}</h1>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1"><Mail size={11}/>{userData.email}</span>
                {editingBasic ? (
                  <div className="relative">
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus-within:border-blue-400">
                      <MapPin size={11} className="text-blue-500"/>
                      <input value={userData.city}
                        onChange={e=>{ setUserData(p=>({...p,city:e.target.value})); setCityQuery(e.target.value); setShowCitySugg(true); }}
                        onFocus={()=>setShowCitySugg(true)}
                        placeholder="Your city" className="bg-transparent outline-none text-xs w-24"/>
                    </div>
                    {showCitySugg && allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).length > 0 && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 min-w-[160px] overflow-hidden">
                        {allDests.filter(d=>d.name.toLowerCase().includes((cityQuery||userData.city).toLowerCase())).slice(0,5).map(d=>(
                          <button key={d._id} onClick={()=>{ setUserData(p=>({...p,city:d.name})); setCityQuery(d.name); setShowCitySugg(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-blue-50 border-b border-gray-50 last:border-0">{d.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : userData.city && <span className="flex items-center gap-1 text-blue-600 font-semibold"><MapPin size={11}/>{userData.city}</span>}
              </div>

              {/* Bio row */}
              {editingBasic ? (
                <textarea value={userData.bio} onChange={e=>setUserData(p=>({...p,bio:e.target.value}))} rows={2} maxLength={300} placeholder="Short bio..."
                  className="mt-2 w-full max-w-lg px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/>
              ) : userData.bio && (
                <p className="text-xs text-gray-500 leading-relaxed mt-1.5 max-w-lg">{userData.bio}</p>
              )}

              {/* Intent + extra fields when editing */}
              {editingBasic && (
                <div className="flex flex-wrap gap-3 mt-3">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Status</p>
                    <select value={userData.intentStatus} onChange={e=>setUserData(p=>({...p,intentStatus:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                      <option>Exploring</option><option>Planning a trip</option><option>Looking for buddy</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Gender</p>
                    <select value={userData.gender} onChange={e=>setUserData(p=>({...p,gender:e.target.value}))} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none">
                      <option value="">—</option><option>Male</option><option>Female</option><option>Other</option><option value="Prefer not to say">N/A</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Age</p>
                    <input type="number" min="1" max="120" value={userData.age} onWheel={e=>e.target.blur()} onChange={e=>setUserData(p=>({...p,age:e.target.value}))} className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">Phone</p>
                    <input value={userData.phone} onChange={e=>setUserData(p=>({...p,phone:e.target.value}))} className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"/>
                  </div>
                </div>
              )}

              {/* Status badge (not editing) */}
              {!editingBasic && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {userData.intentStatus && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{userData.intentStatus}</span>}
                  {userData.gender && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">{userData.gender}{userData.age ? ` · ${userData.age}yrs` : ''}</span>}
                </div>
              )}
            </div>

            {/* Edit / Save buttons */}
            <div className="flex gap-2 mb-1 flex-shrink-0">
              {editingBasic ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-blue-700 transition">
                    {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                  </button>
                  <button onClick={()=>{ setEditingBasic(false); load(); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition">Cancel</button>
                </>
              ) : (
                <button onClick={()=>setEditingBasic(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition shadow-sm">
                  <Edit2 size={12}/> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pb-4 border-t border-gray-50 pt-4">
            {[
              { label:"Posts",     val: postCount },
              { label:"Followers", val: userData.travelStats.followersCount },
              { label:"Following", val: userData.travelStats.followingCount },
              { label:"Connected", val: userData.travelStats.buddyCount },
            ].map(s => (
              <div key={s.label}>
                <p className="text-lg font-bold text-gray-900 leading-none">{s.val}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Travel Identity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Travel Identity</h2>
                {editingTravel ? (
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
                    <button onClick={()=>setEditingTravel(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">Cancel</button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingTravel(true)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={13}/></button>
                )}
              </div>

              <div className="space-y-5">
                {/* Style */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Travel Style</p>
                  {editingTravel ? (
                    <div className="flex flex-wrap gap-1.5">
                      {STYLES.map(s => (
                        <button key={s} onClick={()=>setUserData(p=>({...p,travelStyle:s}))}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${userData.travelStyle===s?"bg-blue-600 text-white border-blue-600":"border-gray-200 text-gray-500 hover:border-blue-300"}`}>{s}</button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${userData.travelStyle ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                      {userData.travelStyle || "Not set"}
                    </span>
                  )}
                </div>

                {/* Pace */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Travel Pace</p>
                  {editingTravel ? (
                    <div className="flex gap-2">
                      {PACES.map(p => (
                        <button key={p} onClick={()=>setUserData(d=>({...d,travelPace:p}))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${userData.travelPace===p?"bg-purple-600 text-white border-purple-600":"border-gray-200 text-gray-500 hover:border-purple-300"}`}>{p}</button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${userData.travelPace ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                      {userData.travelPace || "Not set"}
                    </span>
                  )}
                </div>

                {/* Budget */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Budget</p>
                  {editingTravel ? (
                    <div className="space-y-1.5">
                      {BUDGETS.map(b => (
                        <button key={b.value} onClick={()=>setUserData(p=>({...p,travelBudget:b.value}))}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition ${userData.travelBudget===b.value?"bg-green-600 text-white border-green-600":"border-gray-200 text-gray-600 hover:border-green-300"}`}>
                          <span className="font-semibold">{b.label}</span>
                          <span className={`text-[10px] ${userData.travelBudget===b.value?"text-green-100":"text-gray-400"}`}>{b.desc}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${userData.travelBudget ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
                      {userData.travelBudget || "Not set"}
                    </span>
                  )}
                </div>

                {/* Interests */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Interests</p>
                  {editingTravel && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {PRESETS.filter(t=>!userData.travelInterests.includes(t)).map(t=>(
                        <button key={t} onClick={()=>setUserData(p=>({...p,travelInterests:[...p.travelInterests,t]}))}
                          className="px-2 py-0.5 border border-dashed border-gray-200 text-gray-400 rounded-full text-[10px] hover:border-orange-400 hover:text-orange-600 transition">+ {t}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {userData.travelInterests.map(t=>(
                      <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[10px] font-semibold border border-orange-100">
                        #{t}
                        {editingTravel && <button onClick={()=>setUserData(p=>({...p,travelInterests:p.travelInterests.filter(i=>i!==t)}))} className="ml-0.5 hover:text-red-500"><X size={9}/></button>}
                      </span>
                    ))}
                    {editingTravel && (
                      showIntInp ? (
                        <div className="flex items-center gap-1">
                          <input autoFocus value={intInput} onChange={e=>setIntInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&intInput.trim()){ setUserData(p=>({...p,travelInterests:[...p.travelInterests,intInput.trim()]})); setIntInput(""); setShowIntInp(false); }}}
                            placeholder="Custom…" className="px-2 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-20"/>
                          <button onClick={()=>setShowIntInp(false)} className="text-gray-400"><X size={10}/></button>
                        </div>
                      ) : (
                        <button onClick={()=>setShowIntInp(true)} className="px-2 py-0.5 border border-dashed border-gray-200 text-gray-400 rounded-full text-[10px] hover:border-blue-400 hover:text-blue-600 transition">+ Custom</button>
                      )
                    )}
                    {userData.travelInterests.length===0 && !editingTravel && <span className="text-xs text-gray-400 italic">None added</span>}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {userData.languages.map(l=>(
                      <span key={l} className="flex items-center gap-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-semibold border border-indigo-100">
                        {l}
                        {editingTravel && <button onClick={()=>setUserData(p=>({...p,languages:p.languages.filter(x=>x!==l)}))} className="ml-0.5 hover:text-red-500"><X size={9}/></button>}
                      </span>
                    ))}
                    {editingTravel && (
                      showLangInp ? (
                        <div className="flex items-center gap-1">
                          <input autoFocus value={langInput} onChange={e=>setLangInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&langInput.trim()){ setUserData(p=>({...p,languages:[...p.languages,langInput.trim()]})); setLangInput(""); setShowLangInp(false); }}}
                            placeholder="e.g. Nepali" className="px-2 py-0.5 border border-blue-300 rounded-full text-[10px] outline-none w-20"/>
                          <button onClick={()=>setShowLangInp(false)} className="text-gray-400"><X size={10}/></button>
                        </div>
                      ) : (
                        <button onClick={()=>setShowLangInp(true)} className="px-2 py-0.5 border border-dashed border-gray-200 text-gray-400 rounded-full text-[10px] hover:border-indigo-400 hover:text-indigo-600 transition">+ Add</button>
                      )
                    )}
                    {userData.languages.length===0 && !editingTravel && <span className="text-xs text-gray-400 italic">None added</span>}
                  </div>
                  {editingTravel && userData.languages.length>0 && (
                    <button onClick={handleSave} disabled={saving} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">Save</button>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-900">Recent Bookings</h2>
                <button onClick={()=>navigate("/my-bookings")} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">All <ChevronRight size={12}/></button>
              </div>
              {recentBkgs.length===0
                ? <p className="text-xs text-gray-400 italic">No bookings yet</p>
                : recentBkgs.map(b=>(
                  <div key={b._id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                      {b.type==="flight" ? <Plane size={15} className="text-indigo-400"/>
                        : b.hotel?.images?.[0] ? <img src={`${BASE_URL}${b.hotel.images[0]}`} className="w-full h-full object-cover" alt=""/>
                        : <MapPin size={15} className="text-blue-400"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {b.type==="flight" ? `${b.flight?.airline||""} ${b.flight?.flightNumber||""}` : b.hotel?.name||"Booking"}
                      </p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${b.status==="confirmed"?"text-green-500":b.status==="cancelled"?"text-red-400":"text-amber-500"}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Account */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Account</h2>
              <button onClick={()=>setShowDeleteModal(true)}
                className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1.5">
                <Trash2 size={12}/> Delete Account
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Preferred Destinations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-900">Preferred Destinations</h2>
                {editingDests ? (
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">{saving?"Saving…":"Save"}</button>
                    <button onClick={()=>{ setEditingDests(false); setDestQuery(""); }} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold">Cancel</button>
                  </div>
                ) : (
                  <button onClick={()=>setEditingDests(true)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition"><Plus size={12}/> Add</button>
                )}
              </div>

              {editingDests && (
                <div className="relative mb-4">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 focus-within:border-blue-400 transition">
                    <Search size={13} className="text-gray-400 flex-shrink-0"/>
                    <input value={destQuery} onChange={e=>setDestQuery(e.target.value)} placeholder="Search destinations…" className="bg-transparent outline-none text-sm flex-1"/>
                  </div>
                  {filteredDests.length>0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                      {filteredDests.map(d=>(
                        <button key={d._id} onClick={()=>{ setUserData(p=>({...p,preferredDestinations:[...p.preferredDestinations,d.name]})); setDestQuery(""); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 text-left">
                          {d.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt=""/>}
                          <div><p className="text-sm font-semibold text-gray-900">{d.name}</p><p className="text-xs text-gray-400">{d.country||"Nepal"}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {userData.preferredDestinations.length===0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 rounded-xl">
                  <MapPin size={20} className="text-gray-200 mx-auto mb-1"/>
                  <p className="text-xs text-gray-400">No destinations added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {userData.preferredDestinations.map(name=>{
                    const d = allDests.find(x=>x.name===name);
                    return (
                      <div key={name} className="group relative rounded-xl overflow-hidden border border-gray-100 hover:border-blue-200 transition">
                        <div className="h-16 bg-gradient-to-br from-blue-100 to-indigo-100">
                          {d?.images?.[0] && <img src={`${BASE_URL}${d.images[0]}`} className="w-full h-full object-cover" alt={name}/>}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-bold text-gray-700 truncate">{name}</p>
                        </div>
                        {editingDests && (
                          <button onClick={()=>setUserData(p=>({...p,preferredDestinations:p.preferredDestinations.filter(x=>x!==name)}))}
                            className="absolute top-1 right-1 w-5 h-5 bg-white/90 text-gray-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:text-red-500 shadow">
                            <X size={10}/>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Posts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex gap-5 border-b border-gray-100 w-full pb-3">
                  {[{id:"posts",label:`Posts (${postCount})`},{id:"saved",label:"Saved"}].map(t=>(
                    <button key={t.id} onClick={()=>setPostsTab(t.id)}
                      className={`text-sm font-semibold pb-1 border-b-2 -mb-3 transition ${postsTab===t.id?"border-blue-600 text-blue-600":"border-transparent text-gray-400 hover:text-gray-600"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>{ setEditingPost(null); setShowCreate(true); }} className="flex-shrink-0 flex items-center gap-1 ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition -mb-1">
                  <Plus size={13}/> New
                </button>
              </div>

              {postsTab==="posts" && (
                <div className="space-y-5">
                  {posts.length===0
                    ? <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl"><Plane size={24} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No posts yet</p></div>
                    : posts.map(post=><PostCard key={post._id} post={post} onUpdated={(p,a)=>{ if(a==="edit") setEditingPost(p); }} onDeleted={id=>{ setPosts(prev=>prev.filter(p=>p._id!==id)); setPostCount(c=>c-1); }}/>)}
                </div>
              )}

              {postsTab==="saved" && (
                <div className="space-y-5">
                  {savedLoading ? <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-blue-600"/></div>
                    : savedPosts.length===0
                    ? <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl"><Bookmark size={24} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">No saved posts yet</p></div>
                    : savedPosts.map(post=><PostCard key={post._id} post={post} onUpdated={()=>{}} onDeleted={()=>setSavedPosts(p=>p.filter(x=>x._id!==post._id))}/>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit post modal */}
      {(showCreate||editingPost) && (
        <CreatePostModal onClose={()=>{ setShowCreate(false); setEditingPost(null); }}
          onCreated={(np,edit)=>{ if(edit) setPosts(prev=>prev.map(p=>p._id===np._id?np:p)); else{ setPosts(prev=>[np,...prev]); setPostCount(c=>c+1); } setEditingPost(null); setShowCreate(false); }}
          editingPost={editingPost}/>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <Trash2 size={26} className="text-red-500 mx-auto mb-3"/>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Delete Account?</h3>
            <p className="text-xs text-gray-500 mb-4">Type <span className="font-bold text-red-600">DELETE</span> to confirm.</p>
            <input value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-sm focus:border-red-400 outline-none mb-4"/>
            <div className="flex gap-3">
              <button onClick={()=>setShowDeleteModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={handleDelete} disabled={deleting||deleteText!=="DELETE"} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{deleting?"Deleting…":"Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {showPhotoView && avatarSrc && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={()=>setShowPhotoView(false)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white" onClick={()=>setShowPhotoView(false)}><X size={28}/></button>
          <img src={avatarSrc} alt={userData.fullName} className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e=>e.stopPropagation()}/>
        </div>
      )}

      {/* Setup modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-7 shadow-2xl text-center">
            <Compass size={32} className="text-blue-600 mx-auto mb-4"/>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Complete Your Profile</h3>
            <p className="text-sm text-gray-500 mb-5">Add your city and travel style to join the community.</p>
            <button onClick={()=>setShowSetupModal(false)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">Let's Go</button>
          </div>
        </div>
      )}
    </div>
  );
}