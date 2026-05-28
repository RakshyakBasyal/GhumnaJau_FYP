// frontend/src/components/feed/CreatePostModal.js
import { useState, useEffect, useRef } from 'react';
import {
  X, Image, MapPin, Loader2, Star, Search,
  HelpCircle, Camera, Globe, Lightbulb, Hotel,
  Check, Sparkles, Trash2, Plus,
} from 'lucide-react';
import { createPost, updatePost } from '../../services/feedApi';
import { useToast } from '../../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const CATEGORIES = [
  { id: 'photo',    label: 'Photo',    icon: Camera,     color: 'blue'    },
  { id: 'story',    label: 'Story',    icon: Globe,      color: 'purple'  },
  { id: 'question', label: 'Question', icon: HelpCircle, color: 'rose'    },
  { id: 'review',   label: 'Review',   icon: Star,       color: 'amber'   },
  { id: 'tip',      label: 'Tip',      icon: Lightbulb,  color: 'emerald' },
];

const CAT_COLORS = {
  blue:    { active: 'bg-blue-600 text-white border-blue-600',       ring: 'focus:ring-blue-300',    btn: 'bg-blue-600 hover:bg-blue-700' },
  purple:  { active: 'bg-purple-600 text-white border-purple-600',   ring: 'focus:ring-purple-300',  btn: 'bg-purple-600 hover:bg-purple-700' },
  rose:    { active: 'bg-rose-600 text-white border-rose-600',       ring: 'focus:ring-rose-300',    btn: 'bg-rose-600 hover:bg-rose-700' },
  amber:   { active: 'bg-amber-500 text-white border-amber-500',     ring: 'focus:ring-amber-300',   btn: 'bg-amber-500 hover:bg-amber-600' },
  emerald: { active: 'bg-emerald-600 text-white border-emerald-600', ring: 'focus:ring-emerald-300', btn: 'bg-emerald-600 hover:bg-emerald-700' },
};

const BUDGETS      = ['Budget', 'Mid-range', 'Luxury', 'Flexible'];
const REVIEW_TYPES = [
  { id: 'destination', label: 'Destination', icon: MapPin },
  { id: 'hotel',       label: 'Hotel',       icon: Hotel  },
];
const STAR_LABELS  = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function CreatePostModal({ onClose, onCreated, editingPost, initialCategory }) {
  const { showToast } = useToast();
  const fileRef     = useRef(null);
  const destRef     = useRef(null);
  const reviewRef   = useRef(null);
  const textareaRef = useRef(null);

  const [category,  setCategory]  = useState(editingPost?.category || initialCategory || 'photo');
  const [content,   setContent]   = useState(editingPost?.content  || '');
  const [submitting, setSubmitting] = useState(false);

  // ── Image state ──────────────────────────────────────────────────────────────
  // existingImages: paths already stored on server (only relevant when editing)
  // imagesToDelete: server paths the user flagged for deletion
  // newFiles:       File objects the user added this session
  // newPreviews:    object-URL previews for newFiles
  const [existingImages, setExistingImages] = useState(
    editingPost?.images?.map(img => (img.startsWith('http') ? img : `${BASE_URL}${img}`)) || []
  );
  const [existingPaths,  setExistingPaths]  = useState(editingPost?.images || []);
  const [imagesToDelete, setImagesToDelete] = useState([]);   // server paths to delete
  const [newFiles,       setNewFiles]       = useState([]);   // File objects
  const [newPreviews,    setNewPreviews]    = useState([]);   // blob URLs

  // Photo extras
  const [destQuery,    setDestQuery]    = useState(editingPost?.destinationName || '');
  const [destResults,  setDestResults]  = useState([]);
  const [selectedDest, setSelectedDest] = useState(
    editingPost?.destinationId ? { _id: editingPost.destinationId, name: editingPost.destinationName } : null
  );
  const [showDestDD, setShowDestDD] = useState(false);
  const [budget,     setBudget]     = useState(editingPost?.budget || '');

  // Review extras
  const [reviewType,   setReviewType]   = useState(editingPost?.reviewType || 'destination');
  const [reviewQuery,  setReviewQuery]  = useState('');
  const [reviewItems,  setReviewItems]  = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReviewDD, setShowReviewDD] = useState(false);
  const [rating,       setRating]       = useState(editingPost?.rating || 0);
  const [hoverRating,  setHoverRating]  = useState(0);

  const currentCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const colors     = CAT_COLORS[currentCat.color];
  const totalImages = existingImages.length + newPreviews.length;

  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 100); }, []);

  // Destination suggestions
  useEffect(() => {
    if (!destQuery.trim() || category !== 'photo') { setDestResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${BASE_URL}/api/destinations`)
        .then(r => r.json())
        .then(d => {
          const all = Array.isArray(d) ? d : [];
          setDestResults(all.filter(dest => dest.name.toLowerCase().includes(destQuery.toLowerCase())).slice(0, 5));
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [destQuery, category]);

  // Review items
  useEffect(() => {
    if (category !== 'review') return;
    const url = reviewType === 'destination' ? `${BASE_URL}/api/destinations` : `${BASE_URL}/api/hotels`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => setReviewItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [reviewType, category]);

  // Outside click closes dropdowns
  useEffect(() => {
    const h = (e) => {
      if (destRef.current   && !destRef.current.contains(e.target))   setShowDestDD(false);
      if (reviewRef.current && !reviewRef.current.contains(e.target)) setShowReviewDD(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Image handlers ────────────────────────────────────────────────────────────
  const handleAddFiles = (e) => {
    const added = Array.from(e.target.files);
    setNewFiles(prev => [...prev, ...added]);
    setNewPreviews(prev => [...prev, ...added.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  // Mark an existing server image for deletion
  const handleDeleteExisting = (idx) => {
    const path = existingPaths[idx];
    setImagesToDelete(prev => [...prev, path]);
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
    setExistingPaths(prev => prev.filter((_, i) => i !== idx));
  };

  // Remove a newly added image before submit
  const handleDeleteNew = (idx) => {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && totalImages === 0) {
      showToast('Add some content or a photo', 'error'); return;
    }
    if (category === 'review' && !selectedItem && !editingPost) {
      showToast("Select what you're reviewing", 'error'); return;
    }
    if (category === 'review' && rating === 0 && !editingPost) {
      showToast('Add a star rating', 'error'); return;
    }

    setSubmitting(true);
    try {
      let res;
      if (editingPost) {
        // Always use FormData for edit so we can attach new image files
        const fd = new FormData();
        fd.append('content', content.trim());
        if (imagesToDelete.length > 0) {
          fd.append('deleteImages', JSON.stringify(imagesToDelete));
        }
        newFiles.forEach(f => fd.append('images', f));
        res = await updatePost(editingPost._id, fd);
      } else {
        const fd = new FormData();
        fd.append('content', content.trim());
        fd.append('category', category);
        if (category === 'photo') {
          if (selectedDest) {
            fd.append('destinationId',   selectedDest._id || '');
            fd.append('destinationName', selectedDest.name || '');
          }
          if (budget) fd.append('budget', budget);
        }
        if (category === 'review' && selectedItem) {
          fd.append('reviewType',      reviewType);
          fd.append('reviewRefId',     selectedItem._id);
          fd.append('rating',          String(rating));
          fd.append('destinationName', selectedItem.name || '');
        }
        newFiles.forEach(f => fd.append('images', f));
        res = await createPost(fd);
      }

      showToast(editingPost ? 'Post updated!' : 'Posted!', 'success');
      onCreated(res.data, !!editingPost);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Failed to post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReviewItems = reviewItems.filter(item =>
    !reviewQuery || item.name.toLowerCase().includes(reviewQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>

      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">
              {editingPost ? 'Edit post' : `Share a ${currentCat.label.toLowerCase()}`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {editingPost ? 'Update content or photos' : 'Share with fellow travelers'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition flex-shrink-0">
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {/* ── Category tabs (create only) ────────────────────── */}
        {!editingPost && (
          <div className="flex gap-1.5 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-gray-50">
            {CATEGORIES.map(cat => {
              const Icon   = cat.icon;
              const active = category === cat.id;
              const c      = CAT_COLORS[cat.color];
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${
                    active ? `${c.active} shadow-sm` : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                  }`}>
                  <Icon size={11} /> {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

          {/* Review: type + search + stars */}
          {category === 'review' && !editingPost && (
            <div className="space-y-3 p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
              <div className="flex gap-2">
                {REVIEW_TYPES.map(rt => {
                  const Icon = rt.icon;
                  return (
                    <button key={rt.id} type="button"
                      onClick={() => { setReviewType(rt.id); setSelectedItem(null); setReviewQuery(''); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition ${
                        reviewType === rt.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200'
                      }`}>
                      <Icon size={13} /> {rt.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative" ref={reviewRef}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text"
                    placeholder={`Search ${reviewType === 'destination' ? 'destinations' : 'hotels'}...`}
                    value={reviewQuery}
                    onChange={e => { setReviewQuery(e.target.value); setShowReviewDD(true); setSelectedItem(null); }}
                    onFocus={() => setShowReviewDD(true)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-300 transition" />
                </div>
                {showReviewDD && filteredReviewItems.length > 0 && !selectedItem && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44">
                    {filteredReviewItems.slice(0, 5).map(item => (
                      <div key={item._id}
                        onClick={() => { setSelectedItem(item); setReviewQuery(item.name); setShowReviewDD(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.images?.[0]
                            ? <img src={`${BASE_URL}${item.images[0]}`} alt="" className="w-full h-full object-cover" />
                            : <MapPin size={12} className="m-auto text-gray-300 mt-2" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.country || ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedItem && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                    <Check size={14} className="text-amber-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-amber-800 flex-1">{selectedItem.name}</p>
                    <button type="button" onClick={() => { setSelectedItem(null); setReviewQuery(''); }}
                      className="text-amber-400 hover:text-amber-600"><X size={13} /></button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Your rating</p>
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110 active:scale-95">
                      <Star size={28}
                        className={`transition-colors ${n <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}`} />
                    </button>
                  ))}
                  {(hoverRating || rating) > 0 && (
                    <span className="text-sm font-bold text-amber-600 ml-1">
                      {STAR_LABELS[hoverRating || rating]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photo: destination + budget */}
          {category === 'photo' && !editingPost && (
            <div className="flex gap-2">
              <div className="flex-1 relative" ref={destRef}>
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" placeholder="Tag a place (optional)"
                    value={destQuery}
                    onChange={e => { setDestQuery(e.target.value); setShowDestDD(true); if (!e.target.value) setSelectedDest(null); }}
                    onFocus={() => setShowDestDD(true)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 transition bg-gray-50" />
                  {destQuery && (
                    <button type="button" onClick={() => { setDestQuery(''); setSelectedDest(null); setShowDestDD(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={11} /></button>
                  )}
                </div>
                {showDestDD && destResults.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44">
                    {destResults.map(dest => (
                      <div key={dest._id}
                        onClick={() => { setSelectedDest(dest); setDestQuery(dest.name); setShowDestDD(false); }}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {dest.images?.[0]
                            ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
                            : <MapPin size={10} className="text-gray-300 m-auto mt-2" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{dest.name}</p>
                          <p className="text-[10px] text-gray-400">{dest.country || 'Nepal'}</p>
                        </div>
                      </div>
                    ))}
                    {destQuery && !destResults.some(d => d.name.toLowerCase() === destQuery.toLowerCase()) && (
                      <div onClick={() => { setSelectedDest({ _id: null, name: destQuery }); setShowDestDD(false); }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 text-xs font-semibold border-t border-gray-100">
                        <MapPin size={11} /> Use "{destQuery}"
                      </div>
                    )}
                  </div>
                )}
                {selectedDest && (
                  <p className="text-[10px] text-blue-600 mt-1 pl-1 flex items-center gap-1">
                    <Check size={9} /> {selectedDest.name}
                  </p>
                )}
              </div>
              <select value={budget} onChange={e => setBudget(e.target.value)}
                className="py-2 px-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-600 transition flex-shrink-0">
                <option value="">Budget?</option>
                {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                category === 'photo'    ? "What's the story behind this shot?" :
                category === 'story'    ? "Share your travel experience..." :
                category === 'question' ? "What would you like to ask fellow travelers?" :
                category === 'review'   ? "Write your honest review..." :
                "Share your travel tip..."
              }
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition resize-none bg-gray-50 focus:bg-white"
            />
            <span className="absolute bottom-2.5 right-3 text-[10px] text-gray-300 font-mono select-none">
              {content.length}/2000
            </span>
          </div>

          {/* Image grid (existing + new, with delete buttons) */}
          {category !== 'question' && (
            <div>
              {totalImages > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {/* Existing server images */}
                  {existingImages.map((src, idx) => (
                    <div key={`existing-${idx}`} className="relative group aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-xl border border-gray-100" />
                      <button type="button" onClick={() => handleDeleteExisting(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md">
                        <Trash2 size={11} />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                        saved
                      </div>
                    </div>
                  ))}

                  {/* New image previews */}
                  {newPreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative group aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-xl border border-blue-200" />
                      <button type="button" onClick={() => handleDeleteNew(idx)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md">
                        <X size={11} />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-blue-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                        new
                      </div>
                    </div>
                  ))}

                  {/* Add more button */}
                  {totalImages < 10 && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:text-blue-400 hover:border-blue-300 transition">
                      <Plus size={20} />
                      <span className="text-[10px] mt-1 font-medium">Add</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Empty state — upload prompt */
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/20 transition group">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition flex-shrink-0">
                    <Camera size={17} className="group-hover:text-blue-500 transition" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Add photos</p>
                    <p className="text-xs text-gray-300 mt-0.5">Up to 10 images · JPG, PNG, GIF, WebP</p>
                  </div>
                  <Image size={16} className="ml-auto opacity-30" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
            </div>
          )}

          {/* Deletion warning */}
          {imagesToDelete.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
              <Trash2 size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-600 font-medium">
                {imagesToDelete.length} photo{imagesToDelete.length !== 1 ? 's' : ''} will be deleted on save
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3 bg-white rounded-b-3xl">
          {totalImages > 0 && (
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
              <Image size={12} /> {totalImages}/10
            </span>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && totalImages === 0)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${colors.btn}`}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Posting...</>
              : editingPost
              ? <><Check size={14} /> Save changes</>
              : <><Sparkles size={14} /> Post</>}
          </button>
        </div>
      </div>
    </div>
  );
}