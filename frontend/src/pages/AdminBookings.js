// // // // // frontend/src/pages/AdminBookings.jsx
import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Calendar,
  IndianRupee,
  MapPin,
  X,
  Loader2,
  Trash2,
  Archive,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AdminNavbar from '../components/AdminNavbar';
import { io } from 'socket.io-client';

const BASE_URL = "http://localhost:5000";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState(null);
  const [showBulkUnarchiveModal, setShowBulkUnarchiveModal] = useState(false);
  const [showSingleArchiveModal, setShowSingleArchiveModal] = useState(false);
  const [pendingSingleArchiveId, setPendingSingleArchiveId] = useState(null);
  const [showSingleUnarchiveModal, setShowSingleUnarchiveModal] = useState(false);
  const [pendingSingleUnarchiveId, setPendingSingleUnarchiveId] = useState(null);

  const { showToast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not logged in');

      const url = `${BASE_URL}/api/bookings${showArchived ? '?includeArchived=true' : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `Failed to load bookings (${res.status})`);
      }

      const data = await res.json();
      setBookings(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Bookings fetch error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [showArchived, showToast]);

  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });

    socket.on('connect', () => console.log('AdminBookings socket connected'));

    socket.on('newBooking', (newBooking) => {
      setBookings(prev => [newBooking, ...prev]);
      showToast('New booking received!', 'success');
    });

    socket.on('bookingUpdated', (updated) => {
      setBookings(prev => prev.map(b => b._id === updated._id ? { ...b, ...updated } : b));
      showToast(`Booking updated to ${updated.status}`, 'info');
    });

    socket.on('bookingCancelled', (cancelled) => {
      setBookings(prev => prev.map(b => b._id === cancelled._id ? { ...b, ...cancelled } : b));
      showToast('A booking was cancelled by user', 'warning');
    });

    socket.on('bookingRefunded', (refunded) => {
      setBookings(prev => prev.map(b => b._id === refunded._id ? { ...b, ...refunded } : b));
      showToast('A booking was cancelled by user and refunded', 'warning');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      showToast('Live updates disconnected – refresh page', 'error');
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings, showArchived]);

  const paymentBadge = (paymentStatus) => {
    const map = {
      completed: 'bg-blue-100 text-blue-800',
      refunded:  'bg-purple-100 text-purple-800',
      failed:    'bg-red-100 text-red-800',
      pending:   'bg-gray-100 text-gray-600',
    };
    const label = {
      completed: 'Paid',
      refunded:  'Refunded',
      failed:    'Failed',
      pending:   'Unpaid',
    };
    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${map[paymentStatus] || map.pending}`}>
        {label[paymentStatus] || 'Unpaid'}
      </span>
    );
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
        throw new Error(data.message || 'Failed to update status');
      }

      showToast(
        newStatus === 'confirmed'
          ? 'Booking confirmed successfully!'
          : 'Booking cancelled successfully!',
        'success'
      );
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      setShowStatusModal(false);
      setPendingStatusAction(null);
      setUpdating(false);
    }
  };

  const requestSingleArchive = (bookingId) => {
    setPendingSingleArchiveId(bookingId);
    setShowSingleArchiveModal(true);
  };

  const confirmSingleArchive = async () => {
    if (!pendingSingleArchiveId) return;
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${pendingSingleArchiveId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to archive');
      }
      showToast('Booking archived', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Failed to archive: ' + err.message, 'error');
    } finally {
      setShowSingleArchiveModal(false);
      setPendingSingleArchiveId(null);
      setClearing(false);
    }
  };

  const requestSingleUnarchive = (bookingId) => {
    setPendingSingleUnarchiveId(bookingId);
    setShowSingleUnarchiveModal(true);
  };

  const confirmSingleUnarchive = async () => {
    if (!pendingSingleUnarchiveId) return;
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${pendingSingleUnarchiveId}/unarchive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to unarchive');
      }
      showToast('Booking unarchived', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Failed to unarchive: ' + err.message, 'error');
    } finally {
      setShowSingleUnarchiveModal(false);
      setPendingSingleUnarchiveId(null);
      setClearing(false);
    }
  };

  const handleArchiveCompleted = () => {
    const count = bookings.filter(b => ['confirmed', 'cancelled'].includes(b.status) && !b.isArchived).length;
    if (count === 0) {
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to archive completed bookings');
      }
      const data = await res.json();
      showToast(data.message || 'Bookings archived', 'success');
      fetchBookings();
    } catch (err) {
      showToast('Failed to archive: ' + err.message, 'error');
    } finally {
      setShowClearModal(false);
      setClearing(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]
    );
  };

  const handleBulkUnarchive = () => {
    if (selectedIds.length === 0) {
      showToast('No bookings selected', 'info');
      return;
    }
    setShowBulkUnarchiveModal(true);
  };

  const confirmBulkUnarchive = async () => {
    setClearing(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetch(`${BASE_URL}/api/bookings/${id}/unarchive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then(res => {
            if (!res.ok) throw new Error('Failed');
            return res.json();
          })
        )
      );
      fetchBookings();
      setSelectedIds([]);
      showToast(`${selectedIds.length} bookings unarchived`, 'success');
    } catch (err) {
      showToast('Failed to unarchive some bookings: ' + err.message, 'error');
    } finally {
      setShowBulkUnarchiveModal(false);
      setClearing(false);
    }
  };

  const visibleBookings = showArchived
    ? bookings.filter(b => b.isArchived === true)
    : bookings.filter(b => b.isArchived === false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xl text-gray-700">Loading bookings...</p>
        </div>
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

  const hasActionableBookings = bookings.some(b => ['confirmed', 'cancelled'].includes(b.status) && !b.isArchived);

  return (
    <div className="min-h-screen bg-gray-50 pt-0 pb-12">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">All Bookings</h1>
            <p className="text-lg text-gray-600 mt-2">Manage all user hotel & flight reservations</p>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-3 cursor-pointer bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">View archived bookings</span>
            </label>

            {showArchived && selectedIds.length > 0 && (
              <button
                onClick={handleBulkUnarchive}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-md"
              >
                <RotateCcw className="h-5 w-5" />
                Unarchive Selected ({selectedIds.length})
              </button>
            )}

            {!showArchived && hasActionableBookings && (
              <button
                onClick={handleArchiveCompleted}
                disabled={clearing}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition disabled:opacity-50 shadow-md"
              >
                {clearing ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />Archiving...</>
                ) : (
                  <><Trash2 className="h-5 w-5" />Archive Completed</>
                )}
              </button>
            )}
          </div>
        </div>

        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Calendar className="h-20 w-20 text-gray-300 mx-auto mb-8" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              No {showArchived ? 'archived' : 'active'} bookings
            </h3>
            <p className="text-gray-600 text-lg">
              {showArchived ? 'No archived bookings at the moment.' : 'No active bookings to manage.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {showArchived && (
                      <th className="px-6 py-4 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === visibleBookings.length && visibleBookings.length > 0}
                          onChange={() => {
                            if (selectedIds.length === visibleBookings.length) {
                              setSelectedIds([]);
                            } else {
                              setSelectedIds(visibleBookings.map(b => b._id));
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Booking</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Route / Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Details</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleBookings.map(booking => (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      {showArchived && (
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(booking._id)}
                            onChange={() => toggleSelection(booking._id)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </td>
                      )}

                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user ? booking.user.fullName : 'Deleted User'}
                        </div>
                        {booking.user && (
                          <div className="text-sm text-gray-500 break-all">{booking.user.email}</div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        {booking.type === 'flight' ? (
                          <div className="text-sm font-medium text-gray-900">
                            {booking.flight?.airline || 'Flight'} {booking.flight?.flightNumber || ''}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900">
                            {booking.hotel?.name || 'Hotel Booking'}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          {booking.type === 'flight'
                            ? `${booking.flight?.from || '-'} → ${booking.flight?.to || '-'}`
                            : booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {booking.type === 'flight' ? (
                          <>
                            <div className="text-sm text-gray-900">
                              Departure: {booking.flight?.departureTime || '-'}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {booking.passengersCount?.adults || 0} Adult{booking.passengersCount?.adults !== 1 ? 's' : ''},{' '}
                              {booking.passengersCount?.children || 0} Child{booking.passengersCount?.children !== 1 ? 'ren' : ''}
                            </div>
                          </>
                        ) : (
                          booking.checkIn && booking.checkOut
                            ? `${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`
                            : 'Dates not available'
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-blue-600 flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1" />
                          {booking.totalAmount.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          booking.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {paymentBadge(booking.paymentStatus)}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex gap-4">
                          {/* ✅ Only show confirm/reject for unpaid pending bookings */}
                          {booking.status === 'pending' && booking.paymentStatus !== 'completed' && (
                            <>
                              <button
                                onClick={() => requestStatusUpdate(booking._id, 'confirmed')}
                                disabled={updating}
                                className={`text-green-600 hover:text-green-800 transition ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Confirm"
                              >
                                <CheckCircle className="h-6 w-6" />
                              </button>
                              <button
                                onClick={() => requestStatusUpdate(booking._id, 'cancelled')}
                                disabled={updating}
                                className={`text-red-600 hover:text-red-800 transition ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Reject"
                              >
                                <XCircle className="h-6 w-6" />
                              </button>
                            </>
                          )}

                          {showArchived ? (
                            <button
                              onClick={() => requestSingleUnarchive(booking._id)}
                              disabled={clearing}
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="Unarchive"
                            >
                              <RotateCcw className="h-6 w-6" />
                            </button>
                          ) : (
                            ['confirmed', 'cancelled'].includes(booking.status) && (
                              <button
                                onClick={() => requestSingleArchive(booking._id)}
                                disabled={clearing}
                                className="text-red-600 hover:text-red-800 transition"
                                title="Archive"
                              >
                                <Archive className="h-6 w-6" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status Change Modal */}
      {showStatusModal && pendingStatusAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingStatusAction.newStatus === 'confirmed' ? 'Confirm Booking' : 'Reject Booking'}
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to {pendingStatusAction.newStatus === 'confirmed' ? 'confirm' : 'reject'} this booking?
              </p>
              {pendingStatusAction.newStatus === 'cancelled' && (
                <p className="mt-3 text-red-600 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  This will cancel the booking permanently.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={updating}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                disabled={updating}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                  updating ? 'bg-gray-500 cursor-not-allowed' :
                  pendingStatusAction.newStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {pendingStatusAction.newStatus === 'confirmed' ? 'Confirm' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Completed Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Archive className="h-6 w-6 text-red-600" />
                Archive Completed Bookings
              </h3>
              <button onClick={() => setShowClearModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                This will archive all <strong>confirmed</strong> and <strong>cancelled</strong> bookings.
              </p>
              <p className="mt-3 text-red-600 font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Pending bookings will remain visible.
              </p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveCompleted}
                disabled={clearing}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                  clearing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                Archive Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unarchive Modal */}
      {showBulkUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-blue-600" />
                Unarchive Selected Bookings
              </h3>
              <button onClick={() => setShowBulkUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to unarchive {selectedIds.length} selected booking(s)?
              </p>
              <p className="mt-3 text-sm text-gray-600">They will appear in the active bookings list again.</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button
                onClick={() => setShowBulkUnarchiveModal(false)}
                disabled={clearing}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkUnarchive}
                disabled={clearing}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                  clearing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                Unarchive Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Archive Modal */}
      {showSingleArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
              <button onClick={() => setShowSingleArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Are you sure you want to archive this booking?</p>
              <p className="mt-3 text-red-600 font-medium">It will be hidden from the active list.</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button
                onClick={() => setShowSingleArchiveModal(false)}
                disabled={clearing}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSingleArchive}
                disabled={clearing}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                  clearing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Unarchive Modal */}
      {showSingleUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-blue-600" />
                Unarchive Booking
              </h3>
              <button onClick={() => setShowSingleUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Are you sure you want to unarchive this booking?</p>
              <p className="mt-3 text-sm text-gray-600">It will appear in the active bookings list again.</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button
                onClick={() => setShowSingleUnarchiveModal(false)}
                disabled={clearing}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSingleUnarchive}
                disabled={clearing}
                className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${
                  clearing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;