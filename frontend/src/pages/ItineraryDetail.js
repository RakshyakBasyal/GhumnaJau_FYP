// frontend/src/pages/ItineraryDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import {
  Plus, Calendar, MapPin, Hotel, Plane, UtensilsCrossed, Zap,
  Trash2, Edit2, X, Loader2, Search, ChevronRight, Star,
  ArrowRight, DollarSign, Clock, AlertTriangle, ChevronDown,
  ChevronUp, Check, CheckCircle2, Circle, TrendingUp, TrendingDown,
  Minus, Cloud, Sun, CloudRain, Wind, Camera,
  Share2, ClipboardList, StickyNote, Copy, CheckCheck,
  Receipt, Sparkles, Globe, ExternalLink
} from 'lucide-react';
import { TripModal, StatusButton, STATUS_CFG, Modal, ConfirmDelete } from './Itinerary';
import { getImageUrl } from '../services/api';
// ── CHANGE 1: Import AIPlannerModal ──────────────────────────────────────────
import AIPlannerModal from '../components/AIPlannerModal';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const fmtNPR   = (n) => `NPR ${Math.round(n).toLocaleString()}`;
const tok      = () => localStorage.getItem('token');
const todayStr = () => new Date().toISOString().slice(0, 10);

const TYPE_CFG = {
  destination:    { icon: MapPin,          label: 'Destination', color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200'  },
  hotel:          { icon: Hotel,           label: 'Hotel',       color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
  flight:         { icon: Plane,           label: 'Flight',      color: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  restaurant:     { icon: UtensilsCrossed, label: 'Restaurant',  color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200'  },
  activity:       { icon: Zap,             label: 'Activity',    color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200' },
  custom_expense: { icon: Receipt,         label: 'Expense',     color: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-200'   },
};
const getCfg = (t) => TYPE_CFG[t] || { icon: Calendar, label: t, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };

const fmtDate  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const isSameDay = (d1, d2) => new Date(d1).toISOString().slice(0, 10) === new Date(d2).toISOString().slice(0, 10);

const fmtDateRange = (itin) => {
  if (!itin?.startDate && !itin?.endDate) return null;
  if (itin.startDate && itin.endDate) return `${fmtDate(itin.startDate)} – ${fmtDate(itin.endDate)}`;
  if (itin.startDate) return `From ${fmtDate(itin.startDate)}`;
  return `Until ${fmtDate(itin.endDate)}`;
};
const getDays = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return [];
  const days = [];
  const end  = new Date(itin.endDate);
  for (let d = new Date(itin.startDate); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
};
const getNights = (itin) => {
  if (!itin?.startDate || !itin?.endDate) return 1;
  return Math.max(1, Math.round((new Date(itin.endDate) - new Date(itin.startDate)) / 86400000));
};

// ── Search Modal Base ─────────────────────────────────────────────────────────
const SearchModal = ({ title, subtitle, onClose, loading, children, query, setQuery, placeholder }) => (
  <Modal onClose={onClose} wide>
    <div className="p-5 border-b border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-blue-600 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
      </div>
    </div>
    <div className="overflow-y-auto max-h-72">
      {loading && <p className="text-center py-10 text-gray-400 text-sm">Loading...</p>}
      {children}
    </div>
  </Modal>
);

// ── Add Hotel Modal ───────────────────────────────────────────────────────────
const AddHotelModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]           = useState([]);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [nights, setNights]     = useState(1);
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/hotels`).then(r => r.json()).then(d => {
      let hotels = Array.isArray(d) ? d : d.hotels || [];
      if (destinationIds?.length > 0) hotels = hotels.filter(h => destinationIds.includes(String(h.destination?._id || h.destination)));
      setAll(hotels);
    }).catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim() ? all.filter(h => h.name.toLowerCase().includes(query.toLowerCase())) : all;
  const estimatedCost = roomType ? roomType.pricePerNight * nights : 0;

  if (selected) return (
    <Modal onClose={onClose} wide>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => { setSelected(null); setRoomType(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition text-sm font-semibold">← Back</button>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{selected.name}</h2><p className="text-xs text-gray-400">Select room type and duration</p></div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-5">
        <div className="space-y-2">
          {selected.roomTypes?.map(rt => (
            <button key={rt._id || rt.name} onClick={() => setRoomType(rt)}
              className={`w-full text-left p-4 rounded-xl border-2 transition ${roomType?.name === rt.name ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center justify-between">
                <div><p className="font-semibold text-gray-900">{rt.name}</p><p className="text-sm text-gray-500 mt-0.5">Up to {rt.maxCapacity} guest{rt.maxCapacity !== 1 ? 's' : ''}{rt.description ? ` · ${rt.description}` : ''}</p></div>
                <div className="text-right flex-shrink-0 ml-4"><p className="font-bold text-blue-600 text-base">NPR {rt.pricePerNight.toLocaleString()}</p><p className="text-xs text-gray-400">per night</p></div>
              </div>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Nights</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">−</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{nights}</span>
            <button onClick={() => setNights(n => n + 1)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">+</button>
            <span className="text-sm text-gray-500 ml-1">night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {roomType && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">{roomType.name} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="text-base font-bold text-blue-700">NPR {estimatedCost.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!roomType || adding}
          onClick={async () => { setAdding(true); await onAdd({ type: 'hotel', title: selected.name, referenceId: selected._id, notes: `${roomType.name} · ${nights} night${nights !== 1 ? 's' : ''}`, estimatedCost, roomTypeName: roomType.name, roomTypePricePerNight: roomType.pricePerNight, numberOfNights: nights, plannedDate: plannedDate || undefined }); setAdding(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Hotel
        </button>
      </div>
    </Modal>
  );

  return (
    <SearchModal title="Add Hotel" subtitle={destinationIds?.length > 0 ? `Filtered to your destination` : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search hotels...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No hotels found</p>}
      {filtered.map(hotel => {
        const minPrice = hotel.roomTypes?.length ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        const maxPrice = hotel.roomTypes?.length ? Math.max(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        return (
          <button key={hotel._id} onClick={() => setSelected(hotel)}
            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
              {hotel.images?.[0] ? <img src={getImageUrl(hotel.images[0])} alt="" className="w-full h-full object-cover" /> : <Hotel className="h-4 w-4 text-blue-600 m-auto mt-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{hotel.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /><span className="text-xs text-gray-500">{hotel.rating || 5}</span>{hotel.destination?.name && <span className="text-xs text-gray-400">· {hotel.destination.name}</span>}</div>
            </div>
            {minPrice > 0 && <p className="text-sm font-bold text-blue-600 flex-shrink-0">NPR {minPrice.toLocaleString()}{minPrice !== maxPrice ? `–${maxPrice.toLocaleString()}` : ''}<span className="text-xs text-gray-400 font-normal">/n</span></p>}
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition ml-1 flex-shrink-0" />
          </button>
        );
      })}
    </SearchModal>
  );
};

// ── Add Flight Modal ──────────────────────────────────────────────────────────
const AddFlightModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]               = useState([]);
  const [query, setQuery]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [adding, setAdding]         = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/flights`).then(r => r.json()).then(d => {
      let flights = Array.isArray(d) ? d : [];
      if (destinationIds?.length > 0) flights = flights.filter(f => destinationIds.includes(String(f.destination?._id || f.destination)));
      setAll(flights);
    }).catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim() ? all.filter(f =>
    f.airline.toLowerCase().includes(query.toLowerCase()) || f.flightNumber?.toLowerCase().includes(query.toLowerCase()) ||
    f.from?.toLowerCase().includes(query.toLowerCase()) || f.to?.toLowerCase().includes(query.toLowerCase())) : all;
  const estimatedCost = selected ? selected.price * passengers : 0;

  if (selected) return (
    <Modal onClose={onClose} wide>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition text-sm font-semibold">← Back</button>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{selected.airline} · {selected.flightNumber}</h2><p className="text-xs text-gray-400">{selected.from} → {selected.to} · {selected.class}</p></div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-5">
        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg"><Plane className="h-4 w-4 text-indigo-600" /></div>
            <div><p className="font-semibold text-gray-900 text-sm">{selected.from} → {selected.to}</p><p className="text-xs text-gray-500">{selected.departureTime} – {selected.arrivalTime} · {selected.duration}</p></div>
          </div>
          <div className="text-right"><p className="font-bold text-indigo-700">NPR {selected.price.toLocaleString()}</p><p className="text-xs text-gray-400">per ticket</p></div>
        </div>
        {selected.availableSeats != null && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${selected.availableSeats > 10 ? 'bg-green-500' : selected.availableSeats > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
            {selected.availableSeats} seat{selected.availableSeats !== 1 ? 's' : ''} available
          </p>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Number of Passengers</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setPassengers(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">−</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{passengers}</span>
            <button onClick={() => setPassengers(n => Math.min(selected.availableSeats || 99, n + 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">+</button>
            <span className="text-sm text-gray-500 ml-1">passenger{passengers !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">NPR {selected.price.toLocaleString()} × {passengers}</span>
          <span className="text-base font-bold text-blue-700">NPR {estimatedCost.toLocaleString()}</span>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={adding}
          onClick={async () => { setAdding(true); await onAdd({ type: 'flight', title: `${selected.airline} ${selected.flightNumber}`, notes: `${selected.from} → ${selected.to} · ${selected.departureTime}–${selected.arrivalTime} · ${selected.duration} · ${passengers} pax`, plannedDate: plannedDate || selected.departureDate, referenceId: selected._id, estimatedCost, pricePerTicket: selected.price, numberOfPassengers: passengers }); setAdding(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Flight
        </button>
      </div>
    </Modal>
  );

  return (
    <SearchModal title="Add Flight" subtitle={destinationIds?.length > 0 ? `Filtered to your destination` : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search airline or route...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No flights found</p>}
      <div className="p-2 space-y-1">
        {filtered.map(flight => (
          <button key={flight._id} onClick={() => setSelected(flight)}
            className="w-full text-left p-3.5 rounded-xl hover:bg-gray-50 border border-gray-100 transition group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 p-1.5 rounded-lg"><Plane className="h-3.5 w-3.5 text-indigo-600" /></div>
                <span className="font-bold text-gray-900 text-sm">{flight.airline} · {flight.flightNumber}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{flight.class}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-blue-600 text-sm">NPR {Number(flight.price).toLocaleString()}</p>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition" />
              </div>
            </div>
            <p className="text-xs text-gray-500 ml-8 flex items-center gap-1">
              <span className="font-medium text-gray-700">{flight.from}</span><ArrowRight className="h-3 w-3" /><span className="font-medium text-gray-700">{flight.to}</span>
              · {flight.departureTime}–{flight.arrivalTime} · {flight.duration}
            </p>
          </button>
        ))}
      </div>
    </SearchModal>
  );
};

// ── Add Restaurant / Activity ─────────────────────────────────────────────────
const AddCustomModal = ({ type, onClose, onAdd, plannedDate }) => {
  const [title, setTitle]     = useState('');
  const [notes, setNotes]     = useState('');
  const [date, setDate]       = useState(plannedDate?.slice?.(0, 10) || '');
  const [cost, setCost]       = useState('');
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Est. Cost (NPR)</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
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

// ── Add Custom Expense ────────────────────────────────────────────────────────
const AddCustomExpenseModal = ({ onClose, onAdd, plannedDate }) => {
  const [title, setTitle]     = useState('');
  const [amount, setAmount]   = useState('');
  const [date, setDate]       = useState(plannedDate?.slice?.(0, 10) || '');
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <div><h2 className="text-lg font-bold text-gray-900">Add Expense</h2><p className="text-sm text-gray-400 mt-0.5">Record any cost manually</p></div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">What for? <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Taxi to airport, Entrance fee, Souvenirs"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (NPR) <span className="text-red-400">*</span></label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || !amount || loading}
          onClick={async () => { setLoading(true); await onAdd({ type: 'custom_expense', title, notes, plannedDate: date || undefined, estimatedCost: parseFloat(amount) || 0 }); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Expense
        </button>
      </div>
    </Modal>
  );
};

// ── Mark Done Modal ───────────────────────────────────────────────────────────
const MarkDoneModal = ({ item, onClose, onConfirm }) => {
  const [cost, setCost]       = useState(item.estimatedCost > 0 ? String(item.estimatedCost) : '');
  const [loading, setLoading] = useState(false);
  const cfg      = getCfg(item.type);
  const Icon     = cfg.icon;
  const isNoCost = item.type === 'destination';
  const diff     = !isNoCost && cost && item.estimatedCost > 0 ? parseFloat(cost) - item.estimatedCost : null;
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mark as Done</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0"><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
          <div><p className="font-semibold text-gray-900 text-sm">{item.title}</p>{!isNoCost && item.estimatedCost > 0 && <p className="text-xs text-gray-500">Estimated: {fmtNPR(item.estimatedCost)}</p>}</div>
        </div>
        {isNoCost ? <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">No cost to record for this item.</p> : (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Actual Cost (NPR) <span className="text-gray-400 font-normal">— optional</span></label>
              <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="How much did you actually spend?"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
            </div>
            {diff !== null && (
              <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-medium ${diff > 0 ? 'bg-red-50 text-red-600' : diff < 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                {diff > 0 ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {diff > 0 ? `NPR ${diff.toLocaleString()} over estimate` : diff < 0 ? `NPR ${Math.abs(diff).toLocaleString()} under estimate` : 'Exactly on estimate'}
              </div>
            )}
          </>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onConfirm({ isDone: true, actualCost: isNoCost ? null : (cost ? parseFloat(cost) : null) }); setLoading(false); }}
          className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark as Done
        </button>
      </div>
    </Modal>
  );
};

// ── Edit Cost Modal ───────────────────────────────────────────────────────────
const EditCostModal = ({ item, onClose, onConfirm }) => {
  const [cost, setCost]       = useState(item.actualCost != null ? String(item.actualCost) : '');
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Edit Actual Cost</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
        {item.estimatedCost > 0 && <p className="text-xs text-gray-400">Estimated: {fmtNPR(item.estimatedCost)}</p>}
        <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Actual amount (NPR)"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onConfirm({ actualCost: cost ? parseFloat(cost) : null }); setLoading(false); }}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
};

// ── Set Budget Modal ──────────────────────────────────────────────────────────
const SetBudgetModal = ({ current, grandEst, onClose, onSave }) => {
  const [value, setValue]     = useState(current != null ? String(current) : '');
  const [loading, setLoading] = useState(false);
  const num = parseFloat(value) || 0;
  const diff = grandEst > 0 && num > 0 ? num - grandEst : null;
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div><h2 className="text-lg font-bold text-gray-900">{current != null ? 'Edit Budget' : 'Set Trip Budget'}</h2><p className="text-sm text-gray-500 mt-0.5">Your total spending cap for this trip</p></div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Total Budget (NPR)</label>
          <input autoFocus type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 50000"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        {grandEst > 0 && <p className="text-xs text-gray-400">Estimated spend so far: <strong className="text-gray-700">{fmtNPR(grandEst)}</strong></p>}
        {diff !== null && num > 0 && (
          <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-medium ${diff < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {diff < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {diff < 0 ? `Budget is ${fmtNPR(Math.abs(diff))} below your estimates` : `${fmtNPR(diff)} buffer above estimates`}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onSave(value ? parseFloat(value) : null); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Budget
        </button>
      </div>
    </Modal>
  );
};

// ── Share Modal ───────────────────────────────────────────────────────────────
const ShareModal = ({ itin, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/itinerary/public/${itin._id}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Share Trip</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">Share this link — anyone with it can view your itinerary (read-only).</p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none" />
          <button onClick={copy} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {copied ? <><CheckCheck className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Weather Widget ────────────────────────────────────────────────────────────
const WeatherWidget = ({ destination }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!destination) return;
    setLoading(true);
    (async () => {
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`).then(r => r.json());
        const loc = geo.results?.[0]; if (!loc) return;
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=celsius&forecast_days=5`).then(r => r.json());
        const code = wx.current?.weather_code ?? 0;
        const condition = code === 0 ? 'Clear & Sunny' : code < 10 ? 'Mostly Clear' : code < 50 ? 'Cloudy' : code < 70 ? 'Rainy' : 'Stormy';
        const WIcon = code < 10 ? Sun : code < 50 ? Cloud : CloudRain;
        setWeather({
          temp: wx.current?.temperature_2m, wind: wx.current?.wind_speed_10m,
          humidity: wx.current?.relative_humidity_2m, condition, WIcon,
          forecast: (wx.daily?.time || []).slice(0, 5).map((t, i) => ({
            day: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
            max: wx.daily.temperature_2m_max?.[i], min: wx.daily.temperature_2m_min?.[i],
            code: wx.daily.weather_code?.[i] ?? 0,
          })),
        });
      } catch { }
    })().finally(() => setLoading(false));
  }, [destination]);
  if (!destination) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Sun className="h-4 w-4 text-yellow-500" />Weather — {destination}</h3>
      {loading && <p className="text-xs text-gray-400 text-center py-3">Fetching weather...</p>}
      {!loading && !weather && <p className="text-xs text-gray-400 text-center py-3">Weather unavailable</p>}
      {weather && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-4xl font-bold text-gray-900">{Math.round(weather.temp)}°C</p>
              <p className="text-sm text-gray-500 mt-0.5">{weather.condition}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-2"><Wind className="h-3 w-3" />{weather.wind} km/h · 💧{weather.humidity}%</p>
            </div>
            <weather.WIcon className="h-12 w-12 text-blue-400" />
          </div>
          {weather.forecast.length > 0 && (
            <div className="grid grid-cols-5 gap-1 border-t border-gray-100 pt-3">
              {weather.forecast.map((f, i) => {
                const FIcon = f.code < 10 ? Sun : f.code < 50 ? Cloud : CloudRain;
                return (
                  <div key={i} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{i === 0 ? 'Today' : f.day}</p>
                    <FIcon className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-gray-700">{Math.round(f.max)}°</p>
                    <p className="text-xs text-gray-400">{Math.round(f.min)}°</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Packing Checklist ─────────────────────────────────────────────────────────
const PackingChecklist = ({ itinId }) => {
  const DEFAULTS = ['Passport / ID', 'Travel insurance', 'Phone charger', 'Power bank', 'Camera', 'Sunscreen', 'First aid kit', 'Cash (NPR)', 'Water bottle', 'Warm jacket'];
  const storageKey = `packing_${itinId}`;
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(storageKey)) || DEFAULTS.map(t => ({ text: t, done: false })); } catch { return DEFAULTS.map(t => ({ text: t, done: false })); } });
  const [newItem, setNewItem] = useState('');
  const save = (u) => { setItems(u); localStorage.setItem(storageKey, JSON.stringify(u)); };
  const done = items.filter(i => i.done).length;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-600" />Packing List</h3>
        <span className="text-xs text-gray-400">{done}/{items.length} packed</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: items.length > 0 ? `${(done/items.length)*100}%` : '0%' }} />
      </div>
      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 group">
            <button onClick={() => save(items.map((it, idx) => idx === i ? { ...it, done: !it.done } : it))} className="flex-shrink-0">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <Circle className="h-4 w-4 text-gray-300" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
            <button onClick={() => save(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-300 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && newItem.trim() && (save([...items, { text: newItem.trim(), done: false }]), setNewItem(''))}
          placeholder="Add item..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        <button onClick={() => { if (!newItem.trim()) return; save([...items, { text: newItem.trim(), done: false }]); setNewItem(''); }}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

// ── Item Row ──────────────────────────────────────────────────────────────────
const ItemRow = ({ item, onDelete, onMarkDone, onUndone, onEditCost, readOnly }) => {
  const cfg  = getCfg(item.type);
  const Icon = cfg.icon;
  return (
    <div className={`group flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${item.isDone ? 'opacity-50' : ''}`}>
      {!readOnly && item.type !== 'destination' ? (
        <button onClick={() => item.isDone ? onUndone(item) : onMarkDone(item)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition">
          {item.isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
        </button>
      ) : <div className="mt-0.5 w-5 h-5 flex-shrink-0" />}
      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium text-gray-900 leading-snug ${item.isDone ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
          {item.type === 'hotel' && item.roomTypeName && <span>{item.roomTypeName} · {item.numberOfNights}N</span>}
          {item.type === 'flight' && item.numberOfPassengers && <span>{item.numberOfPassengers} pax</span>}
          {item.type !== 'hotel' && item.type !== 'flight' && item.notes && <span className="truncate max-w-xs">{item.notes}</span>}
          {item.type !== 'destination' && item.estimatedCost > 0 && !item.isDone && <span>Est. {fmtNPR(item.estimatedCost)}</span>}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5">
          <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  );
};

// ── Plan Card ─────────────────────────────────────────────────────────────────
const PLAN_ATTACH_TYPES = [
  { key: 'flight',         label: 'Flight',     Icon: Plane           },
  { key: 'hotel',          label: 'Hotel',      Icon: Hotel           },
  { key: 'restaurant',     label: 'Restaurant', Icon: UtensilsCrossed },
  { key: 'activity',       label: 'Activity',   Icon: Zap             },
  { key: 'custom_expense', label: 'Expense',    Icon: Receipt         },
];

const PlanCard = ({ plan, items, onDeletePlan, onDeleteItem, onMarkDone, onUndone, onEditCost, onAddItemToPlan, destinationIds, readOnly }) => {
  const [modal, setModal]               = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal]         = useState(plan.title);
  const [savingTitle, setSavingTitle]   = useState(false);

  const planItems = items.filter(i => i.planId === plan._id);
  const doneCount = planItems.filter(i => i.isDone).length;
  const allDone   = planItems.length > 0 && doneCount === planItems.length;
  const planEst   = planItems.filter(i => i.type !== 'destination').reduce((s, i) => s + (i.estimatedCost || 0), 0);

  const handleAdd = async (data) => { await onAddItemToPlan(plan._id, data); setModal(null); };

  const saveTitle = async () => {
    if (!titleVal.trim() || titleVal === plan.title) { setEditingTitle(false); setTitleVal(plan.title); return; }
    setSavingTitle(true);
    await fetch(`${BASE_URL}/api/itineraries/plans/${plan._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
      body: JSON.stringify({ title: titleVal }),
    });
    setSavingTitle(false);
    plan.title = titleVal;
    setEditingTitle(false);
  };

  return (
    <>
      {!readOnly && modal === 'flight'         && <AddFlightModal        onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={plan.plannedDate} />}
      {!readOnly && modal === 'hotel'          && <AddHotelModal         onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={plan.plannedDate} />}
      {!readOnly && modal === 'restaurant'     && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plan.plannedDate} />}
      {!readOnly && modal === 'activity'       && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plan.plannedDate} />}
      {!readOnly && modal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plan.plannedDate} />}

      <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${allDone ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
        <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {allDone ? <Check className="h-3 w-3" /> : '·'}
          </div>
          <div className="flex-1 min-w-0">
            {!readOnly && editingTitle ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(plan.title); } }}
                  className="flex-1 text-sm font-medium text-gray-900 border border-blue-400 rounded-lg px-2 py-1 focus:outline-none" />
                <button onClick={saveTitle} disabled={savingTitle} className="p-1.5 bg-blue-600 text-white rounded-lg">
                  {savingTitle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => { setEditingTitle(false); setTitleVal(plan.title); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/title">
                <p className={`text-sm font-semibold text-gray-900 ${allDone ? 'line-through text-gray-400' : ''}`}>{plan.title}</p>
                {!readOnly && (
                  <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover/title:opacity-100 transition p-1 text-gray-300 hover:text-gray-500 rounded">
                    <Edit2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              {planItems.length > 0 && <span>{doneCount}/{planItems.length} done</span>}
              {planEst > 0 && <span>{fmtNPR(planEst)}</span>}
            </div>
          </div>
          {!readOnly && (
            <button onClick={() => onDeletePlan(plan)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {planItems.length > 0 && (
          <div className="px-4">
            {planItems.map(item => (
              <ItemRow key={item._id} item={item} readOnly={readOnly}
                onDelete={onDeleteItem} onMarkDone={onMarkDone} onUndone={onUndone} onEditCost={onEditCost} />
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="px-4 py-2.5 flex flex-wrap gap-1.5 bg-gray-50/60 border-t border-gray-100">
            {PLAN_ATTACH_TYPES.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setModal(key)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ── Add Plan Modal ────────────────────────────────────────────────────────────
const AddPlanModal = ({ onClose, onAdd, plannedDate }) => {
  const [title, setTitle]     = useState('');
  const [loading, setLoading] = useState(false);
  const SUGGESTIONS = ['Take a flight to destination','Check in to hotel','Explore the city','Visit local attractions','Lunch at a restaurant','Evening activity','Return journey','Check out from hotel'];
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add a Plan</h2>
          <p className="text-sm text-gray-500 mt-0.5">Describe what you're doing — you can attach flights, hotels etc. after</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Plan description <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && title.trim() && !loading && (setLoading(true), onAdd({ title, plannedDate }).then(() => { setLoading(false); onClose(); }))}
            placeholder="e.g. Take a flight to Pokhara, Check in to hotel..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Suggestions:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setTitle(s)}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || loading}
          onClick={async () => { setLoading(true); await onAdd({ title, plannedDate }); setLoading(false); onClose(); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Plan
        </button>
      </div>
    </Modal>
  );
};

// ── Day Section ───────────────────────────────────────────────────────────────
const DaySection = ({ day, dayNum, plans, items, onAddPlan, onDeletePlan, onAddItemToPlan, onDeleteItem, onMarkDone, onUndone, onEditCost, destinationIds, itinId, token, isToday, isTripActive, readOnly }) => {
  const [open, setOpen]             = useState(true);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const dateStr  = day.toISOString().slice(0, 10);
  const dayPlans = plans.filter(p => p.plannedDate && isSameDay(p.plannedDate, day));
  const dayItems = items.filter(i => i.plannedDate && isSameDay(i.plannedDate, day) && !i.planId);
  const totalItems = dayPlans.reduce((s, p) => s + items.filter(i => i.planId === p._id).length, 0) + dayItems.length;
  const doneItems  = dayPlans.reduce((s, p) => s + items.filter(i => i.planId === p._id && i.isDone).length, 0) + dayItems.filter(i => i.isDone).length;
  const allDone    = totalItems > 0 && doneItems === totalItems;
  const notesKey   = `daynotes_${itinId}_${dateStr}`;
  const [notes, setNotes]         = useState(() => localStorage.getItem(notesKey) || '');
  const [showNotes, setShowNotes] = useState(false);
  const saveNotes  = (val) => { setNotes(val); localStorage.setItem(notesKey, val); };
  const handleAddPlan = async (data) => { await onAddPlan({ ...data, plannedDate: dateStr }); };

  return (
    <>
      {!readOnly && showAddPlan && <AddPlanModal onClose={() => setShowAddPlan(false)} onAdd={handleAddPlan} plannedDate={dateStr} />}
      <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isToday && isTripActive ? 'ring-2 ring-blue-500' : ''}`}>
        <button onClick={() => setOpen(o => !o)} className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left ${isToday && isTripActive ? 'bg-blue-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold px-4 py-2 rounded-xl min-w-[5rem] text-center bg-blue-600 text-white">Day {dayNum}</div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                {isToday && isTripActive && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Today</span>}
                {allDone && <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-semibold">All done</span>}
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                {dayPlans.length === 0 && dayItems.length === 0 ? 'No plans yet' : `${dayPlans.length} plan${dayPlans.length !== 1 ? 's' : ''} · ${doneItems}/${totalItems} done`}
              </p>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {open && (
          <div className="border-t border-gray-100">
            {(dayPlans.length > 0 || dayItems.length > 0) && (
              <div className="p-4 space-y-3">
                {dayPlans.map(plan => (
                  <PlanCard key={plan._id} plan={plan} items={items} readOnly={readOnly}
                    onDeletePlan={onDeletePlan} onDeleteItem={onDeleteItem}
                    onMarkDone={onMarkDone} onUndone={onUndone} onEditCost={onEditCost}
                    onAddItemToPlan={onAddItemToPlan} destinationIds={destinationIds} />
                ))}
                {dayItems.length > 0 && (
                  <div className="border border-gray-200 rounded-2xl px-4 py-1">
                    {dayItems.map(item => (
                      <ItemRow key={item._id} item={item} readOnly={readOnly}
                        onDelete={onDeleteItem} onMarkDone={onMarkDone} onUndone={onUndone} onEditCost={onEditCost} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {dayPlans.length === 0 && dayItems.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">{readOnly ? 'No plans for this day.' : 'No plans yet for this day.'}</p>
            )}
            {!readOnly && (
              <div className="px-4 pb-4 pt-1">
                <button onClick={() => setShowAddPlan(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition w-full border-2 border-dashed border-blue-200 hover:border-blue-400 justify-center">
                  <Plus className="h-4 w-4" /> Add Plan
                </button>
              </div>
            )}
            {!readOnly && (
              <div className="px-4 pb-4">
                <button onClick={() => setShowNotes(o => !o)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium transition">
                  <StickyNote className="h-3.5 w-3.5" />
                  {showNotes ? 'Hide notes' : 'Day notes / journal'}
                  {notes && !showNotes && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-1" />}
                </button>
                {showNotes && (
                  <textarea value={notes} onChange={e => saveNotes(e.target.value)} rows={2}
                    placeholder="What happened today? Any highlights, thoughts..."
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none text-gray-700 placeholder-gray-300" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Budget Card ───────────────────────────────────────────────────────────────
// const BudgetCard = ({ items, budget, onSetBudget, readOnly }) => {
//   const nonDest    = items.filter(i => i.type !== 'destination');
//   const grandEst   = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);
//   const doneItems  = nonDest.filter(i => i.isDone && i.actualCost != null);
//   const grandAct   = doneItems.reduce((s, i) => s + (i.actualCost || 0), 0);
//   const hasActual  = doneItems.length > 0;
//   const budgetDiff = budget != null ? grandEst - budget : null;
//   const CATS = [
//     { types: ['flight'],                label: 'Flights',    Icon: Plane   },
//     { types: ['hotel'],                 label: 'Hotels',     Icon: Hotel   },
//     { types: ['restaurant','activity'], label: 'Food & Fun', Icon: Zap     },
//     { types: ['custom_expense'],        label: 'Expenses',   Icon: Receipt },
//   ].map(c => {
//     const catItems = items.filter(i => c.types.includes(i.type));
//     const est = catItems.reduce((s, i) => s + (i.estimatedCost || 0), 0);
//     return { ...c, est };
//   }).filter(c => c.est > 0);

//   return (
//     <div className="bg-white rounded-2xl shadow-sm p-5">
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><DollarSign className="h-4 w-4 text-blue-600" />Budget</h3>
//         {!readOnly && <button onClick={onSetBudget} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition px-2 py-1 rounded-lg hover:bg-blue-50">{budget != null ? 'Edit' : '+ Set Budget'}</button>}
//       </div>
//       {budget != null && (
//         <div className="mb-4 pb-4 border-b border-gray-100">
//           <div className="flex items-center justify-between mb-1">
//             <span className="text-sm font-semibold text-gray-700">Budget</span>
//             <span className="text-base font-bold text-gray-900">{fmtNPR(budget)}</span>
//           </div>
//           {grandEst > 0 && (
//             <>
//               <div className="flex justify-between text-xs text-gray-400 mb-1.5">
//                 <span>Estimated spend</span>
//                 <span className={budgetDiff > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
//                   {fmtNPR(grandEst)}{budgetDiff > 0 ? ` (+${fmtNPR(budgetDiff)} over)` : ` (${fmtNPR(Math.abs(budgetDiff))} left)`}
//                 </span>
//               </div>
//               <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
//                 <div className={`h-full rounded-full transition-all ${budgetDiff > 0 ? 'bg-red-400' : 'bg-blue-500'}`}
//                   style={{ width: `${Math.min(100, (grandEst / budget) * 100)}%` }} />
//               </div>
//             </>
//           )}
//         </div>
//       )}
//       {CATS.length === 0 && <p className="text-gray-400 text-sm text-center py-3">No items added yet</p>}
//       {CATS.length > 0 && (
//         <div className="space-y-3">
//           {CATS.map(c => (
//             <div key={c.label} className="flex items-center justify-between text-sm">
//               <span className="flex items-center gap-2 text-gray-500"><c.Icon className="h-3.5 w-3.5 flex-shrink-0" />{c.label}</span>
//               <span className="font-semibold text-gray-900">{fmtNPR(c.est)}</span>
//             </div>
//           ))}
//           <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
//             <span className="font-bold text-gray-900 text-sm">Total Estimated</span>
//             <span className="font-bold text-blue-600 text-base">{fmtNPR(grandEst)}</span>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// ── Budget Card ───────────────────────────────────────────────────────────────
// Replace the existing BudgetCard in ItineraryDetail.jsx with this one.
//
// LOGIC:
//   Total Planned  = estimatedCost of ALL items (whether done or not)
//   Actual Spent   = actualCost of items marked isDone only
//   Your Budget    = the limit the user set via "Set Budget"
//
// Progress bar compares Actual Spent vs Budget — not planned vs budget —
// because you only truly "use" budget when you actually spend money.

const BudgetCard = ({ items, budget, onSetBudget, readOnly }) => {
  const nonDest   = items.filter(i => i.type !== 'destination');

  // Total Planned: estimated cost of every item regardless of done status
  const totalPlanned = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);

  // Actual Spent: only items that are marked done AND have an actualCost recorded
  const doneWithCost = nonDest.filter(i => i.isDone && i.actualCost != null);
  const actualSpent  = doneWithCost.reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual    = doneWithCost.length > 0;

  // Budget difference compares actual spent vs budget (not planned)
  const budgetDiff = budget != null && hasActual ? actualSpent - budget : null;

  const CATS = [
    { types: ['flight'],                label: 'Flights',    Icon: Plane   },
    { types: ['hotel'],                 label: 'Hotels',     Icon: Hotel   },
    { types: ['restaurant','activity'], label: 'Food & Fun', Icon: Zap     },
    { types: ['custom_expense'],        label: 'Expenses',   Icon: Receipt },
  ].map(c => {
    const catItems = items.filter(i => c.types.includes(i.type));
    const planned  = catItems.reduce((s, i) => s + (i.estimatedCost || 0), 0);
    const spent    = catItems.filter(i => i.isDone && i.actualCost != null).reduce((s, i) => s + (i.actualCost || 0), 0);
    return { ...c, planned, spent };
  }).filter(c => c.planned > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" />Budget
        </h3>
        {!readOnly && (
          <button
            onClick={onSetBudget}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            {budget != null ? 'Edit' : '+ Set Budget'}
          </button>
        )}
      </div>

      {/* ── Nothing added yet ── */}
      {totalPlanned === 0 && (
        <p className="text-gray-400 text-sm text-center py-3">No items added yet</p>
      )}

      {/* ── Budget limit rows ── */}
      {budget != null && (
        <div className="mb-4 pb-4 border-b border-gray-100 space-y-3">

          {/* Your Budget */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Your Budget</span>
            <span className="font-bold text-gray-900">{fmtNPR(budget)}</span>
          </div>

          {/* Total Planned */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Total Planned</span>
            <span className="font-semibold text-gray-700">{fmtNPR(totalPlanned)}</span>
          </div>

          {/* Actual Spent — only shown if at least one done item has actualCost */}
          {hasActual && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 font-medium">Actual Spent</span>
              <span className="font-semibold text-gray-700">{fmtNPR(actualSpent)}</span>
            </div>
          )}

          {/* Over / Under budget — only shown when there is actual spend */}
          {hasActual && budgetDiff !== null && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${
              budgetDiff > 0
                ? 'bg-red-50 text-red-600'
                : budgetDiff < 0
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-50 text-gray-600'
            }`}>
              <span>
                {budgetDiff > 0 ? 'Over budget by' : budgetDiff < 0 ? 'Under budget by' : 'Exactly on budget'}
              </span>
              {budgetDiff !== 0 && <span>{fmtNPR(Math.abs(budgetDiff))}</span>}
            </div>
          )}

          {/* Progress bar — actual spent vs budget, only when there is actual spend */}
          {hasActual && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Spent of budget</span>
                <span>{Math.round((actualSpent / budget) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetDiff > 0 ? 'bg-red-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (actualSpent / budget) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* If no items done yet, show a soft hint */}
          {!hasActual && (
            <p className="text-xs text-gray-400 text-center pt-1">
              Mark items as done to track actual spend
            </p>
          )}
        </div>
      )}

      {/* ── Category breakdown ── */}
      {CATS.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Breakdown</p>
          {CATS.map(c => (
            <div key={c.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <c.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {c.label}
              </span>
              <div className="text-right">
                <span className="font-semibold text-gray-900">{fmtNPR(c.planned)}</span>
                {c.spent > 0 && (
                  <span className="text-xs text-gray-400 ml-1">(spent {fmtNPR(c.spent)})</span>
                )}
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-sm">Total Planned</span>
            <span className="font-bold text-blue-600 text-base">{fmtNPR(totalPlanned)}</span>
          </div>

          {hasActual && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-900 text-sm">Total Spent</span>
              <span className="font-bold text-green-600 text-base">{fmtNPR(actualSpent)}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
// ── Trip Summary Banner ───────────────────────────────────────────────────────
// const TripSummaryBanner = ({ itin, items, nights, budget }) => {
//   const nonDest  = items.filter(i => i.type !== 'destination');
//   const totalEst = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);
//   const doneCount = items.filter(i => i.isDone).length;
//   const destNames = items.filter(i => i.type === 'destination').map(i => i.title);
//   return (
//     <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
//       <div className="h-2 bg-blue-600" />
//       <div className="p-6">
//         <div className="flex items-center gap-3 mb-6">
          
//           <div><h2 className="text-xl font-bold text-gray-900">Trip Complete!</h2><p className="text-gray-500 text-sm mt-0.5">{itin.title}</p></div>
//         </div>
//         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
//           {[
//             { label: 'Duration',   value: nights,          unit: `night${nights !== 1 ? 's' : ''}` },
//             { label: 'Items Done', value: doneCount,        unit: `of ${items.length} planned`       },
//             { label: 'Estimated',  value: fmtNPR(totalEst), unit: 'total planned'                    },
//           ].map((s, i) => (
//             <div key={i} className="bg-gray-50 rounded-xl p-4">
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
//               <p className="text-xl font-bold text-gray-900">{s.value}</p>
//               <p className="text-sm text-gray-500">{s.unit}</p>
//             </div>
//           ))}
//         </div>
//         {destNames.length > 0 && (
//           <div>
//             <p className="text-sm font-semibold text-gray-500 mb-2">Destinations visited</p>
//             <div className="flex flex-wrap gap-2">
//               {destNames.map(name => <span key={name} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"><MapPin className="h-3.5 w-3.5" />{name}</span>)}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// ── Trip Summary Banner ───────────────────────────────────────────────────────
// Replace the existing TripSummaryBanner in ItineraryDetail.jsx with this one.
//
// LOGIC (same as BudgetCard):
//   Total Planned = sum of estimatedCost of ALL items
//   Actual Spent  = sum of actualCost of DONE items only
//   Your Budget   = the limit set by user
//   Remaining     = Your Budget - Actual Spent (only if budget set + items done)

const TripSummaryBanner = ({ itin, items, nights, budget }) => {
  const nonDest  = items.filter(i => i.type !== 'destination');

  // Total Planned: all estimated costs
  const totalPlanned = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);

  // Actual Spent: only done items with actualCost recorded
  const doneWithCost = nonDest.filter(i => i.isDone && i.actualCost != null);
  const actualSpent  = doneWithCost.reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual    = doneWithCost.length > 0;

  const doneCount = items.filter(i => i.isDone).length;
  const destNames = items.filter(i => i.type === 'destination').map(i => i.title);

  // Budget difference: actual spent vs budget
  const budgetDiff = budget != null && hasActual ? actualSpent - budget : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="h-2 bg-blue-600" />
      <div className="p-6">

        {/* ── Title ── */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Trip Complete!</h2>
            <p className="text-gray-500 text-sm mt-0.5">{itin.title}</p>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">

          {/* Duration */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
            <p className="text-xl font-bold text-gray-900">{nights}</p>
            <p className="text-sm text-gray-500">night{nights !== 1 ? 's' : ''}</p>
          </div>

          {/* Items Done */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Items Done</p>
            <p className="text-xl font-bold text-gray-900">{doneCount}</p>
            <p className="text-sm text-gray-500">of {items.length} planned</p>
          </div>

          {/* Total Planned */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Planned</p>
            <p className="text-xl font-bold text-gray-900">{fmtNPR(totalPlanned)}</p>
            <p className="text-sm text-gray-500">estimated cost</p>
          </div>

          {/* Actual Spent — show real number if available, else show dash */}
          <div className={`rounded-xl p-4 ${hasActual ? 'bg-green-50' : 'bg-gray-50'}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Actual Spent</p>
            <p className={`text-xl font-bold ${hasActual ? 'text-green-700' : 'text-gray-400'}`}>
              {hasActual ? fmtNPR(actualSpent) : '—'}
            </p>
            <p className="text-sm text-gray-500">
              {hasActual ? 'total spent' : 'no data yet'}
            </p>
          </div>
        </div>

        

        {/* ── Destinations visited ── */}
        {destNames.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Destinations visited</p>
            <div className="flex flex-wrap gap-2">
              {destNames.map(name => (
                <span key={name} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" />{name}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ── AddPlanForNoDateSection ───────────────────────────────────────────────────
const AddPlanForNoDateSection = ({ onAdd }) => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      {showModal && <AddPlanModal onClose={() => setShowModal(false)} onAdd={async (data) => { await onAdd(data); setShowModal(false); }} />}
      <button onClick={() => setShowModal(true)}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 px-4 py-2.5 rounded-xl hover:bg-blue-50 transition w-full border-2 border-dashed border-blue-200 hover:border-blue-400 justify-center">
        <Plus className="h-4 w-4" /> Add Plan
      </button>
    </>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const ItineraryDetail = ({ publicView = false }) => {
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const token    = tok();

  const [itin,        setItin]        = useState(null);
  const [items,       setItems]       = useState([]);
  const [plans,       setPlans]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [deleteItem,  setDeleteItem]  = useState(null);
  const [deletePlan,  setDeletePlan]  = useState(null);
  const [markItem,    setMarkItem]    = useState(null);
  const [editCost,    setEditCost]    = useState(null);
  const [editTrip,    setEditTrip]    = useState(false);
  const [showShare,   setShowShare]   = useState(false);
  const [deleteTrip,  setDeleteTrip]  = useState(false);
  const [showBudget,  setShowBudget]  = useState(false);
  const [unschedModal, setUnschedModal] = useState(null);
  // ── CHANGE 2: AI planner state ───────────────────────────────────────────
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    if (publicView) {
      fetch(`${BASE_URL}/api/itineraries/public/${id}`)
        .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
        .then(data => { setItin(data); setItems(data.items || []); setPlans(data.plans || []); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
      return;
    }
    if (!token) { navigate('/login'); return; }
    fetch(`${BASE_URL}/api/itineraries/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => { setItin(data); setItems(data.items || []); setPlans(data.plans || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token, navigate, publicView]);

  const handleAddPlan = async (data) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/plans`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) { showToast('Failed to add plan', 'error'); return; }
    const newPlan = await res.json();
    setPlans(prev => [...prev, newPlan]);
    showToast('Plan added');
  };

  const handleDeletePlan = async () => {
    try {
      const plan = deletePlan;
      const res = await fetch(`${BASE_URL}/api/itineraries/plans/${plan._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setPlans(prev => prev.filter(p => p._id !== plan._id));
      setItems(prev => prev.filter(i => i.planId !== plan._id));
      setDeletePlan(null);
      showToast('Plan deleted');
    } catch (_) {
      showToast('Failed to delete plan', 'error');
    }
  };

  const handleAddItemToPlan = async (planId, itemData) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/plans/${planId}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(itemData),
    });
    if (!res.ok) { showToast('Failed to add item', 'error'); return; }
    const newItem = await res.json();
    setItems(prev => [...prev, newItem]);
    showToast('Item added to plan');
  };

  const handleAddItem = async (itemData) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(itemData),
    });
    if (!res.ok) { showToast('Failed to add item', 'error'); return; }
    const newItem = await res.json();
    setItems(prev => [...prev, newItem]);
    setUnschedModal(null);
    showToast('Item added');
  };

  const handleRemoveItem = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries/items/${deleteItem._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i._id !== deleteItem._id));
      setDeleteItem(null);
      showToast('Item removed');
    } catch (_) {
      showToast('Failed to remove item', 'error');
    }
  };

  const handleMarkDone = async ({ isDone, actualCost }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${markItem._id}/done`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDone, actualCost }),
    });
    if (!res.ok) { showToast('Failed to update status', 'error'); return; }
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    setMarkItem(null);
    showToast(isDone ? 'Item completed' : 'Item marked as pending');
  };

  const handleUndone = async (item) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${item._id}/done`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDone: false }),
    });
    if (!res.ok) { showToast('Failed to update status', 'error'); return; }
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const handleEditCost = async ({ actualCost }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${editCost._id}/cost`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actualCost }),
    });
    if (!res.ok) { showToast('Failed to update cost', 'error'); return; }
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    setEditCost(null);
    showToast('Cost updated');
  };

  const handleEditSave = async (data) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) { showToast('Failed to update trip', 'error'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, ...updated }));
    setEditTrip(false);
    showToast('Trip details updated');
  };

  const handleStatusChange = async (_, newStatus) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { showToast('Failed to update status', 'error'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, status: updated.status }));
    showToast(`Trip ${newStatus}`);
  };

  const handleDeleteTrip = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      showToast('Trip deleted successfully');
      navigate('/itinerary');
    } catch (_) {
      showToast('Failed to delete trip', 'error');
    }
  };

  const handleSetBudget = async (amount) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ budget: amount }),
    });
    if (!res.ok) { showToast('Failed to set budget', 'error'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, budget: updated.budget }));
    setShowBudget(false);
    showToast('Budget updated');
  };

  const days    = itin ? getDays(itin) : [];
  const hasDays = days.length > 0;
  const nights  = itin ? getNights(itin) : 1;
  const status  = itin?.status || 'planning';
  const sCfg    = STATUS_CFG[status];
  const today   = todayStr();

  const destinationIds = useMemo(() => {
    const fromItems = items.filter(i => i.type === 'destination').map(i => String(i.referenceId)).filter(Boolean);
    const itineraryDestinationId = itin?.destinationId ? String(itin.destinationId) : null;
    return itineraryDestinationId ? Array.from(new Set([...fromItems, itineraryDestinationId])) : fromItems;
  }, [items, itin?.destinationId]);

  const destinationName  = itin?.destinationName || items.find(i => i.type === 'destination')?.title || null;
  const grandEst         = items.filter(i => i.type !== 'destination').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const unscheduledPlans = hasDays ? plans.filter(p => !p.plannedDate) : plans;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" /><span className="text-gray-500">Loading itinerary...</span>
    </div>
  );
  if (error || !itin) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium mb-4">{error || 'Trip not found'}</p>
        <button onClick={() => navigate('/itinerary')} className="text-blue-600 font-semibold">Back to My Trips</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {!publicView && deleteItem && <ConfirmDelete label={deleteItem.title} onClose={() => setDeleteItem(null)} onConfirm={handleRemoveItem} />}
      {!publicView && deletePlan && <ConfirmDelete label={deletePlan.title} onClose={() => setDeletePlan(null)} onConfirm={handleDeletePlan} />}
      {!publicView && deleteTrip && <ConfirmDelete label={itin.title} onClose={() => setDeleteTrip(false)} onConfirm={handleDeleteTrip} />}
      {!publicView && markItem   && <MarkDoneModal item={markItem} onClose={() => setMarkItem(null)} onConfirm={handleMarkDone} />}
      {!publicView && editCost   && <EditCostModal item={editCost} onClose={() => setEditCost(null)} onConfirm={handleEditCost} />}
      {!publicView && editTrip   && <TripModal existing={itin} onClose={() => setEditTrip(false)} onSave={handleEditSave} />}
      {showShare   && <ShareModal itin={itin} onClose={() => setShowShare(false)} />}
      {!publicView && showBudget && <SetBudgetModal current={itin.budget} grandEst={grandEst} onClose={() => setShowBudget(false)} onSave={handleSetBudget} />}
      {/* ── CHANGE 3: AI Planner Modal ─────────────────────────────────────── */}
      {!publicView && showAI && (
        <AIPlannerModal
          itin={itin}
          onClose={() => setShowAI(false)}
          onAddPlan={(plan) => setPlans(prev => [...prev, plan])}
          onAddItemToPlan={handleAddItemToPlan}
        />
      )}

      {!publicView && !hasDays && unschedModal === 'flight'         && <AddFlightModal        onClose={() => setUnschedModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!publicView && !hasDays && unschedModal === 'hotel'          && <AddHotelModal         onClose={() => setUnschedModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!publicView && !hasDays && unschedModal === 'restaurant'     && <AddCustomModal type="restaurant" onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}
      {!publicView && !hasDays && unschedModal === 'activity'       && <AddCustomModal type="activity"   onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}
      {!publicView && !hasDays && unschedModal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}

      {/* Hero */}
      <div className="relative h-[320px] md:h-[400px] bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden flex items-center">
        {itin.destinationImage && <img src={getImageUrl(itin.destinationImage)} alt={itin.title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        <button onClick={() => navigate(publicView ? '/' : '/itinerary')}
          className="absolute top-6 left-6 flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/20 transition-all shadow-xl">
          ← {publicView ? 'Home' : 'My Trips'}
        </button>

        <div className="absolute top-6 right-6 flex gap-3">
          <button onClick={() => setShowShare(true)} className="p-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl hover:bg-white/20 transition-all shadow-xl" title="Share">
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-8 lg:px-10 mt-auto pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 mb-4 text-white shadow-lg">
                <span className={`w-2 h-2 rounded-full ${sCfg.dotColor} ${status === 'active' ? 'animate-pulse' : ''}`} />{sCfg.label}
                {publicView && <span className="ml-2 text-blue-200">· Shared View</span>}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 tracking-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                {itin.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90 text-base md:text-lg font-medium">
                {destinationName && <span className="flex items-center gap-2 drop-shadow-md"><MapPin className="h-5 w-5 text-blue-400" />{destinationName}</span>}
                {itin.startDate && itin.endDate && <span className="flex items-center gap-2 drop-shadow-md"><Calendar className="h-5 w-5 text-indigo-400" />{nights} nights</span>}
              </div>
            </div>

            {!publicView && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
                  <StatusButton itin={itin} onStatusChange={handleStatusChange} />
                  <button onClick={() => setEditTrip(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white rounded-xl hover:bg-white/30 text-sm font-bold transition-all backdrop-blur-sm border border-white/10"><Edit2 className="h-4 w-4" />Edit</button>
                  <button onClick={() => setDeleteTrip(true)} className="p-2.5 bg-red-500/20 text-white rounded-xl hover:bg-red-500/80 transition-all backdrop-blur-sm border border-red-500/30"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {publicView && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span>You're viewing a shared itinerary — read only.</span>
            </div>
            <Link to="/itinerary" className="font-bold underline text-blue-600 hover:text-blue-800 ml-4 whitespace-nowrap">
              Create your own →
            </Link>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {status === 'completed' && !publicView && <TripSummaryBanner itin={itin} items={items} nights={nights} budget={itin.budget ?? null} />}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: day-by-day */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Itinerary</h2>
                <p className="text-gray-500 mt-0.5">
                  {plans.length === 0 ? 'No plans added yet' : `${plans.length} plan${plans.length !== 1 ? 's' : ''} · ${items.filter(i => i.isDone).length}/${items.length} items done`}
                </p>
              </div>
            </div>

            {!hasDays && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-amber-700">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {publicView
                    ? 'This itinerary has no dates set.'
                    : <>Add start & end dates to enable day-by-day planning. <button onClick={() => setEditTrip(true)} className="underline font-semibold">Edit trip →</button></>
                  }
                </span>
              </div>
            )}

            {hasDays && days.map((day, i) => (
              <DaySection key={day.toISOString()} day={day} dayNum={i + 1}
                plans={plans} items={items}
                onAddPlan={handleAddPlan} onDeletePlan={setDeletePlan}
                onAddItemToPlan={handleAddItemToPlan} onDeleteItem={setDeleteItem}
                onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost}
                destinationIds={destinationIds} itinId={id} token={token}
                isToday={day.toISOString().slice(0, 10) === today}
                isTripActive={status === 'active'}
                readOnly={publicView}
              />
            ))}

            {!hasDays && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {plans.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {plans.map(plan => (
                      <PlanCard key={plan._id} plan={plan} items={items} readOnly={publicView}
                        onDeletePlan={setDeletePlan} onDeleteItem={setDeleteItem}
                        onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost}
                        onAddItemToPlan={handleAddItemToPlan} destinationIds={destinationIds} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-14">
                    <Globe className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">{publicView ? 'No plans in this itinerary.' : 'No plans yet — add your first plan below'}</p>
                  </div>
                )}
                {!publicView && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <AddPlanForNoDateSection onAdd={handleAddPlan} />
                  </div>
                )}
              </div>
            )}

            {hasDays && unscheduledPlans.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-700 text-sm">📌 Unscheduled Plans</p>
                  <p className="text-xs text-gray-400 mt-0.5">These plans have no date assigned</p>
                </div>
                <div className="p-4 space-y-3">
                  {unscheduledPlans.map(plan => (
                    <PlanCard key={plan._id} plan={plan} items={items} readOnly={publicView}
                      onDeletePlan={setDeletePlan} onDeleteItem={setDeleteItem}
                      onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost}
                      onAddItemToPlan={handleAddItemToPlan} destinationIds={destinationIds} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {!publicView && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Trip Status</h3>
                <div className="space-y-1 mb-4">
                  {(['planning', 'active', 'completed']).map(key => {
                    const cfg    = STATUS_CFG[key];
                    const active = status === key;
                    return (
                      <div key={key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${active ? cfg.bgColor : ''}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? cfg.dotColor : 'bg-gray-200'} ${active && key === 'active' ? 'animate-pulse' : ''}`} />
                        <span className={`text-sm font-semibold ${active ? cfg.textColor : 'text-gray-300'}`}>{cfg.label}</span>
                        {active && <CheckCircle2 className={`h-4 w-4 ml-auto ${cfg.textColor}`} />}
                      </div>
                    );
                  })}
                </div>
                <StatusButton itin={itin} onStatusChange={handleStatusChange} />
              </div>
            )}

            {/* ── CHANGE 4: Plan with AI button ──────────────────────────────── */}
            {!publicView && (
              <button
                onClick={() => setShowAI(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-sm transition"
              >
                <Sparkles className="h-4 w-4" />
                Plan with AI
              </button>
            )}

            <BudgetCard items={items} budget={itin.budget ?? null} onSetBudget={() => setShowBudget(true)} readOnly={publicView} />

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
              {itin.startDate && itin.endDate && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                  <span className="flex items-center gap-2 text-gray-500"><Calendar className="h-3.5 w-3.5 text-blue-600" />Duration</span>
                  <span className="font-semibold text-gray-900">{nights} nights</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                <span className="flex items-center gap-2 text-gray-500"><CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />Plans</span>
                <span className="font-semibold text-gray-900">{plans.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-3">No items yet</p>
              ) : (
                <>
                  {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                    const count = items.filter(i => i.type === type).length;
                    if (!count) return null;
                    const done = items.filter(i => i.type === type && i.isDone).length;
                    const Icon = cfg.icon;
                    return (
                      <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                        <span className="flex items-center gap-2 text-gray-500"><Icon className={`h-3.5 w-3.5 ${cfg.color}`} />{cfg.label}</span>
                        <span className="text-xs text-gray-400"><span className="font-semibold text-gray-900">{done}</span>/{count}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-2 text-sm font-semibold">
                    <span className="text-gray-500">Total done</span>
                    <span className="text-gray-900">{items.filter(i => i.isDone).length}/{items.length}</span>
                  </div>
                </>
              )}
            </div>

            {destinationName && <WeatherWidget destination={destinationName} />}
            {!publicView && <PackingChecklist itinId={id} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDetail;

