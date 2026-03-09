// frontend/src/pages/Itinerary.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Hotel, Plane, UtensilsCrossed,
  Zap, Trash2, Edit2, X, Loader2, Search, ChevronRight,
  Star, ArrowRight, DollarSign, Clock, AlertTriangle, Check,
  ChevronDown, ChevronUp, PlayCircle, CheckCircle2, RotateCcw,
  Sparkles, Package, Flag
} from 'lucide-react';

const BASE_URL = 'http://localhost:5000';
const fmtNPR = (n) => `NPR ${Math.round(n).toLocaleString()}`;
const tok = () => localStorage.getItem('token');
const todayStr = () => new Date().toISOString().slice(0, 10);

const TYPE_CFG = {
  destination: { icon: MapPin,          label: 'Destination', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
  hotel:       { icon: Hotel,           label: 'Hotel',       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  flight:      { icon: Plane,           label: 'Flight',      color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  restaurant:  { icon: UtensilsCrossed, label: 'Restaurant',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  activity:    { icon: Zap,             label: 'Activity',    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
};
const getCfg = (t) => TYPE_CFG[t] || { icon: Calendar, label: t, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };

const fmtDate   = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtDateRange = (itin) => {
  if (!itin?.startDate && !itin?.endDate) return null;
  if (itin.startDate && itin.endDate) return `${fmtDate(itin.startDate)} – ${fmtDate(itin.endDate)}`;
  if (itin.startDate) return `From ${fmtDate(itin.startDate)}`;
  return `Until ${fmtDate(itin.endDate)}`;
};

const getDays = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return [];
  const days = [];
  const end = new Date(itin.endDate);
  for (let d = new Date(itin.startDate); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
};

const getNights = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return 1;
  return Math.max(1, Math.round((new Date(itin.endDate) - new Date(itin.startDate)) / 86400000));
};

const isSameDay = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

const STATUS_CFG = {
  planning:  { label: 'Planning',    color: 'text-gray-600',   bg: 'bg-gray-100',    dot: 'bg-gray-400'    },
  active:    { label: 'Active',      color: 'text-green-700',  bg: 'bg-green-100',   dot: 'bg-green-500'   },
  completed: { label: 'Completed',   color: 'text-blue-700',   bg: 'bg-blue-100',    dot: 'bg-blue-500'    },
};

// ── Modal Shell ───────────────────────────────────────────────────────────────
const Modal = ({ children, onClose, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`bg-white w-full ${wide ? 'max-w-lg' : 'max-w-md'} rounded-2xl shadow-2xl overflow-hidden`}>
      {children}
    </div>
  </div>
);

// ── Confirm Delete ────────────────────────────────────────────────────────────
const ConfirmDelete = ({ label, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Delete this?</h2>
        <p className="text-gray-500 text-sm mb-6">"{label}" will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition text-sm">Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium flex items-center justify-center gap-2 transition text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Trip Form Modal ───────────────────────────────────────────────────────────
const TripModal = ({ existing, onClose, onSave }) => {
  const [title,     setTitle]     = useState(existing?.title || '');
  const [startDate, setStartDate] = useState(existing?.startDate?.slice(0, 10) || '');
  const [endDate,   setEndDate]   = useState(existing?.endDate?.slice(0, 10) || '');
  const [loading,   setLoading]   = useState(false);
  const today = todayStr();

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{existing ? 'Edit Trip' : 'Plan a New Trip'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{existing ? 'Update your trip details' : 'Where are you heading next?'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Name <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Pokhara Getaway"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input type="date" value={startDate} min={today}
              onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input type="date" value={endDate} min={startDate || today}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
        </div>
        {startDate && endDate && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span><strong>{getNights({ startDate, endDate })} nights</strong> · {fmtShort(startDate)} to {fmtShort(endDate)}</span>
          </div>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || loading}
          onClick={async () => { setLoading(true); await onSave({ title, startDate: startDate || undefined, endDate: endDate || undefined }); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {existing ? 'Save Changes' : 'Create Trip'}
        </button>
      </div>
    </Modal>
  );
};

// ── Search Modal Base ─────────────────────────────────────────────────────────
const SearchModal = ({ title, subtitle, onClose, loading, children, query, setQuery, placeholder }) => (
  <Modal onClose={onClose} wide>
    <div className="p-5 border-b border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-blue-500 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" />
      </div>
    </div>
    <div className="overflow-y-auto max-h-72">
      {loading && <p className="text-center py-10 text-gray-400 text-sm">Loading...</p>}
      {children}
    </div>
  </Modal>
);

// ── Add Destination Modal ─────────────────────────────────────────────────────
const AddDestModal = ({ onClose, onAdd, plannedDate }) => {
  const [all, setAll]         = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/destinations`)
      .then(r => r.json()).then(d => setAll(Array.isArray(d) ? d : d.destinations || []))
      .catch(() => setAll([])).finally(() => setLoading(false));
  }, []);

  const filtered = query.trim() ? all.filter(d => d.name.toLowerCase().includes(query.toLowerCase())) : all;

  return (
    <SearchModal title="Add Destination" onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search destinations...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No destinations found</p>}
      {filtered.map(dest => (
        <button key={dest._id} disabled={!!adding}
          onClick={async () => { setAdding(dest._id); await onAdd({ type: 'destination', title: dest.name, referenceId: dest._id, plannedDate: plannedDate || undefined }); setAdding(null); }}
          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-green-50 flex-shrink-0">
            {dest.images?.[0]
              ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-green-600" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{dest.name}</p>
            <p className="text-xs text-gray-500">{dest.country || 'Nepal'}</p>
          </div>
          {adding === dest._id
            ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition" />}
        </button>
      ))}
    </SearchModal>
  );
};

// ── Add Hotel Modal — all destinations ────────────────────────────────────────
const AddHotelModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]         = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/hotels`)
      .then(r => r.json()).then(d => {
        let hotels = Array.isArray(d) ? d : d.hotels || [];
        if (destinationIds?.length > 0) {
          hotels = hotels.filter(h => destinationIds.includes(String(h.destination?._id || h.destination)));
        }
        setAll(hotels);
      })
      .catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim() ? all.filter(h => h.name.toLowerCase().includes(query.toLowerCase())) : all;

  return (
    <SearchModal
      title="Add Hotel"
      subtitle={destinationIds?.length > 0 ? `Filtered by your ${destinationIds.length} destination(s)` : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search hotels...">
      {!loading && filtered.length === 0 && (
        <p className="text-center py-10 text-gray-400 text-sm">
          {destinationIds?.length > 0 ? 'No hotels found for your destinations' : 'No hotels found'}
        </p>
      )}
      {filtered.map(hotel => {
        const minPrice = hotel.roomTypes?.length ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        return (
          <button key={hotel._id} disabled={!!adding}
            onClick={async () => { setAdding(hotel._id); await onAdd({ type: 'hotel', title: hotel.name, referenceId: hotel._id, estimatedCost: minPrice, plannedDate: plannedDate || undefined }); setAdding(null); }}
            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
              {hotel.images?.[0]
                ? <img src={`${BASE_URL}${hotel.images[0]}`} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Hotel className="h-4 w-4 text-blue-600" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{hotel.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-500">{hotel.rating || 5}</span>
                {hotel.destination?.name && <span className="text-xs text-gray-400">· {hotel.destination.name}</span>}
              </div>
            </div>
            {minPrice > 0 && (
              <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                NPR {minPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span>
              </span>
            )}
            {adding === hotel._id
              ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin ml-1" />
              : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition ml-1" />}
          </button>
        );
      })}
    </SearchModal>
  );
};

// ── Add Flight Modal — all destinations ───────────────────────────────────────
const AddFlightModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]         = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/flights`)
      .then(r => r.json()).then(d => {
        let flights = Array.isArray(d) ? d : [];
        if (destinationIds?.length > 0) {
          flights = flights.filter(f => destinationIds.includes(String(f.destination?._id || f.destination)));
        }
        setAll(flights);
      })
      .catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim()
    ? all.filter(f =>
        f.airline.toLowerCase().includes(query.toLowerCase()) ||
        f.flightNumber.toLowerCase().includes(query.toLowerCase()) ||
        f.from.toLowerCase().includes(query.toLowerCase()) ||
        f.to.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <SearchModal
      title="Add Flight"
      subtitle={destinationIds?.length > 0 ? `Filtered by your ${destinationIds.length} destination(s)` : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search airline or route...">
      {!loading && filtered.length === 0 && (
        <p className="text-center py-10 text-gray-400 text-sm">
          {destinationIds?.length > 0 ? 'No flights found for your destinations' : 'No flights found'}
        </p>
      )}
      <div className="p-2 space-y-1">
        {filtered.map(flight => (
          <button key={flight._id} disabled={!!adding}
            onClick={async () => {
              setAdding(flight._id);
              await onAdd({
                type: 'flight',
                title: `${flight.airline} ${flight.flightNumber}`,
                notes: `${flight.from} → ${flight.to} · ${flight.departureTime}–${flight.arrivalTime} · ${flight.duration}`,
                plannedDate: plannedDate || flight.departureDate,
                referenceId: flight._id,
                estimatedCost: flight.price || 0,
              });
              setAdding(null);
            }}
            className="w-full text-left p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 transition">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 p-1.5 rounded-lg"><Plane className="h-3.5 w-3.5 text-indigo-600" /></div>
                <span className="font-bold text-gray-900 text-sm">{flight.airline} · {flight.flightNumber}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{flight.class}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-600 text-sm">NPR {Number(flight.price).toLocaleString()}</span>
                {adding === flight._id && <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 ml-8 flex items-center gap-1.5">
              <span className="font-medium text-gray-700">{flight.from}</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium text-gray-700">{flight.to}</span>
              <span>·</span><span>{flight.departureTime}–{flight.arrivalTime}</span>
              <span>·</span><span>{flight.duration}</span>
            </p>
          </button>
        ))}
      </div>
    </SearchModal>
  );
};

// ── Add Custom Modal ──────────────────────────────────────────────────────────
const AddCustomModal = ({ type, onClose, onAdd, plannedDate }) => {
  const [title,   setTitle]   = useState('');
  const [notes,   setNotes]   = useState('');
  const [date,    setDate]    = useState(plannedDate?.slice(0, 10) || '');
  const [cost,    setCost]    = useState('');
  const [loading, setLoading] = useState(false);
  const isRest = type === 'restaurant';

  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">{isRest ? 'Add Restaurant' : 'Add Activity'}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Name <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={isRest ? 'e.g. Krishnarpan Restaurant' : 'e.g. Paragliding in Pokhara'}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{isRest ? 'Reservation Date' : 'Planned Date'}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Est. Cost (NPR)</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || loading}
          onClick={async () => { setLoading(true); await onAdd({ type, title, notes, plannedDate: date || undefined, estimatedCost: parseFloat(cost) || 0 }); setLoading(false); }}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
    </Modal>
  );
};

// ── Status Button ─────────────────────────────────────────────────────────────
const StatusButton = ({ itin, onStatusChange, small }) => {
  const [loading, setLoading] = useState(false);
  const status = itin.status || 'planning';

  const handleChange = async (e, newStatus) => {
    e.stopPropagation();
    setLoading(true);
    await onStatusChange(itin._id, newStatus);
    setLoading(false);
  };

  if (loading) {
    return (
      <button disabled className={`flex items-center gap-1.5 ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-gray-100 text-gray-400 rounded-xl font-semibold`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
      </button>
    );
  }

  if (status === 'planning') return (
    <button onClick={e => handleChange(e, 'active')}
      className={`flex items-center gap-1.5 ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold transition`}>
      <PlayCircle className="h-3.5 w-3.5" /> Start Trip
    </button>
  );

  if (status === 'active') return (
    <button onClick={e => handleChange(e, 'completed')}
      className={`flex items-center gap-1.5 ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition`}>
      <Flag className="h-3.5 w-3.5" /> End Trip
    </button>
  );

  if (status === 'completed') return (
    <button onClick={e => handleChange(e, 'planning')}
      className={`flex items-center gap-1.5 ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-semibold transition`}>
      <RotateCcw className="h-3.5 w-3.5" /> Reset
    </button>
  );

  return null;
};

// ── Item Row ──────────────────────────────────────────────────────────────────
const ItemRow = ({ item, onDelete }) => {
  const cfg  = getCfg(item.type);
  const Icon = cfg.icon;
  return (
    <div className="group flex items-center gap-3 py-3 px-1 border-b border-gray-50 last:border-0">
      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0 text-xs text-gray-400 mt-0.5">
          {item.estimatedCost > 0 && <span className="font-semibold text-blue-600">{fmtNPR(item.estimatedCost)}</span>}
          {item.notes && <span className="truncate max-w-xs">{item.notes}</span>}
          {item.plannedDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(item.plannedDate)}</span>}
        </div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} flex-shrink-0 hidden sm:block`}>{cfg.label}</span>
      <button onClick={() => onDelete(item)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Day Section ───────────────────────────────────────────────────────────────
const DaySection = ({ day, dayNum, items, onAddItem, destinationIds, onDeleteItem }) => {
  const [open,  setOpen]  = useState(true);
  const [modal, setModal] = useState(null);
  const dateStr = day.toISOString().slice(0, 10);

  const handleAdd = async (itemData) => {
    await onAddItem({ ...itemData, plannedDate: itemData.plannedDate || dateStr });
    setModal(null);
  };

  const ADD_BTNS = [
    { key: 'destination', label: 'Destination', Icon: MapPin          },
    { key: 'hotel',       label: 'Hotel',       Icon: Hotel           },
    { key: 'flight',      label: 'Flight',      Icon: Plane           },
    { key: 'restaurant',  label: 'Restaurant',  Icon: UtensilsCrossed },
    { key: 'activity',    label: 'Activity',    Icon: Zap             },
  ];

  return (
    <>
      {modal === 'destination' && <AddDestModal   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
      {modal === 'hotel'       && <AddHotelModal  onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={dateStr} />}
      {modal === 'flight'      && <AddFlightModal onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={dateStr} />}
      {modal === 'restaurant'  && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
      {modal === 'activity'    && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg min-w-[4rem] text-center">
              Day {dayNum}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {open && (
          <div className="border-t border-gray-100">
            {items.length > 0 && (
              <div className="px-5 pt-2 pb-1">
                {items.map(item => <ItemRow key={item._id} item={item} onDelete={onDeleteItem} />)}
              </div>
            )}
            {items.length === 0 && (
              <p className="text-center text-gray-400 text-xs py-4 px-5">Nothing planned for this day yet</p>
            )}
            <div className="px-5 pb-4 pt-2 flex flex-wrap gap-2">
              {ADD_BTNS.map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setModal(key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                  <Icon className="h-3.5 w-3.5" /> + {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ── Trip Card ─────────────────────────────────────────────────────────────────
const TripCard = ({ itin, onOpen, onEdit, onDelete, onStatusChange }) => {
  const dr     = fmtDateRange(itin);
  const nights = getNights(itin);
  const status = itin.status || 'planning';
  const sCfg   = STATUS_CFG[status];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Top colour bar */}
      <div className={`h-1.5 ${status === 'active' ? 'bg-green-500' : status === 'completed' ? 'bg-blue-500' : 'bg-gray-200'}`} />

      <div className="p-6">
        {/* Status badge + title */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sCfg.bg} ${sCfg.color} mb-2`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {sCfg.label}
            </span>
            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate cursor-pointer"
              onClick={() => onOpen(itin)}>
              {itin.title}
            </h3>
            {dr && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />{dr}
              </p>
            )}
          </div>
          {/* Edit / Delete — visible on hover */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); onEdit(itin); }}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 className="h-4 w-4" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(itin); }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{itin.itemCount ?? 0} items</span>
            {itin.startDate && itin.endDate && <span>{nights} nights</span>}
          </div>
          <div className="flex items-center gap-2">
            <StatusButton itin={itin} onStatusChange={onStatusChange} small />
            <button onClick={() => onOpen(itin)}
              className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
              View <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Trip Detail ───────────────────────────────────────────────────────────────
const TripDetail = ({ itin, onBack, onEdit, onDelete, onStatusChange, authToken }) => {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deleteItem, setDeleteItem] = useState(null);
  const [modal,      setModal]      = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/itineraries/${itin._id}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setItems(d.items || []))
      .catch(() => setItems([])).finally(() => setLoading(false));
  }, [itin._id, authToken]);

  const handleAddItem = async (itemData) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${itin._id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(itemData),
    });
    if (!res.ok) { alert('Failed to add item'); return; }
    const newItem = await res.json();
    setItems(prev => [...prev, newItem]);
    setModal(null);
  };

  const handleRemoveItem = async () => {
    await fetch(`${BASE_URL}/api/itineraries/items/${deleteItem._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` },
    });
    setItems(prev => prev.filter(i => i._id !== deleteItem._id));
    setDeleteItem(null);
  };

  const days        = getDays(itin);
  const hasDays     = days.length > 0;
  const nights      = getNights(itin);
  const status      = itin.status || 'planning';
  const sCfg        = STATUS_CFG[status];
  const unscheduled = hasDays ? items.filter(i => !i.plannedDate) : [];

  // All destination IDs in this itinerary
  const destinationIds = useMemo(() =>
    items.filter(i => i.type === 'destination').map(i => String(i.referenceId)).filter(Boolean),
    [items]
  );

  const flightCost = items.filter(i => i.type === 'flight').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const hotelNight = items.filter(i => i.type === 'hotel').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const otherCost  = items.filter(i => ['restaurant', 'activity'].includes(i.type)).reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const grand      = flightCost + hotelNight * nights + otherCost;

  const QUICK_BTNS = [
    { key: 'destination', label: 'Destination', Icon: MapPin          },
    { key: 'hotel',       label: 'Hotel',       Icon: Hotel           },
    { key: 'flight',      label: 'Flight',      Icon: Plane           },
    { key: 'restaurant',  label: 'Restaurant',  Icon: UtensilsCrossed },
    { key: 'activity',    label: 'Activity',    Icon: Zap             },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {deleteItem && <ConfirmDelete label={deleteItem.title} onClose={() => setDeleteItem(null)} onConfirm={handleRemoveItem} />}
      {!hasDays && modal === 'destination' && <AddDestModal   onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {!hasDays && modal === 'hotel'       && <AddHotelModal  onClose={() => setModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!hasDays && modal === 'flight'      && <AddFlightModal onClose={() => setModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!hasDays && modal === 'restaurant'  && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {!hasDays && modal === 'activity'    && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAddItem} />}

      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={onBack} className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition whitespace-nowrap">
              Back
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 truncate">{itin.title}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${sCfg.bg} ${sCfg.color} flex-shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
                  {sCfg.label}
                </span>
              </div>
              {fmtDateRange(itin) && (
                <p className="text-xs text-gray-400">{fmtDateRange(itin)} · {nights} night{nights !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <StatusButton itin={itin} onStatusChange={onStatusChange} />
            <button onClick={() => onEdit(itin)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => onDelete(itin)}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-50 text-sm font-semibold transition">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-32">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-500">Loading your itinerary...</span>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Main */}
            <div className="lg:col-span-2 space-y-4">
              {hasDays ? (
                <>
                  {days.map((day, i) => (
                    <DaySection
                      key={day.toISOString()}
                      day={day} dayNum={i + 1}
                      items={items.filter(item => item.plannedDate && isSameDay(item.plannedDate, day))}
                      onAddItem={handleAddItem}
                      destinationIds={destinationIds}
                      onDeleteItem={setDeleteItem}
                    />
                  ))}
                  {unscheduled.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <p className="text-sm font-bold text-gray-700 mb-3">Unscheduled Items</p>
                      {unscheduled.map(item => <ItemRow key={item._id} item={item} onDelete={setDeleteItem} />)}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-1">Itinerary Items</h3>
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg mb-4">
                    Add start and end dates to enable day-by-day planning
                  </p>
                  {items.length === 0
                    ? <div className="text-center py-10">
                        <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No items yet — use the buttons below to start planning</p>
                      </div>
                    : items.map(item => <ItemRow key={item._id} item={item} onDelete={setDeleteItem} />)
                  }
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    {QUICK_BTNS.map(({ key, label, Icon }) => (
                      <button key={key} onClick={() => setModal(key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                        <Icon className="h-3.5 w-3.5" /> + {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">

              {/* Trip status card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Trip Status</h3>
                <div className="space-y-2 mb-4">
                  {[
                    { key: 'planning',  label: 'Planning',  desc: 'Building your trip plan' },
                    { key: 'active',    label: 'Active',    desc: 'Trip is underway'         },
                    { key: 'completed', label: 'Completed', desc: 'Trip is finished'         },
                  ].map(({ key, label, desc }) => {
                    const cfg    = STATUS_CFG[key];
                    const active = status === key;
                    return (
                      <div key={key} className={`flex items-center gap-3 p-2.5 rounded-xl ${active ? cfg.bg : ''}`}>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? cfg.dot : 'bg-gray-200'} ${active && key === 'active' ? 'animate-pulse' : ''}`} />
                        <div>
                          <p className={`text-sm font-semibold ${active ? cfg.color : 'text-gray-400'}`}>{label}</p>
                          {active && <p className="text-xs text-gray-400">{desc}</p>}
                        </div>
                        {active && <CheckCircle2 className={`h-4 w-4 ml-auto ${cfg.color}`} />}
                      </div>
                    );
                  })}
                </div>
                <StatusButton itin={itin} onStatusChange={onStatusChange} />
              </div>

              {/* Budget */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Estimated Budget</h3>
                </div>
                {grand === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-3">Add items to see budget</p>
                ) : (
                  <div className="space-y-2.5 text-sm">
                    {flightCost > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500"><Plane className="h-3.5 w-3.5 text-indigo-400" />Flights</span>
                        <span className="font-semibold text-gray-900">{fmtNPR(flightCost)}</span>
                      </div>
                    )}
                    {hotelNight > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500"><Hotel className="h-3.5 w-3.5 text-blue-400" />Hotels <span className="text-gray-400 text-xs">x{nights}n</span></span>
                        <span className="font-semibold text-gray-900">{fmtNPR(hotelNight * nights)}</span>
                      </div>
                    )}
                    {otherCost > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-gray-500"><Zap className="h-3.5 w-3.5 text-amber-400" />Activities & Dining</span>
                        <span className="font-semibold text-gray-900">{fmtNPR(otherCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-blue-600 text-base">{fmtNPR(grand)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Trip Summary</h3>
                {itin.startDate && itin.endDate && (
                  <div className="flex items-center justify-between py-1.5 text-sm border-b border-gray-50 mb-1">
                    <span className="flex items-center gap-2 text-gray-500"><Calendar className="h-3.5 w-3.5 text-blue-400" />Duration</span>
                    <span className="font-semibold text-gray-900">{nights} nights</span>
                  </div>
                )}
                {items.length === 0
                  ? <p className="text-gray-400 text-xs text-center py-3">No items yet</p>
                  : Object.entries(TYPE_CFG).map(([type, cfg]) => {
                      const count = items.filter(i => i.type === type).length;
                      if (!count) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={type} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="flex items-center gap-2 text-gray-500"><Icon className={`h-3.5 w-3.5 ${cfg.color}`} />{cfg.label}</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Itinerary = () => {
  const [itineraries,  setItineraries]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [openTrip,     setOpenTrip]     = useState(null);
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

  const handleCreate = async ({ title, startDate, endDate }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, startDate: startDate || undefined, endDate: endDate || undefined }),
    });
    if (!res.ok) { alert('Failed to create'); return; }
    const created = await res.json();
    setItineraries(prev => [created, ...prev]);
    setShowCreate(false);
  };

  const handleEdit = async ({ title, startDate, endDate }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${editTarget._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, startDate: startDate || undefined, endDate: endDate || undefined }),
    });
    if (!res.ok) { alert('Failed to update'); return; }
    const updated = await res.json();
    setItineraries(prev => prev.map(i => i._id === updated._id ? updated : i));
    if (openTrip?._id === updated._id) setOpenTrip(updated);
    setEditTarget(null);
  };

  const handleDelete = async () => {
    await fetch(`${BASE_URL}/api/itineraries/${deleteTarget._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setItineraries(prev => prev.filter(i => i._id !== deleteTarget._id));
    if (openTrip?._id === deleteTarget._id) setOpenTrip(null);
    setDeleteTarget(null);
  };

  // Status change handler — calls new PATCH /status endpoint
  const handleStatusChange = async (id, newStatus) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { alert('Failed to update status'); return; }
    const updated = await res.json();
    setItineraries(prev => prev.map(i => i._id === updated._id ? { ...i, status: updated.status } : i));
    if (openTrip?._id === updated._id) setOpenTrip(prev => ({ ...prev, status: updated.status }));
  };

  const filteredItineraries = itineraries.filter(i => filter === 'all' || (i.status || 'planning') === filter);

  const counts = {
    all:       itineraries.length,
    planning:  itineraries.filter(i => (i.status || 'planning') === 'planning').length,
    active:    itineraries.filter(i => i.status === 'active').length,
    completed: itineraries.filter(i => i.status === 'completed').length,
  };

  if (openTrip) return (
    <>
      {editTarget   && <TripModal existing={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <ConfirmDelete label={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}
      <TripDetail
        itin={openTrip}
        authToken={token}
        onBack={() => setOpenTrip(null)}
        onEdit={setEditTarget}
        onDelete={t => setDeleteTarget(t)}
        onStatusChange={handleStatusChange}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {showCreate   && <TripModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editTarget   && <TripModal existing={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <ConfirmDelete label={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}

      {/* Hero — matches rest of site */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Trips</h1>
          <p className="text-gray-500">Plan and manage your Nepal adventures</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {loading && (
          <div className="flex items-center justify-center gap-3 py-32">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-gray-500">Loading your trips...</p>
          </div>
        )}

        {error && <div className="text-center py-32 text-red-500 font-medium">{error}</div>}

        {!loading && !error && itineraries.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No trips planned yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto text-sm">Create your first trip and start adding destinations, hotels, flights and more.</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-semibold inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> Plan Your First Trip
            </button>
          </div>
        )}

        {!loading && !error && itineraries.length > 0 && (
          <>
            {/* Filters + New Trip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all',       label: 'All Trips'  },
                  { key: 'planning',  label: 'Planning'   },
                  { key: 'active',    label: 'Active'     },
                  { key: 'completed', label: 'Completed'  },
                ].map(({ key, label }) => (counts[key] > 0 || key === 'all') ? (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                    {label}
                    {counts[key] > 0 && (
                      <span className={`ml-1.5 text-xs ${filter === key ? 'text-blue-200' : 'text-gray-400'}`}>
                        ({counts[key]})
                      </span>
                    )}
                  </button>
                ) : null)}
              </div>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition font-semibold text-sm shadow-sm whitespace-nowrap">
                <Plus className="h-4 w-4" /> New Trip
              </button>
            </div>

            {filteredItineraries.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                <p className="font-medium">No {filter} trips found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItineraries.map(itin => (
                  <TripCard
                    key={itin._id}
                    itin={itin}
                    onOpen={setOpenTrip}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Itinerary;