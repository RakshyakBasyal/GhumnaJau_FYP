// frontend/src/components/feed/CreatePostModal.jsx
import { useState, useEffect, useRef } from 'react';
import {
  X, Image, MapPin, Loader2, Star, Search, HelpCircle,
  Camera, MessageSquare, Lightbulb, Hotel, Globe,
  DollarSign, ChevronDown,
} from 'lucide-react';
import { createPost, updatePost } from '../../services/feedApi';
import { useToast } from '../../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const CATEGORIES = [
  { id: 'photo',    label: 'Travel Photo',  icon: Camera,       desc: 'Share a photo from your journey' },
  { id: 'story',    label: 'Story',         icon: Globe,        desc: 'Share a travel experience or memory' },
  { id: 'question', label: 'Ask a Question',icon: HelpCircle,   desc: 'Ask the community for advice' },
  { id: 'review',   label: 'Write a Review',icon: Star,         desc: 'Review a destination or hotel' },
  { id: 'tip',      label: 'Travel Tip',    icon: Lightbulb,    desc: 'Share a useful tip with travelers' },
];

const BUDGETS = ['', 'Budget', 'Mid-range', 'Luxury', 'Flexible'];
const REVIEW_TYPES = [
  { id: 'destination', label: 'Destination', icon: MapPin },
  { id: 'hotel',       label: 'Hotel',       icon: Hotel },
];

export default function CreatePostModal({ onClose, onCreated, editingPost, initialCategory }) {
  const { showToast } = useToast();
  const fileRef       = useRef(null);
  const destRef       = useRef(null);
  const reviewRef     = useRef(null);

  const [category,  setCategory]  = useState(editingPost?.category || initialCategory || 'photo');
  const [content,   setContent]   = useState(editingPost?.content  || '');
  const [images,    setImages]    = useState([]); // new File objects
  const [previews,  setPreviews]  = useState(editingPost?.images?.map(i => `${BASE_URL}${i}`) || []);
  const [submitting, setSubmitting] = useState(false);

  // Travel photo extras
  const [destQuery,   setDestQuery]   = useState(editingPost?.destinationName || '');
  const [destResults, setDestResults] = useState([]);
  const [selectedDest, setSelectedDest] = useState(editingPost?.destinationId ? { _id: editingPost.destinationId, name: editingPost.destinationName } : null);
  const [showDestDD,  setShowDestDD]  = useState(false);
  const [budget,      setBudget]      = useState(editingPost?.budget || '');

  // Review extras
  const [reviewType,   setReviewType]   = useState(editingPost?.reviewType || 'destination');
  const [reviewQuery,  setReviewQuery]  = useState('');
  const [reviewItems,  setReviewItems]  = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReviewDD, setShowReviewDD] = useState(false);
  const [rating,       setRating]       = useState(editingPost?.rating || 0);
  const [hoverRating,  setHoverRating]  = useState(0);

  // Load destinations when typing
  useEffect(() => {
    if (!destQuery.trim() || category !== 'photo') { setDestResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${BASE_URL}/api/destinations`)
        .then(r => r.json())
        .then(d => {
          const all = Array.isArray(d) ? d : [];
          setDestResults(all.filter(dest => dest.name.toLowerCase().includes(destQuery.toLowerCase())).slice(0, 6));
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [destQuery, category]);

  // Load destinations or hotels for review
  useEffect(() => {
    if (category !== 'review') return;
    const url = reviewType === 'destination' ? `${BASE_URL}/api/destinations` : `${BASE_URL}/api/hotels`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => setReviewItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [reviewType, category]);

  // Outside-click close dropdowns
  useEffect(() => {
    const h = (e) => {
      if (destRef.current && !destRef.current.contains(e.target)) setShowDestDD(false);
      if (reviewRef.current && !reviewRef.current.contains(e.target)) setShowReviewDD(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    setImages(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const selectDestination = (dest) => {
    setSelectedDest(dest);
    setDestQuery(dest.name);
    setShowDestDD(false);
  };

  const filteredReviewItems = reviewItems.filter(item =>
    !reviewQuery || item.name.toLowerCase().includes(reviewQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() && images.length === 0) {
      showToast('Add some content or an image', 'error');
      return;
    }
    if (category === 'review' && !selectedItem) {
      showToast('Please select what you are reviewing', 'error');
      return;
    }
    if (category === 'review' && rating === 0) {
      showToast('Please add a star rating', 'error');
      return;
    }

    setSubmitting(true);
    try {
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
        fd.append('reviewType',  reviewType);
        fd.append('reviewRefId', selectedItem._id);
        fd.append('rating',      String(rating));
        // Also tag the destination name for display
        fd.append('destinationName', selectedItem.name || '');
      }

      images.forEach(f => fd.append('images', f));

      const res = editingPost
        ? await updatePost(editingPost._id, { content: content.trim() })
        : await createPost(fd);

      showToast(editingPost ? 'Post updated!' : 'Posted!', 'success');
      onCreated(res.data, !!editingPost);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.msg || 'Failed to post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
  const CatIcon = currentCat.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-4">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-base">
                {editingPost ? 'Edit Post' : 'Share with Travelers'}
              </h2>
              {!editingPost && (
                <p className="text-blue-100 text-xs mt-0.5">{currentCat.desc}</p>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl transition">
              <X size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Category tabs (only on create) — horizontal scroll pill buttons */}
        {!editingPost && (
          <div className="flex gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = category === cat.id;
              return (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex-shrink-0 border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
                  <Icon size={12} /> {cat.label}
                </button>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">

            {/* ── REVIEW: pick what you're reviewing ────────────────────── */}
            {category === 'review' && !editingPost && (
              <div className="space-y-3">
                {/* Review type toggle */}
                <div className="flex gap-2">
                  {REVIEW_TYPES.map(rt => {
                    const Icon = rt.icon;
                    return (
                      <button key={rt.id} type="button"
                        onClick={() => { setReviewType(rt.id); setSelectedItem(null); setReviewQuery(''); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border transition ${
                          reviewType === rt.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}>
                        <Icon size={14} /> {rt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search for destination/hotel */}
                <div className="relative" ref={reviewRef}>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={`Search ${reviewType === 'destination' ? 'destinations' : 'hotels'}...`}
                      value={reviewQuery}
                      onChange={e => { setReviewQuery(e.target.value); setShowReviewDD(true); setSelectedItem(null); }}
                      onFocus={() => setShowReviewDD(true)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                    {selectedItem && (
                      <button type="button" onClick={() => { setSelectedItem(null); setReviewQuery(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {showReviewDD && filteredReviewItems.length > 0 && !selectedItem && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-44">
                      {filteredReviewItems.slice(0, 6).map(item => (
                        <div key={item._id}
                          onClick={() => { setSelectedItem(item); setReviewQuery(item.name); setShowReviewDD(false); }}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.images?.[0]
                              ? <img src={`${BASE_URL}${item.images[0]}`} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300"><MapPin size={12} /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-[10px] text-gray-400">{item.country || item.destination?.name || ''}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedItem && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-blue-100 flex-shrink-0">
                        {selectedItem.images?.[0]
                          ? <img src={`${BASE_URL}${selectedItem.images[0]}`} alt="" className="w-full h-full object-cover" />
                          : <MapPin size={12} className="text-blue-600 m-auto mt-2" />}
                      </div>
                      <p className="text-sm font-semibold text-blue-800 flex-1 truncate">{selectedItem.name}</p>
                      <span className="text-[10px] text-blue-500 capitalize">{reviewType}</span>
                    </div>
                  )}
                </div>

                {/* Star rating */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Your Rating *</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110">
                        <Star
                          size={28}
                          className={`transition-colors ${n <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="ml-2 text-sm font-bold text-amber-600">
                        {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TRAVEL PHOTO: destination tag + budget ─────────────────── */}
            {category === 'photo' && !editingPost && (
              <div className="flex flex-col gap-3">
                {/* Destination tag */}
                <div className="relative" ref={destRef}>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Tag a destination (optional)"
                      value={destQuery}
                      onChange={e => { setDestQuery(e.target.value); setShowDestDD(true); if (!e.target.value) setSelectedDest(null); }}
                      onFocus={() => setShowDestDD(true)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                    {destQuery && (
                      <button type="button" onClick={() => { setDestQuery(''); setSelectedDest(null); setShowDestDD(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  {showDestDD && destResults.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-40">
                      {destResults.map(dest => (
                        <div key={dest._id} onClick={() => selectDestination(dest)}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {dest.images?.[0]
                              ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
                              : <MapPin size={10} className="text-gray-300 m-auto mt-2" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{dest.name}</p>
                            <p className="text-[10px] text-gray-400">{dest.country || 'Nepal'}</p>
                          </div>
                        </div>
                      ))}
                      {/* Allow custom entry */}
                      {destQuery && !destResults.some(d => d.name.toLowerCase() === destQuery.toLowerCase()) && (
                        <div onClick={() => { setSelectedDest({ _id: null, name: destQuery }); setShowDestDD(false); }}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer text-blue-600 text-sm border-t border-gray-100">
                          <MapPin size={12} /> Use "{destQuery}"
                        </div>
                      )}
                    </div>
                  )}
                  {selectedDest && (
                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 pl-1">
                      <MapPin size={9} /> Tagged: {selectedDest.name}
                    </p>
                  )}
                </div>

                {/* Budget tag */}
                <div className="flex items-center gap-2">
                  <DollarSign size={13} className="text-gray-400 flex-shrink-0" />
                  <select value={budget} onChange={e => setBudget(e.target.value)}
                    className="flex-1 py-1.5 px-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white">
                    <option value="">Budget level (optional)</option>
                    {BUDGETS.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Content textarea ─────────────────────────────────────────── */}
            <div>
              <textarea
                autoFocus
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={
                  category === 'photo'    ? 'Tell your story about this photo...' :
                  category === 'story'    ? 'Share your travel experience...' :
                  category === 'question' ? 'What would you like to ask the community?' :
                  category === 'review'   ? 'Write your review...' :
                  'Share your travel tip...'
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>

            {/* ── Image previews ────────────────────────────────────────────── */}
            {category !== 'question' && (
              <div>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {previews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt="" className="w-full h-24 object-cover rounded-xl border border-gray-100" />
                        <button type="button" onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {previews.length < 10 && (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:text-blue-400 hover:border-blue-300 transition">
                        <Image size={20} />
                        <span className="text-[10px] mt-1">Add more</span>
                      </button>
                    )}
                  </div>
                )}
                {previews.length === 0 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-300 transition">
                    <Image size={18} />
                    <span className="text-sm">Add photos</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {submitting ? 'Posting...' : editingPost ? 'Save Changes' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}