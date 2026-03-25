// frontend/src/pages/ItineraryDetail.jsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Hotel, Plane, UtensilsCrossed, Zap,
  Trash2, Edit2, X, Loader2, Search, ChevronRight, Star,
  ArrowRight, DollarSign, Clock, AlertTriangle, ChevronDown,
  ChevronUp, Check, CheckCircle2, Circle, TrendingUp, TrendingDown,
  Minus, Cloud, Sun, CloudRain, Wind, Thermometer, Camera,
  Share2, Package, ClipboardList, StickyNote, Copy, CheckCheck,
  FileText, Receipt
} from 'lucide-react';
import { TripModal, StatusButton, STATUS_CFG, Modal, ConfirmDelete } from './Itinerary';

const BASE_URL = 'http://localhost:5000';
const fmtNPR   = (n) => `NPR ${Math.round(n).toLocaleString()}`;
const tok      = () => localStorage.getItem('token');
const todayStr = () => new Date().toISOString().slice(0, 10);

const TYPE_CFG = {
  destination:    { icon: MapPin,          label: 'Destination',    color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200',  noCost: true  },
  hotel:          { icon: Hotel,           label: 'Hotel',          color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'                  },
  flight:         { icon: Plane,           label: 'Flight',         color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200'                },
  restaurant:     { icon: UtensilsCrossed, label: 'Restaurant',     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'                 },
  activity:       { icon: Zap,             label: 'Activity',       color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200'                },
  custom_expense: { icon: Receipt,         label: 'Expense',        color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200'                  },
};
const getCfg = (t) => TYPE_CFG[t] || { icon: Calendar, label: t, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };

const fmtDate  = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

const isSameDay = (d1, d2) => {
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

// ── Add Custom Expense Modal ──────────────────────────────────────────────────
const AddCustomExpenseModal = ({ onClose, onAdd, plannedDate }) => {
  const [title,   setTitle]   = useState('');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(plannedDate?.slice(0, 10) || '');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
          <p className="text-sm text-gray-400 mt-0.5">Record any cost manually</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">What did you spend on? <span className="text-red-400">*</span></label>
          <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Taxi to airport, Entrance fee, Souvenir shopping"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (NPR) <span className="text-red-400">*</span></label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!title.trim() || !amount || loading}
          onClick={async () => {
            setLoading(true);
            await onAdd({
              type: 'custom_expense',
              title,
              notes,
              plannedDate: date || undefined,
              estimatedCost: parseFloat(amount) || 0,
            });
            setLoading(false);
          }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Expense
        </button>
      </div>
    </Modal>
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
    <SearchModal title="Add Destination" onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search destinations...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No destinations found</p>}
      {filtered.map(dest => (
        <button key={dest._id} disabled={!!adding}
          onClick={async () => { setAdding(dest._id); await onAdd({ type: 'destination', title: dest.name, referenceId: dest._id, plannedDate: plannedDate || undefined }); setAdding(null); }}
          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-green-50 flex-shrink-0">
            {dest.images?.[0] ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-green-600" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{dest.name}</p>
            <p className="text-xs text-gray-500">{dest.country || 'Nepal'}</p>
          </div>
          {adding === dest._id ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" /> : <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition" />}
        </button>
      ))}
    </SearchModal>
  );
};

// ── Add Hotel Modal — pick hotel → room type → nights ─────────────────────────
const AddHotelModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]             = useState([]);
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);   // selected hotel object
  const [roomType, setRoomType]   = useState(null);   // selected roomType object
  const [nights, setNights]       = useState(1);
  const [adding, setAdding]       = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/hotels`).then(r => r.json()).then(d => {
      let hotels = Array.isArray(d) ? d : d.hotels || [];
      if (destinationIds?.length > 0) hotels = hotels.filter(h => destinationIds.includes(String(h.destination?._id || h.destination)));
      setAll(hotels);
    }).catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim() ? all.filter(h => h.name.toLowerCase().includes(query.toLowerCase())) : all;
  const estimatedCost = roomType ? roomType.pricePerNight * nights : 0;

  // Step 2 — room type + nights picker
  if (selected) return (
    <Modal onClose={onClose} wide>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => { setSelected(null); setRoomType(null); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition text-sm font-semibold">← Back</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
          <p className="text-xs text-gray-400">Select room type and duration</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-5">
        {/* Room Types */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Room Type <span className="text-red-400">*</span></label>
          <div className="space-y-2">
            {selected.roomTypes?.map(rt => (
              <button key={rt._id || rt.name} onClick={() => setRoomType(rt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition ${roomType?.name === rt.name ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{rt.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">Up to {rt.maxCapacity} guest{rt.maxCapacity !== 1 ? 's' : ''}{rt.description ? ` · ${rt.description}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-blue-600 text-base">NPR {rt.pricePerNight.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">per night</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Number of nights */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Nights</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setNights(n => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">−</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{nights}</span>
            <button onClick={() => setNights(n => n + 1)}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">+</button>
            <span className="text-sm text-gray-500 ml-1">night{nights !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Cost summary */}
        {roomType && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-blue-700 font-medium">
              {roomType.name} × {nights} night{nights !== 1 ? 's' : ''}
            </span>
            <span className="text-base font-bold text-blue-700">NPR {estimatedCost.toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!roomType || adding}
          onClick={async () => {
            setAdding(true);
            await onAdd({
              type: 'hotel',
              title: selected.name,
              referenceId: selected._id,
              notes: `${roomType.name} · ${nights} night${nights !== 1 ? 's' : ''}`,
              estimatedCost,
              roomTypeName: roomType.name,
              roomTypePricePerNight: roomType.pricePerNight,
              numberOfNights: nights,
              plannedDate: plannedDate || undefined,
            });
            setAdding(false);
          }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Hotel
        </button>
      </div>
    </Modal>
  );

  // Step 1 — hotel list
  return (
    <SearchModal title="Add Hotel" subtitle={destinationIds?.length > 0 ? `Filtered by your ${destinationIds.length} destination(s)` : null}
      onClose={onClose} loading={loading} query={query} setQuery={setQuery} placeholder="Search hotels...">
      {!loading && filtered.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">{destinationIds?.length > 0 ? 'No hotels for your destinations' : 'No hotels found'}</p>}
      {filtered.map(hotel => {
        const minPrice = hotel.roomTypes?.length ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        const maxPrice = hotel.roomTypes?.length ? Math.max(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;
        return (
          <button key={hotel._id} onClick={() => setSelected(hotel)}
            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition group text-left border-b border-gray-50 last:border-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 flex-shrink-0">
              {hotel.images?.[0] ? <img src={`${BASE_URL}${hotel.images[0]}`} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Hotel className="h-4 w-4 text-blue-600" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{hotel.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-500">{hotel.rating || 5}</span>
                {hotel.destination?.name && <span className="text-xs text-gray-400">· {hotel.destination.name}</span>}
                {hotel.roomTypes?.length > 0 && <span className="text-xs text-gray-400">· {hotel.roomTypes.length} room type{hotel.roomTypes.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {minPrice > 0 && (
                <p className="text-sm font-bold text-blue-600">
                  NPR {minPrice.toLocaleString()}{minPrice !== maxPrice ? `–${maxPrice.toLocaleString()}` : ''}
                </p>
              )}
              <p className="text-xs text-gray-400">per night</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition ml-1" />
          </button>
        );
      })}
    </SearchModal>
  );
};

// ── Add Flight Modal — pick flight → number of passengers ─────────────────────
const AddFlightModal = ({ onClose, onAdd, destinationIds, plannedDate }) => {
  const [all, setAll]             = useState([]);
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);   // selected flight object
  const [passengers, setPassengers] = useState(1);
  const [adding, setAdding]       = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/flights`).then(r => r.json()).then(d => {
      let flights = Array.isArray(d) ? d : [];
      if (destinationIds?.length > 0) flights = flights.filter(f => destinationIds.includes(String(f.destination?._id || f.destination)));
      setAll(flights);
    }).catch(() => setAll([])).finally(() => setLoading(false));
  }, [JSON.stringify(destinationIds)]);

  const filtered = query.trim() ? all.filter(f =>
    f.airline.toLowerCase().includes(query.toLowerCase()) || f.flightNumber.toLowerCase().includes(query.toLowerCase()) ||
    f.from.toLowerCase().includes(query.toLowerCase()) || f.to.toLowerCase().includes(query.toLowerCase())) : all;

  const estimatedCost = selected ? selected.price * passengers : 0;

  // Step 2 — passenger count picker
  if (selected) return (
    <Modal onClose={onClose} wide>
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => setSelected(null)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition text-sm font-semibold">← Back</button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{selected.airline} · {selected.flightNumber}</h2>
          <p className="text-xs text-gray-400">{selected.from} → {selected.to} · {selected.class}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-5">
        {/* Flight summary */}
        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg"><Plane className="h-4 w-4 text-indigo-600" /></div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{selected.from} → {selected.to}</p>
              <p className="text-xs text-gray-500">{selected.departureTime} – {selected.arrivalTime} · {selected.duration}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-indigo-700">NPR {selected.price.toLocaleString()}</p>
            <p className="text-xs text-gray-400">per ticket</p>
          </div>
        </div>

        {/* Seat availability */}
        {selected.availableSeats != null && (
          <p className="text-sm text-gray-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${selected.availableSeats > 10 ? 'bg-green-500' : selected.availableSeats > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
            {selected.availableSeats} seat{selected.availableSeats !== 1 ? 's' : ''} available
          </p>
        )}

        {/* Passenger count */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Number of Passengers</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setPassengers(n => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">−</button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{passengers}</span>
            <button onClick={() => setPassengers(n => Math.min(selected.availableSeats || 99, n + 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 transition">+</button>
            <span className="text-sm text-gray-500 ml-1">passenger{passengers !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Cost summary */}
        <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">
            NPR {selected.price.toLocaleString()} × {passengers} passenger{passengers !== 1 ? 's' : ''}
          </span>
          <span className="text-base font-bold text-blue-700">NPR {estimatedCost.toLocaleString()}</span>
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={adding}
          onClick={async () => {
            setAdding(true);
            await onAdd({
              type: 'flight',
              title: `${selected.airline} ${selected.flightNumber}`,
              notes: `${selected.from} → ${selected.to} · ${selected.departureTime}–${selected.arrivalTime} · ${selected.duration} · ${passengers} passenger${passengers !== 1 ? 's' : ''}`,
              plannedDate: plannedDate || selected.departureDate,
              referenceId: selected._id,
              estimatedCost,
              pricePerTicket: selected.price,
              numberOfPassengers: passengers,
            });
            setAdding(false);
          }}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add Flight
        </button>
      </div>
    </Modal>
  );

  // Step 1 — flight list
  return (
    <SearchModal title="Add Flight" subtitle={destinationIds?.length > 0 ? `Filtered by your ${destinationIds.length} destination(s)` : null}
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
                <div className="text-right">
                  <p className="font-bold text-blue-600 text-sm">NPR {Number(flight.price).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">per ticket</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition" />
              </div>
            </div>
            <div className="flex items-center justify-between ml-8">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <span className="font-medium text-gray-700">{flight.from}</span>
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium text-gray-700">{flight.to}</span>
                <span>·</span><span>{flight.departureTime}–{flight.arrivalTime}</span>
                <span>·</span><span>{flight.duration}</span>
              </p>
              {flight.availableSeats != null && (
                <span className="text-xs text-gray-400">{flight.availableSeats} seats left</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </SearchModal>
  );
};

// ── Add Custom Modal ──────────────────────────────────────────────────────────
const AddCustomModal = ({ type, onClose, onAdd, plannedDate }) => {
  const [title, setTitle]     = useState('');
  const [notes, setNotes]     = useState('');
  const [date, setDate]       = useState(plannedDate?.slice(0, 10) || '');
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


// ── Mark Done Modal ───────────────────────────────────────────────────────────
const MarkDoneModal = ({ item, onClose, onConfirm }) => {
  const [cost, setCost]       = useState(item.estimatedCost > 0 ? String(item.estimatedCost) : '');
  const [loading, setLoading] = useState(false);
  const cfg        = getCfg(item.type);
  const Icon       = cfg.icon;
  const isNoCost   = item.type === 'destination';
  const diff       = !isNoCost && cost && item.estimatedCost > 0 ? parseFloat(cost) - item.estimatedCost : null;

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mark as Done</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
            {!isNoCost && item.estimatedCost > 0 && <p className="text-xs text-gray-500">Estimated: {fmtNPR(item.estimatedCost)}</p>}
          </div>
        </div>
        {isNoCost ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
            Marking this destination as visited. No cost to record.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Actual Cost (NPR) <span className="text-gray-400 font-normal">— optional</span></label>
              <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)}
                placeholder="How much did you actually spend?"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
              <p className="text-xs text-gray-400 mt-1.5">Leave blank if free or unknown</p>
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

// ── Share Modal ───────────────────────────────────────────────────────────────
const ShareModal = ({ itin, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/itinerary/${itin._id}`;
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Share Trip</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">Share this link with your travel buddies so they can view your itinerary.</p>
        <div className="flex gap-2">
          <input readOnly value={url} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 outline-none" />
          <button onClick={copy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {copied ? <><CheckCheck className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Cover Photo Modal ─────────────────────────────────────────────────────────
const CoverPhotoModal = ({ itinId, token, onClose, onSaved }) => {
  const [preview, setPreview]   = useState(null);
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('coverImage', file);
    const res = await fetch(`${BASE_URL}/api/itineraries/${itinId}/cover`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (res.ok) { const d = await res.json(); onSaved(d.coverImage); onClose(); }
    else alert('Failed to upload cover photo');
    setLoading(false);
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Cover Photo</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        {preview && <img src={preview} alt="preview" className="w-full h-44 object-cover rounded-xl" />}
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
          <Camera className="h-7 w-7 text-gray-400" />
          <span className="text-sm text-gray-500 font-medium">Click to choose a photo</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
      <div className="px-6 pb-6 flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
        <button disabled={!file || loading} onClick={handleSave}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Photo
        </button>
      </div>
    </Modal>
  );
};

// ── Weather Widget ────────────────────────────────────────────────────────────
const WeatherWidget = ({ destinations }) => {
  const [weather, setWeather] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destinations.length) return;
    setLoading(true);
    // Fetch weather for each destination using Open-Meteo + geocoding
    Promise.all(
      destinations.slice(0, 3).map(async (name) => {
        try {
          const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`).then(r => r.json());
          const loc = geo.results?.[0];
          if (!loc) return null;
          const wx = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius`).then(r => r.json());
          const code = wx.current?.weather_code ?? 0;
          const temp = wx.current?.temperature_2m;
          const wind = wx.current?.wind_speed_10m;
          const condition = code === 0 ? 'Clear' : code < 10 ? 'Mostly Clear' : code < 50 ? 'Cloudy' : code < 70 ? 'Rainy' : code < 80 ? 'Snowy' : 'Stormy';
          const Icon = code === 0 ? Sun : code < 50 ? Cloud : CloudRain;
          return { name, temp, wind, condition, Icon };
        } catch { return null; }
      })
    ).then(results => setWeather(results.filter(Boolean))).finally(() => setLoading(false));
  }, [JSON.stringify(destinations)]);

  if (!destinations.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Sun className="h-4 w-4 text-yellow-500" /> Weather
      </h3>
      {loading && <p className="text-xs text-gray-400 text-center py-3">Fetching weather...</p>}
      {!loading && weather.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Weather unavailable</p>}
      <div className="space-y-3">
        {weather.map(w => (
          <div key={w.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2">
              <w.Icon className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                <p className="text-xs text-gray-400">{w.condition} · Wind {w.wind} km/h</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900">{w.temp}°C</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Packing Checklist ─────────────────────────────────────────────────────────
const PackingChecklist = ({ itinId, token }) => {
  const DEFAULTS = ['Passport / ID', 'Travel insurance', 'Phone charger', 'Power bank', 'Camera', 'Sunscreen', 'First aid kit', 'Cash (NPR)', 'Water bottle', 'Warm jacket'];
  const storageKey = `packing_${itinId}`;

  const [items, setItems]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || DEFAULTS.map(t => ({ text: t, done: false })); }
    catch { return DEFAULTS.map(t => ({ text: t, done: false })); }
  });
  const [newItem, setNewItem] = useState('');

  const save = (updated) => { setItems(updated); localStorage.setItem(storageKey, JSON.stringify(updated)); };
  const toggle = (i) => save(items.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  const remove = (i) => save(items.filter((_, idx) => idx !== i));
  const add = () => { if (!newItem.trim()) return; save([...items, { text: newItem.trim(), done: false }]); setNewItem(''); };

  const done  = items.filter(i => i.done).length;
  const total = items.length;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" /> Packing Checklist
        </h3>
        <span className="text-xs text-gray-400">{done}/{total} packed</span>
      </div>
      {/* Progress */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: total > 0 ? `${(done/total)*100}%` : '0%' }} />
      </div>
      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 group">
            <button onClick={() => toggle(i)} className="flex-shrink-0">
              {item.done ? <CheckCircle2 className="h-4.5 w-4.5 text-blue-600" /> : <Circle className="h-4.5 w-4.5 text-gray-300" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
            <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-gray-300 hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Add item..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        <button onClick={add} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ── Day Notes ─────────────────────────────────────────────────────────────────
const DayNotes = ({ dayKey, token }) => {
  const storageKey = `daynotes_${dayKey}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  let timer = null;

  const handleChange = (val) => {
    setNotes(val);
    localStorage.setItem(storageKey, val);
    setSaved(false);
    clearTimeout(timer);
    timer = setTimeout(() => setSaved(true), 800);
  };

  return (
    <div className="mt-2 px-5 pb-4">
      <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
        <StickyNote className="h-3.5 w-3.5" /> Day Notes / Journal
        {saved && <span className="text-green-500 ml-auto text-xs">Saved</span>}
      </label>
      <textarea value={notes} onChange={e => handleChange(e.target.value)} rows={2}
        placeholder="What happened today? Any highlights, thoughts, or memories..."
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none text-gray-700 placeholder-gray-300" />
    </div>
  );
};

// ── Item Row ──────────────────────────────────────────────────────────────────
const ItemRow = ({ item, onDelete, onMarkDone, onUndone, onEditCost }) => {
  const cfg  = getCfg(item.type);
  const Icon = cfg.icon;
  return (
    <div className={`group flex items-start gap-4 py-4 border-b border-gray-100 last:border-0 ${item.isDone && item.type !== 'destination' ? 'opacity-55' : ''}`}>
      {item.type !== 'destination' ? (
        <button onClick={() => item.isDone ? onUndone(item) : onMarkDone(item)}
          className="mt-1 flex-shrink-0 text-gray-300 hover:text-green-500 transition">
          {item.isDone ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
        </button>
      ) : (
        <div className="mt-1 w-5 h-5 flex-shrink-0" />
      )}
      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`h-4 w-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-gray-900 text-base leading-snug ${item.isDone ? 'line-through text-gray-400' : ''}`}>
          {item.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          {item.type !== 'destination' && item.estimatedCost > 0 && (
            <span className={item.isDone ? 'line-through text-gray-300' : ''}>Est. {fmtNPR(item.estimatedCost)}</span>
          )}
          {item.type !== 'destination' && item.isDone && item.actualCost != null && (
            <span className={`font-semibold ${item.actualCost > item.estimatedCost ? 'text-red-500' : item.actualCost < item.estimatedCost ? 'text-green-600' : 'text-blue-600'}`}>
              Actual: {fmtNPR(item.actualCost)}
            </span>
          )}
          {item.type !== 'destination' && item.isDone && item.actualCost == null && item.estimatedCost > 0 && (
            <button onClick={() => onEditCost(item)} className="text-blue-500 hover:text-blue-700 transition">+ add actual cost</button>
          )}
          {item.type === 'hotel' && item.roomTypeName && (
            <span className="text-gray-400">{item.roomTypeName} · {item.numberOfNights} night{item.numberOfNights !== 1 ? 's' : ''}</span>
          )}
          {item.type === 'flight' && item.numberOfPassengers && (
            <span className="text-gray-400">{item.numberOfPassengers} passenger{item.numberOfPassengers !== 1 ? 's' : ''}</span>
          )}
          {item.type !== 'hotel' && item.type !== 'flight' && item.notes && (
            <span className="text-gray-400 truncate max-w-xs">{item.notes}</span>
          )}
          {item.plannedDate && (
            <span className="flex items-center gap-1 text-gray-400">
              <Clock className="h-3.5 w-3.5" />{fmtDate(item.plannedDate)}
            </span>
          )}
        </div>
        {item.type !== 'destination' && item.isDone && item.actualCost != null && (
          <button onClick={() => onEditCost(item)} className="text-xs text-gray-400 hover:text-blue-500 mt-1 transition">Edit actual cost</button>
        )}
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5">
        <span className={`text-xs px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} hidden sm:block font-medium`}>{cfg.label}</span>
        <button onClick={() => onDelete(item)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ── Edit Actual Cost Modal ────────────────────────────────────────────────────
const EditCostModal = ({ item, onClose, onConfirm }) => {
  const [cost, setCost]       = useState(item.actualCost != null ? String(item.actualCost) : '');
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Edit Actual Cost</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
        {item.estimatedCost > 0 && <p className="text-xs text-gray-400">Estimated: {fmtNPR(item.estimatedCost)}</p>}
        <input autoFocus type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Actual amount spent (NPR)"
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

// ── Day Section ───────────────────────────────────────────────────────────────
const DaySection = ({ day, dayNum, items, onAddItem, destinationIds, onDeleteItem, onMarkDone, onUndone, onEditCost, itinId, token }) => {
  const [open, setOpen]   = useState(true);
  const [modal, setModal] = useState(null);
  const dateStr           = day.toISOString().slice(0, 10);
  const doneCount         = items.filter(i => i.isDone).length;
  const allDone           = items.length > 0 && doneCount === items.length;

  const handleAdd = async (itemData) => { await onAddItem({ ...itemData, plannedDate: itemData.plannedDate || dateStr }); setModal(null); };
  const ADD_BTNS  = [
    { key: 'destination',    label: 'Destination', Icon: MapPin          },
    { key: 'hotel',          label: 'Hotel',       Icon: Hotel           },
    { key: 'flight',         label: 'Flight',      Icon: Plane           },
    { key: 'restaurant',     label: 'Restaurant',  Icon: UtensilsCrossed },
    { key: 'activity',       label: 'Activity',    Icon: Zap             },
    { key: 'custom_expense', label: 'Expense',     Icon: Receipt         },
  ];

  return (
    <>
      {modal === 'destination'    && <AddDestModal          onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
      {modal === 'hotel'          && <AddHotelModal         onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={dateStr} />}
      {modal === 'flight'         && <AddFlightModal        onClose={() => setModal(null)} onAdd={handleAdd} destinationIds={destinationIds} plannedDate={dateStr} />}
      {modal === 'restaurant'     && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
      {modal === 'activity'       && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}
      {modal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setModal(null)} onAdd={handleAdd} plannedDate={dateStr} />}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl min-w-[5rem] text-center">Day {dayNum}</div>
            <div>
              <p className="font-bold text-gray-900 text-base">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="text-sm text-gray-400 mt-0.5">{items.length === 0 ? 'Nothing planned yet' : `${doneCount} of ${items.length} done`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allDone && <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-semibold">All done</span>}
            {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>
        {open && (
          <div className="border-t border-gray-100">
            {items.length > 0 && (
              <div className="px-6 pt-3 pb-2">
                {items.map(item => (
                  <ItemRow key={item._id} item={item} onDelete={onDeleteItem}
                    onMarkDone={onMarkDone} onUndone={onUndone} onEditCost={onEditCost} />
                ))}
              </div>
            )}
            {items.length === 0 && <p className="text-center text-gray-500 text-sm py-6 px-6">Nothing planned yet — add something below</p>}
            {/* Add buttons */}
            <div className="px-6 pb-4 pt-2 flex flex-wrap gap-2">
              {ADD_BTNS.map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setModal(key)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            {/* Day notes / journal */}
            <DayNotes dayKey={`${itinId}_${dateStr}`} token={token} />
          </div>
        )}
      </div>
    </>
  );
};

// ── Set Budget Modal ─────────────────────────────────────────────────────────
const SetBudgetModal = ({ current, onClose, onSave }) => {
  const [value, setValue] = useState(current != null ? String(current) : '');
  const [loading, setLoading] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{current != null ? 'Edit Trip Budget' : 'Set Trip Budget'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">How much do you plan to spend in total?</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"><X className="h-5 w-5" /></button>
      </div>
      <div className="p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Budget (NPR)</label>
        <input autoFocus type="number" value={value} onChange={e => setValue(e.target.value)}
          placeholder="e.g. 50000"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition" />
        <p className="text-xs text-gray-400 mt-2">This is your overall spending target for the whole trip.</p>
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

// ── Budget Sidebar Card ───────────────────────────────────────────────────────
const BudgetCard = ({ items, nights, budget, onSetBudget }) => {
  // Flatten items — hotels already have estimatedCost = pricePerNight * nights baked in
  const grandEst = items.filter(i => i.type !== 'destination').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const doneItems = items.filter(i => i.isDone && i.actualCost != null);
  const grandAct  = doneItems.reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual = doneItems.length > 0;

  // Per-category breakdown
  const cats = [
    { key: 'flight',              label: 'Flights',            Icon: Plane           },
    { key: 'hotel',               label: 'Hotels',             Icon: Hotel           },
    { key: 'restaurant,activity', label: 'Activities & Dining',Icon: Zap             },
    { key: 'custom_expense',      label: 'Other Expenses',     Icon: Receipt         },
  ].map(cat => {
    const types    = cat.key.split(',');
    const catItems = items.filter(i => types.includes(i.type));
    const est      = catItems.reduce((s, i) => s + (i.estimatedCost || 0), 0);
    const actItems = catItems.filter(i => i.isDone && i.actualCost != null);
    const act      = actItems.length > 0 ? actItems.reduce((s, i) => s + (i.actualCost || 0), 0) : null;
    return { ...cat, est, act };
  }).filter(c => c.est > 0 || c.act != null);

  const budgetDiff = budget != null ? grandEst - budget : null;
  const actualDiff = hasActual && budget != null ? grandAct - budget : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" /> Budget
        </h3>
        <button onClick={onSetBudget}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition px-2 py-1 rounded-lg hover:bg-blue-50">
          {budget != null ? 'Edit' : '+ Set Budget'}
        </button>
      </div>

      {/* User-set budget row */}
      {budget != null && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700">Your Budget</span>
            <span className="text-base font-bold text-gray-900">{fmtNPR(budget)}</span>
          </div>
          {grandEst > 0 && (
            <>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Estimated spend</span>
                <span className={budgetDiff > 0 ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                  {fmtNPR(grandEst)}
                  {budgetDiff > 0 ? ` (+${fmtNPR(budgetDiff)} over)` : budgetDiff < 0 ? ` (${fmtNPR(Math.abs(budgetDiff))} left)` : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetDiff > 0 ? 'bg-red-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (grandEst / budget) * 100)}%` }}
                />
              </div>
            </>
          )}
          {hasActual && (
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-gray-400">Actually spent so far</span>
              <span className={`font-semibold ${actualDiff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {fmtNPR(grandAct)}
                {actualDiff > 0 ? ` (+${fmtNPR(actualDiff)} over)` : actualDiff < 0 ? ` (${fmtNPR(Math.abs(actualDiff))} left)` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* No items yet */}
      {cats.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-3">Add items to see cost breakdown</p>
      )}

      {/* Category breakdown */}
      {cats.length > 0 && (
        <>
          {budget == null && hasActual && (
            <div className="flex justify-end gap-8 text-xs text-gray-400 mb-2">
              <span>Estimated</span><span>Actual</span>
            </div>
          )}
          <div className="space-y-3">
            {cats.map(c => (
              <div key={c.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-500 flex-1 min-w-0">
                  <c.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{c.label}</span>
                </span>
                <div className="flex items-center gap-4 flex-shrink-0 ml-2">
                  <span className={`font-semibold ${hasActual ? 'text-gray-400 text-xs' : 'text-gray-900'}`}>{fmtNPR(c.est)}</span>
                  {hasActual && (
                    <span className={`font-semibold w-28 text-right ${c.act != null
                      ? c.act > c.est ? 'text-red-500' : c.act < c.est ? 'text-green-600' : 'text-gray-900'
                      : 'text-gray-300'}`}>
                      {c.act != null ? fmtNPR(c.act) : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Total row */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-900 text-sm">Total</span>
              <div className="flex items-center gap-4">
                <span className={`font-bold ${hasActual ? 'text-gray-400 text-xs' : 'text-blue-600 text-base'}`}>
                  {fmtNPR(grandEst)}
                </span>
                {hasActual && (
                  <span className={`font-bold text-base w-28 text-right ${
                    grandAct > grandEst ? 'text-red-500' : grandAct < grandEst ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {fmtNPR(grandAct)}
                  </span>
                )}
              </div>
            </div>

            {/* Est vs actual diff (when no user budget set) */}
            {hasActual && budget == null && grandAct !== grandEst && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${grandAct > grandEst ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {grandAct > grandEst ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {grandAct > grandEst ? `${fmtNPR(grandAct - grandEst)} over estimate` : `${fmtNPR(grandEst - grandAct)} under estimate`}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};


// ── Trip Completion Summary Banner ───────────────────────────────────────────
const TripSummaryBanner = ({ itin, items, nights, budget }) => {
  const totalEst  = items.filter(i => i.type !== 'destination').reduce((s, i) => s + (i.estimatedCost || 0), 0);
  const totalAct  = items.filter(i => i.isDone && i.actualCost != null && i.type !== 'destination').reduce((s, i) => s + (i.actualCost || 0), 0);
  const hasActual = items.some(i => i.isDone && i.actualCost != null);
  const doneCount = items.filter(i => i.isDone).length;
  const destNames = items.filter(i => i.type === 'destination').map(i => i.title);

  // What to compare actual spend against: user budget if set, otherwise estimated
  const baseline     = budget != null ? budget : totalEst;
  const actVsBase    = hasActual ? totalAct - baseline : null;
  const estVsBudget  = budget != null ? totalEst - budget : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
      <div className="h-2 bg-blue-600" />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Trip Complete!</h2>
            <p className="text-gray-500 text-sm mt-0.5">Here is a summary of your {itin.title} trip</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
            <p className="text-2xl font-bold text-gray-900">{nights}</p>
            <p className="text-sm text-gray-500">night{nights !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Items Done</p>
            <p className="text-2xl font-bold text-gray-900">{doneCount}</p>
            <p className="text-sm text-gray-500">of {items.length} planned</p>
          </div>
          {budget != null && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Your Budget</p>
              <p className="text-xl font-bold text-gray-900">{fmtNPR(budget)}</p>
              {estVsBudget != null && (
                <p className={`text-sm ${estVsBudget > 0 ? 'text-red-500' : 'text-green-600'}`}>
                  Est. {estVsBudget > 0 ? `${fmtNPR(estVsBudget)} over` : `${fmtNPR(Math.abs(estVsBudget))} under`}
                </p>
              )}
            </div>
          )}
          {budget == null && totalEst > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Estimated</p>
              <p className="text-xl font-bold text-gray-900">{fmtNPR(totalEst)}</p>
              <p className="text-sm text-gray-500">planned spend</p>
            </div>
          )}
          {hasActual && (
            <div className={`rounded-xl p-4 ${actVsBase > 0 ? 'bg-red-50' : actVsBase < 0 ? 'bg-green-50' : 'bg-blue-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${actVsBase > 0 ? 'text-red-400' : actVsBase < 0 ? 'text-green-500' : 'text-blue-400'}`}>
                Actually Spent
              </p>
              <p className={`text-xl font-bold ${actVsBase > 0 ? 'text-red-600' : actVsBase < 0 ? 'text-green-700' : 'text-blue-600'}`}>
                {fmtNPR(totalAct)}
              </p>
              <p className={`text-sm ${actVsBase > 0 ? 'text-red-400' : actVsBase < 0 ? 'text-green-500' : 'text-blue-400'}`}>
                {actVsBase > 0
                  ? `${fmtNPR(actVsBase)} over ${budget != null ? 'budget' : 'estimate'}`
                  : actVsBase < 0
                  ? `${fmtNPR(Math.abs(actVsBase))} ${budget != null ? 'saved' : 'under estimate'}`
                  : `exactly on ${budget != null ? 'budget' : 'estimate'}`}
              </p>
            </div>
          )}
        </div>

        {/* Destinations visited */}
        {destNames.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Destinations visited</p>
            <div className="flex flex-wrap gap-2">
              {destNames.map(name => (
                <span key={name} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5" /> {name}
                </span>
              ))}
            </div>
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

  const [itin,        setItin]        = useState(null);
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [deleteItem,  setDeleteItem]  = useState(null);
  const [modal,       setModal]       = useState(null);
  const [markItem,    setMarkItem]    = useState(null);
  const [editCost,    setEditCost]    = useState(null);
  const [editTrip,    setEditTrip]    = useState(false);
  const [showShare,      setShowShare]      = useState(false);
  const [showCover,      setShowCover]      = useState(false);
  const [deleteTrip,     setDeleteTrip]     = useState(false);
  const [showSetBudget,  setShowSetBudget]  = useState(false);

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
    setModal(null);
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ budget: amount }),
    });
    if (!res.ok) { alert('Failed to save budget'); return; }
    const updated = await res.json();
    setItin(prev => ({ ...prev, budget: updated.budget }));
    setShowSetBudget(false);
  };

  const days          = itin ? getDays(itin) : [];
  const hasDays       = days.length > 0;
  const nights        = itin ? getNights(itin) : 1;
  const status        = itin?.status || 'planning';
  const sCfg          = STATUS_CFG[status];
  const unscheduled   = hasDays ? items.filter(i => !i.plannedDate) : [];

  const destinationIds = useMemo(() =>
    items.filter(i => i.type === 'destination').map(i => String(i.referenceId)).filter(Boolean),
    [items]
  );
  const destinationNames = useMemo(() =>
    items.filter(i => i.type === 'destination').map(i => i.title).filter(Boolean),
    [items]
  );

  const QUICK_BTNS = [
    { key: 'destination',    label: 'Destination', Icon: MapPin          },
    { key: 'hotel',          label: 'Hotel',       Icon: Hotel           },
    { key: 'flight',         label: 'Flight',      Icon: Plane           },
    { key: 'restaurant',     label: 'Restaurant',  Icon: UtensilsCrossed },
    { key: 'activity',       label: 'Activity',    Icon: Zap             },
    { key: 'custom_expense', label: 'Expense',     Icon: Receipt         },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      <span className="text-gray-500">Loading itinerary...</span>
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
      {deleteItem && <ConfirmDelete label={deleteItem.title} onClose={() => setDeleteItem(null)} onConfirm={handleRemoveItem} />}
      {deleteTrip && <ConfirmDelete label={itin.title} onClose={() => setDeleteTrip(false)} onConfirm={handleDeleteTrip} />}
      {markItem   && <MarkDoneModal item={markItem} onClose={() => setMarkItem(null)} onConfirm={handleMarkDone} />}
      {editCost   && <EditCostModal item={editCost} onClose={() => setEditCost(null)} onConfirm={handleEditCost} />}
      {editTrip   && <TripModal existing={itin} onClose={() => setEditTrip(false)} onSave={handleEditSave} />}
      {showShare     && <ShareModal itin={itin} onClose={() => setShowShare(false)} />}
      {showCover     && <CoverPhotoModal itinId={id} token={token} onClose={() => setShowCover(false)} onSaved={path => setItin(prev => ({ ...prev, coverImage: path }))} />}
      {showSetBudget && <SetBudgetModal current={itin.budget} onClose={() => setShowSetBudget(false)} onSave={handleSetBudget} />}
      {!hasDays && modal === 'destination'    && <AddDestModal          onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {!hasDays && modal === 'hotel'          && <AddHotelModal         onClose={() => setModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!hasDays && modal === 'flight'         && <AddFlightModal        onClose={() => setModal(null)} onAdd={handleAddItem} destinationIds={destinationIds} />}
      {!hasDays && modal === 'restaurant'     && <AddCustomModal type="restaurant" onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {!hasDays && modal === 'activity'       && <AddCustomModal type="activity"   onClose={() => setModal(null)} onAdd={handleAddItem} />}
      {!hasDays && modal === 'custom_expense' && <AddCustomExpenseModal onClose={() => setModal(null)} onAdd={handleAddItem} />}

      {/* Cover image hero — same treatment as hotel detail pages */}
      <div className="relative h-56 bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden">
        {itin.coverImage
          ? <img src={`${BASE_URL}${itin.coverImage}`} alt={itin.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><MapPin className="h-16 w-16 text-white/30" /></div>}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {/* Back button */}
        <button onClick={() => navigate('/itinerary')}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/90 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-white transition">
          ← My Trips
        </button>
        {/* Action buttons top-right */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setShowCover(true)} className="p-2 bg-white/90 text-gray-700 rounded-lg hover:bg-white transition" title="Change cover photo"><Camera className="h-4 w-4" /></button>
          <button onClick={() => setShowShare(true)} className="p-2 bg-white/90 text-gray-700 rounded-lg hover:bg-white transition" title="Share trip"><Share2 className="h-4 w-4" /></button>
        </div>
        {/* Trip title over image */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 mb-2 ${sCfg.textColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dotColor} ${status === 'active' ? 'animate-pulse' : ''}`} />
                {sCfg.label}
              </span>
              <h1 className="text-2xl font-bold text-white">{itin.title}</h1>
              {fmtDateRange(itin) && <p className="text-white/80 text-sm mt-0.5">{fmtDateRange(itin)} · {nights} night{nights !== 1 ? 's' : ''}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <StatusButton itin={itin} onStatusChange={handleStatusChange} />
              <button onClick={() => setEditTrip(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 text-sm font-semibold transition backdrop-blur-sm">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={() => setDeleteTrip(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white rounded-xl hover:bg-red-500 text-sm font-semibold transition backdrop-blur-sm">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trip Completion Summary — shown when trip is completed */}
        {status === 'completed' && (
          <TripSummaryBanner itin={itin} items={items} nights={nights} budget={itin.budget ?? null} />
        )}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left — day sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Section heading — matches site's "Explore All Hotels" style */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Itinerary</h2>
                <p className="text-base text-gray-500 mt-1">
                  {items.length === 0 ? 'No items added yet' : `${items.filter(i => i.isDone).length} of ${items.length} items completed`}
                </p>
              </div>
            </div>

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
                    onMarkDone={setMarkItem}
                    onUndone={handleUndone}
                    onEditCost={setEditCost}
                    itinId={id}
                    token={token}
                  />
                ))}
                {unscheduled.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <p className="font-bold text-gray-900 text-sm mb-3">Unscheduled Items</p>
                    {unscheduled.map(item => (
                      <ItemRow key={item._id} item={item} onDelete={setDeleteItem}
                        onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 px-4 py-3 rounded-xl mb-4 text-sm">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  Add start and end dates to your trip to enable day-by-day planning
                </div>
                {items.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No items yet — use the buttons below to start planning</p>
                  </div>
                ) : items.map(item => (
                  <ItemRow key={item._id} item={item} onDelete={setDeleteItem}
                    onMarkDone={setMarkItem} onUndone={handleUndone} onEditCost={setEditCost} />
                ))}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  {QUICK_BTNS.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setModal(key)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition">
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Trip Status */}
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

            {/* Budget */}
            <BudgetCard items={items} nights={nights} budget={itin.budget ?? null} onSetBudget={() => setShowSetBudget(true)} />

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
              {itin.startDate && itin.endDate && (
                <div className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                  <span className="flex items-center gap-2 text-gray-500"><Calendar className="h-3.5 w-3.5 text-blue-600" />Duration</span>
                  <span className="font-semibold text-gray-900">{nights} nights</span>
                </div>
              )}
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

            {/* Weather */}
            {destinationNames.length > 0 && <WeatherWidget destinations={destinationNames} />}

            {/* Packing Checklist */}
            <PackingChecklist itinId={id} token={token} />

          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDetail;

