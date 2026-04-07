// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import {
  Calendar, Users, MapPin, Plane, X, Loader2, Archive,
  RotateCcw, CreditCard, Clock, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

// Must match backend PREDEFINED_REASONS (auto-refund triggers)
const AUTO_REFUND_REASONS = [
  'Booking mistake',
  'Change of plans',
  'Found a better deal',
  'Duplicate booking',
  'Medical emergency',
  'Weather or natural issues',
];

const CANCELLATION_OPTIONS = [
  { value: 'Booking mistake',           isCustom: false },
  { value: 'Change of plans',           isCustom: false },
  { value: 'Found a better deal',       isCustom: false },
  { value: 'Duplicate booking',         isCustom: false },
  { value: 'Medical emergency',         isCustom: false },
  { value: 'Weather or natural issues', isCustom: false },
  { value: 'Other',                     label: 'Other / Custom reason', isCustom: true },
];

// ── helpers ───────────────────────────────────────────────────────────────────
const getTravelDate = (booking) => {
  const value = booking.type === 'hotel' ? booking.checkIn : booking.flight?.departureDate;
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getRefundPercent = (booking) => {
  if (!booking || booking.paymentStatus !== 'completed') return 0;
  const travelDate = getTravelDate(booking);
  if (!travelDate) return 0;
  const diffDays = (travelDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (diffDays >= 7) return 100;
  if (diffDays >= 3) return 90;
  if (diffDays >= 1) return 70;
  return 30;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Refund status pill shown on card ─────────────────────────────────────────
const RefundPill = ({ booking }) => {
  const s = booking.refundReviewStatus;
  if (!s || s === 'none') return null;

  const cfg = {
    pending_review: { cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="h-3 w-3" />, label: 'Refund under admin review' },
    auto_approved:  { cls: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-3 w-3" />, label: booking.refundAmount > 0 ? `Refund processed — NPR ${booking.refundAmount.toLocaleString()}` : 'No refund (outside window)' },
    admin_approved: { cls: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-3 w-3" />, label: `Refund approved — NPR ${booking.refundAmount.toLocaleString()}` },
    admin_rejected: { cls: 'bg-red-100 text-red-800 border-red-200',       icon: <X className="h-3 w-3" />,            label: 'Refund rejected by admin' },
  }[s];

  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

// ── Cancel Modal ──────────────────────────────────────────────────────────────
const CancelModal = ({ booking, onConfirm, onClose, cancelling }) => {
  const isPaid = booking?.paymentStatus === 'completed';
  const [selected, setSelected]     = useState('');
  const [customText, setCustomText] = useState('');
  const [note, setNote]             = useState('');

  const isOther         = selected === 'Other';
  const effectiveReason = isOther ? customText.trim() : selected;
  const isValid         = isOther ? customText.trim().length >= 5 : Boolean(selected);
  const willAutoRefund  = isPaid && !isOther && AUTO_REFUND_REASONS.includes(selected);

  const refundPercent = getRefundPercent(booking);
  const refundAmount  = ((booking?.totalAmount || 0) * refundPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">Cancel Booking</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Paid: show refund estimate */}
          {isPaid && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-semibold text-base">
                Estimated refund: NPR {refundAmount.toLocaleString()} ({refundPercent}%)
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Policy before {booking.type === 'hotel' ? 'check-in' : 'departure'}:
                7+ days = 100% · 3–6 days = 90% · 1–2 days = 70% · under 24h = 30%
              </p>
            </div>
          )}

          {/* Unpaid: no refund */}
          {!isPaid && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-gray-600 text-sm">This booking is unpaid — no refund will be processed.</p>
            </div>
          )}

          {/* Reason list */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">
              Reason for cancellation <span className="text-red-500">*</span>
            </p>
            <div className="space-y-2.5">
              {CANCELLATION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={opt.value}
                    checked={selected === opt.value}
                    onChange={() => { setSelected(opt.value); if (!opt.isCustom) setCustomText(''); }}
                    className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 shrink-0"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {opt.label || opt.value}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom textarea — appears only when "Other" is selected */}
            {isOther && (
              <div className="mt-3 pl-7">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={3}
                  placeholder="Please describe your reason (at least 5 characters)..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                {isPaid && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Custom reasons require admin review before a refund is issued.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Additional note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Any extra details..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Refund path hint */}
          {isPaid && isValid && (
            <div className={`rounded-xl p-3 text-sm border ${
              willAutoRefund
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {willAutoRefund
                ? '✓ Your refund will be processed automatically to your original payment method.'
                : '⏳ Your refund request will be sent to the admin team for review before processing.'}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition font-medium"
          >
            Keep Booking
          </button>
          <button
            onClick={() => onConfirm(effectiveReason, note.trim())}
            disabled={cancelling || !isValid}
            className={`px-6 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 transition min-w-[160px] justify-center ${
              cancelling || !isValid ? 'bg-red-300 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {cancelling
              ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
              : 'Yes, Cancel Booking'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const MyBookings = () => {
  const [bookings, setBookings]                         = useState([]);
  const [loading, setLoading]                           = useState(true);
  const [error, setError]                               = useState(null);
  const [showArchived, setShowArchived]                 = useState(false);
  const navigate                                        = useNavigate();
  const { showToast }                                   = useToast();

  const [showCancelModal, setShowCancelModal]           = useState(false);
  const [pendingCancelBooking, setPendingCancelBooking] = useState(null);
  const [cancelling, setCancelling]                     = useState(false);

  const [showArchiveModal, setShowArchiveModal]         = useState(false);
  const [pendingArchiveId, setPendingArchiveId]         = useState(null);
  const [archiving, setArchiving]                       = useState(false);

  const [showUnarchiveModal, setShowUnarchiveModal]     = useState(false);
  const [pendingUnarchiveId, setPendingUnarchiveId]     = useState(null);
  const [unarchiving, setUnarchiving]                   = useState(false);

  const [payingBookingId, setPayingBookingId]           = useState(null);

  // ── socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on('bookingUpdated', (u) => {
      setBookings((p) => p.map((b) => b._id === u._id ? { ...b, ...u } : b));
    });
    socket.on('bookingRefunded', (u) => {
      setBookings((p) => p.map((b) => b._id === u._id ? { ...b, ...u } : b));
      showToast(`Refund of NPR ${u.refundAmount?.toLocaleString()} processed.`, 'success');
    });
    socket.on('bookingRefundReviewed', (u) => {
      setBookings((p) => p.map((b) => b._id === u._id ? { ...b, ...u } : b));
      if (u.refundReviewStatus === 'admin_approved')
        showToast(`Refund of NPR ${u.refundAmount?.toLocaleString()} approved!`, 'success');
      else
        showToast('Your refund request was rejected by admin.', 'error');
    });
    return () => socket.disconnect();
  }, [showToast]);

  // ── fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => { fetchBookings(); }, [showArchived]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      const res = await fetch(`${BASE_URL}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      setBookings(await res.json());
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Pay Now ──────────────────────────────────────────────────────────────────
  const handlePayNow = async (booking) => {
    setPayingBookingId(booking._id);
    try {
      const res = await fetch(`${BASE_URL}/api/payments/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ bookingId: booking._id, amount: booking.totalAmount }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.msg || 'Failed'); }
      window.location.href = (await res.json()).checkoutUrl;
    } catch (err) {
      showToast('Payment failed: ' + err.message, 'error');
      setPayingBookingId(null);
    }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────────
  const requestCancel = (booking) => { setPendingCancelBooking(booking); setShowCancelModal(true); };

  const confirmCancel = async (reason, note) => {
    if (!pendingCancelBooking) return;
    setCancelling(true);
    const token  = localStorage.getItem('token');
    const isPaid = pendingCancelBooking.paymentStatus === 'completed';
    try {
      if (isPaid) {
        const res  = await fetch(`${BASE_URL}/api/payments/stripe/refund/${pendingCancelBooking._id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cancellationReason: reason, cancellationNote: note }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Refund failed');
        setBookings((p) => p.map((b) => b._id === pendingCancelBooking._id ? { ...b, ...data.booking } : b));
        if (data.autoRefunded)    showToast(`Cancelled. NPR ${data.amountRefunded?.toLocaleString()} refund processing.`, 'success');
        else if (data.pendingReview) showToast('Cancelled. Refund request sent for admin review.', 'info');
        else                      showToast('Cancelled. No refund applies for this window.', 'info');
      } else {
        const res  = await fetch(`${BASE_URL}/api/bookings/my/${pendingCancelBooking._id}/cancel`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cancellationReason: reason, cancellationNote: note }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Cancel failed');
        setBookings((p) => p.map((b) => b._id === pendingCancelBooking._id ? { ...b, ...data.booking } : b));
        showToast('Booking cancelled.', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setShowCancelModal(false);
      setPendingCancelBooking(null);
      setCancelling(false);
    }
  };

  // ── Archive ──────────────────────────────────────────────────────────────────
  const requestArchive   = (id) => { setPendingArchiveId(id);   setShowArchiveModal(true); };
  const requestUnarchive = (id) => { setPendingUnarchiveId(id); setShowUnarchiveModal(true); };

  const confirmArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingArchiveId}/archive`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed');
      setBookings((p) => p.map((b) => b._id === pendingArchiveId ? { ...b, isUserArchived: true } : b));
      showToast('Booking archived', 'success');
    } catch { showToast('Failed to archive', 'error'); }
    finally { setShowArchiveModal(false); setPendingArchiveId(null); setArchiving(false); }
  };

  const confirmUnarchive = async () => {
    setUnarchiving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingUnarchiveId}/unarchive`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Failed');
      setBookings((p) => p.map((b) => b._id === pendingUnarchiveId ? { ...b, isUserArchived: false } : b));
      showToast('Booking unarchived', 'success');
    } catch { showToast('Failed to unarchive', 'error'); }
    finally { setShowUnarchiveModal(false); setPendingUnarchiveId(null); setUnarchiving(false); }
  };

  const visibleBookings = showArchived
    ? bookings.filter((b) => b.isUserArchived)
    : bookings.filter((b) => !b.isUserArchived);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /></div>;
  if (error)   return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="bg-white rounded-2xl p-10 text-center max-w-md"><p className="text-xl font-bold text-gray-900 mb-2">Error</p><p className="text-gray-600">{error}</p></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-lg text-gray-600 mt-2">Manage your hotel & flight reservations</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
            <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
            <span className="text-gray-700 font-medium">Show archived bookings</span>
          </label>
        </div>

        {/* Empty */}
        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-8" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">{showArchived ? 'No archived bookings' : 'No bookings yet'}</h3>
            <p className="text-gray-600 text-lg mb-8">{showArchived ? "You haven't archived any bookings yet." : 'Start exploring hotels or flights!'}</p>
            {!showArchived && (
              <div className="flex gap-4 justify-center">
                <button onClick={() => navigate('/hotels')} className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-medium text-lg shadow-md">Browse Hotels</button>
                <button onClick={() => navigate('/flights')} className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition font-medium text-lg shadow-md">Browse Flights</button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleBookings.map((booking) => {
              const isRefunded  = booking.paymentStatus === 'refunded';
              const isCancelled = booking.status === 'cancelled';
              const isConfirmed = booking.status === 'confirmed';
              const isPending   = booking.status === 'pending';
              const showPayNow  = !isCancelled && booking.paymentStatus === 'pending';
              const showCancel  = !isCancelled;

              // Stable hotel image — use booking._id as key on the img to prevent cross-card bleed
              const hotelImg = booking.hotel?.images?.[0]
                ? `${BASE_URL}${booking.hotel.images[0]}`
                : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg';

              return (
                <div key={`booking-card-${booking._id}`} className={`bg-white rounded-2xl shadow-lg overflow-hidden border transition-all duration-200 hover:shadow-xl ${booking.isUserArchived ? 'opacity-75' : ''}`}>

                  {/* Card image */}
                  <div className="relative h-48 bg-gray-100">
                    {booking.type === 'flight' ? (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                        <Plane className="h-24 w-24 text-white opacity-30" />
                      </div>
                    ) : (
                      <img
                        src={hotelImg}
                        alt={booking.hotel?.name || 'Hotel'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Booking status */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${isConfirmed ? 'bg-green-500 text-white' : isCancelled ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>

                    {/* Payment status */}
                    <div className="absolute top-4 left-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        booking.paymentStatus === 'completed' ? 'bg-blue-500 text-white' :
                        booking.paymentStatus === 'refunded'  ? 'bg-purple-500 text-white' :
                        booking.paymentStatus === 'failed'    ? 'bg-red-500 text-white' :
                        'bg-gray-800 text-white'
                      }`}>
                        {booking.paymentStatus === 'completed' ? 'Paid' :
                         booking.paymentStatus === 'refunded'  ? 'Refunded' :
                         booking.paymentStatus === 'failed'    ? 'Failed' : 'Unpaid'}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Flight */}
                    {booking.type === 'flight' ? (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.flight?.airline || 'Flight'} {booking.flight?.flightNumber || ''}</h3>
                        <p className="text-gray-600 flex items-center gap-1.5 mb-4"><MapPin className="h-4 w-4" />{booking.flight?.from || '-'} → {booking.flight?.to || '-'}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div><p className="text-gray-500">Departure</p><p className="font-medium">{booking.flight?.departureTime || '-'}</p></div>
                          <div><p className="text-gray-500">Passengers</p><p className="font-medium flex items-center gap-1"><Users className="h-4 w-4" />{booking.passengersCount?.adults || 0}A, {booking.passengersCount?.children || 0}C</p></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{booking.hotel?.name || 'Hotel Booking'}</h3>
                        <p className="text-gray-600 flex items-center gap-1.5 mb-4"><MapPin className="h-4 w-4" />{booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}</p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div><p className="text-gray-500">Check-in</p><p className="font-medium">{fmtDate(booking.checkIn)}</p></div>
                          <div><p className="text-gray-500">Check-out</p><p className="font-medium">{fmtDate(booking.checkOut)}</p></div>
                          <div><p className="text-gray-500">Guests</p><p className="font-medium flex items-center gap-1"><Users className="h-4 w-4" />{booking.guests || '—'}</p></div>
                          <div><p className="text-gray-500">Room</p><p className="font-medium">{booking.roomType || '—'}</p></div>
                        </div>
                      </>
                    )}

                    {/* Context messages */}
                    {isPending && booking.paymentStatus === 'pending' && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                        Awaiting admin approval. Pay now to skip the queue, or wait and pay after approval.
                      </p>
                    )}
                    {isConfirmed && booking.paymentStatus === 'pending' && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
                        Booking confirmed by admin! Complete your payment to secure your spot.
                      </p>
                    )}

                    {/* Refund review pill */}
                    {booking.refundReviewStatus && booking.refundReviewStatus !== 'none' && (
                      <div className="mb-4 space-y-1">
                        <RefundPill booking={booking} />
                        {booking.refundReviewStatus === 'admin_rejected' && booking.adminRefundNote && (
                          <p className="text-xs text-gray-500 italic pl-1">Admin note: "{booking.adminRefundNote}"</p>
                        )}
                      </div>
                    )}

                    {/* Amount / refund breakdown */}
                    <div className="pt-5 border-t border-gray-200">
                      {isRefunded ? (
                        <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Amount paid</span>
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                              <span className="text-[10px]">NPR</span>{booking.totalAmount?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-700 font-medium">Refunded ({booking.refundPercent}%)</span>
                            <span className="text-base font-bold text-purple-700 flex items-center gap-1">
                              <span className="text-xs">NPR</span>{booking.refundAmount?.toLocaleString()}
                            </span>
                          </div>
                          {booking.refundAmount < booking.totalAmount && (
                            <div className="flex items-center justify-between pt-2 border-t border-purple-200">
                              <span className="text-xs text-gray-400">Net charged</span>
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                <span className="text-[9px]">NPR</span>{(booking.totalAmount - booking.refundAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-2xl font-bold text-blue-700 flex items-center gap-1">
                              <span className="text-sm font-medium">NPR</span>{booking.totalAmount?.toLocaleString() || '—'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3">
                        {showPayNow && (
                          <button
                            onClick={() => handlePayNow(booking)}
                            disabled={payingBookingId === booking._id}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition shadow-sm ${payingBookingId === booking._id ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {payingBookingId === booking._id
                              ? <><Loader2 className="h-4 w-4 animate-spin" />Redirecting...</>
                              : <><CreditCard className="h-4 w-4" />Pay Now</>}
                          </button>
                        )}

                        {showCancel && (
                          <button
                            onClick={() => requestCancel(booking)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium bg-red-500 hover:bg-red-600 transition shadow-sm"
                          >
                            <X className="h-4 w-4" />
                            {booking.paymentStatus === 'completed' ? 'Cancel & Refund' : 'Cancel'}
                          </button>
                        )}

                        {booking.isUserArchived ? (
                          <button onClick={() => requestUnarchive(booking._id)} disabled={unarchiving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition text-sm font-medium">
                            <RotateCcw className="h-4 w-4" />Unarchive
                          </button>
                        ) : (
                          (isConfirmed || isCancelled) && (
                            <button onClick={() => requestArchive(booking._id)} disabled={archiving} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60 transition text-sm font-medium">
                              <Archive className="h-4 w-4" />Archive
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

      {/* Cancel Modal */}
      {showCancelModal && pendingCancelBooking && (
        <CancelModal booking={pendingCancelBooking} onConfirm={confirmCancel} onClose={() => { setShowCancelModal(false); setPendingCancelBooking(null); }} cancelling={cancelling} />
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
              <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6"><p className="text-gray-700">Archive this booking? It will be hidden from your main list.</p></div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowArchiveModal(false)} disabled={archiving} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmArchive} disabled={archiving} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${archiving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'}`}>
                {archiving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Modal */}
      {showUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Unarchive Booking</h3>
              <button onClick={() => setShowUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6"><p className="text-gray-700">Bring this booking back to your main list?</p></div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowUnarchiveModal(false)} disabled={unarchiving} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmUnarchive} disabled={unarchiving} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${unarchiving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {unarchiving ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
