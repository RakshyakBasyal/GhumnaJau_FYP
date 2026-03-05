// frontend/src/pages/Itinerary.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Hotel, Plane, UtensilsCrossed,
  Zap, Trash2, Edit2, X, Loader2, Search, ChevronRight,
  Star, ArrowRight, DollarSign, Clock, AlertTriangle, Check,
  ChevronDown, ChevronUp
} from 'lucide-react';

const BASE_URL = 'http://localhost:5000';
const fmtNPR   = (n) => `NPR ${Math.round(n).toLocaleString()}`;
const tok      = () => localStorage.getItem('token');

const TYPE_CFG = {
  destination: { icon: MapPin,          label: 'Destination', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
  hotel:       { icon: Hotel,           label: 'Hotel',       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  flight:      { icon: Plane,           label: 'Flight',      color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  restaurant:  { icon: UtensilsCrossed, label: 'Restaurant',  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  activity:    { icon: Zap,             label: 'Activity',    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
};
const getCfg = (t) => TYPE_CFG[t] || { icon: Calendar, label: t, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' };

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateRange = (itin) => {
  if (!itin?.startDate && !itin?.endDate) return null;
  if (itin.startDate && itin.endDate) return `${fmtDate(itin.startDate)} – ${fmtDate(itin.endDate)}`;
  if (itin.startDate) return `From ${fmtDate(itin.startDate)}`;
  return `Until ${fmtDate(itin.endDate)}`;
};

// Generate array of dates between start and end
const getDays = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return [];
  const days = [];
  const start = new Date(itin.startDate);
  const end   = new Date(itin.endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
};

const getNights = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return 1;
  return Math.max(1, Math.round((new Date(itin.endDate) - new Date(itin.startDate)) / 86400000));
};

const isSameDay = (date1, date2) => {
  const d1 = new Date(date1); const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

// ── Confirm Delete ────────────────────────────────────────────────────────────
const ConfirmDelete = ({ label, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Delete "{label}"?</h2>
        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition">Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-medium flex items-center justify-center gap-2 transition">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Trip Form Modal ───────────────────────────────────────────────────────────
const TripModal = ({ existing, onClose, onSave }) => {
  const [title,     setTitle]     = useState(existing?.title || '');
  const [startDate, setStartDate] = useState(existing?.startDate?.slice(0, 10) || '');
  const [endDate,   setEndDate]   = useState(existing?.endDate?.slice(0, 10) || '');
  const [loading,   setLoading]   = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{existing ? 'Edit Trip' : 'New Trip'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trip Name <span className="text-red-400">*</span></label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pokhara Getaway"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition">Cancel</button>
          <button disabled={!title.trim() || loading}
            onClick={async () => { setLoading(true); await onSave({ title, startDate: startDate || undefined, endDate: endDate || undefined }); setLoading(false); }}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing ? 'Save Changes' : 'Create Trip'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Add Destination</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search destinations..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72">
          {loading && <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No destinations found</p>}
          {filtered.map(dest => (
            <button key={dest._id} disabled={!!adding}
              onClick={async () => {
                setAdding(dest._id);
                await onAdd({ type: 'destination', title: dest.name, referenceId: dest._id, plannedDate: plannedDate || undefined });
                setAdding(null);
              }}
              className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-blue-50 transition group text-left">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-green-100 flex-shrink-0">
                {dest.images?.[0]
                  ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-5 w-5 text-green-600" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{dest.name}</p>
                <p className="text-xs text-gray-500">{dest.country || 'Nepal'}</p>
              </div>
              {adding === dest._id ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Add Hotel Modal (filtered by destination) ─────────────────────────────────
const AddHotelModal = ({ onClose, onAdd, destinationId, plannedDate }) => {
  const [all, setAll]         = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/hotels`)
      .then(r => r.json()).then(d => {
        let hotels = Array.isArray(d) ? d : d.hotels || [];
        // Filter by destination if one is selected
        if (destinationId) {
          hotels = hotels.filter(h => h.destination?._id === destinationId || h.destination === destinationId);
        }
        setAll(hotels);
      })
      .catch(() => setAll([])).finally(() => setLoading(false));
  }, [destinationId]);

  const filtered = query.trim() ? all.filter(h => h.name.toLowerCase().includes(query.toLowerCase())) : all;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold text-gray-900">Add Hotel</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          {destinationId && <p className="text-xs text-blue-500 mb-3">Showing hotels for selected destination</p>}
          <div className="relative mt-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search hotels..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72">
          {loading && <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-center py-10 text-gray-400 text-sm">
              {destinationId ? 'No hotels found for this destination' : 'No hotels found'}
            </p>
          )}
          {filtered.map(hotel => {
            const minPrice = hotel.roomTypes?.length ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
            return (
              <button key={hotel._id} disabled={!!adding}
                onClick={async () => {
                  setAdding(hotel._id);
                  await onAdd({ type: 'hotel', title: hotel.name, referenceId: hotel._id, estimatedCost: minPrice, plannedDate: plannedDate || undefined });
                  setAdding(null);
                }}
                className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-blue-50 transition group text-left">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-100 flex-shrink-0">
                  {hotel.images?.[0]
                    ? <img src={`${BASE_URL}${hotel.images[0]}`} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Hotel className="h-5 w-5 text-blue-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{hotel.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500">{hotel.rating || 5}</span>
                  </div>
                </div>
                {minPrice > 0 && (
                  <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                    NPR {minPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span>
                  </span>
                )}
                {adding === hotel._id ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin ml-2" /> : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Add Flight Modal (filtered by destination) ────────────────────────────────
const AddFlightModal = ({ onClose, onAdd, destinationId, plannedDate }) => {
  const [all, setAll]         = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/flights`)
      .then(r => r.json()).then(d => {
        let flights = Array.isArray(d) ? d : [];
        if (destinationId) {
          flights = flights.filter(f => f.destination?._id === destinationId || f.destination === destinationId);
        }
        setAll(flights);
      })
      .catch(() => setAll([])).finally(() => setLoading(false));
  }, [destinationId]);

  const filtered = query.trim()
    ? all.filter(f =>
        f.airline.toLowerCase().includes(query.toLowerCase()) ||
        f.flightNumber.toLowerCase().includes(query.toLowerCase()) ||
        f.from.toLowerCase().includes(query.toLowerCase()) ||
        f.to.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-bold text-gray-900">Add Flight</h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
          </div>
          {destinationId && <p className="text-xs text-indigo-500 mb-3">Showing flights for selected destination</p>}
          <div className="relative mt-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search airline, route..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-blue-400 outline-none transition" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 p-2">
          {loading && <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-center py-10 text-gray-400 text-sm">
              {destinationId ? 'No flights found for this destination' : 'No flights found'}
            </p>
          )}
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
              className="w-full text-left p-4 rounded-xl hover:bg-indigo-50 transition mb-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 p-1.5 rounded-lg"><Plane className="h-3.5 w-3.5 text-indigo-600" /></div>
                  <span className="font-bold text-gray-900 text-sm">{flight.airline} · {flight.flightNumber}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{flight.class}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600 text-sm">NPR {Number(flight.price).toLocaleString()}</span>
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
              {flight.departureDate && (
                <p className="text-xs text-gray-400 ml-8 mt-0.5">{fmtDate(flight.departureDate)}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Add Restaurant / Activity Modal ──────────────────────────────────────────
const AddCustomModal = ({ type, onClose, onAdd, plannedDate }) => {
  const [title,     setTitle]     = useState('');
  const [notes,     setNotes]     = useState('');
  const [date,      setDate]      = useState(plannedDate?.slice(0,10) || '');
  const [cost,      setCost]      = useState('');
  const [loading,   setLoading]   = useState(false);

  const cfg = type === 'restaurant'
    ? { heading: 'Add Restaurant', placeholder: 'e.g. Krishnarpan Restaurant', dateLabel: 'Reservation Date' }
    : { heading: 'Add Activity',   placeholder: 'e.g. Paragliding in Pokhara',  dateLabel: 'Planned Date'     };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{cfg.heading}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={cfg.placeholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{cfg.dateLabel}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Est. Cost (NPR)</label>
              <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition">Cancel</button>
          <button disabled={!title.trim() || loading}
            onClick={async () => {
              setLoading(true);
              await onAdd({ type, title, notes, plannedDate: date || undefined, estimatedCost: parseFloat(cost) || 0 });
              setLoading(false);
            }}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Item Card ─────────────────────────────────────────────────────────────────
const ItemCard = ({ item, onDelete }) => {
  const cfg  = getCfg(item.type);
  const Icon = cfg.icon;
  return (
    <div className={`group flex items-start gap-3 p-4 rounded-xl border ${cfg.border} ${cfg.bg} transition`}>
      <div className="bg-white p-2 rounded-lg shadow-sm flex-shrink-0">
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 bg-white border ${cfg.border} ${cfg.color}`}>
          {cfg.label}
        </span>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
          {item.estimatedCost > 0 && <span className="font-semibold text-blue-600">{fmtNPR(item.estimatedCost)}</span>}
          {item.notes && <span className="italic truncate max-w-xs">{item.notes}</span>}
          {item.plannedDate && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(item.plannedDate)}</span>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(item)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Day Column ────────────────────────────────────────────────────────────────
const DayColumn = ({ day, dayNum, items, onAddItem, destinations, onDeleteItem }) => {
  const [open, setOpen]   = useState(true);
  const [modal, setModal] = useState(null);
  const dateStr = day.toISOString().slice(0, 10);

  // Get destination IDs already added on this day or in the whole itinerary
  const destId = destinations.length > 0 ? destinations[0].referenceId : null;

  const handleAdd = async (itemData) => {
    await onAddItem({ ...itemData, plannedDate: itemData.plannedDate || dateStr });
    setModal(null);
  };

  const QUICK = [
    { key: 'destination', label: 'Destination', Icon: MapPin,          cls: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' },
    { key: 'hotel',       label: 'Hotel',       Icon: Hotel,           cls: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'     },
    { key: 'flight',      label: 'Flight',      Icon: Plane,           cls: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
    { key: 'restaurant',  label: 'Restaurant',  Icon: UtensilsCrossed, cls: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'  },
    { key: 'activity',    label: 'Activity',    Icon: Zap,             cls: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Day header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 px-3 py-1 rounded-lg">
            <span className="font-bold text-sm">Day {dayNum}</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">{day.toLocaleDateString('en-US', { weekday: 'long' })}</p>
            <p className="text-blue-100 text-xs">{fmtDate(day)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-100 text-xs">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronUp className="h-4 w-4 text-blue-100" /> : <ChevronDown className="h-4 w-4 text-blue-100" />}
        </div>
      </button>

      {open && (
        <div className="p-4">
          {/* Modals */}
          {modal === 'destination' && <AddDestModal   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
          {modal === 'hotel'       && <AddHotelModal  onClose={() => setModal(null)} onAdd={handleAdd} destinationId={destId} plannedDate={dateStr} />}
          {modal === 'flight'      && <AddFlightModal onClose={() => setModal(null)} onAdd={handleAdd} destinationId={destId} plannedDate={dateStr} />}
          {modal === 'restaurant'  && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
          {modal === 'activity'    && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}

          {/* Items */}
          {items.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Nothing planned — add items below</p>
          ) : (
            <div className="space-y-2 mb-4">
              {items.map(item => <ItemCard key={item._id} item={item} onDelete={onDeleteItem} />)}
            </div>
          )}

          {/* Quick add buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            {QUICK.map(({ key, label, Icon, cls }) => (
              <button key={key} onClick={() => setModal(key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition ${cls}`}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Trip Card (list view) ─────────────────────────────────────────────────────
const TripCard = ({ itin, onOpen, onEdit, onDelete }) => {
  const dr = fmtDateRange(itin);
  const nights = getNights(itin);
  return (
    <div onClick={() => onOpen(itin)}
      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer">
      <div className="h-2 bg-blue-600" />
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">{itin.title}</h3>
            {dr && <p className="text-sm text-gray-500 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />{dr}</p>}
            {itin.startDate && itin.endDate && <p className="text-xs text-gray-400 mt-0.5">{nights} night{nights !== 1 ? 's' : ''}</p>}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); onEdit(itin); }}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 className="h-4 w-4" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(itin); }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">{itin.itemCount ?? 0} item{(itin.itemCount ?? 0) !== 1 ? 's' : ''}</span>
          <span className="text-blue-600 font-medium text-sm group-hover:underline">View Details →</span>
        </div>
      </div>
    </div>
  );
};

// ── Trip Detail View ──────────────────────────────────────────────────────────
const TripDetail = ({ itin, onBack, onEdit, onDelete, authToken }) => {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deleteItem, setDeleteItem] = useState(null);
  const [modal,      setModal]      = useState(null); // for unscheduled items

  useEffect(() => {
    fetch(`${BASE_URL}/api/itineraries/${itin._id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
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

  const days    = getDays(itin);
  const nights  = getNights(itin);
  const hasDays = days.length > 0;

  // Budget
  const flightCost = items.filter(i => i.type === 'flight').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const hotelNight = items.filter(i => i.type === 'hotel').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const otherCost  = items.filter(i => ['restaurant', 'activity'].includes(i.type)).reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const grand      = flightCost + (hotelNight * nights) + otherCost;

  // Group items by day
  const getItemsForDay = (day) => items.filter(item => item.plannedDate && isSameDay(item.plannedDate, day));
  const unscheduled    = items.filter(item => !item.plannedDate);

  // Destinations for context (used by hotel/flight filtering)
  const destinations = items.filter(i => i.type === 'destination');

  const UNSCHEDULED_QUICK = [
    { key: 'destination', label: 'Destination', Icon: MapPin          },
    { key: 'hotel',       label: 'Hotel',       Icon: Hotel           },
    { key: 'flight',      label: 'Flight',      Icon: Plane           },
    { key: 'restaurant',  label: 'Restaurant',  Icon: UtensilsCrossed },
    { key: 'activity',    label: 'Activity',    Icon: Zap             },
  ];

  const destId = destinations.length > 0 ? destinations[0].referenceId : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {deleteItem && <ConfirmDelete label={deleteItem.title} onClose={() => setDeleteItem(null)} onConfirm={handleRemoveItem} />}

      {/* Unscheduled modals */}
      {modal === 'destination' && <AddDestModal   onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {modal === 'hotel'       && <AddHotelModal  onClose={() => setModal(null)} onAdd={handleAddItem} destinationId={destId} />}
      {modal === 'flight'      && <AddFlightModal onClose={() => setModal(null)} onAdd={handleAddItem} destinationId={destId} />}
      {modal === 'restaurant'  && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {modal === 'activity'    && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAddItem} />}

      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition text-sm font-medium">
                ← Back
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{itin.title}</h1>
                {fmtDateRange(itin) && <p className="text-xs text-gray-400">{fmtDateRange(itin)} · {nights} night{nights !== 1 ? 's' : ''}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(itin)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm font-medium transition">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => onDelete(itin)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 text-sm font-medium transition">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-500">Loading itinerary…</span>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left: Day-wise plan */}
            <div className="lg:col-span-2 space-y-4">
              {hasDays ? (
                <>
                  {days.map((day, i) => (
                    <DayColumn
                      key={day.toISOString()}
                      day={day}
                      dayNum={i + 1}
                      items={getItemsForDay(day)}
                      onAddItem={handleAddItem}
                      destinations={destinations}
                      onDeleteItem={setDeleteItem}
                    />
                  ))}

                  {/* Unscheduled */}
                  {unscheduled.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-700 mb-3 text-sm">Unscheduled Items</h3>
                      <div className="space-y-2">
                        {unscheduled.map(item => <ItemCard key={item._id} item={item} onDelete={setDeleteItem} />)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* No dates — show flat list + add buttons */
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800">Itinerary Items</h3>
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      Add trip dates for day-wise planning
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <div className="text-center py-10">
                      <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium mb-1">Nothing added yet</p>
                      <p className="text-gray-400 text-sm">Use the quick-add buttons on the right</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map(item => <ItemCard key={item._id} item={item} onDelete={setDeleteItem} />)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">

              {/* Budget */}
              {grand > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Estimated Budget</h3>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {flightCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Plane className="h-3.5 w-3.5 text-indigo-500" />Flights</span>
                        <span className="font-semibold text-gray-900">{fmtNPR(flightCost)}</span>
                      </div>
                    )}
                    {hotelNight > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Hotel className="h-3.5 w-3.5 text-blue-500" />Hotels <span className="text-gray-400 text-xs">({nights}n)</span></span>
                        <span className="font-semibold text-gray-900">{fmtNPR(hotelNight * nights)}</span>
                      </div>
                    )}
                    {otherCost > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-500" />Activities & Dining</span>
                        <span className="font-semibold text-gray-900">{fmtNPR(otherCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-emerald-100 font-bold text-base">
                      <span className="text-gray-900">Total</span>
                      <span className="text-emerald-600">{fmtNPR(grand)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick add (when no dates set) */}
              {!hasDays && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">Quick Add</h3>
                  <div className="space-y-2">
                    {UNSCHEDULED_QUICK.map(({ key, label, Icon }) => {
                      const cfg = getCfg(key);
                      return (
                        <button key={key} onClick={() => setModal(key)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.color} font-medium text-sm hover:opacity-80 transition`}>
                          <Icon className="h-4 w-4 flex-shrink-0" />{label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trip summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Trip Summary</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                    const count = items.filter(i => i.type === type).length;
                    if (count === 0) return null;
                    const Icon = cfg.icon;
                    return (
                      <div key={type} className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Icon className={`h-3.5 w-3.5 ${cfg.color}`} />{cfg.label}</span>
                        <span className="font-semibold text-gray-800">{count}</span>
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="text-gray-400 text-xs text-center py-2">No items yet</p>}
                </div>
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
  const navigate = useNavigate();
  const token = tok();

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${BASE_URL}/api/itineraries`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(setItineraries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
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
      />
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      {showCreate   && <TripModal onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editTarget   && <TripModal existing={editTarget} onClose={() => setEditTarget(null)} onSave={handleEdit} />}
      {deleteTarget && <ConfirmDelete label={deleteTarget.title} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">My Trips</h1>
          <p className="text-lg text-gray-600">Plan and manage your Nepal adventures</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-lg text-gray-600">Loading your trips…</p>
          </div>
        )}

        {error && <div className="text-center py-24 text-red-500 font-medium">{error}</div>}

        {!loading && !error && itineraries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-blue-100 p-6 rounded-full mb-6"><Calendar className="h-12 w-12 text-blue-600" /></div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No trips yet</h2>
            <p className="text-gray-600 mb-8 max-w-md">Create your first trip and start adding destinations, hotels, flights, restaurants and activities.</p>
            <button onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-10 py-4 rounded-xl hover:bg-blue-700 transition font-medium text-lg">
              Plan Your First Trip
            </button>
          </div>
        )}

        {!loading && !error && itineraries.length > 0 && (
          <>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Your Trips</h2>
                <p className="text-gray-600 mt-1">{itineraries.length} trip{itineraries.length !== 1 ? 's' : ''} planned</p>
              </div>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium shadow-sm">
                <Plus className="h-5 w-5" /> New Trip
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {itineraries.map(itin => (
                <TripCard key={itin._id} itin={itin} onOpen={setOpenTrip} onEdit={setEditTarget} onDelete={setDeleteTarget} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Itinerary;