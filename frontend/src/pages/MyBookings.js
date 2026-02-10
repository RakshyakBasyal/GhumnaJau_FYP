// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import { Calendar, Users, IndianRupee, MapPin, X, Loader2, Archive } from 'lucide-react';
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

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
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
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [navigate]);

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to archive booking');
      }

      setBookings(prev =>
        prev.map(b =>
          b._id === pendingArchiveId ? { ...b, isUserArchived: true } : b
        )
      );

      showToast('Booking archived successfully', 'success');
    } catch (err) {
      showToast('Failed to archive: ' + err.message, 'error');
    } finally {
      setShowArchiveModal(false);
      setPendingArchiveId(null);
      setArchiving(false);
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setPendingArchiveId(null);
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel booking');
      }

      setBookings(prev =>
        prev.map(b =>
          b._id === pendingCancelId ? { ...b, status: 'cancelled' } : b
        )
      );

      showToast('Booking cancelled successfully', 'success');
    } catch (err) {
      showToast('Failed to cancel: ' + err.message, 'error');
    } finally {
      setShowCancelModal(false);
      setPendingCancelId(null);
      setCancelling(false);
    }
  };

  const cancelCancel = () => {
    setShowCancelModal(false);
    setPendingCancelId(null);
  };

  const visibleBookings = showArchived
    ? bookings
    : bookings.filter(b => !b.isUserArchived);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading your bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
            <p className="text-xl text-gray-600">
              View and manage your hotel reservations
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived(!showArchived)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="text-gray-700 font-medium">Show archived bookings</span>
          </label>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              {showArchived ? "No archived bookings" : "No bookings yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {showArchived
                ? "You haven't archived any bookings yet."
                : "Start exploring hotels and make your first reservation today!"}
            </p>
            {!showArchived && (
              <button
                onClick={() => navigate('/hotels')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Browse Hotels
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {visibleBookings.map((booking) => (
              <div
                key={booking._id}
                className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 ${
                  booking.status === 'cancelled' || booking.isUserArchived ? 'opacity-85 bg-gray-50' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-80 flex-shrink-0">
                    <img
                      src={
                        booking.hotel?.images?.[0]
                          ? `${BASE_URL}${booking.hotel.images[0]}`
                          : "https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg"
                      }
                      alt={booking.hotel?.name}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>

                  <div className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {booking.hotel?.name || 'Hotel Name'}
                        </h3>
                        <p className="text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="h-4 w-4" />
                          {booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Check-in</p>
                        <p className="font-medium">{new Date(booking.checkIn).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Check-out</p>
                        <p className="font-medium">{new Date(booking.checkOut).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Guests</p>
                        <p className="font-medium flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {booking.guests}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Room Type</p>
                        <p className="font-semibold">{booking.roomType}</p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-3">
                        <div>
                          <p className="text-sm text-gray-600">Total Amount</p>
                          <p className="text-2xl font-bold text-blue-600 flex items-center justify-end gap-1">
                            <IndianRupee className="h-5 w-5" />
                            {booking.totalAmount.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex gap-3">
                          {booking.status === 'pending' && (
                            <button
                              onClick={() => requestCancel(booking._id)}
                              disabled={cancelling}
                              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition ${
                                cancelling && pendingCancelId === booking._id
                                  ? 'bg-red-300 cursor-not-allowed text-white'
                                  : 'bg-red-100 hover:bg-red-200 text-red-700'
                              }`}
                            >
                              {cancelling && pendingCancelId === booking._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              Cancel
                            </button>
                          )}

                          {!booking.isUserArchived && (
                            <button
                              onClick={() => requestArchive(booking._id)}
                              disabled={archiving}
                              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition ${
                                archiving && pendingArchiveId === booking._id
                                  ? 'bg-gray-300 cursor-not-allowed text-gray-800'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              {archiving && pendingArchiveId === booking._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                              Archive
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
                <button onClick={cancelArchive} className="p-1 rounded-full hover:bg-gray-100">
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

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={cancelArchive}
                  disabled={archiving}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  disabled={archiving}
                  className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 ${
                    archiving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  {archiving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Archive Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">Cancel Booking</h3>
                <button onClick={cancelCancel} className="p-1 rounded-full hover:bg-gray-100">
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

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  onClick={cancelCancel}
                  disabled={cancelling}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  No, Keep It
                </button>
                <button
                  onClick={confirmCancel}
                  disabled={cancelling}
                  className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 ${
                    cancelling ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {cancelling ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Yes, Cancel Booking'
                  )}
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