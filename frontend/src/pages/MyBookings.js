// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import {
  Calendar, Users, MapPin, Plane, Hotel, X, Loader2, Archive,
  RotateCcw, CreditCard, Clock, CheckCircle2, Utensils,
  Zap, Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

const AUTO_REFUND_REASONS = [
  'Booking mistake', 'Change of plans', 'Found a better deal',
  'Duplicate booking', 'Medical emergency', 'Weather or natural issues',
];

const CANCELLATION_OPTIONS = [
  { value: 'Booking mistake' },
  { value: 'Change of plans' },
  { value: 'Found a better deal' },
  { value: 'Duplicate booking' },
  { value: 'Medical emergency' },
  { value: 'Weather or natural issues' },
  { value: 'Other', label: 'Other / Custom reason', isCustom: true },
];

const getTravelDate = (booking) => {
  if (booking.type === 'hotel'  && booking.checkIn)              return new Date(booking.checkIn);
  if (booking.type === 'flight' && booking.flight?.departureDate) return new Date(booking.flight.departureDate);
  if (booking.type === 'activity' && booking.activityDate)        return new Date(booking.activityDate);
  return null;
};

const getRefundPercent = (booking) => {
  if (!booking || booking.paymentStatus !== 'completed') return 0;
  const td = getTravelDate(booking);
  if (!td) return 0;
  const days = (td.getTime() - Date.now()) / 86400000;
  if (days >= 7) return 100;
  if (days >= 3) return 90;
  if (days >= 1) return 70;
  return 30;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// Booking type config for display
const typeConfig = {
  hotel:       { label: 'Hotel',        color: 'bg-blue-50 text-blue-700',   Icon: MapPin   },
  flight:      { label: 'Flight',       color: 'bg-indigo-50 text-indigo-700', Icon: Plane   },
  reservation: { label: 'Reservation',  color: 'bg-orange-50 text-orange-700', Icon: Utensils },
  activity:    { label: 'Activity',     color: 'bg-green-50 text-green-700',  Icon: Zap     },
  trip_plan:   { label: 'Trip Plan',    color: 'bg-purple-50 text-purple-700', Icon: Package  },
};

const RefundPill = ({ booking }) => {
  const s = booking.refundReviewStatus;
  if (!s || s === 'none') return null;
  const cfg = {
    pending_review: { cls: 'bg-amber-100 text-amber-800', label: 'Refund under admin review' },
    auto_approved:  { cls: 'bg-green-100 text-green-800', label: booking.refundAmount > 0 ? 'Refund processed — NPR ' + booking.refundAmount.toLocaleString() : 'No refund (outside window)' },
    admin_approved: { cls: 'bg-green-100 text-green-800', label: 'Refund approved — NPR ' + booking.refundAmount.toLocaleString() },
    admin_rejected: { cls: 'bg-red-100 text-red-800',     label: 'Refund rejected by admin' },
  }[s];
  if (!cfg) return null;
  return <span className={'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ' + cfg.cls}>{cfg.label}</span>;
};

// ── Cancel Modal ──────────────────────────────────────────────────────────────
const CancelModal = ({ booking, onConfirm, onClose, cancelling }) => {
  const isPaid = booking?.paymentStatus === 'completed';
  const [selected,   setSelected]   = useState('');
  const [customText, setCustomText] = useState('');
  const [note,       setNote]       = useState('');

  const isOther        = selected === 'Other';
  const effectiveReason = isOther ? customText.trim() : selected;
  const isValid        = isOther ? customText.trim().length >= 5 : Boolean(selected);
  const willAutoRefund = isPaid && !isOther && AUTO_REFUND_REASONS.includes(selected);
  const refundPercent  = getRefundPercent(booking);
  const refundAmount   = ((booking?.totalAmount || 0) * refundPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-900">Cancel Booking</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          {isPaid && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-semibold">Estimated refund: NPR {refundAmount.toLocaleString()} ({refundPercent}%)</p>
              <p className="text-sm text-amber-700 mt-1">7+ days = 100% · 3–6 days = 90% · 1–2 days = 70% · under 24h = 30%</p>
            </div>
          )}
          {!isPaid && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-gray-600 text-sm">This booking is unpaid — no refund will be processed.</p>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Reason <span className="text-red-500">*</span></p>
            {CANCELLATION_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="cancel-reason" value={opt.value} checked={selected === opt.value}
                  onChange={() => { setSelected(opt.value); if (!opt.isCustom) setCustomText(''); }}
                  className="mt-0.5 w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{opt.label || opt.value}</span>
              </label>
            ))}
            {isOther && (
              <div className="pl-7">
                <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={3}
                  placeholder="Please describe your reason (at least 5 characters)..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" autoFocus />
                {isPaid && <p className="text-xs text-amber-600 mt-1">Custom reasons require admin review before a refund is issued.</p>}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Any extra details..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          {isPaid && isValid && (
            <div className={'rounded-xl p-3 text-sm border ' + (willAutoRefund ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800')}>
              {willAutoRefund ? '✓ Your refund will be processed automatically.' : '⏳ Your refund request will be sent for admin review.'}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
          <button onClick={onClose} disabled={cancelling} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition font-medium">Keep Booking</button>
          <button onClick={() => onConfirm(effectiveReason, note.trim())} disabled={cancelling || !isValid}
            className={'px-6 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 min-w-[160px] justify-center transition ' + (cancelling || !isValid ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600')}>
            {cancelling ? <><Loader2 size={14} className="animate-spin" />Processing...</> : 'Yes, Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Booking card header image / icon ──────────────────────────────────────────
function BookingCardImage({ booking }) {
  if (booking.type === 'hotel' && booking.hotel?.images?.[0]) {
    return <img src={BASE_URL + booking.hotel.images[0]} alt={booking.hotel.name} className="w-full h-full object-cover" />;
  }
  if (booking.type === 'reservation' && booking.restaurant?.images?.[0]) {
    return <img src={BASE_URL + booking.restaurant.images[0]} alt="" className="w-full h-full object-cover" />;
  }
  if (booking.type === 'activity' && booking.activity?.images?.[0]) {
    return <img src={BASE_URL + booking.activity.images[0]} alt="" className="w-full h-full object-cover" />;
  }
  // Trip plan: show destination image if available
  if (booking.type === 'trip_plan' && booking.tripPlanDestination?.images?.[0]) {
    return (
      <div className="w-full h-full relative">
        <img src={BASE_URL + booking.tripPlanDestination.images[0]} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent flex items-end p-3">
          <span className="text-white text-xs font-bold flex items-center gap-1"><Package size={12} /> Trip Plan</span>
        </div>
      </div>
    );
  }
  const gradients = {
    flight:    'from-indigo-500 to-blue-600',
    reservation: 'from-orange-400 to-orange-600',
    activity:  'from-green-500 to-emerald-600',
    trip_plan: 'from-purple-500 to-indigo-600',
    hotel:     'from-blue-400 to-blue-600',
  };
  const Icons = { flight: Plane, reservation: Utensils, activity: Zap, trip_plan: Package, hotel: Hotel };
  const Ic = Icons[booking.type] || Package;
  return (
    <div className={'w-full h-full bg-gradient-to-br ' + (gradients[booking.type] || 'from-gray-400 to-gray-600') + ' flex items-center justify-center'}>
      <Ic className="h-20 w-20 text-white opacity-30" />
    </div>
  );
}

// ── Booking card details section ──────────────────────────────────────────────
function BookingDetails({ booking }) {
  const tc = typeConfig[booking.type] || typeConfig.hotel;

  if (booking.type === 'hotel') return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.hotel?.name || 'Hotel Booking'}</h3>
      <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm"><MapPin size={14} />{booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-400 text-xs">Check-in</p><p className="font-medium">{fmtDate(booking.checkIn)}</p></div>
        <div><p className="text-gray-400 text-xs">Check-out</p><p className="font-medium">{fmtDate(booking.checkOut)}</p></div>
        <div><p className="text-gray-400 text-xs">Room</p><p className="font-medium">{booking.roomType || '—'}</p></div>
        <div><p className="text-gray-400 text-xs">Guests</p><p className="font-medium flex items-center gap-1"><Users size={12} />{booking.guests || '—'}</p></div>
      </div>
    </>
  );

  if (booking.type === 'flight') return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.flight?.airline || 'Flight'} {booking.flight?.flightNumber || ''}</h3>
      <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm"><Plane size={14} />{booking.flight?.from || '-'} → {booking.flight?.to || '-'}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-400 text-xs">Departure</p><p className="font-medium">{fmtDate(booking.flight?.departureDate)}</p></div>
        <div><p className="text-gray-400 text-xs">Time</p><p className="font-medium">{booking.flight?.departureTime || '—'}</p></div>
        <div><p className="text-gray-400 text-xs">Passengers</p><p className="font-medium">{(booking.passengersCount?.adults || 0)}A, {(booking.passengersCount?.children || 0)}C</p></div>
        <div><p className="text-gray-400 text-xs">Class</p><p className="font-medium">{booking.flight?.class || '—'}</p></div>
      </div>
    </>
  );

  if (booking.type === 'reservation') return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.restaurant?.name || 'Table Reservation'}</h3>
      <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm"><Utensils size={14} />Table Reservation</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-400 text-xs">Date</p><p className="font-medium">{fmtDate(booking.reservationDate)}</p></div>
        <div><p className="text-gray-400 text-xs">Time</p><p className="font-medium">{booking.reservationTime || '—'}</p></div>
        <div><p className="text-gray-400 text-xs">People</p><p className="font-medium">{booking.tableSize || '—'}</p></div>
        <div><p className="text-gray-400 text-xs">Payment</p><p className="font-medium text-orange-600">At restaurant</p></div>
      </div>
    </>
  );

  if (booking.type === 'activity') return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.activity?.name || 'Activity Booking'}</h3>
      <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm"><Zap size={14} />{booking.activity?.category || 'Activity'}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-gray-400 text-xs">Date</p><p className="font-medium">{fmtDate(booking.activityDate)}</p></div>
        <div><p className="text-gray-400 text-xs">Guests</p><p className="font-medium">{booking.activityGuests || 1} people</p></div>
        {booking.activity?.duration && <div><p className="text-gray-400 text-xs">Duration</p><p className="font-medium">{booking.activity.duration}</p></div>}
      </div>
    </>
  );

  if (booking.type === 'trip_plan') return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.tripPlanName || 'Trip Plan'}</h3>
      <p className="text-gray-600 flex items-center gap-1.5 mb-3 text-sm"><Package size={14} />{booking.tripPlanDestination?.name || 'Custom Trip'}</p>
      <div className="space-y-1 text-sm">
        {booking.tripPlanItems?.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-gray-500 text-xs">
            {item.type === 'hotel'      && <><MapPin size={10} className="text-blue-500" />Hotel</>}
            {item.type === 'flight'     && <><Plane size={10} className="text-indigo-500" />Flight</>}
            {item.type === 'restaurant' && <><Utensils size={10} className="text-orange-500" />Restaurant</>}
            {item.type === 'activity'   && <><Zap size={10} className="text-green-500" />Activity</>}
            {item.amount > 0 && <span className="ml-auto">NPR {item.amount.toLocaleString()}</span>}
          </div>
        ))}
      </div>
    </>
  );

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
const MyBookings = () => {
  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showArchived,  setShowArchived]  = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showCancelModal,      setShowCancelModal]      = useState(false);
  const [pendingCancelBooking, setPendingCancelBooking] = useState(null);
  const [cancelling,           setCancelling]           = useState(false);
  const [showArchiveModal,     setShowArchiveModal]     = useState(false);
  const [pendingArchiveId,     setPendingArchiveId]     = useState(null);
  const [archiving,            setArchiving]            = useState(false);
  const [showUnarchiveModal,   setShowUnarchiveModal]   = useState(false);
  const [pendingUnarchiveId,   setPendingUnarchiveId]   = useState(null);
  const [unarchiving,          setUnarchiving]          = useState(false);
  const [payingId,             setPayingId]             = useState(null);

  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on('bookingUpdated',       u => setBookings(p => p.map(b => b._id === u._id ? { ...b, ...u } : b)));
    socket.on('bookingRefunded',      u => { setBookings(p => p.map(b => b._id === u._id ? { ...b, ...u } : b)); showToast('Refund of NPR ' + u.refundAmount?.toLocaleString() + ' processed.', 'success'); });
    socket.on('bookingRefundReviewed', u => {
      setBookings(p => p.map(b => b._id === u._id ? { ...b, ...u } : b));
      if (u.refundReviewStatus === 'admin_approved') showToast('Refund approved!', 'success');
      else showToast('Refund request rejected.', 'error');
    });
    return () => socket.disconnect();
  }, [showToast]);

  useEffect(() => { fetchBookings(); }, [showArchived]);

  async function fetchBookings() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      const res = await fetch(BASE_URL + '/api/bookings/my', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setBookings(await res.json());
    } catch (err) { setError(err.message); showToast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  async function handlePayNow(booking) {
    setPayingId(booking._id);
    try {
      const res = await fetch(BASE_URL + '/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ bookingId: booking._id, amount: booking.totalAmount }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg || 'Failed'); }
      window.location.href = (await res.json()).checkoutUrl;
    } catch (err) { showToast('Payment failed: ' + err.message, 'error'); setPayingId(null); }
  }

  async function confirmCancel(reason, note) {
    if (!pendingCancelBooking) return;
    setCancelling(true);
    const token  = localStorage.getItem('token');
    const isPaid = pendingCancelBooking.paymentStatus === 'completed';
    try {
      if (isPaid) {
        const res  = await fetch(BASE_URL + '/api/payments/stripe/refund/' + pendingCancelBooking._id, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ cancellationReason: reason, cancellationNote: note }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Refund failed');
        setBookings(p => p.map(b => b._id === pendingCancelBooking._id ? { ...b, ...data.booking } : b));
        if (data.autoRefunded)     showToast('Cancelled. NPR ' + data.amountRefunded?.toLocaleString() + ' refund processing.', 'success');
        else if (data.pendingReview) showToast('Cancelled. Refund sent for admin review.', 'info');
        else                       showToast('Cancelled. No refund applies.', 'info');
      } else {
        const res  = await fetch(BASE_URL + '/api/bookings/my/' + pendingCancelBooking._id + '/cancel', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ cancellationReason: reason, cancellationNote: note }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Cancel failed');
        setBookings(p => p.map(b => b._id === pendingCancelBooking._id ? { ...b, ...data.booking } : b));
        showToast('Booking cancelled.', 'success');
      }
    } catch (err) { showToast(err.message, 'error'); }
    finally { setShowCancelModal(false); setPendingCancelBooking(null); setCancelling(false); }
  }

  async function confirmArchive() {
    setArchiving(true);
    try {
      const res = await fetch(BASE_URL + '/api/bookings/my/' + pendingArchiveId + '/archive', { method: 'PATCH', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      if (!res.ok) throw new Error('Failed');
      setBookings(p => p.map(b => b._id === pendingArchiveId ? { ...b, isUserArchived: true } : b));
      showToast('Booking archived', 'success');
    } catch { showToast('Failed to archive', 'error'); }
    finally { setShowArchiveModal(false); setPendingArchiveId(null); setArchiving(false); }
  }

  async function confirmUnarchive() {
    setUnarchiving(true);
    try {
      const res = await fetch(BASE_URL + '/api/bookings/my/' + pendingUnarchiveId + '/unarchive', { method: 'PATCH', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
      if (!res.ok) throw new Error('Failed');
      setBookings(p => p.map(b => b._id === pendingUnarchiveId ? { ...b, isUserArchived: false } : b));
      showToast('Booking unarchived', 'success');
    } catch { showToast('Failed to unarchive', 'error'); }
    finally { setShowUnarchiveModal(false); setPendingUnarchiveId(null); setUnarchiving(false); }
  }

  const visibleBookings = showArchived
    ? bookings.filter(b => b.isUserArchived)
    : bookings.filter(b => !b.isUserArchived);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  if (error)   return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">{error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-lg text-gray-600 mt-2">Manage all your reservations and bookings</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
            <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="w-5 h-5 text-blue-600 rounded border-gray-300" />
            <span className="text-gray-700 font-medium">Show archived</span>
          </label>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-8" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">{showArchived ? 'No archived bookings' : 'No bookings yet'}</h3>
            <p className="text-gray-600 text-lg mb-8">{showArchived ? "You haven't archived any bookings yet." : 'Start exploring destinations!'}</p>
            {!showArchived && (
              <div className="flex gap-4 justify-center flex-wrap">
                <button onClick={() => navigate('/hotels')} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium shadow-md">Browse Hotels</button>
                <button onClick={() => navigate('/flights')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-medium shadow-md">Browse Flights</button>
                <button onClick={() => navigate('/destinations')} className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-medium shadow-md">Explore Destinations</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleBookings.map(booking => {
              const isRefunded  = booking.paymentStatus === 'refunded';
              const isCancelled = booking.status === 'cancelled';
              const isConfirmed = booking.status === 'confirmed';
              const showPayNow  = !isCancelled && booking.paymentStatus === 'pending' && booking.totalAmount > 0 && booking.type !== 'reservation';
              const showCancel  = !isCancelled;
              const tc          = typeConfig[booking.type] || typeConfig.hotel;

              return (
                <div key={booking._id} className={'bg-white rounded-2xl shadow-lg overflow-hidden border transition-all hover:shadow-xl ' + (booking.isUserArchived ? 'opacity-75' : '')}>
                  {/* Image */}
                  <div className="relative h-44 bg-gray-100">
                    <BookingCardImage booking={booking} />
                    {/* Status badges */}
                    <div className="absolute top-4 right-4">
                      <span className={'px-2.5 py-1 rounded-full text-xs font-semibold shadow ' + (isConfirmed ? 'bg-green-500 text-white' : isCancelled ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white')}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                    <div className="absolute top-4 left-4 flex gap-1.5">
                      <span className={'px-2.5 py-1 rounded-full text-xs font-semibold shadow ' + (booking.paymentStatus === 'completed' ? 'bg-blue-500 text-white' : booking.paymentStatus === 'refunded' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-white')}>
                        {booking.paymentStatus === 'completed' ? 'Paid' : booking.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
                      </span>
                      <span className={'px-2.5 py-1 rounded-full text-xs font-semibold shadow ' + tc.color}>{tc.label}</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <BookingDetails booking={booking} />

                    {/* Context messages */}
                    {booking.status === 'pending' && booking.paymentStatus === 'pending' && booking.type !== 'reservation' && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
                        Awaiting admin approval. You can pay now or wait.
                      </p>
                    )}
                    {isConfirmed && booking.paymentStatus === 'pending' && booking.type !== 'reservation' && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3">
                        Confirmed! Complete payment to secure your booking.
                      </p>
                    )}
                    {booking.type === 'reservation' && isConfirmed && (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3">
                        Your table is reserved. Pay at the restaurant.
                      </p>
                    )}

                    {booking.refundReviewStatus && booking.refundReviewStatus !== 'none' && (
                      <div className="mt-3"><RefundPill booking={booking} /></div>
                    )}

                    {/* Amount */}
                    <div className="pt-4 mt-4 border-t border-gray-100">
                      {booking.totalAmount > 0 ? (
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-500">Total</p>
                          <p className="text-xl font-bold text-blue-700">NPR {booking.totalAmount.toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-500">Cost</p>
                          <p className="text-lg font-bold text-green-600">Free (Pay at venue)</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {showPayNow && (
                          <button onClick={() => handlePayNow(booking)} disabled={payingId === booking._id}
                            className={'flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition shadow-sm ' + (payingId === booking._id ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                            {payingId === booking._id ? <><Loader2 size={13} className="animate-spin" />Redirecting...</> : <><CreditCard size={13} />Pay Now</>}
                          </button>
                        )}
                        {showCancel && (
                          <button onClick={() => { setPendingCancelBooking(booking); setShowCancelModal(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium bg-red-500 hover:bg-red-600 transition shadow-sm">
                            <X size={13} />{booking.paymentStatus === 'completed' ? 'Cancel & Refund' : 'Cancel'}
                          </button>
                        )}
                        {booking.isUserArchived ? (
                          <button onClick={() => { setPendingUnarchiveId(booking._id); setShowUnarchiveModal(true); }} disabled={unarchiving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium transition">
                            <RotateCcw size={13} />Unarchive
                          </button>
                        ) : (
                          (isConfirmed || isCancelled) && (
                            <button onClick={() => { setPendingArchiveId(booking._id); setShowArchiveModal(true); }} disabled={archiving}
                              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition">
                              <Archive size={13} />Archive
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCancelModal && pendingCancelBooking && (
        <CancelModal booking={pendingCancelBooking} onConfirm={confirmCancel} onClose={() => { setShowCancelModal(false); setPendingCancelBooking(null); }} cancelling={cancelling} />
      )}

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
              <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-600" /></button>
            </div>
            <div className="p-6"><p className="text-gray-700">Archive this booking? It will be hidden from your main list.</p></div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowArchiveModal(false)} disabled={archiving} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmArchive} disabled={archiving} className={'px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ' + (archiving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800')}>
                {archiving ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Unarchive Booking</h3>
              <button onClick={() => setShowUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={18} className="text-gray-600" /></button>
            </div>
            <div className="p-6"><p className="text-gray-700">Bring this booking back to your main list?</p></div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowUnarchiveModal(false)} disabled={unarchiving} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmUnarchive} disabled={unarchiving} className={'px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ' + (unarchiving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                {unarchiving ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;