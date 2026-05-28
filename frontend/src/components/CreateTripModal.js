//frontend/src/components/CreateTripModal.js
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Loader2, Sparkles, Calendar } from 'lucide-react';
import { createTrip, createTripFromChat, getDestinations, getImageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function CreateTripModal({ onClose, onSuccess, mode = 'discovery', partnerId, partnerName, defaultDestination }) {
  const getLocalDate = () => {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - off);
    return local.toISOString().split('T')[0];
  };
  const today = getLocalDate();
  const [form, setForm] = useState({
    destination: defaultDestination || '',
    startDate: today,
    endDate: today,
    budget: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [dests, setDests] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [hiIdx, setHiIdx] = useState(-1);
  const destRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    getDestinations()
      .then(res => setDests(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function h(e) {
      if (destRef.current && !destRef.current.contains(e.target)) setShowSugg(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = dests.filter(d => 
    form.destination && d.name.toLowerCase().includes(form.destination.toLowerCase())
  ).slice(0, 6);

  function handleKeyDown(e) {
    if (!showSugg || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHiIdx(p => (p + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHiIdx(p => (p - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hiIdx >= 0) selectDest(filtered[hiIdx]);
    } else if (e.key === 'Escape') setShowSugg(false);
  }

  function selectDest(dest) {
    setForm(p => ({ ...p, destination: dest.name }));
    setShowSugg(false);
    setHiIdx(-1);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.destination || !form.startDate) {
      showToast('Destination and start date are required', 'error');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (mode === 'chat' && partnerId) {
        res = await createTripFromChat({
          partnerId,
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate || form.startDate,
          budget: form.budget || '',
          description: form.description || ''
        });
        showToast(`Trip to ${form.destination} created with ${partnerName}!`, 'success');
      } else {
        res = await createTrip({ ...form, createGroup: true });
        showToast('Trip created! Your group is now live.', 'success');
      }
      
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      showToast(err.response?.data?.msg || 'Failed to create trip', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              {mode === 'chat' ? 'Plan a Trip Together' : 'Plan a Trip'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {mode === 'chat' 
                ? `with ${partnerName} — both of you become co-owners`
                : 'A group is created automatically for others to join'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={17} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Destination *</label>
            <div className="relative" ref={destRef}>
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input 
                required 
                type="text" 
                placeholder="Search or type destination..."
                value={form.destination}
                onChange={(e) => {
                  setForm(p => ({ ...p, destination: e.target.value }));
                  setShowSugg(true);
                  setHiIdx(-1);
                }}
                onFocus={() => setShowSugg(true)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" 
              />
              {showSugg && form.destination && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52">
                  {filtered.length > 0 ? filtered.map((dest, idx) => (
                    <div 
                      key={dest._id} 
                      onClick={() => selectDest(dest)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition border-b border-gray-50 last:border-0 ${idx === hiIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {dest.images && dest.images[0] 
                          ? <img src={getImageUrl(dest.images[0])} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-gray-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                        <p className="text-[10px] text-gray-400">{dest.country || 'Nepal'}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="px-3 py-3 text-xs text-gray-400 text-center">No match — you can still type any destination</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Start Date *</label>
              <div className="relative">
                <input 
                  required 
                  type="date" 
                  value={form.startDate} 
                  min={today}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setForm(p => ({ 
                      ...p, 
                      startDate: newStart,
                      endDate: p.endDate < newStart ? newStart : p.endDate
                    }));
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">End Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={form.endDate} 
                  min={form.startDate} 
                  onChange={(e) => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Budget</label>
            <select 
              value={form.budget} 
              onChange={(e) => setForm(p => ({ ...p, budget: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition"
            >
              <option value="">Optional</option>
              <option value="Budget">Budget</option>
              <option value="Mid-range">Mid-range</option>
              <option value="Luxury">Luxury</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea 
              rows={2} 
              placeholder="Tell others about your trip plans..."
              value={form.description} 
              onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition resize-none" 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creating...</>
              ) : (
                <><Sparkles size={14} /> Create Trip & Group</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
