// frontend/src/pages/Itinerary.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, Loader2, Edit2, Trash2, X, Check,
  AlertTriangle, MapPin, PlayCircle, Flag, ChevronRight,
  Globe, Search, Star
} from 'lucide-react';

const BASE_URL = 'http://localhost:5000';
const tok = () => localStorage.getItem('token');
const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getNights = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return null;
  return Math.max(1, Math.round((new Date(itin.endDate) - new Date(itin.startDate)) / 86400000));
};

const fmtDateRange = (itin) => {
  if (!itin?.startDate && !itin?.endDate) return null;
  if (itin.startDate && itin.endDate) return `${fmtDate(itin.startDate)} – ${fmtDate(itin.endDate)}`;
  if (itin.startDate) return `From ${fmtDate(itin.startDate)}`;
  return `Until ${fmtDate(itin.endDate)}`;
};

export const STATUS_CFG = {
  planning:  { label: 'Planning',  textColor: 'text-amber-700',  bgColor: 'bg-amber-50',  dotColor: 'bg-amber-400',  border: 'border-amber-200' },
  active:    { label: 'Active',    textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', dotColor: 'bg-emerald-500', border: 'border-emerald-200' },
  completed: { label: 'Completed', textColor: 'text-sky-700',    bgColor: 'bg-sky-50',    dotColor: 'bg-sky-500',    border: 'border-sky-200' },
};

export const Modal = ({ children, onClose, wide }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
    style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`bg-white w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-3xl shadow-2xl overflow-hidden`}
      style={{ animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
      {children}
    </div>
    <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.92) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
  </div>
);

export const ConfirmDelete = ({ label, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Delete this trip?</h2>
        <p className="text-gray-500 text-sm mb-6">"{label}" will be permanently removed along with all its items.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 font-semibold flex items-center justify-center gap-2 transition text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Trip creation modal — now includes destination selection
export const TripModal = ({ existing, onClose, onSave }) => {
  const [step, setStep] = useState(existing ? 2 : 1); // step 1 = pick destination, step 2 = trip details
  const [destinations, setDestinations] = useState([]);
  const [destQuery, setDestQuery] = useState('');
  const [destLoading, setDestLoading] = useState(true);
  const [selectedDest, setSelectedDest] = useState(existing?.destination || null);

  const [title, setTitle]         = useState(existing?.title || '');
  const [startDate, setStartDate] = useState(existing?.startDate?.slice(0, 10) || '');
  const [endDate, setEndDate]     = useState(existing?.endDate?.slice(0, 10) || '');
  const [loading, setLoading]     = useState(false);
  const today = todayStr();

  useEffect(() => {
    if (step === 1) {
      fetch(`${BASE_URL}/api/destinations`)
        .then(r => r.json()).then(d => setDestinations(Array.isArray(d) ? d : d.destinations || []))
        .catch(() => setDestinations([])).finally(() => setDestLoading(false));
    }
  }, [step]);

  // Auto-fill title when destination is selected
  const pickDest = (dest) => {
    setSelectedDest(dest);
    if (!title) setTitle(`Trip to ${dest.name}`);
    setStep(2);
  };

  const filteredDests = destQuery.trim()
    ? destinations.filter(d => d.name.toLowerCase().includes(destQuery.toLowerCase()))
    : destinations;

  if (step === 1) return (
    <Modal onClose={onClose} wide>
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Where are you going?</h2>
            <p className="text-sm text-gray-500 mt-0.5">Pick a destination to start planning</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input autoFocus type="text" value={destQuery} onChange={e => setDestQuery(e.target.value)}
            placeholder="Search destinations..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {destLoading && <p className="text-center py-10 text-gray-400 text-sm">Loading destinations...</p>}
        {!destLoading && filteredDests.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No destinations found</p>}
        {filteredDests.map(dest => (
          <button key={dest._id} onClick={() => pickDest(dest)}
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50 transition group text-left border-b border-gray-50 last:border-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0">
              {dest.images?.[0]
                ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-blue-400" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{dest.name}</p>
              <p className="text-sm text-gray-400">{dest.country || 'Nepal'}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition" />
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-gray-100">
        <button onClick={() => setStep(2)}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition">
          Skip — plan without a destination →
        </button>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            {selectedDest && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                  {selectedDest.images?.[0]
                    ? <img src={`${BASE_URL}${selectedDest.images[0]}`} alt="" className="w-full h-full object-cover" />
                    : <MapPin className="h-3 w-3 text-blue-400 m-auto" />}
                </div>
                <span className="text-sm font-semibold text-blue-600">{selectedDest.name}</span>
                {!existing && (
                  <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">change</button>
                )}
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">{existing ? 'Edit Trip' : 'Plan Your Trip'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Name <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Pokhara Getaway, EBC Trek"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input type="date" value={startDate} min={today}
              onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input type="date" value={endDate} min={startDate || today}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
        </div>
        {startDate && endDate && (
          <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span><strong>{getNights({ startDate, endDate })} nights</strong> · {fmtShort(startDate)} to {fmtShort(endDate)}</span>
          </div>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        {!existing && <button onClick={() => setStep(1)} className="px-4 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">← Back</button>}
        {existing && <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>}
        <button disabled={!title.trim() || loading}
          onClick={async () => {
            setLoading(true);
            await onSave({
              title,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              destinationId: selectedDest?._id || undefined,
              destinationName: selectedDest?.name || undefined,
            });
            setLoading(false);
          }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {existing ? 'Save Changes' : 'Create Trip'}
        </button>
      </div>
    </Modal>
  );
};

export const StatusButton = ({ itin, onStatusChange, small }) => {
  const [loading, setLoading] = useState(false);
  const status = itin.status || 'planning';
  const sz = small ? 'px-3 py-1.5 text-xs' : 'px-5 py-2.5 text-sm';
  const handle = async (e, next) => { e.stopPropagation(); setLoading(true); await onStatusChange(itin._id, next); setLoading(false); };

  if (loading) return <button disabled className={`flex items-center gap-1.5 ${sz} bg-gray-100 text-gray-400 rounded-xl font-semibold`}><Loader2 className="h-3.5 w-3.5 animate-spin" />...</button>;
  if (status === 'planning') return <button onClick={e => handle(e, 'active')} className={`flex items-center gap-1.5 ${sz} bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition`}><PlayCircle className="h-3.5 w-3.5" />Start Trip</button>;
  if (status === 'active')   return <button onClick={e => handle(e, 'completed')} className={`flex items-center gap-1.5 ${sz} bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold transition`}><Flag className="h-3.5 w-3.5" />End Trip</button>;
  return null;
};

const TripCard = ({ itin, onOpen, onEdit, onDelete, onStatusChange }) => {
  const dr     = fmtDateRange(itin);
  const nights = getNights(itin);
  const status = itin.status || 'planning';
  const sCfg   = STATUS_CFG[status];
  const total  = itin.itemCount ?? 0;
  const done   = itin.doneCount ?? 0;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div onClick={() => onOpen(itin)}
      className="bg-white rounded-3xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-100">
      <div className="relative h-48 overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6,#60a5fa)' }}>
        {itin.coverImage
          ? <img src={`${BASE_URL}${itin.coverImage}`} alt={itin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : itin.destinationImage
            ? <img src={`${BASE_URL}${itin.destinationImage}`} alt={itin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/40">
                <Globe className="h-12 w-12" />
              </div>
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />

        {/* Status badge */}
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white shadow-md ${sCfg.textColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dotColor} ${status === 'active' ? 'animate-pulse' : ''}`} />
          {sCfg.label}
        </div>

        {/* Edit/delete */}
        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onEdit(itin); }} className="p-2 bg-white/90 rounded-xl shadow text-gray-600 hover:text-blue-600 transition"><Edit2 className="h-3.5 w-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(itin); }} className="p-2 bg-white/90 rounded-xl shadow text-gray-600 hover:text-red-500 transition"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>

        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white leading-tight">{itin.title}</h3>
          {itin.destinationName && (
            <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{itin.destinationName}</p>
          )}
        </div>
      </div>

      <div className="p-4">
        {dr && <p className="flex items-center gap-1.5 text-gray-400 text-xs mb-3"><Calendar className="h-3.5 w-3.5" />{dr}</p>}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {nights && <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">{nights}N</span>}
          <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">{total} items</span>
          {total > 0 && <span className="text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">{pct}% done</span>}
        </div>

        {total > 0 && (
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all duration-700 ${status === 'completed' ? 'bg-sky-500' : status === 'active' ? 'bg-emerald-500' : 'bg-blue-400'}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className={`text-xs font-semibold ${status === 'completed' ? 'text-sky-600' : status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
            {status === 'completed' ? '✓ Completed' : status === 'active' ? '● In progress' : 'Not started'}
          </span>
          <div onClick={e => e.stopPropagation()}>
            <StatusButton itin={itin} onStatusChange={onStatusChange} small />
          </div>
        </div>
      </div>
    </div>
  );
};

const Itinerary = () => {
  const [itineraries,  setItineraries]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filter,       setFilter]       = useState('all');
  const navigate = useNavigate();
  const token    = tok();

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${BASE_URL}/api/itineraries`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(setItineraries).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [token, navigate]);

  const handleCreate = async ({ title, startDate, endDate, destinationId, destinationName }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, startDate, endDate, destinationId, destinationName }),
    });
    if (!res.ok) { alert('Failed to create'); return; }
    const created = await res.json();
    setItineraries(prev => [{ ...created, itemCount: 0, doneCount: 0 }, ...prev]);
    setShowCreate(false);
    // Navigate straight to detail page
    navigate(`/itinerary/${created._id}`);
  };

  const handleEdit = async ({ title, startDate, endDate }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${editTarget._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, startDate, endDate }),
    });
    if (!res.ok) { alert('Failed to update'); return; }
    const updated = await res.json();
    setItineraries(prev => prev.map(i => i._id === updated._id ? { ...i, ...updated } : i));
    setEditTarget(null);
  };

  const handleDelete = async () => {
    await fetch(`${BASE_URL}/api/itineraries/${deleteTarget._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setItineraries(prev => prev.filter(i => i._id !== deleteTarget._id));
    setDeleteTarget(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { alert('Failed to update status'); return; }
    const updated = await res.json();
    setItineraries(prev => prev.map(i => i._id === updated._id ? { ...i, status: updated.status } : i));
  };

  const filtered = itineraries.filter(i => filter === 'all' || (i.status || 'planning') === filter);
  const counts = {
    all: itineraries.length,
    active: itineraries.filter(i => i.status === 'active').length,
    planning: itineraries.filter(i => (i.status || 'planning') === 'planning').length,
    completed: itineraries.filter(i => i.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreate   && <TripModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editTarget   && <TripModal existing={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <ConfirmDelete label={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-400 mt-1 text-sm">{loading ? '' : `${itineraries.length} trip${itineraries.length !== 1 ? 's' : ''} planned`}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl hover:bg-blue-700 font-semibold text-sm transition shadow-md shadow-blue-200">
            <Plus className="h-4 w-4" /> New Trip
          </button>
        </div>

        {!loading && itineraries.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-6 mb-6">
            {[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'planning', label: 'Planning' }, { key: 'completed', label: 'Completed' }]
              .filter(({ key }) => key === 'all' || counts[key] > 0)
              .map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === key ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                  {label} {counts[key] > 0 && <span className={`ml-1 text-xs ${filter === key ? 'text-blue-200' : 'text-gray-400'}`}>({counts[key]})</span>}
                </button>
              ))}
          </div>
        )}

        {loading && <div className="flex items-center justify-center gap-3 py-32"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>}
        {error && <p className="text-center py-32 text-red-500">{error}</p>}

        {!loading && !error && itineraries.length === 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-16 text-center mt-6 border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Globe className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No trips planned yet</h2>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm">Start planning your Nepal adventure — pick a destination, set dates, add flights, hotels and activities.</p>
            <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 font-semibold transition inline-flex items-center gap-2 shadow-md shadow-blue-200">
              <Plus className="h-4 w-4" /> Plan Your First Trip
            </button>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(itin => (
              <TripCard key={itin._id} itin={itin}
                onOpen={i => navigate(`/itinerary/${i._id}`)}
                onEdit={setEditTarget} onDelete={setDeleteTarget} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Itinerary;