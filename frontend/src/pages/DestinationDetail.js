// frontend/src/pages/DestinationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MapPin, DollarSign, Calendar, Plane, Hotel, X,
  ChevronLeft, ChevronRight, Star, User, Utensils,
  Zap, Package, Clock, CheckCircle, CreditCard,
  Loader2, Plus, Minus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const BASE_URL = 'http://localhost:5000';

const formatCostNPR = (dest) => {
  const hasAvg = dest.averageCost !== undefined && dest.averageCost !== null && dest.averageCost !== '';
  const hasMin = dest.averageCostMin !== undefined && dest.averageCostMin !== null && dest.averageCostMin !== '';
  const hasMax = dest.averageCostMax !== undefined && dest.averageCostMax !== null && dest.averageCostMax !== '';
  if (hasAvg) return 'NPR ' + Math.round(Number(dest.averageCost));
  if (hasMin || hasMax) {
    const min = hasMin ? Math.round(Number(dest.averageCostMin)) : '';
    const max = hasMax ? Math.round(Number(dest.averageCostMax)) : '';
    if (min !== '' && max !== '') return 'NPR ' + min + ' – ' + max;
    if (min !== '') return 'From NPR ' + min;
    if (max !== '') return 'Up to NPR ' + max;
  }
  return 'Varies';
};

const TABS = [
  { key: 'overview',    label: 'Overview',     Icon: MapPin   },
  { key: 'restaurants', label: 'Restaurants',  Icon: Utensils },
  { key: 'activities',  label: 'Activities',   Icon: Zap      },
  { key: 'flights',     label: 'Flights',      Icon: Plane    },
  { key: 'plan',        label: 'Plan My Trip', Icon: Package  },
];

const INP = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white';

// ── Success panel ─────────────────────────────────────────────────────────────
function SuccessPanel({ title, subtitle, total, onPayNow, onClose, payLoading }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 mb-4 border border-green-100 flex justify-between items-center">
        <span className="text-sm text-gray-500">Total</span>
        <span className="text-2xl font-bold text-blue-600">NPR {Number(total).toLocaleString()}</span>
      </div>
      {total > 0 ? (
        <div className="flex gap-3">
          <button onClick={onPayNow} disabled={payLoading}
            className={'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition ' + (payLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700')}>
            {payLoading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Pay Now
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50">Pay Later</button>
        </div>
      ) : (
        <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700">Done</button>
      )}
      {total > 0 && <p className="text-xs text-center text-gray-400 mt-2">Pay later from My Bookings</p>}
    </div>
  );
}

// ── Book a Table modal ────────────────────────────────────────────────────────
function BookTableModal({ restaurant, onClose }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form,      setForm]    = useState({ date: '', time: '', tableSize: 2 });
  const [submitting, setSub]    = useState(false);
  const [success,    setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    setSub(true);
    try {
      const res = await fetch(BASE_URL + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ type: 'reservation', restaurantId: restaurant._id, reservationDate: form.date, reservationTime: form.time, tableSize: form.tableSize, totalAmount: 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setSuccess(true);
      showToast('Table booked!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSub(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><Utensils size={18} className="text-orange-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Book a Table</h2>
              <p className="text-sm text-gray-500">{restaurant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">Table Booked!</h3>
              <p className="text-sm text-gray-500 mb-4">Show this confirmation when you arrive. Payment at restaurant.</p>
              <button onClick={onClose} className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input type="date" required value={form.date} min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                  <input type="time" required value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className={INP} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Number of People</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setForm(p => ({ ...p, tableSize: Math.max(1, p.tableSize - 1) }))}
                    className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"><Minus size={14} /></button>
                  <span className="text-xl font-bold w-8 text-center text-gray-900">{form.tableSize}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, tableSize: p.tableSize + 1 }))}
                    className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"><Plus size={14} /></button>
                  <span className="text-sm text-gray-400 ml-1">{form.tableSize === 1 ? 'person' : 'people'}</span>
                </div>
              </div>
              {restaurant.openingHours && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <Clock size={11} /> <span>Open: {restaurant.openingHours}</span>
                </div>
              )}
              <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700 flex items-center gap-2">
                <span>ℹ️</span> Booking is free — you pay at the restaurant.
              </div>
              <button type="submit" disabled={submitting}
                className={'w-full py-3 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 ' + (submitting ? 'bg-orange-400' : 'bg-orange-500 hover:bg-orange-600')}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Booking...</> : '🍽️ Book a Table'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Book Activity modal ───────────────────────────────────────────────────────
function BookActivityModal({ activity, onClose }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form,      setForm]    = useState({ date: '', guests: 1 });
  const [submitting, setSub]    = useState(false);
  const [payLoading, setPay]    = useState(false);
  const [success,    setSuccess] = useState(null);

  const total = (activity.price || 0) * form.guests;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    setSub(true);
    try {
      const res = await fetch(BASE_URL + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ type: 'activity', activityId: activity._id, activityDate: form.date, activityGuests: form.guests, totalAmount: total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setSuccess({ bookingId: data.booking._id, total });
      showToast('Activity booked!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSub(false); }
  }

  async function handlePayNow() {
    setPay(true);
    try {
      const res = await fetch(BASE_URL + '/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ bookingId: success.bookingId, amount: success.total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      window.location.href = data.checkoutUrl;
    } catch (err) { showToast(err.message, 'error'); }
    finally { setPay(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-xl"><Zap size={18} className="text-green-600" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Book Activity</h2>
              <p className="text-sm text-gray-500">{activity.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-5">
          {success ? (
            <SuccessPanel title="Activity Booked!" subtitle="Pending confirmation" total={success.total} onPayNow={handlePayNow} onClose={onClose} payLoading={payLoading} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" required value={form.date} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={INP} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Number of People</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setForm(p => ({ ...p, guests: Math.max(1, p.guests - 1) }))}
                    className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"><Minus size={14} /></button>
                  <span className="text-xl font-bold w-8 text-center text-gray-900">{form.guests}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, guests: p.guests + 1 }))}
                    className="w-9 h-9 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition"><Plus size={14} /></button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Price per person</span>
                  <span className="font-semibold">{activity.price ? 'NPR ' + activity.price.toLocaleString() : 'Free'}</span>
                </div>
                {activity.duration && <div className="flex justify-between text-sm"><span className="text-gray-500">Duration</span><span className="font-semibold">{activity.duration}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span className="text-blue-600">NPR {total.toLocaleString()}</span>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className={'w-full py-3 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 ' + (submitting ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700')}>
                {submitting ? <><Loader2 size={15} className="animate-spin" />Booking...</> : 'Confirm Booking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan My Trip ──────────────────────────────────────────────────────────────
function PlanMyTrip({ destination, hotels, flights, restaurants, activities }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [planName,   setPlanName]   = useState('My Trip to ' + (destination?.name || ''));
  const [selHotel,   setSelHotel]   = useState(null);
  const [selFlight,  setSelFlight]  = useState(null);
  const [selRests,   setSelRests]   = useState([]);
  const [selActs,    setSelActs]    = useState([]);
  const [hotelOpts,  setHotelOpts]  = useState({ roomType: '', checkIn: '', checkOut: '', guests: 1 });
  const [submitting, setSub]        = useState(false);
  const [payLoading, setPay]        = useState(false);
  const [success,    setSuccess]    = useState(null);

  // Section expand/collapse
  const [showHotels,  setShowHotels]  = useState(true);
  const [showFlights, setShowFlights] = useState(true);
  const [showRests,   setShowRests]   = useState(true);
  const [showActs,    setShowActs]    = useState(true);

  const hotelNights = (hotelOpts.checkIn && hotelOpts.checkOut)
    ? Math.max(1, Math.ceil((new Date(hotelOpts.checkOut) - new Date(hotelOpts.checkIn)) / 86400000))
    : 1;
  const selRoom    = selHotel?.roomTypes?.find(r => r.name === hotelOpts.roomType);
  const hotelCost  = selRoom ? selRoom.pricePerNight * hotelNights : 0;
  const flightCost = selFlight?.price || 0;
  const actCost    = selActs.reduce((s, a) => s + (a.price || 0), 0);
  const total      = hotelCost + flightCost + actCost;

  function toggleRest(r) { setSelRests(p => p.find(i => i._id === r._id) ? p.filter(i => i._id !== r._id) : [...p, r]); }
  function toggleAct(a)  { setSelActs(p  => p.find(i => i._id === a._id) ? p.filter(i => i._id !== a._id) : [...p, a]); }

  function buildItems() {
    const items = [];
    if (selHotel)  items.push({ type: 'hotel',      hotel:      selHotel._id,  roomType: hotelOpts.roomType, checkIn: hotelOpts.checkIn, checkOut: hotelOpts.checkOut, guests: hotelOpts.guests, amount: hotelCost });
    if (selFlight) items.push({ type: 'flight',     flight:     selFlight._id, amount: flightCost });
    selRests.forEach(r => items.push({ type: 'restaurant', restaurant: r._id, amount: 0 }));
    selActs.forEach(a  => items.push({ type: 'activity',   activity:   a._id, amount: a.price || 0 }));
    return items;
  }

  async function handleBook() {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    const items = buildItems();
    if (items.length === 0) { showToast('Add at least one item to your plan', 'error'); return; }
    setSub(true);
    try {
      const res = await fetch(BASE_URL + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ type: 'trip_plan', tripPlanName: planName, tripPlanDestination: destination._id, tripPlanItems: items, totalAmount: total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setSuccess({ bookingId: data.booking._id, total });
      showToast('Trip plan booked!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSub(false); }
  }

  async function handlePayNow() {
    setPay(true);
    try {
      const res = await fetch(BASE_URL + '/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ bookingId: success.bookingId, amount: success.total }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      window.location.href = data.checkoutUrl;
    } catch (err) { showToast(err.message, 'error'); }
    finally { setPay(false); }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <SuccessPanel title="Trip Plan Booked!" subtitle="Your custom trip is confirmed — pending admin approval" total={success.total} onPayNow={handlePayNow} onClose={() => navigate('/my-bookings')} payLoading={payLoading} />
      </div>
    );
  }

  const items = buildItems();

  // Section header component
  const SectionHeader = ({ icon: Icon, color, title, count, expanded, onToggle, selected }) => (
    <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition rounded-t-xl">
      <div className="flex items-center gap-2">
        <div className={'p-1.5 rounded-lg ' + color}><Icon size={15} className="text-white" /></div>
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <span className="text-xs text-gray-400">({count} available)</span>
        {selected && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Selected</span>}
      </div>
      {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Plan My Trip to {destination?.name}</h2>
        <p className="text-sm text-gray-500 mt-1">Build your perfect trip — pick what you want and book everything in one go</p>
      </div>

      {/* Trip name */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Trip Name</label>
        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} className={INP} placeholder="Give your trip a name..." />
      </div>

      {/* Hotel section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <SectionHeader icon={Hotel} color="bg-blue-500" title="Hotel" count={hotels.length} expanded={showHotels} onToggle={() => setShowHotels(v => !v)} selected={!!selHotel} />
        {showHotels && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {hotels.length === 0 ? <p className="text-sm text-gray-400 py-3">No hotels available for this destination</p> : (
              <div className="space-y-2 mt-3">
                {hotels.map(h => (
                  <div key={h._id}
                    onClick={() => { if (selHotel?._id === h._id) { setSelHotel(null); } else { setSelHotel(h); setHotelOpts(p => ({ ...p, roomType: h.roomTypes?.[0]?.name || '' })); } }}
                    className={'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' + (selHotel?._id === h._id ? 'border-blue-400 bg-blue-50' : 'border-transparent bg-gray-50 hover:border-gray-200')}>
                    {h.images?.[0] && <img src={BASE_URL + h.images[0]} alt={h.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-400">From NPR {Math.min(...(h.roomTypes?.map(r => r.pricePerNight) || [0])).toLocaleString()}/night</p>
                    </div>
                    <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (selHotel?._id === h._id ? 'border-blue-500 bg-blue-500' : 'border-gray-300')}>
                      {selHotel?._id === h._id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                ))}

                {selHotel && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3 mt-2 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Configure your stay</p>
                    <select value={hotelOpts.roomType} onChange={e => setHotelOpts(p => ({ ...p, roomType: e.target.value }))} className={INP}>
                      {selHotel.roomTypes?.map(r => <option key={r.name} value={r.name}>{r.name} — NPR {r.pricePerNight.toLocaleString()}/night (max {r.maxCapacity} guests)</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-blue-600 font-medium mb-1">Check-in</label>
                        <input type="date" value={hotelOpts.checkIn} min={new Date().toISOString().split('T')[0]} onChange={e => setHotelOpts(p => ({ ...p, checkIn: e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 font-medium mb-1">Check-out</label>
                        <input type="date" value={hotelOpts.checkOut} min={hotelOpts.checkIn || new Date().toISOString().split('T')[0]} onChange={e => setHotelOpts(p => ({ ...p, checkOut: e.target.value }))} className={INP} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-blue-600 font-medium mb-1">Guests</label>
                      <input type="number" min="1" value={hotelOpts.guests} onWheel={e => e.target.blur()} onChange={e => setHotelOpts(p => ({ ...p, guests: parseInt(e.target.value) || 1 }))} className={INP} />
                    </div>
                    {hotelCost > 0 && (
                      <div className="flex justify-between text-sm font-semibold text-blue-700 bg-white rounded-lg px-3 py-2">
                        <span>{hotelNights} night{hotelNights > 1 ? 's' : ''}</span>
                        <span>NPR {hotelCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flight section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <SectionHeader icon={Plane} color="bg-indigo-500" title="Flight" count={flights.length} expanded={showFlights} onToggle={() => setShowFlights(v => !v)} selected={!!selFlight} />
        {showFlights && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {flights.length === 0 ? <p className="text-sm text-gray-400 py-3">No flights available for this destination</p> : (
              <div className="space-y-2 mt-3">
                {flights.map(f => (
                  <div key={f._id}
                    onClick={() => setSelFlight(selFlight?._id === f._id ? null : f)}
                    className={'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' + (selFlight?._id === f._id ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-gray-50 hover:border-gray-200')}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{f.airline} {f.flightNumber}</p>
                      <p className="text-xs text-gray-400">{f.from} → {f.to} · {new Date(f.departureDate).toLocaleDateString()} · {f.departureTime} · {f.class}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600 text-sm">NPR {f.price.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{f.availableSeats} seats</p>
                    </div>
                    <div className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' + (selFlight?._id === f._id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300')}>
                      {selFlight?._id === f._id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurants section */}
      {restaurants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Utensils} color="bg-orange-500" title="Restaurants" count={restaurants.length} expanded={showRests} onToggle={() => setShowRests(v => !v)} selected={selRests.length > 0} />
          {showRests && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mt-3 mb-2">Select any restaurants you'd like to include in your trip plan</p>
              <div className="space-y-2">
                {restaurants.map(r => {
                  const sel = selRests.find(i => i._id === r._id);
                  return (
                    <div key={r._id} onClick={() => toggleRest(r)}
                      className={'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' + (sel ? 'border-orange-400 bg-orange-50' : 'border-transparent bg-gray-50 hover:border-gray-200')}>
                      {r.images?.[0] && <img src={BASE_URL + r.images[0]} alt={r.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.cuisine?.join(', ')} · {r.priceRange}{r.avgCostPerPerson ? ' · ~NPR ' + r.avgCostPerPerson + '/person' : ''}</p>
                      </div>
                      <div className={'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ' + (sel ? 'border-orange-500 bg-orange-500' : 'border-gray-300')}>
                        {sel && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activities section */}
      {activities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <SectionHeader icon={Zap} color="bg-green-500" title="Activities" count={activities.length} expanded={showActs} onToggle={() => setShowActs(v => !v)} selected={selActs.length > 0} />
          {showActs && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mt-3 mb-2">Select activities to include in your trip plan</p>
              <div className="space-y-2">
                {activities.map(a => {
                  const sel = selActs.find(i => i._id === a._id);
                  return (
                    <div key={a._id} onClick={() => toggleAct(a)}
                      className={'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' + (sel ? 'border-green-400 bg-green-50' : 'border-transparent bg-gray-50 hover:border-gray-200')}>
                      {a.images?.[0] && <img src={BASE_URL + a.images[0]} alt={a.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.category}{a.duration ? ' · ' + a.duration : ''}{a.difficulty ? ' · ' + a.difficulty : ''}</p>
                      </div>
                      <div className="text-right mr-2">
                        <p className="font-bold text-green-700 text-sm">{a.price ? 'NPR ' + a.price.toLocaleString() : 'Free'}</p>
                      </div>
                      <div className={'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ' + (sel ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                        {sel && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {items.length > 0 ? (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
          <h3 className="font-bold text-lg mb-3">📋 Your Trip Summary</h3>
          <div className="space-y-2 mb-4">
            {selHotel && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-200">🏨 {selHotel.name} ({hotelNights}n{hotelNights > 1 ? 's' : ''})</span>
                <span className="font-semibold">NPR {hotelCost.toLocaleString()}</span>
              </div>
            )}
            {selFlight && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-200">✈️ {selFlight.airline} {selFlight.flightNumber}</span>
                <span className="font-semibold">NPR {flightCost.toLocaleString()}</span>
              </div>
            )}
            {selRests.map(r => (
              <div key={r._id} className="flex justify-between text-sm">
                <span className="text-blue-200">🍽️ {r.name}</span>
                <span className="font-semibold text-blue-300">Included</span>
              </div>
            ))}
            {selActs.map(a => (
              <div key={a._id} className="flex justify-between text-sm">
                <span className="text-blue-200">⚡ {a.name}</span>
                <span className="font-semibold">{a.price ? 'NPR ' + a.price.toLocaleString() : 'Free'}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center border-t border-white/20 pt-3 mb-4">
            <span className="font-semibold text-lg">Total</span>
            <span className="font-bold text-2xl">NPR {total.toLocaleString()}</span>
          </div>
          <button onClick={handleBook} disabled={submitting}
            className={'w-full py-3.5 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ' + (submitting ? 'bg-white/20 cursor-not-allowed' : 'bg-white text-blue-700 hover:bg-blue-50 shadow-lg')}>
            {submitting ? <><Loader2 size={18} className="animate-spin text-white" /> Booking...</> : <><Package size={18} /> Book This Trip Plan</>}
          </button>
          {total === 0 && <p className="text-xs text-center text-blue-300 mt-2">This plan has no paid items — it's free!</p>}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">Your plan is empty</p>
          <p className="text-sm mt-1">Select a hotel, flight, restaurants, or activities above to get started</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const DestinationDetail = () => {
  const { id }   = useParams();

  const [destination,  setDestination]  = useState(null);
  const [hotels,       setHotels]       = useState([]);
  const [flights,      setFlights]      = useState([]);
  const [restaurants,  setRestaurants]  = useState([]);
  const [activities,   setActivities]   = useState([]);
  const [reviews,      setReviews]      = useState([]);
  const [avgRating,    setAvgRating]    = useState(null);
  const [reviewCount,  setReviewCount]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [showPhotos,   setShowPhotos]   = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [bookingTableRest, setBookingTableRest] = useState(null);
  const [bookingAct,       setBookingAct]       = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token  = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
        const [destRes, hotelsRes, flightsRes, reviewsRes, restRes, actRes] = await Promise.all([
          axios.get(BASE_URL + '/api/destinations/' + id),
          axios.get(BASE_URL + '/api/hotels?destination=' + id),
          axios.get(BASE_URL + '/api/flights?destination=' + id + '&isActive=true'),
          axios.get(BASE_URL + '/api/posts/reviews?reviewType=destination&reviewRefId=' + id, config),
          axios.get(BASE_URL + '/api/restaurants?destination=' + id),
          axios.get(BASE_URL + '/api/activities?destination=' + id),
        ]);
        setDestination(destRes.data);
        setHotels(hotelsRes.data || []);
        setFlights(flightsRes.data || []);
        setReviews(reviewsRes.data.posts || []);
        setAvgRating(reviewsRes.data.avgRating);
        setReviewCount(reviewsRes.data.count || 0);
        setRestaurants(restRes.data || []);
        setActivities(actRes.data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  if (loading) return <p className="text-center py-20 text-xl">Loading...</p>;
  if (!destination) return <p className="text-center py-20 text-gray-600 text-xl">Destination not found</p>;

  const coverImage    = destination.images?.[0] ? BASE_URL + destination.images[0] : 'https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg';
  const allImages     = destination.images || [];
  const previewImages = allImages.slice(0, 3);
  const nextPhoto     = () => setCurrentPhotoIndex(p => (p + 1) % allImages.length);
  const prevPhoto     = () => setCurrentPhotoIndex(p => (p - 1 + allImages.length) % allImages.length);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="relative h-72 bg-cover bg-center" style={{ backgroundImage: 'url(' + coverImage + ')' }}>
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 text-center">
          <h1 className="text-5xl font-bold mb-2">{destination.name}</h1>
          <div className="flex items-center gap-2 text-lg mb-2"><MapPin size={18} /><span>{destination.country || 'Nepal'}</span></div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{avgRating || '5.0'}</span>
              <span className="text-white/70">· {reviewCount} reviews</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Tab Nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={'flex items-center gap-1.5 px-5 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition ' + (activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800')}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">About {destination.name}</h2>
              <p className="text-gray-600 leading-relaxed mb-5">{destination.description || 'No description available.'}</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                  <Calendar size={22} className="text-blue-600 flex-shrink-0" />
                  <div><p className="text-xs text-gray-500">Best Time</p><p className="font-semibold text-sm">{destination.bestTimeToVisit || 'Year-round'}</p></div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <DollarSign size={22} className="text-green-600 flex-shrink-0" />
                  <div><p className="text-xs text-gray-500">Avg Cost</p><p className="font-semibold text-sm">{formatCostNPR(destination)}</p></div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
                  <MapPin size={22} className="text-orange-600 flex-shrink-0" />
                  <div><p className="text-xs text-gray-500">Country</p><p className="font-semibold text-sm">{destination.country || 'Nepal'}</p></div>
                </div>
              </div>
            </div>

            {allImages.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Gallery</h2>
                  {allImages.length > 3 && <button onClick={() => setShowPhotos(true)} className="text-sm text-blue-600 font-semibold hover:underline">View all ({allImages.length})</button>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {previewImages.map((img, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl cursor-pointer aspect-video"
                      onClick={() => { setCurrentPhotoIndex(i); setShowPhotos(true); }}>
                      <img src={BASE_URL + img} alt={destination.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Hotel size={18} className="text-blue-600" /> Hotels in {destination.name}</h2>
              {hotels.length === 0 ? <p className="text-gray-400 text-sm">No hotels listed yet.</p> : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotels.map(hotel => (
                    <Link key={hotel._id} to={'/hotels/' + hotel._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition group">
                      {hotel.images?.[0] && <div className="h-36 overflow-hidden"><img src={BASE_URL + hotel.images[0]} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition text-sm">{hotel.name}</h3>
                        <p className="text-xs text-blue-600 font-semibold">From NPR {Math.min(...(hotel.roomTypes?.map(r => r.pricePerNight) || [0])).toLocaleString()}/night</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Star size={16} className="fill-amber-400 text-amber-400" /> Community Reviews</h2>
                {reviews.length > 1 && <button onClick={() => setShowAllReviews(true)} className="text-sm text-blue-600 font-semibold hover:underline">View all ({reviews.length})</button>}
              </div>
              {reviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-sm text-gray-400">No reviews yet.</div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                        {reviews[0].author?.avatar ? <img src={BASE_URL + reviews[0].author.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User size={13} className="text-blue-600" /></div>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{reviews[0].author?.fullName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-400">{new Date(reviews[0].createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star size={11} className="fill-amber-400 text-amber-400" /><span className="text-xs font-bold text-amber-700">{reviews[0].rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{reviews[0].content}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RESTAURANTS ───────────────────────────────────────────────── */}
        {activeTab === 'restaurants' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Restaurants in {destination.name}</h2>
            {restaurants.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><Utensils size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No restaurants listed yet.</p></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {restaurants.map(rest => (
                  <div key={rest._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
                    {rest.images?.[0] ? <div className="h-44 overflow-hidden"><img src={BASE_URL + rest.images[0]} alt={rest.name} className="w-full h-full object-cover" /></div>
                      : <div className="h-44 bg-orange-50 flex items-center justify-center"><Utensils size={36} className="text-orange-200" /></div>}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{rest.name}</h3>
                      {rest.cuisine?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {rest.cuisine.slice(0, 3).map(c => <span key={c} className="text-[10px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full font-medium">{c}</span>)}
                        </div>
                      )}
                      {rest.shortDescription && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{rest.shortDescription}</p>}
                      {rest.openingHours && <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Clock size={10} /> {rest.openingHours}</p>}
                      {rest.avgCostPerPerson && <p className="text-xs text-gray-500 mb-2">~NPR {rest.avgCostPerPerson.toLocaleString()} / person</p>}
                      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (rest.priceRange === 'Budget' ? 'bg-green-50 text-green-700' : rest.priceRange === 'Fine Dining' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}>
                          {rest.priceRange}
                        </span>
                        <button onClick={() => setBookingTableRest(rest)} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition flex items-center gap-1">
                          🍽️ Book a Table
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITIES ────────────────────────────────────────────────── */}
        {activeTab === 'activities' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Activities in {destination.name}</h2>
            {activities.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><Zap size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No activities listed yet.</p></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activities.map(act => {
                  const catColor = { Adventure: 'bg-red-50 text-red-700', Cultural: 'bg-purple-50 text-purple-700', Nature: 'bg-green-50 text-green-700', Sightseeing: 'bg-blue-50 text-blue-700', Spiritual: 'bg-amber-50 text-amber-700', 'Water Sports': 'bg-cyan-50 text-cyan-700', Other: 'bg-gray-50 text-gray-600' }[act.category] || 'bg-gray-50 text-gray-600';
                  return (
                    <div key={act._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
                      {act.images?.[0] ? <div className="h-44 overflow-hidden"><img src={BASE_URL + act.images[0]} alt={act.name} className="w-full h-full object-cover" /></div>
                        : <div className="h-44 bg-green-50 flex items-center justify-center"><Zap size={36} className="text-green-200" /></div>}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 flex-1 text-sm">{act.name}</h3>
                          <span className={'text-[10px] px-2 py-0.5 rounded-full font-semibold ' + catColor}>{act.category}</span>
                        </div>
                        {act.shortDescription && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{act.shortDescription}</p>}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-2">
                          {act.duration && <span className="flex items-center gap-1"><Clock size={10} /> {act.duration}</span>}
                          {act.difficulty && <span className={'px-1.5 py-0.5 rounded text-[10px] font-semibold ' + (act.difficulty === 'Easy' ? 'bg-green-50 text-green-700' : act.difficulty === 'Hard' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>{act.difficulty}</span>}
                        </div>
                        {act.includes?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {act.includes.slice(0, 3).map(inc => <span key={inc} className="text-[10px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded">{inc}</span>)}
                          </div>
                        )}
                        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                          <span className="font-bold text-green-700 text-sm">{act.price ? 'NPR ' + act.price.toLocaleString() : 'Free'}</span>
                          <button onClick={() => setBookingAct(act)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition">
                            Book Activity
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FLIGHTS ───────────────────────────────────────────────────── */}
        {activeTab === 'flights' && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Flights to {destination.name}</h2>
            {flights.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-12 text-center"><Plane size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No active flights.</p></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {flights.map(flight => (
                  <div key={flight._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{flight.airline} {flight.flightNumber}</h3>
                        <p className="text-sm text-gray-500">{flight.from} → {flight.to}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold">{flight.class}</span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between"><span>Departure</span><span className="font-medium">{new Date(flight.departureDate).toLocaleDateString()} {flight.departureTime}</span></div>
                      <div className="flex justify-between"><span>Duration</span><span className="font-medium">{flight.duration}</span></div>
                      <div className="flex justify-between"><span>Seats</span><span className="font-medium">{flight.availableSeats}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <p className="font-bold text-indigo-600">NPR {Number(flight.price).toLocaleString()}</p>
                      <Link to={'/flights?openFlight=' + flight._id} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition">Book Now</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PLAN MY TRIP ──────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <PlanMyTrip destination={destination} hotels={hotels} flights={flights} restaurants={restaurants} activities={activities} />
        )}
      </div>

      {/* Modals */}
      {bookingTableRest && <BookTableModal restaurant={bookingTableRest} onClose={() => setBookingTableRest(null)} />}
      {bookingAct       && <BookActivityModal activity={bookingAct}      onClose={() => setBookingAct(null)} />}

      {/* Reviews modal */}
      {showAllReviews && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-5 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAllReviews(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"><X size={18} /></button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Reviews — {destination.name}</h2>
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review._id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                        {review.author?.avatar ? <img src={BASE_URL + review.author.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User size={13} className="text-blue-600" /></div>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.author?.fullName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star size={11} className="fill-amber-400 text-amber-400" /><span className="text-xs font-bold text-amber-700">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{review.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photo viewer */}
      {showPhotos && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button onClick={() => setShowPhotos(false)} className="absolute top-6 right-6 bg-white/20 p-3 rounded-full hover:bg-white/40 transition"><X size={20} className="text-white" /></button>
          <button onClick={prevPhoto} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 p-4 rounded-full hover:bg-white/40 transition"><ChevronLeft size={24} className="text-white" /></button>
          <button onClick={nextPhoto} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 p-4 rounded-full hover:bg-white/40 transition"><ChevronRight size={24} className="text-white" /></button>
          <div className="max-w-5xl w-full px-4">
            <img src={BASE_URL + allImages[currentPhotoIndex]} alt="" className="w-full max-h-[85vh] object-contain rounded-xl" />
            <p className="text-white text-center mt-3 text-sm">{currentPhotoIndex + 1} / {allImages.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationDetail;