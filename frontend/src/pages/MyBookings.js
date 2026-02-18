// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import { Calendar, Users, IndianRupee, MapPin, X, Loader2, Archive, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const BASE_URL = "http://localhost:5000";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Archive modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Unarchive modal
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [pendingUnarchiveId, setPendingUnarchiveId] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [showArchived]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await fetch(`${BASE_URL}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to load bookings');
      }

      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const requestArchive = (bookingId) => {
    setPendingArchiveId(bookingId);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!pendingArchiveId) return;
    setArchiving(true);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingArchiveId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Failed to archive');

      setBookings(prev =>
        prev.map(b => b._id === pendingArchiveId ? { ...b, isUserArchived: true } : b)
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

  const requestUnarchive = (bookingId) => {
    setPendingUnarchiveId(bookingId);
    setShowUnarchiveModal(true);
  };

  const confirmUnarchive = async () => {
    if (!pendingUnarchiveId) return;
    setUnarchiving(true);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingUnarchiveId}/unarchive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Failed to unarchive');

      setBookings(prev =>
        prev.map(b => b._id === pendingUnarchiveId ? { ...b, isUserArchived: false } : b)
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

  const requestCancel = (bookingId) => {
    setPendingCancelId(bookingId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!pendingCancelId) return;
    setCancelling(true);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/${pendingCancelId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) throw new Error('Failed to cancel');

      setBookings(prev =>
        prev.map(b => b._id === pendingCancelId ? { ...b, status: 'cancelled' } : b)
      );

      showToast('Booking cancelled', 'success');
    } catch (err) {
      showToast('Failed to cancel', 'error');
    } finally {
      setShowCancelModal(false);
      setPendingCancelId(null);
      setCancelling(false);
    }
  };

 
  const visibleBookings = showArchived
    ? bookings.filter(b => b.isUserArchived === true)     // ONLY archived when checked
    : bookings.filter(b => b.isUserArchived === false);   // ONLY non-archived when unchecked

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-lg text-gray-600 mt-2">Manage your hotel reservations</p>
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
                : "Start exploring hotels and make your first reservation today!"}
            </p>
            {!showArchived && (
              <button
                onClick={() => navigate('/hotels')}
                className="bg-blue-600 text-white px-10 py-4 rounded-xl hover:bg-blue-700 transition font-medium text-lg shadow-md"
              >
                Browse Hotels
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleBookings.map(booking => (
              <div
                key={booking._id}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden border transition-all duration-200 hover:shadow-xl ${
                  booking.isUserArchived ? 'opacity-75 bg-gray-50' : ''
                }`}
              >
                <div className="relative h-48">
                  <img
                    src={booking.hotel?.images?.[0] ? `${BASE_URL}${booking.hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
                    alt={booking.hotel?.name || 'Hotel'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium shadow-sm ${
                      booking.status === 'confirmed' ? 'bg-green-500 text-white' :
                      booking.status === 'cancelled' ? 'bg-red-500 text-white' :
                      booking.status === 'pending' ? 'bg-yellow-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
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
                      <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-out</p>
                      <p className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Guests</p>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.guests}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Room Type</p>
                      <p className="font-medium">{booking.roomType}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-xl font-bold text-blue-600">
                        NPR {booking.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => requestCancel(booking._id)}
                          disabled={cancelling}
                          className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          {cancelling && pendingCancelId === booking._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                          Cancel
                        </button>
                      )}

                      {booking.isUserArchived ? (
                        <button
                          onClick={() => requestUnarchive(booking._id)}
                          disabled={unarchiving}
                          className="flex items-center gap-2 px-5 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition"
                        >
                          {unarchiving && pendingUnarchiveId === booking._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          Unarchive
                        </button>
                      ) : (
                        ['confirmed', 'cancelled'].includes(booking.status) && (
                          <button
                            onClick={() => requestArchive(booking._id)}
                            disabled={archiving}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                          >
                            {archiving && pendingArchiveId === booking._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
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
                <p className="text-gray-700">
                  Are you sure you want to archive this booking?
                </p>
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
                <p className="text-gray-700">
                  Do you want to bring this booking back to your main list?
                </p>
                <p className="mt-3 text-sm text-gray-600">
                  It will appear in your active bookings again.
                </p>
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

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b">
                <h3 className="text-xl font-bold text-gray-900">Cancel Booking</h3>
                <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700">
                  Are you sure you want to cancel this pending booking?
                </p>
                <p className="mt-3 text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
                >
                  No, Keep It
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                    cancelling ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {cancelling ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
                  Yes, Cancel
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