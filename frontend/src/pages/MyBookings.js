// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import {
  Calendar,
  Users,
  MapPin,
  Plane,
  X,
  Loader2,
  Archive,
  RotateCcw,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { io } from 'socket.io-client';

const BASE_URL = "http://localhost:5000";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelBooking, setPendingCancelBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [pendingUnarchiveId, setPendingUnarchiveId] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  const [payingBookingId, setPayingBookingId] = useState(null);

  const cancellationReasons = [
    { value: 'change_of_plans', label: 'Change of plans' },
    { value: 'found_better_option', label: 'Found a better option' },
    { value: 'pricing_issue', label: 'Pricing issue' },
    { value: 'travel_dates_changed', label: 'Travel dates changed' },
    { value: 'booking_mistake', label: 'Booked by mistake' },
    { value: 'other', label: 'Other' },
  ];

  const getTravelDate = (booking) => {
    if (!booking) return null;
    const value = booking.type === 'hotel' ? booking.checkIn : booking.flight?.departureDate;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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

  const getRefundPreview = (booking) => {
    const percent = getRefundPercent(booking);
    const amount = ((booking?.totalAmount || 0) * percent) / 100;
    return { percent, amount };
  };

  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });

    socket.on('connect', () => console.log('Socket connected'));

    socket.on('newBooking', (newBooking) => {
      const userId = JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id;
      if (newBooking.user === userId || newBooking.user?._id === userId) {
        setBookings((prev) => [newBooking, ...prev]);
        showToast('New booking added!', 'success');
      }
    });

    socket.on('bookingUpdated', (updated) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b))
      );
      if (updated.paymentStatus === 'refunded') {
        showToast(
          `NPR ${updated.totalAmount.toLocaleString()} refunded. Booking cancelled.`,
          'success'
        );
      } else {
        showToast('Booking status updated', 'info');
      }
    });

    return () => socket.disconnect();
  }, [showToast]);

  useEffect(() => {
    fetchBookings();
  }, [showArchived]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const res = await fetch(`${BASE_URL}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to load bookings');
      }

      setBookings(await res.json());
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (booking) => {
    setPayingBookingId(booking._id);
    try {
      const res = await fetch(`${BASE_URL}/api/payments/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          bookingId: booking._id,
          amount: booking.totalAmount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.msg || 'Failed to initiate payment');
      }

      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      showToast('Payment initiation failed: ' + err.message, 'error');
    } finally {
      setPayingBookingId(null);
    }
  };

  const requestCancel = (booking) => {
    setPendingCancelBooking(booking);
    setCancelReason('');
    setCancelNote('');
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!pendingCancelBooking) return;
    if (!cancelReason) {
      showToast('Please select a cancellation reason', 'error');
      return;
    }
    setCancelling(true);

    try {
      let toastMessage = 'Booking cancelled successfully';
      const payload = {
        cancellationReason: cancelReason,
        cancellationNote: cancelNote.trim(),
      };

      if (pendingCancelBooking.paymentStatus === 'completed') {
        const refundRes = await fetch(
          `${BASE_URL}/api/payments/stripe/refund/${pendingCancelBooking._id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const refundData = await refundRes.json();
        if (!refundRes.ok) throw new Error(refundData.msg || 'Refund failed');
        toastMessage =
          refundData.amountRefunded > 0
            ? `NPR ${Number(refundData.amountRefunded).toLocaleString()} refunded. Booking cancelled successfully`
            : 'Booking cancelled. No refund applicable for this cancellation window.';
      } else {
        const cancelRes = await fetch(
          `${BASE_URL}/api/bookings/my/${pendingCancelBooking._id}/cancel`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (!cancelRes.ok) {
          const data = await cancelRes.json();
          throw new Error(data.message || 'Cancel failed');
        }
      }

      showToast(toastMessage, 'success');

      setBookings((prev) =>
        prev.map((b) =>
          b._id === pendingCancelBooking._id
            ? {
                ...b,
                status: 'cancelled',
                paymentStatus:
                  pendingCancelBooking.paymentStatus === 'completed'
                    ? getRefundPercent(pendingCancelBooking) > 0
                      ? 'refunded'
                      : b.paymentStatus
                    : b.paymentStatus,
                cancellationReason: cancelReason,
                cancellationNote: cancelNote.trim(),
              }
            : b
        )
      );
    } catch (err) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setShowCancelModal(false);
      setPendingCancelBooking(null);
      setCancelReason('');
      setCancelNote('');
      setCancelling(false);
    }
  };

  const requestArchive = (id) => {
    setPendingArchiveId(id);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingArchiveId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Archive failed');

      setBookings((prev) =>
        prev.map((b) => (b._id === pendingArchiveId ? { ...b, isUserArchived: true } : b))
      );
      showToast('Booking archived', 'success');
    } catch (err) {
      showToast('Failed to archive', 'error');
    } finally {
      setShowArchiveModal(false);
      setPendingArchiveId(null);
      setArchiving(false);
    }
  };

  const requestUnarchive = (id) => {
    setPendingUnarchiveId(id);
    setShowUnarchiveModal(true);
  };

  const confirmUnarchive = async () => {
    setUnarchiving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingUnarchiveId}/unarchive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Unarchive failed');

      setBookings((prev) =>
        prev.map((b) => (b._id === pendingUnarchiveId ? { ...b, isUserArchived: false } : b))
      );
      showToast('Booking unarchived', 'success');
    } catch (err) {
      showToast('Failed to unarchive', 'error');
    } finally {
      setShowUnarchiveModal(false);
      setPendingUnarchiveId(null);
      setUnarchiving(false);
    }
  };

  const visibleBookings = showArchived
    ? bookings.filter((b) => b.isUserArchived)
    : bookings.filter((b) => !b.isUserArchived);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

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
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived(!showArchived)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">Show archived bookings</span>
          </label>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-8" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              {showArchived ? "No archived bookings" : "No bookings yet"}
            </h3>
            <p className="text-gray-600 text-lg mb-8">
              {showArchived
                ? "You haven't archived any bookings yet."
                : "Start exploring hotels or flights and make your first reservation today!"}
            </p>
            {!showArchived && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate('/hotels')}
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition font-medium text-lg shadow-md"
                >
                  Browse Hotels
                </button>
                <button
                  onClick={() => navigate('/flights')}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition font-medium text-lg shadow-md"
                >
                  Browse Flights
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleBookings.map((booking) => (
              <div
                key={booking._id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden border transition-all duration-200 hover:shadow-xl ${
                  booking.isUserArchived ? 'opacity-75 bg-gray-50' : ''
                }`}
              >
                {/* Card Image */}
                <div className="relative h-48">
                  {booking.type === 'flight' ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                      <Plane className="h-24 w-24 text-white opacity-30" />
                    </div>
                  ) : (
                    <img
                      src={
                        booking.hotel?.images?.[0]
                          ? `${BASE_URL}${booking.hotel.images[0]}`
                          : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'
                      }
                      alt={booking.hotel?.name || 'Hotel'}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Booking status badge — top right */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm ${
                      booking.status === 'confirmed' ? 'bg-green-500 text-white' :
                      booking.status === 'cancelled' ? 'bg-red-500 text-white' :
                      'bg-yellow-500 text-white'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>

                  {/* Payment badge — top left */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                      booking.paymentStatus === 'completed' ? 'bg-blue-500 text-white' :
                      booking.paymentStatus === 'refunded'  ? 'bg-purple-500 text-white' :
                      booking.paymentStatus === 'failed'    ? 'bg-red-500 text-white' :
                      'bg-gray-800 text-white'
                    }`}>
                      {booking.paymentStatus === 'completed' ? 'Paid' :
                       booking.paymentStatus === 'refunded'  ? 'Refunded' :
                       booking.paymentStatus === 'failed'    ? 'Failed' :
                       'Unpaid'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Flight details */}
                  {booking.type === 'flight' ? (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {booking.flight?.airline || 'Flight Booking'} {booking.flight?.flightNumber || ''}
                      </h3>
                      <p className="text-gray-600 flex items-center gap-1.5 mb-4">
                        <MapPin className="h-4 w-4" />
                        {booking.flight?.from || '-'} → {booking.flight?.to || '-'}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div>
                          <p className="text-gray-500">Departure</p>
                          <p className="font-medium">{booking.flight?.departureTime || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Passengers</p>
                          <p className="font-medium flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {booking.passengersCount?.adults || 0}A,{' '}
                            {booking.passengersCount?.children || 0}C
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {booking.hotel?.name || 'Hotel Booking'}
                      </h3>
                      <p className="text-gray-600 flex items-center gap-1.5 mb-4">
                        <MapPin className="h-4 w-4" />
                        {booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div>
                          <p className="text-gray-500">Check-in</p>
                          <p className="font-medium">
                            {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Check-out</p>
                          <p className="font-medium">
                            {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Guests</p>
                          <p className="font-medium flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {booking.guests || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Room Type</p>
                          <p className="font-medium">{booking.roomType || '—'}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Amount & Actions */}
                  <div className="pt-5 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-700">
                          NPR {booking.totalAmount?.toLocaleString() || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">

                      {/* ✅ Pay Now — unpaid + not cancelled */}
                      {booking.paymentStatus === 'pending' && booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handlePayNow(booking)}
                          disabled={payingBookingId === booking._id}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition shadow-sm ${
                            payingBookingId === booking._id
                              ? 'bg-blue-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {payingBookingId === booking._id ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Redirecting...</>
                          ) : (
                            <><CreditCard className="h-4 w-4" />Pay Now</>
                          )}
                        </button>
                      )}

                      {/* ✅ Cancel — show for ALL non-cancelled bookings */}
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => requestCancel(booking)}
                          disabled={cancelling}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition shadow-sm ${
                            cancelling ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                          }`}
                        >
                          {cancelling ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
                          ) : (
                            <><X className="h-4 w-4" />Cancel</>
                          )}
                        </button>
                      )}

                      {/* Archive / Unarchive */}
                      {booking.isUserArchived ? (
                        <button
                          onClick={() => requestUnarchive(booking._id)}
                          disabled={unarchiving}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-60 transition text-sm font-medium"
                        >
                          {unarchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          Unarchive
                        </button>
                      ) : (
                        ['confirmed', 'cancelled'].includes(booking.status) && (
                          <button
                            onClick={() => requestArchive(booking._id)}
                            disabled={archiving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60 transition text-sm font-medium"
                          >
                            {archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                            Archive
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && pendingCancelBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <X className="h-6 w-6 text-red-600" />
                  Cancel Booking
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-gray-700 text-base">
                  Are you sure you want to cancel this booking?
                </p>

                {pendingCancelBooking.paymentStatus === 'completed' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    {(() => {
                      const { percent, amount } = getRefundPreview(pendingCancelBooking);
                      return (
                        <>
                          <p className="text-amber-800 font-medium text-lg">
                            Estimated refund:{' '}
                            <span className="font-bold">
                              NPR {amount.toLocaleString()} ({percent}%)
                            </span>
                          </p>
                          <p className="text-sm text-amber-700 mt-2">
                            Policy before {pendingCancelBooking.type === 'hotel' ? 'check-in' : 'departure'}: 7+ days = 100%, 3-6 days = 90%, 1-2 days = 70%, under 24h = 30%.
                          </p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <p className="text-gray-700">
                      This booking is not yet paid — no refund will be processed.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Cancellation reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a reason</option>
                    {cancellationReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Additional note (optional)
                  </label>
                  <textarea
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                    rows={3}
                    placeholder="Tell us anything else about why you are cancelling."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition font-medium"
                >
                  No, Keep Booking
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling || !cancelReason}
                  className={`px-6 py-3 text-white rounded-lg font-medium flex items-center gap-2 transition min-w-[160px] justify-center ${
                    cancelling || !cancelReason ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {cancelling ? (
                    <><Loader2 className="h-5 w-5 animate-spin" />Processing...</>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b">
                <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
                <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700">Are you sure you want to archive this booking?</p>
                <p className="mt-3 text-sm text-gray-600">
                  It will be hidden from your main list but can be viewed by enabling "Show archived bookings".
                </p>
              </div>
              <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
                <button
                  onClick={() => setShowArchiveModal(false)}
                  disabled={archiving}
                  className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  disabled={archiving}
                  className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                    archiving ? 'bg-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'
                  }`}
                >
                  {archiving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
                  Archive
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unarchive Confirmation Modal */}
        {showUnarchiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b">
                <h3 className="text-xl font-bold text-gray-900">Unarchive Booking</h3>
                <button onClick={() => setShowUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-700">Do you want to bring this booking back to your main list?</p>
                <p className="mt-3 text-sm text-gray-600">It will appear in your active bookings again.</p>
              </div>
              <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
                <button
                  onClick={() => setShowUnarchiveModal(false)}
                  disabled={unarchiving}
                  className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnarchive}
                  disabled={unarchiving}
                  className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                    unarchiving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {unarchiving ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                  Unarchive
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;