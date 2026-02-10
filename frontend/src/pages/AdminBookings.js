// frontend/src/pages/AdminBookings.jsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Calendar, IndianRupee, MapPin, X, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const BASE_URL = "http://localhost:5000";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Confirmation modal for archive all completed
  const [showClearModal, setShowClearModal] = useState(false);

  // Confirmation modal for individual status change
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState(null);

  const { showToast } = useToast();

  // Re-fetch bookings when showArchived changes
  useEffect(() => {
    fetchBookings();
  }, [showArchived]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not logged in');

      // Add query param when showing archived
      const url = `${BASE_URL}/api/bookings${showArchived ? '?includeArchived=true' : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Failed to load bookings');
      }

      const data = await res.json();
      setBookings(data);
    } catch (err) {
      setError(err.message);
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const requestStatusUpdate = (bookingId, newStatus) => {
    setPendingStatusAction({ bookingId, newStatus });
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatusAction) return;

    const { bookingId, newStatus } = pendingStatusAction;
    setUpdating(true);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Failed to update status');
      }

      setBookings(prev =>
        prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b)
      );

      showToast(`Booking ${newStatus} successfully!`, 'success');
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      setShowStatusModal(false);
      setPendingStatusAction(null);
      setUpdating(false);
    }
  };

  const cancelStatusUpdate = () => {
    setShowStatusModal(false);
    setPendingStatusAction(null);
  };

  const handleArchiveCompleted = () => {
    const completedCount = bookings.filter(b => b.status !== 'pending').length;
    if (completedCount === 0) {
      showToast('No completed bookings to archive', 'info');
      return;
    }
    setShowClearModal(true);
  };

  const confirmArchiveCompleted = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/clear-completed`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to archive bookings');
      }

      const data = await res.json();
      showToast(data.message || 'Completed bookings archived successfully', 'success');

      fetchBookings();
    } catch (err) {
      showToast('Failed to archive: ' + err.message, 'error');
    } finally {
      setShowClearModal(false);
      setClearing(false);
    }
  };

  if (loading) return <p className="text-center py-20 text-lg">Loading all bookings...</p>;
  if (error) return <p className="text-center py-20 text-red-600 text-lg">{error}</p>;

  const hasCompletedBookings = bookings.some(b => b.status !== 'pending' && !b.isArchived);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">All Bookings</h1>
            <p className="text-xl text-gray-600">
              View and manage every user hotel reservation
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-gray-700 font-medium">Show archived bookings</span>
            </label>

            {hasCompletedBookings && (
              <button
                onClick={handleArchiveCompleted}
                disabled={clearing}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 shadow-sm whitespace-nowrap"
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-5 w-5" />
                    Archive Completed Bookings
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              No {showArchived ? 'archived ' : 'active '}bookings found
            </h3>
            <p className="text-gray-600">
              {showArchived
                ? 'No archived bookings at the moment.'
                : 'No active hotel bookings at the moment.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hotel</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Destination</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Dates</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user?.fullName || 'Unknown User'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.hotel?.name || 'Hotel'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(booking.checkIn).toLocaleDateString()} -{' '}
                          {new Date(booking.checkOut).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600 flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {booking.totalAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                        {booking.status === 'pending' && (
                          <div className="flex gap-4">
                            <button
                              onClick={() => requestStatusUpdate(booking._id, 'confirmed')}
                              disabled={updating}
                              className="text-green-600 hover:text-green-800 transition"
                              title="Confirm Booking"
                            >
                              {updating ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle className="h-6 w-6" />}
                            </button>
                            <button
                              onClick={() => requestStatusUpdate(booking._id, 'cancelled')}
                              disabled={updating}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Cancel Booking"
                            >
                              {updating ? <Loader2 className="h-6 w-6 animate-spin" /> : <XCircle className="h-6 w-6" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status Change Confirmation Modal */}
      {showStatusModal && pendingStatusAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingStatusAction.newStatus === 'confirmed' ? 'Confirm Booking' : 'Cancel Booking'}
              </h3>
              <button onClick={cancelStatusUpdate} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to {pendingStatusAction.newStatus} this booking?
              </p>
              {pendingStatusAction.newStatus === 'cancelled' && (
                <p className="mt-2 text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={cancelStatusUpdate}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                className={`px-5 py-2 text-white rounded-lg ${
                  pendingStatusAction.newStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingStatusAction.newStatus === 'confirmed' ? 'Confirm' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Completed Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">Archive Completed Bookings</h3>
              <button onClick={() => setShowClearModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                This will archive all <strong>confirmed</strong> and <strong>cancelled</strong> bookings.
              </p>
              <p className="mt-3 text-red-600 font-medium">
                Pending bookings will NOT be affected. Archived bookings will be hidden from admin view but remain in user history.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveCompleted}
                disabled={clearing}
                className={`px-5 py-2 text-white rounded-lg flex items-center gap-2 ${
                  clearing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  'Archive Completed'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;