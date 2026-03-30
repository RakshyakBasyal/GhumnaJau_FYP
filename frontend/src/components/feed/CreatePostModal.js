// frontend/src/components/feed/CreatePostModal.jsx
import { useState, useRef, useEffect } from 'react';
import { X, Image, MapPin, Building2, Plane, ChevronDown, Loader } from 'lucide-react';
import { createPost, editPost } from '../../services/feedApi';
import axios from 'axios';

const BASE = 'http://localhost:5000/api';
const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CATEGORIES = [
  { value: 'story',  label: 'Travel Story',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'photo',  label: 'Trip Photo',         color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'review', label: 'Destination Review', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { value: 'tip',    label: 'Travel Tip',         color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export default function CreatePostModal({ onClose, onCreated, editingPost = null }) {
  const [content,     setContent]     = useState(editingPost?.content || '');
  const [category,    setCategory]    = useState(editingPost?.category || '');
  const [images,      setImages]      = useState([]);
  const [previews,    setPreviews]    = useState([]);
  const [keepImages,  setKeepImages]  = useState(editingPost?.images || []);
  const [destination, setDestination] = useState(editingPost?.destination?._id || '');
  const [hotel,       setHotel]       = useState(editingPost?.hotel?._id || '');
  const [flight,      setFlight]      = useState(editingPost?.flight?._id || '');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const [destinations, setDestinations] = useState([]);
  const [hotels,       setHotels]       = useState([]);
  const [flights,      setFlights]      = useState([]);

  const fileRef = useRef();

  useEffect(() => {
    // Load tag options
    axios.get(`${BASE}/destinations`, authHeaders()).then(r => setDestinations(r.data)).catch(() => {});
    axios.get(`${BASE}/hotels`,       authHeaders()).then(r => setHotels(r.data)).catch(() => {});
    axios.get(`${BASE}/flights`,      authHeaders()).then(r => setFlights(r.data)).catch(() => {});
  }, []);

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    const total = keepImages.length + images.length + files.length;
    if (total > 5) { setError('Maximum 5 images per post'); return; }
    setImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeNewImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeKeepImage = (img) => setKeepImages(prev => prev.filter(i => i !== img));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!content.trim()) return setError('Please write something.');
    if (!category)       return setError('Please select a category.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('content',  content.trim());
      fd.append('category', category);
      if (destination) fd.append('destination', destination);
      if (hotel)       fd.append('hotel',       hotel);
      if (flight)      fd.append('flight',      flight);
      images.forEach(img => fd.append('images', img));

      let result;
      if (editingPost) {
        const toDelete = (editingPost.images || []).filter(img => !keepImages.includes(img));
        if (toDelete.length) fd.append('deleteImages', JSON.stringify(toDelete));
        result = await editPost(editingPost._id, fd);
      } else {
        result = await createPost(fd);
      }

      onCreated(result.data, !!editingPost);
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to save post.');
    } finally {
      setLoading(false);
    }
  };

  const currentUser = {
    name:   localStorage.getItem('username') || 'You',
    avatar: null,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-5">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {editingPost ? 'Edit post' : 'Create new post'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4 bg-gray-50/40">

          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
            </div>
          </div>

          {/* Content */}
          <textarea
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your travel experience, a hidden gem, or a tip for fellow wanderers..."
            className="w-full resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
          />
          <p className="text-xs text-gray-400 text-right -mt-2">{content.length}/2000</p>

          {/* Category */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                    category === cat.value
                      ? cat.color + ' ring-2 ring-offset-1 ring-blue-400'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tag (optional)</p>

            {/* Destination */}
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700"
              >
                <option value="">Tag a destination</option>
                {destinations.map(d => (
                  <option key={d._id} value={d._id}>{d.name}, {d.country}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Hotel */}
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={hotel}
                onChange={e => setHotel(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700"
              >
                <option value="">Mention a hotel</option>
                {hotels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Flight */}
            <div className="relative">
              <Plane size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={flight}
                onChange={e => setFlight(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-gray-700"
              >
                <option value="">Mention a flight</option>
                {flights.map(f => (
                  <option key={f._id} value={f._id}>{f.airline} {f.flightNumber} · {f.from} → {f.to}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Existing images (edit mode) */}
          {keepImages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Current Images</p>
              <div className="flex gap-2 flex-wrap">
                {keepImages.map((img, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={`http://localhost:5000${img}`} alt="" className="w-full h-full object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeKeepImage(img)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New image previews */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={src} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition font-medium"
          >
            <Image size={17} />
            Add Photos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImages}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-full shadow transition flex items-center gap-2"
          >
            {loading && <Loader size={14} className="animate-spin" />}
            {loading ? 'Saving…' : editingPost ? 'Save Changes' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}