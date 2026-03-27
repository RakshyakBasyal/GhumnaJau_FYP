// frontend/src/pages/ItineraryDetail.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Hotel, Plane, UtensilsCrossed, Zap,
  Trash2, Edit2, X, Loader2, Search, ChevronRight, Star,
  ArrowRight, DollarSign, Clock, AlertTriangle, Check,
  CheckCircle2, Circle, TrendingUp, TrendingDown,
  Cloud, Sun, CloudRain, Wind, Camera,
  Share2, ClipboardList, StickyNote, Copy, CheckCheck,
  Receipt, Flag, PlayCircle, ChevronDown, ChevronUp,
  Minus, Globe, ArrowLeft, MoreVertical, Wallet,
  Target, Sparkles, GripVertical, Info
} from 'lucide-react';
import { TripModal, StatusButton, STATUS_CFG, Modal, ConfirmDelete } from './Itinerary';

const BASE_URL = 'http://localhost:5000';
const fmtNPR   = (n) => `NPR ${Math.round(n).toLocaleString()}`;
const tok      = () => localStorage.getItem('token');

const TYPE_CFG = {
  destination:    { icon: MapPin,          label: 'Destination',  color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  hotel:          { icon: Hotel,           label: 'Hotel',        color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200',    dot: 'bg-blue-500'    },
  flight:         { icon: Plane,           label: 'Flight',       color: 'text-indigo-600',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  restaurant:     { icon: UtensilsCrossed, label: 'Restaurant',   color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   dot: 'bg-amber-500'   },
  activity:       { icon: Zap,             label: 'Activity',     color: 'text-purple-600',  bg: 'bg-purple-50',   border: 'border-purple-200',  dot: 'bg-purple-500'  },
  custom_expense: { icon: Receipt,         label: 'Expense',      color: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-200',    dot: 'bg-rose-500'    },
};
const getCfg = (t) => TYPE_CFG[t] || { icon: Calendar, label: t, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' };

const fmtDate  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const isSameDay = (d1, d2) => new Date(d1).toISOString().slice(0, 10) === new Date(d2).toISOString().slice(0, 10);

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

// ── Add-item type picker ──────────────────────────────────────────────────────
const ADD_TYPES = [
  { key: 'flight',         label: 'Flight',      Icon: Plane,           desc: 'Add a flight' },
  { key: 'hotel',          label: 'Hotel',        Icon: Hotel,           desc: 'Add accommodation' },
  { key: 'restaurant',     label: 'Restaurant',   Icon: UtensilsCrossed, desc: 'Dining plan' },
  { key: 'activity',       label: 'Activity',     Icon: Zap,             desc: 'Tours & activities' },
  { key: 'custom_expense', label: 'Expense',      Icon: Receipt,         desc: 'Any other cost' },
];

// ── Inline Add Button Row ─────────────────────────────────────────────────────
const AddItemRow = ({ onAdd, destinationIds, plannedDate }) => {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAdd = async (data) => { await onAdd({ ...data, plannedDate: data.plannedDate || plannedDate }); setModal(null); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      {modal === 'flight'         && <AddFlightModal        onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={plannedDate} />}
      {modal === 'hotel'          && <AddHotelModal         onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={plannedDate} />}
      {modal === 'restaurant'     && <AddCustomModal type="restaurant"    onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plannedDate} />}
      {modal === 'activity'       && <AddCustomModal type="activity"      onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plannedDate} />}
      {modal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={plannedDate} />}

      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold py-2 px-3 rounded-xl hover:bg-blue-50 transition w-full">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Plus className="h-3.5 w-3.5 text-blue-600" />
        </div>
        Add to this day
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 min-w-56"
          style={{ animation: 'fadeDown 0.15s ease' }}>
          <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {ADD_TYPES.map(({ key, label, Icon, desc }) => (
            <button key={key} onClick={() => { setOpen(false); setModal(key); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition text-left group">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${getCfg(key).bg}`}>
                <Icon className={`h-4 w-4 ${getCfg(key).color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
        <button onClick={() => { setSelected(null); setRoomType(null); }} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition text-sm font-bold">←</button>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{selected.name}</h2><p className="text-xs text-gray-400">Pick a room type and duration</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          {selected.roomTypes?.map(rt => (
            <button key={rt._id || rt.name} onClick={() => setRoomType(rt)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition ${roomType?.name === rt.name ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div><p className="font-bold text-gray-900">{rt.name}</p><p className="text-sm text-gray-500 mt-0.5">Up to {rt.maxCapacity} guest{rt.maxCapacity !== 1 ? 's' : ''}{rt.description ? ` · ${rt.description}` : ''}</p></div>
                <div className="text-right ml-4"><p className="font-bold text-blue-600">NPR {rt.pricePerNight.toLocaleString()}</p><p className="text-xs text-gray-400">/ night</p></div>
              </div>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nights</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setNights(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-50">−</button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{nights}</span>
            <button onClick={() => setNights(n => n + 1)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-gray-50">+</button>
            <span className="text-sm text-gray-400">night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {roomType && (
          <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">{roomType.name} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-bold text-blue-700">{fmtNPR(estimatedCost)}</span>
          </div>
        )}
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!roomType || adding}
          onClick={async () => { setAdding(true); await onAdd({ type: 'hotel', title: selected.name, referenceId: selected._id, notes: `${roomType.name} · ${nights} night${nights !== 1 ? 's' : ''}`, estimatedCost, roomTypeName: roomType.name, roomTypePricePerNight: roomType.pricePerNight, numberOfNights: nights, plannedDate: plannedDate || undefined }); setAdding(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Hotel
        </button>
      </div>
    </Modal>
  );

  return (
    <SearchModal title="Add Hotel" subtitle={destinationIds?.length > 0 ? 'Filtered to your destination' : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search hotels...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No hotels found</p>}
      {filtered.map(hotel => {
        const minPrice = hotel.roomTypes?.length ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        return (
          <button key={hotel._id} onClick={() => setSelected(hotel)}
            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
              {hotel.images?.[0] ? <img src={`${BASE_URL}${hotel.images[0]}`} alt="" className="w-full h-full object-cover" /> : <Hotel className="h-4 w-4 text-blue-400 m-auto" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">{hotel.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-400">{hotel.rating || 5}</span>
                {hotel.destination?.name && <span className="text-xs text-gray-400">· {hotel.destination.name}</span>}
              </div>
            </div>
            {minPrice > 0 && <p className="text-sm font-bold text-blue-600 flex-shrink-0">NPR {minPrice.toLocaleString()}<span className="text-xs text-gray-400 font-normal">/n</span></p>}
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 flex-shrink-0" />
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
    f.airline.toLowerCase().includes(query.toLowerCase()) ||
    f.flightNumber?.toLowerCase().includes(query.toLowerCase()) ||
    f.from?.toLowerCase().includes(query.toLowerCase()) ||
    f.to?.toLowerCase().includes(query.toLowerCase())
  ) : all;

  const estimatedCost = selected ? selected.price * passengers : 0;

  if (selected) return (
    <Modal onClose={onClose} wide>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition font-bold">←</button>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{selected.airline} · {selected.flightNumber}</h2><p className="text-xs text-gray-400">{selected.from} → {selected.to}</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div className="bg-indigo-50 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl"><Plane className="h-4 w-4 text-indigo-600" /></div>
            <div><p className="font-bold text-gray-900 text-sm">{selected.from} → {selected.to}</p><p className="text-xs text-gray-500">{selected.departureTime} – {selected.arrivalTime} · {selected.duration}</p></div>
          </div>
          <div className="text-right"><p className="font-bold text-indigo-700">{fmtNPR(selected.price)}</p><p className="text-xs text-gray-400">/ ticket</p></div>
        </div>
        {selected.availableSeats != null && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${selected.availableSeats > 10 ? 'bg-emerald-500' : selected.availableSeats > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
            {selected.availableSeats} seat{selected.availableSeats !== 1 ? 's' : ''} available
          </p>
        )}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Passengers</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setPassengers(n => Math.max(1, n - 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50">−</button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{passengers}</span>
            <button onClick={() => setPassengers(n => Math.min(selected.availableSeats || 99, n + 1))} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50">+</button>
          </div>
        </div>
        <div className="bg-blue-50 rounded-2xl px-4 py-3 flex justify-between">
          <span className="text-sm text-blue-700 font-medium">{fmtNPR(selected.price)} × {passengers}</span>
          <span className="font-bold text-blue-700">{fmtNPR(estimatedCost)}</span>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={adding}
          onClick={async () => { setAdding(true); await onAdd({ type: 'flight', title: `${selected.airline} ${selected.flightNumber}`, notes: `${selected.from} → ${selected.to} · ${selected.departureTime}–${selected.arrivalTime} · ${passengers} pax`, plannedDate: plannedDate || selected.departureDate, referenceId: selected._id, estimatedCost, pricePerTicket: selected.price, numberOfPassengers: passengers }); setAdding(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Flight
        </button>
      </div>
    </Modal>
  );

  return (
    <SearchModal title="Add Flight" subtitle={destinationIds?.length > 0 ? 'Filtered to your destination' : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search airline or route...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No flights found</p>}
      <div className="p-2 space-y-1">
        {filtered.map(flight => (
          <button key={flight._id} onClick={() => setSelected(flight)}
            className="w-full text-left p-3.5 rounded-2xl hover:bg-gray-50 border border-gray-100 transition group">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-50 p-1.5 rounded-lg"><Plane className="h-3.5 w-3.5 text-indigo-600" /></div>
                <span className="font-bold text-gray-900 text-sm">{flight.airline} · {flight.flightNumber}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{flight.class}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-blue-600 text-sm">NPR {Number(flight.price).toLocaleString()}</p>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 ml-8 flex items-center gap-1">
              <span className="font-medium text-gray-600">{flight.from}</span>
              <ArrowRight className="h-3 w-3" />
              <span className="font-medium text-gray-600">{flight.to}</span>
              · {flight.departureTime}–{flight.arrivalTime} · {flight.duration}
            </p>
          </button>
        ))}
      </div>
    </SearchModal>
  );
};

// ── Add Restaurant / Activity modal ──────────────────────────────────────────
const AddCustomModal = ({ type, onClose, onAdd, plannedDate }) => {
  const [title, setTitle]   = useState('');
  const [notes, setNotes]   = useState('');
  const [date, setDate]     = useState(plannedDate?.slice?.(0, 10) || '');
  const [cost, setCost]     = useState('');
  const [loading, setLoading] = useState(false);
  const isRest = type === 'restaurant';
  const cfg = getCfg(type);
  const Icon = cfg.icon;

  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">{isRest ? 'Add Restaurant' : 'Add Activity'}</h2></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Name <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder={isRest ? 'e.g. Krishnarpan Restaurant' : 'e.g. Paragliding, Bungee Jump'}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..."
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Est. Cost (NPR)</label>
            <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || loading}
          onClick={async () => { setLoading(true); await onAdd({ type, title, notes, plannedDate: date || undefined, estimatedCost: parseFloat(cost) || 0 }); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </button>
      </div>
    </Modal>
  );
};

// ── Add Custom Expense ────────────────────────────────────────────────────────
const AddCustomExpenseModal = ({ onClose, onAdd, plannedDate }) => {
  const [title, setTitle]   = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState(plannedDate?.slice?.(0, 10) || '');
  const [notes, setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center"><Receipt className="h-4 w-4 text-rose-600" /></div>
        <div className="flex-1"><h2 className="text-lg font-bold text-gray-900">Add Expense</h2><p className="text-xs text-gray-400">Record any manual cost</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">What did you spend on? <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Taxi, Entrance fee, Souvenirs"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Amount (NPR) <span className="text-red-400">*</span></label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..."
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || !amount || loading}
          onClick={async () => { setLoading(true); await onAdd({ type: 'custom_expense', title, notes, plannedDate: date || undefined, estimatedCost: parseFloat(amount) || 0 }); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
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
  const cfg    = getCfg(item.type);
  const Icon   = cfg.icon;
  const isNoCost = item.type === 'destination';
  const diff   = !isNoCost && cost && item.estimatedCost > 0 ? parseFloat(cost) - item.estimatedCost : null;

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mark as Done ✓</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className={`flex items-center gap-3 p-4 rounded-2xl ${cfg.bg} border ${cfg.border}`}>
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0"><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{item.title}</p>
            {!isNoCost && item.estimatedCost > 0 && <p className="text-xs text-gray-500">Estimated: {fmtNPR(item.estimatedCost)}</p>}
          </div>
        </div>
        {isNoCost ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl px-4 py-3">Marking as visited — no cost to record.</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Actual Cost (NPR) <span className="text-gray-400 font-normal">— optional</span></label>
              <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)}
                placeholder="How much did you actually spend?"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
            </div>
            {diff !== null && (
              <div className={`px-4 py-3 rounded-2xl text-sm flex items-center gap-2 font-semibold ${diff > 0 ? 'bg-red-50 text-red-600' : diff < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'}`}>
                {diff > 0 ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {diff > 0 ? `${fmtNPR(diff)} over estimate` : diff < 0 ? `${fmtNPR(Math.abs(diff))} under estimate` : 'Exactly on estimate'}
              </div>
            )}
          </>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onConfirm({ isDone: true, actualCost: isNoCost ? null : (cost ? parseFloat(cost) : null) }); setLoading(false); }}
          className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark Done
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
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700 truncate">{item.title}</p>
        {item.estimatedCost > 0 && <p className="text-xs text-gray-400">Estimated: {fmtNPR(item.estimatedCost)}</p>}
        <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Actual amount (NPR)"
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onConfirm({ actualCost: cost ? parseFloat(cost) : null }); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
};

// ── Set Budget Modal ──────────────────────────────────────────────────────────
const SetBudgetModal = ({ current, grandEst, onClose, onSave }) => {
  const [value, setValue]   = useState(current != null ? String(current) : '');
  const [loading, setLoading] = useState(false);
  const num = parseFloat(value) || 0;
  const diff = grandEst > 0 && num > 0 ? num - grandEst : null;

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div><h2 className="text-lg font-bold text-gray-900">{current != null ? 'Edit Budget' : 'Set Trip Budget'}</h2><p className="text-sm text-gray-400 mt-0.5">Your total planned spend cap</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Total Budget (NPR)</label>
          <input autoFocus type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 50000"
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        {grandEst > 0 && <p className="text-xs text-gray-400">Your estimated spend so far: <strong className="text-gray-700">{fmtNPR(grandEst)}</strong></p>}
        {diff !== null && num > 0 && (
          <div className={`px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-2 ${diff < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {diff < 0 ? <TrendingDown className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            {diff < 0 ? `Budget is ${fmtNPR(Math.abs(diff))} below your estimates` : `${fmtNPR(diff)} buffer above estimates`}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={loading}
          onClick={async () => { setLoading(true); await onSave(value ? parseFloat(value) : null); setLoading(false); }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Budget
        </button>
      </div>
    </Modal>
  );
};

// ── Share Modal ───────────────────────────────────────────────────────────────
const ShareModal = ({ itin, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/itinerary/${itin._id}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Share Trip</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">Share this link with travel companions to view your itinerary.</p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none" />
          <button onClick={copy} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {copied ? <><CheckCheck className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Cover Photo Modal ─────────────────────────────────────────────────────────
const CoverPhotoModal = ({ itinId, token, onClose, onSaved }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const handleFile = (e) => { const f = e.target.files[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); };
  const handleSave = async () => {
    if (!file) return; setLoading(true);
    const fd = new FormData(); fd.append('coverImage', file);
    const res = await fetch(`${BASE_URL}/api/itineraries/${itinId}/cover`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (res.ok) { const d = await res.json(); onSaved(d.coverImage); onClose(); } else alert('Failed to upload');
    setLoading(false);
  };
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Cover Photo</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        {preview && <img src={preview} alt="preview" className="w-full h-44 object-cover rounded-2xl" />}
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
          <Camera className="h-7 w-7 text-gray-400" />
          <span className="text-sm text-gray-500 font-semibold">Click to choose a photo</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!file || loading} onClick={handleSave}
          className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Photo
        </button>
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
        const loc = geo.results?.[0];
        if (!loc) return;
        const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=celsius&forecast_days=5`).then(r => r.json());
        const code = wx.current?.weather_code ?? 0;
        const condition = code === 0 ? 'Clear & Sunny' : code < 10 ? 'Mostly Clear' : code < 50 ? 'Cloudy' : code < 70 ? 'Rainy' : 'Stormy';
        const Icon = code < 10 ? Sun : code < 50 ? Cloud : CloudRain;
        setWeather({
          temp: wx.current?.temperature_2m,
          wind: wx.current?.wind_speed_10m,
          humidity: wx.current?.relative_humidity_2m,
          condition, Icon,
          forecast: (wx.daily?.time || []).slice(0, 5).map((t, i) => ({
            day: new Date(t).toLocaleDateString('en-US', { weekday: 'short' }),
            max: wx.daily.temperature_2m_max?.[i],
            min: wx.daily.temperature_2m_min?.[i],
            code: wx.daily.weather_code?.[i] ?? 0,
          })),
        });
      } catch { }
    })().finally(() => setLoading(false));
  }, [destination]);

  if (!destination) return null;

  return (
    <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-5 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Sun className="h-4 w-4 text-yellow-300" />
        <h3 className="font-bold text-sm">Weather in {destination}</h3>
      </div>
      {loading && <p className="text-white/60 text-xs text-center py-4">Fetching weather...</p>}
      {!loading && !weather && <p className="text-white/60 text-xs text-center py-4">Weather unavailable</p>}
      {weather && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold">{Math.round(weather.temp)}°</span>
                <span className="text-white/70 mb-2">C</span>
              </div>
              <p className="text-white/80 text-sm">{weather.condition}</p>
            </div>
            <weather.Icon className="h-14 w-14 text-white/80" />
          </div>
          <div className="flex gap-4 text-xs text-white/70 mb-4">
            <span className="flex items-center gap-1"><Wind className="h-3 w-3" />{weather.wind} km/h</span>
            <span>💧 {weather.humidity}%</span>
          </div>
          {weather.forecast.length > 0 && (
            <div className="grid grid-cols-5 gap-1 border-t border-white/20 pt-3">
              {weather.forecast.map((f, i) => {
                const FIcon = f.code < 10 ? Sun : f.code < 50 ? Cloud : CloudRain;
                return (
                  <div key={i} className="text-center">
                    <p className="text-white/60 text-xs mb-1">{i === 0 ? 'Today' : f.day}</p>
                    <FIcon className="h-4 w-4 text-white/80 mx-auto mb-1" />
                    <p className="text-xs font-bold">{Math.round(f.max)}°</p>
                    <p className="text-white/50 text-xs">{Math.round(f.min)}°</p>
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
  const key = `packing_${itinId}`;
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || DEFAULTS.map(t => ({ text: t, done: false })); } catch { return DEFAULTS.map(t => ({ text: t, done: false })); } });
  const [newItem, setNewItem] = useState('');
  const save = (u) => { setItems(u); localStorage.setItem(key, JSON.stringify(u)); };
  const done  = items.filter(i => i.done).length;
  const total = items.length;

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-blue-600" />Packing List</h3>
        <span className="text-xs text-gray-400 font-semibold">{done}/{total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: total > 0 ? `${(done/total)*100}%` : '0%' }} />
      </div>
      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 group">
            <button onClick={() => save(items.map((it, idx) => idx === i ? { ...it, done: !it.done } : it))} className="flex-shrink-0">
              {item.done ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <Circle className="h-4 w-4 text-gray-300" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-300' : 'text-gray-700'}`}>{item.text}</span>
            <button onClick={() => save(items.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-300 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && newItem.trim() && (save([...items, { text: newItem.trim(), done: false }]), setNewItem(''))}
          placeholder="Add item..." className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        <button onClick={() => { if (!newItem.trim()) return; save([...items, { text: newItem.trim(), done: false }]); setNewItem(''); }}
          className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

// ── Item Card — the new beautiful design ──────────────────────────────────────
const ItemCard = ({ item, onDelete, onMarkDone, onUndone, onEditCost }) => {
  const cfg  = getCfg(item.type);
  const Icon = cfg.icon;
  const isDone = item.isDone;

  return (
    <div className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all duration-200 ${isDone ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'}`}>
      {/* Check circle */}
      {item.type !== 'destination' ? (
        <button onClick={() => isDone ? onUndone(item) : onMarkDone(item)}
          className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
          {isDone
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            : <Circle className="h-5 w-5 text-gray-300 hover:text-emerald-400" />}
        </button>
      ) : (
        <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        </div>
      )}

      {/* Type icon */}
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-gray-900 leading-snug ${isDone ? 'line-through text-gray-400' : ''}`}>{item.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {/* Hotel details */}
          {item.type === 'hotel' && item.roomTypeName && (
            <span className="text-xs text-gray-400">{item.roomTypeName} · {item.numberOfNights}N</span>
          )}
          {/* Flight details */}
          {item.type === 'flight' && item.numberOfPassengers && (
            <span className="text-xs text-gray-400">{item.numberOfPassengers} pax</span>
          )}
          {/* Notes */}
          {item.type !== 'hotel' && item.type !== 'flight' && item.notes && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{item.notes}</span>
          )}
          {/* Costs */}
          {item.type !== 'destination' && item.estimatedCost > 0 && !isDone && (
            <span className="text-xs text-gray-400">Est. {fmtNPR(item.estimatedCost)}</span>
          )}
          {item.type !== 'destination' && isDone && item.actualCost != null && (
            <button onClick={() => onEditCost(item)}
              className={`text-xs font-bold ${item.actualCost > item.estimatedCost ? 'text-red-500' : item.actualCost < item.estimatedCost ? 'text-emerald-600' : 'text-blue-600'}`}>
              Actual: {fmtNPR(item.actualCost)} ✎
            </button>
          )}
          {item.type !== 'destination' && isDone && item.actualCost == null && item.estimatedCost > 0 && (
            <button onClick={() => onEditCost(item)} className="text-xs text-blue-500 hover:text-blue-700 font-semibold">+ add actual cost</button>
          )}
        </div>
      </div>

      {/* Delete */}
      <button onClick={() => onDelete(item)} className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0 mt-0.5">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Day Section — the core planning unit ──────────────────────────────────────
const DaySection = ({ day, dayNum, items, onAddItem, destinationIds, onDeleteItem, onMarkDone, onUndone, onEditCost, itinId, isToday, isTripActive }) => {
  const [open, setOpen] = useState(true);
  const dateStr         = day.toISOString().slice(0, 10);
  const doneCount       = items.filter(i => i.isDone).length;
  const totalCount      = items.length;
  const allDone         = totalCount > 0 && doneCount === totalCount;
  const pct             = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Journal notes (local)
  const notesKey = `daynotes_${itinId}_${dateStr}`;
  const [notes, setNotes]   = useState(() => localStorage.getItem(notesKey) || '');
  const [notesOpen, setNotesOpen] = useState(false);
  const saveNotes = (val) => { setNotes(val); localStorage.setItem(notesKey, val); };

  return (
    <div className={`rounded-3xl overflow-hidden border transition-all ${isToday && isTripActive ? 'border-blue-300 shadow-md shadow-blue-100' : 'border-gray-100 bg-white shadow-sm'}`}>
      {/* Today highlight bar */}
      {isToday && isTripActive && <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />}

      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition ${isToday && isTripActive ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold ${isToday && isTripActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <span className="text-xs font-semibold opacity-70">DAY</span>
          <span className="text-lg leading-none">{dayNum}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            {isToday && isTripActive && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">TODAY</span>}
            {allDone && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">All done ✓</span>}
          </div>
          {totalCount > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-24">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{doneCount}/{totalCount} done</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Nothing planned yet</p>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Body */}
      {open && (
        <div className="bg-white border-t border-gray-100">
          {/* Items list */}
          {items.length > 0 && (
            <div className="px-4 pt-3 pb-2 space-y-2">
              {items.map(item => (
                <ItemCard key={item._id} item={item}
                  onDelete={onDeleteItem} onMarkDone={onMarkDone} onUndone={onUndone} onEditCost={onEditCost} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="px-5 py-6 text-center">
              <p className="text-gray-400 text-sm">Nothing planned for this day yet.</p>
            </div>
          )}

          {/* Add items row */}
          <div className="px-4 py-3 border-t border-gray-50">
            <AddItemRow onAdd={onAddItem} destinationIds={destinationIds} plannedDate={dateStr} />
          </div>

          {/* Day journal */}
          <div className="px-4 pb-4">
            <button onClick={() => setNotesOpen(o => !o)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 font-semibold mb-2 transition">
              <StickyNote className="h-3.5 w-3.5" />
              {notesOpen ? 'Hide' : 'Day notes / journal'}
              {notes && !notesOpen && <span className="text-blue-400 ml-1">●</span>}
            </button>
            {notesOpen && (
              <textarea value={notes} onChange={e => saveNotes(e.target.value)} rows={3}
                placeholder="What happened today? Any highlights, memories..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none text-gray-700 placeholder-gray-300" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Budget Panel ──────────────────────────────────────────────────────────────
const BudgetPanel = ({ items, budget, onSetBudget }) => {
  const nonDest    = items.filter(i => i.type !== 'destination');
  const grandEst   = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const doneItems  = nonDest.filter(i => i.isDone && i.actualCost != null);
  const grandAct   = doneItems.reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual  = doneItems.length > 0;
  const budgetDiff = budget != null ? grandEst - budget : null;

  const CATS = [
    { types: ['flight'],                          label: 'Flights',   Icon: Plane           },
    { types: ['hotel'],                           label: 'Hotels',    Icon: Hotel           },
    { types: ['restaurant', 'activity'],          label: 'Food & Fun',Icon: Zap             },
    { types: ['custom_expense'],                  label: 'Expenses',  Icon: Receipt         },
  ].map(c => {
    const catItems = items.filter(i => c.types.includes(i.type));
    const est      = catItems.reduce((s, i) => s + (i.estimatedCost || 0), 0);
    const actItems = catItems.filter(i => i.isDone && i.actualCost != null);
    const act      = actItems.length > 0 ? actItems.reduce((s, i) => s + (i.actualCost || 0), 0) : null;
    return { ...c, est, act };
  }).filter(c => c.est > 0 || c.act != null);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Wallet className="h-4 w-4 text-blue-600" />Budget</h3>
          <button onClick={onSetBudget} className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition">
            {budget != null ? 'Edit' : '+ Set Budget'}
          </button>
        </div>

        {/* Budget vs estimate visual */}
        {budget != null && (
          <div className="mb-4 p-4 bg-gray-50 rounded-2xl">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500 font-medium">Your budget</span>
              <span className="font-bold text-gray-900">{fmtNPR(budget)}</span>
            </div>
            {grandEst > 0 && (
              <>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2 relative">
                  <div className={`h-full rounded-full transition-all ${budgetDiff > 0 ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (grandEst / budget) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Estimated: {fmtNPR(grandEst)}</span>
                  <span className={`font-bold ${budgetDiff > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {budgetDiff > 0 ? `${fmtNPR(budgetDiff)} over` : `${fmtNPR(Math.abs(budgetDiff))} left`}
                  </span>
                </div>
              </>
            )}
            {hasActual && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs">
                <span className="text-gray-400">Actually spent</span>
                <span className={`font-bold ${grandAct > budget ? 'text-red-500' : 'text-emerald-600'}`}>{fmtNPR(grandAct)}</span>
              </div>
            )}
          </div>
        )}

        {CATS.length === 0 ? (
          <p className="text-gray-300 text-sm text-center py-4">Add items to see breakdown</p>
        ) : (
          <div className="space-y-2.5">
            {CATS.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-indigo-50' : i === 1 ? 'bg-blue-50' : i === 2 ? 'bg-amber-50' : 'bg-rose-50'}`}>
                  <c.Icon className={`h-3.5 w-3.5 ${i === 0 ? 'text-indigo-500' : i === 1 ? 'text-blue-500' : i === 2 ? 'text-amber-500' : 'text-rose-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 truncate">{c.label}</span>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className={`font-semibold ${hasActual ? 'text-gray-300 text-xs' : 'text-gray-900'}`}>{fmtNPR(c.est)}</span>
                      {hasActual && (
                        <span className={`font-bold text-sm w-24 text-right ${c.act != null ? (c.act > c.est ? 'text-red-500' : 'text-emerald-600') : 'text-gray-200'}`}>
                          {c.act != null ? fmtNPR(c.act) : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-900 text-sm">Total</span>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${hasActual ? 'text-gray-300 text-xs' : 'text-blue-600'}`}>{fmtNPR(grandEst)}</span>
                {hasActual && <span className={`font-bold ${grandAct > grandEst ? 'text-red-500' : 'text-emerald-600'}`}>{fmtNPR(grandAct)}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Trip Summary Banner (completed) ──────────────────────────────────────────
const TripSummaryBanner = ({ itin, items, nights, budget }) => {
  const nonDest   = items.filter(i => i.type !== 'destination');
  const totalEst  = nonDest.reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const totalAct  = nonDest.filter(i => i.isDone && i.actualCost != null).reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual = nonDest.some(i => i.isDone && i.actualCost != null);
  const doneCount = items.filter(i => i.isDone).length;
  const destNames = items.filter(i => i.type === 'destination').map(i => i.title);
  const baseline  = budget != null ? budget : totalEst;
  const actDiff   = hasActual ? totalAct - baseline : null;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl overflow-hidden mb-6 text-white">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Sparkles className="h-6 w-6 text-yellow-300" /></div>
          <div><h2 className="text-2xl font-bold">Trip Complete! 🎉</h2><p className="text-blue-200 text-sm">{itin.title}</p></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Duration', value: `${nights}`, unit: `night${nights !== 1 ? 's' : ''}`, bg: 'bg-white/10' },
            { label: 'Items Done', value: `${doneCount}`, unit: `of ${items.length}`, bg: 'bg-white/10' },
            budget != null ? { label: 'Budget', value: fmtNPR(budget), unit: 'set', bg: 'bg-white/10' } : { label: 'Estimated', value: fmtNPR(totalEst), unit: 'planned', bg: 'bg-white/10' },
            hasActual ? { label: 'Spent', value: fmtNPR(totalAct), unit: actDiff > 0 ? `${fmtNPR(actDiff)} over` : `${fmtNPR(Math.abs(actDiff))} saved`, bg: actDiff > 0 ? 'bg-red-500/30' : 'bg-emerald-500/30' } : null,
          ].filter(Boolean).map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-3`}>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold mt-1">{s.value}</p>
              <p className="text-white/60 text-xs">{s.unit}</p>
            </div>
          ))}
        </div>
        {destNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {destNames.map(name => (
              <span key={name} className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full text-sm font-semibold">
                <MapPin className="h-3.5 w-3.5" />{name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Detail Page ──────────────────────────────────────────────────────────
const ItineraryDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = tok();

  const [itin,       setItin]       = useState(null);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [markItem,   setMarkItem]   = useState(null);
  const [editCost,   setEditCost]   = useState(null);
  const [editTrip,   setEditTrip]   = useState(false);
  const [showShare,  setShowShare]  = useState(false);
  const [showCover,  setShowCover]  = useState(false);
  const [deleteTrip, setDeleteTrip] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  // Unscheduled item modal state
  const [unschedModal, setUnschedModal] = useState(null);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch(`${BASE_URL}/api/itineraries/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => { setItin(data); setItems(data.items || []); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id, token, navigate]);

  const handleAddItem = async (itemData) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(itemData),
    });
    if (!res.ok) { alert('Failed to add item'); return; }
    const newItem = await res.json();
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = async () => {
    await fetch(`${BASE_URL}/api/itineraries/items/${deleteItem._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setItems(prev => prev.filter(i => i._id !== deleteItem._id));
    setDeleteItem(null);
  };

  const handleMarkDone = async ({ isDone, actualCost }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${markItem._id}/done`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDone, actualCost }),
    });
    if (!res.ok) { alert('Failed'); return; }
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    setMarkItem(null);
  };

  const handleUndone = async (item) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${item._id}/done`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDone: false }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
  };

  const handleEditCost = async ({ actualCost }) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/items/${editCost._id}/cost`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ actualCost }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    setEditCost(null);
  };

  const handleEditSave = async (data) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert('Failed'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, ...updated }));
    setEditTrip(false);
  };

  const handleStatusChange = async (_, newStatus) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) { alert('Failed'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, status: updated.status }));
  };

  const handleDeleteTrip = async () => {
    await fetch(`${BASE_URL}/api/itineraries/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/itinerary');
  };

  const handleSetBudget = async (amount) => {
    const res = await fetch(`${BASE_URL}/api/itineraries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ budget: amount }),
    });
    if (!res.ok) { alert('Failed'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, budget: updated.budget }));
    setShowBudget(false);
  };

  const days        = itin ? getDays(itin) : [];
  const hasDays     = days.length > 0;
  const nights      = itin ? getNights(itin) : 1;
  const status      = itin?.status || 'planning';
  const sCfg        = STATUS_CFG[status];
  const todayStr    = new Date().toISOString().slice(0, 10);
  const unscheduled = hasDays ? items.filter(i => !i.plannedDate) : [];

  const destinationIds = useMemo(() =>
    items.filter(i => i.type === 'destination').map(i => String(i.referenceId)).filter(Boolean), [items]);

  // Use itinerary-level destination name or first destination item
  const destinationName = itin?.destinationName || items.find(i => i.type === 'destination')?.title || null;

  const grandEst = items.filter(i => i.type !== 'destination').reduce((s, i) => s + (i.estimatedCost || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span className="text-gray-500">Loading itinerary...</span>
    </div>
  );
  if (error || !itin) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-semibold mb-4">{error || 'Trip not found'}</p>
        <button onClick={() => navigate('/itinerary')} className="text-blue-600 font-bold">← Back to My Trips</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modals */}
      {deleteItem && <ConfirmDelete label={deleteItem.title} onClose={() => setDeleteItem(null)} onConfirm={handleRemoveItem} />}
      {deleteTrip && <ConfirmDelete label={itin.title} onClose={() => setDeleteTrip(false)} onConfirm={handleDeleteTrip} />}
      {markItem   && <MarkDoneModal item={markItem} onClose={() => setMarkItem(null)} onConfirm={handleMarkDone} />}
      {editCost   && <EditCostModal item={editCost} onClose={() => setEditCost(null)} onConfirm={handleEditCost} />}
      {editTrip   && <TripModal existing={itin} onClose={() => setEditTrip(false)} onSave={handleEditSave} />}
      {showShare  && <ShareModal itin={itin} onClose={() => setShowShare(false)} />}
      {showCover  && <CoverPhotoModal itinId={id} token={token} onClose={() => setShowCover(false)} onSaved={path => setItin(prev => ({ ...prev, coverImage: path }))} />}
      {showBudget && <SetBudgetModal current={itin.budget} grandEst={grandEst} onClose={() => setShowBudget(false)} onSave={handleSetBudget} />}

      {/* Unscheduled item modals */}
      {unschedModal === 'flight'         && <AddFlightModal        onClose={() => setUnschedModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {unschedModal === 'hotel'          && <AddHotelModal         onClose={() => setUnschedModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {unschedModal === 'restaurant'     && <AddCustomModal type="restaurant" onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}
      {unschedModal === 'activity'       && <AddCustomModal type="activity"   onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}
      {unschedModal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setUnschedModal(null)} onAdd={handleAddItem} />}

      {/* Hero */}
      <div className="relative h-64 overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6,#818cf8)' }}>
        {itin.coverImage
          ? <img src={`${BASE_URL}${itin.coverImage}`} alt={itin.title} className="w-full h-full object-cover" />
          : itin.destinationImage
            ? <img src={`${BASE_URL}${itin.destinationImage}`} alt={itin.title} className="w-full h-full object-cover" />
            : null}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <button onClick={() => navigate('/itinerary')}
            className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-black/50 transition">
            <ArrowLeft className="h-4 w-4" /> My Trips
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowCover(true)} className="p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl hover:bg-black/50 transition" title="Change cover"><Camera className="h-4 w-4" /></button>
            <button onClick={() => setShowShare(true)} className="p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl hover:bg-black/50 transition" title="Share"><Share2 className="h-4 w-4" /></button>
            <button onClick={() => setEditTrip(true)} className="p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl hover:bg-black/50 transition" title="Edit"><Edit2 className="h-4 w-4" /></button>
            <button onClick={() => setDeleteTrip(true)} className="p-2 bg-black/30 backdrop-blur-sm text-white rounded-xl hover:bg-red-500/70 transition" title="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-2 ${sCfg.textColor} bg-white`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dotColor} ${status === 'active' ? 'animate-pulse' : ''}`} />
                <span className="text-gray-800">{sCfg.label}</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{itin.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/70 text-sm">
                {destinationName && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{destinationName}</span>}
                {itin.startDate && itin.endDate && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{nights} nights</span>}
              </div>
            </div>
            <div className="flex-shrink-0">
              <StatusButton itin={itin} onStatusChange={handleStatusChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Completion banner */}
        {status === 'completed' && <TripSummaryBanner itin={itin} items={items} nights={nights} budget={itin.budget ?? null} />}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Left: Day-by-day planner ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* No dates warning */}
            {!hasDays && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm text-amber-700">
                <Info className="h-4 w-4 flex-shrink-0" />
                <div>
                  <strong>Add dates to enable day-by-day planning.</strong>
                  <button onClick={() => setEditTrip(true)} className="underline ml-1 font-bold">Edit trip →</button>
                </div>
              </div>
            )}

            {/* Day sections */}
            {hasDays && days.map((day, i) => {
              const dateStr = day.toISOString().slice(0, 10);
              const dayItems = items.filter(item => item.plannedDate && isSameDay(item.plannedDate, day));
              return (
                <DaySection
                  key={dateStr}
                  day={day} dayNum={i + 1}
                  items={dayItems}
                  onAddItem={handleAddItem}
                  destinationIds={destinationIds}
                  onDeleteItem={setDeleteItem}
                  onMarkDone={setMarkItem}
                  onUndone={handleUndone}
                  onEditCost={setEditCost}
                  itinId={id}
                  isToday={dateStr === todayStr}
                  isTripActive={status === 'active'}
                />
              );
            })}

            {/* No-dates item list */}
            {!hasDays && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {items.length > 0 && (
                  <div className="px-4 pt-4 pb-2 space-y-2">
                    {items.map(item => (
                      <ItemCard key={item._id} item={item}
                        onDelete={setDeleteItem} onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost} />
                    ))}
                  </div>
                )}
                {items.length === 0 && (
                  <div className="py-16 text-center">
                    <Globe className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No items yet</p>
                    <p className="text-gray-300 text-sm mt-1">Add flights, hotels, activities below</p>
                  </div>
                )}
                <div className="px-4 py-3 border-t border-gray-100">
                  <AddItemRow onAdd={handleAddItem} destinationIds={destinationIds} />
                </div>
              </div>
            )}

            {/* Unscheduled items */}
            {hasDays && unscheduled.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl overflow-hidden">
                <div className="px-5 py-3 border-b border-amber-200">
                  <p className="font-bold text-amber-800 text-sm">📌 Unscheduled Items ({unscheduled.length})</p>
                  <p className="text-amber-600 text-xs mt-0.5">These items have no date assigned</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {unscheduled.map(item => (
                    <ItemCard key={item._id} item={item}
                      onDelete={setDeleteItem} onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">

            {/* Trip Status Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Trip Status</h3>
              <div className="space-y-2 mb-4">
                {['planning', 'active', 'completed'].map(key => {
                  const cfg    = STATUS_CFG[key];
                  const active = status === key;
                  const past   = ['planning', 'active', 'completed'].indexOf(key) < ['planning', 'active', 'completed'].indexOf(status);
                  return (
                    <div key={key} className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition ${active ? cfg.bgColor : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${active ? cfg.dotColor + ' text-white' : past ? 'bg-gray-200' : 'bg-gray-100'}`}>
                        {past || active ? <Check className="h-3.5 w-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                      </div>
                      <span className={`text-sm font-bold ${active ? cfg.textColor : past ? 'text-gray-500' : 'text-gray-300'}`}>{cfg.label}</span>
                      {active && <span className={`ml-auto text-xs font-bold ${cfg.textColor}`}>Current</span>}
                    </div>
                  );
                })}
              </div>
              <StatusButton itin={itin} onStatusChange={handleStatusChange} />
            </div>

            {/* Budget */}
            <BudgetPanel items={items} budget={itin.budget ?? null} onSetBudget={() => setShowBudget(true)} />

            {/* Quick Stats */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Nights', value: hasDays ? nights : '—', sub: 'duration' },
                  { label: 'Items', value: items.length, sub: `${items.filter(i => i.isDone).length} done` },
                  { label: 'Flights', value: items.filter(i => i.type === 'flight').length, sub: 'booked' },
                  { label: 'Hotels', value: items.filter(i => i.type === 'hotel').length, sub: 'nights' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
                    <p className="text-xs text-gray-300">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather */}
            {destinationName && <WeatherWidget destination={destinationName} />}

            {/* Packing list */}
            <PackingChecklist itinId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDetail;