// frontend/src/pages/AdminBookings.jsx
import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, Calendar, MapPin, X,
  Loader2, Trash2, Archive, RotateCcw, AlertTriangle,
  Clock, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import AdminNavbar from '../components/AdminNavbar';
import { io } from 'socket.io-client';
import ConfirmDialog from '../components/ConfirmDialog';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── helpers ───────────────────────────────────────────────────────────────────
const paymentBadge = (paymentStatus) => {
  const map = {
    completed: { cls: 'bg-blue-100 text-blue-800',    label: 'Paid' },
    refunded:  { cls: 'bg-purple-100 text-purple-800', label: 'Refunded' },
    failed:    { cls: 'bg-red-100 text-red-700',      label: 'Failed' },
    pending:   { cls: 'bg-gray-100 text-gray-600',    label: 'Unpaid' },
  };
  const { cls, label } = map[paymentStatus] || map.pending;
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>
      {label}
    </span>
  );
};

const statusBadge = (status) => {
  const map = {
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    pending:   'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// ── Refund Review Panel ───────────────────────────────────────────────────────
const RefundReviewPanel = ({ 
  bookings, 
  onDecision, 
  reviewing,
  manualRefundTarget,
  setManualRefundTarget
}) => {
  const [expanded, setExpanded] = useState(true);
  const [notes, setNotes] = useState({}); // bookingId → note string

  if (bookings.length === 0) return null;

  return (
    <div className="mb-8 border border-amber-200 rounded-2xl overflow-hidden bg-amber-50 shadow-md">
      {/* Panel header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-amber-100 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Clock className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Refund Review Queue</p>
            <p className="text-sm text-amber-700">
              {bookings.length} request{bookings.length !== 1 ? 's' : ''} awaiting your decision
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-5 w-5 text-gray-500" />
          : <ChevronDown className="h-5 w-5 text-gray-500" />
        }
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-5">
          {bookings.map((booking) => {
            const title = booking.type === 'flight'
              ? `${booking.flight?.airline || ''} ${booking.flight?.flightNumber || ''}`.trim() || 'Flight'
              : booking.hotel?.name || 'Hotel Booking';

            return (
              <div key={booking._id} className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm">
                {/* Row header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="font-bold text-gray-900">{title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {booking.user?.fullName || 'User'} · {booking.user?.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Cancelled:{' '}
                      {booking.cancelledAt
                        ? new Date(booking.cancelledAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-500">Refund requested</p>
                    <p className="text-xl font-bold text-red-600 flex items-center justify-end gap-1">
                      <span className="text-xs">NPR</span>
                      {booking.refundAmount?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {booking.refundPercent}% of NPR {booking.totalAmount?.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Booking type</p>
                    <p className="font-medium text-gray-800 capitalize">{booking.type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Booking total</p>
                    <p className="font-medium text-gray-800">NPR {booking.totalAmount?.toLocaleString()}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Cancellation reason (custom)</p>
                    <p className="font-medium text-gray-800">{booking.cancellationReason || '—'}</p>
                    {booking.cancellationNote && (
                      <p className="text-xs text-gray-500 mt-1 italic">Note: {booking.cancellationNote}</p>
                    )}
                  </div>
                </div>

                {/* Admin note input */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Admin note to user <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={notes[booking._id] || ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [booking._id]: e.target.value }))
                    }
                    placeholder="Reason for decision (shown to user)..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Decision buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      onDecision(booking._id, 'admin_approved', notes[booking._id] || '')
                    }
                    disabled={reviewing === booking._id}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
                      reviewing === booking._id
                        ? 'bg-green-300 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {reviewing === booking._id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ThumbsUp className="h-4 w-4" />
                    }
                    Approve Refund
                  </button>
                  <button
                    onClick={() =>
                      onDecision(booking._id, 'admin_rejected', notes[booking._id] || '')
                    }
                    disabled={reviewing === booking._id}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition ${
                      reviewing === booking._id
                        ? 'bg-red-300 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {reviewing === booking._id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ThumbsDown className="h-4 w-4" />
                    }
                    Reject Refund
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(manualRefundTarget)}
        onClose={() => setManualRefundTarget(null)}
        onConfirm={() => {
          if (manualRefundTarget) {
            onDecision(manualRefundTarget.bookingId, manualRefundTarget.decision, manualRefundTarget.adminRefundNote, true);
            setManualRefundTarget(null);
          }
        }}
        title="Manual Refund"
        message="Stripe is unreachable. Would you like to MARK AS REFUNDED manually instead? (This updates the status in our database but DOES NOT hit Stripe)."
        confirmText="Mark as Refunded"
        confirmColor="bg-blue-600 hover:bg-blue-700"
      />
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [refundQueue, setRefundQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [reviewing, setReviewing] = useState(null); // bookingId being reviewed

  const [selectedIds, setSelectedIds] = useState([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState(null);
  const [showBulkUnarchiveModal, setShowBulkUnarchiveModal] = useState(false);
  const [showSingleArchiveModal, setShowSingleArchiveModal] = useState(false);
  const [pendingSingleArchiveId, setPendingSingleArchiveId] = useState(null);
  const [showSingleUnarchiveModal, setShowSingleUnarchiveModal] = useState(false);
  const [pendingSingleUnarchiveId, setPendingSingleUnarchiveId] = useState(null);
  const [manualRefundTarget, setManualRefundTarget] = useState(null); // { bookingId, decision, adminRefundNote }

  const { showToast } = useToast();

  // ── fetch bookings ───────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not logged in');

      const [bookingsRes, refundRes] = await Promise.all([
        fetch(`${BASE_URL}/api/bookings${showArchived ? '?includeArchived=true' : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/bookings/refund-review`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!bookingsRes.ok) {
        const d = await bookingsRes.json();
        throw new Error(d.message || `Failed to load bookings (${bookingsRes.status})`);
      }

      setBookings(await bookingsRes.json() || []);
      if (refundRes.ok) setRefundQueue(await refundRes.json() || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Bookings fetch error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, [showArchived, showToast]);

  // ── socket ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });

    socket.on('newBooking', (b) => {
      setBookings((prev) => [b, ...prev]);
      showToast('New booking received!', 'success');
    });
    socket.on('bookingUpdated', (updated) => {
      setBookings((prev) => prev.map((b) => b._id === updated._id ? { ...b, ...updated } : b));
    });
    socket.on('bookingCancelled', (cancelled) => {
      setBookings((prev) => prev.map((b) => b._id === cancelled._id ? { ...b, ...cancelled } : b));
      showToast('A booking was cancelled by user', 'warning');
    });
    socket.on('bookingRefunded', (refunded) => {
      setBookings((prev) => prev.map((b) => b._id === refunded._id ? { ...b, ...refunded } : b));
      showToast('A booking was refunded automatically', 'info');
    });
    socket.on('refundReviewQueued', (b) => {
      setRefundQueue((prev) => {
        if (prev.find((r) => r._id === b._id)) return prev;
        return [b, ...prev];
      });
      showToast('New refund review request!', 'warning');
    });
    socket.on('bookingRefundReviewed', (updated) => {
      setRefundQueue((prev) => prev.filter((b) => b._id !== updated._id));
      setBookings((prev) => prev.map((b) => b._id === updated._id ? { ...b, ...updated } : b));
    });
    socket.on('connect_error', () => showToast('Live updates disconnected – refresh page', 'error'));

    return () => socket.disconnect();
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings, showArchived]);

  // ── refund review decision ────────────────────────────────────────────────────
  const handleRefundDecision = async (bookingId, decision, adminRefundNote, isManual = false) => {
    setReviewing(bookingId);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${bookingId}/refund-review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ decision, adminRefundNote, isManualRefund: isManual }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // If Stripe failed, backend now sends canManual: true
        if (data.canManual && decision === 'admin_approved') {
          setManualRefundTarget({ bookingId, decision, adminRefundNote });
          return;
        }
        throw new Error(data.message || 'Failed to process decision');
      }

      const { booking: updated } = data;
      setRefundQueue((prev) => prev.filter((b) => b._id !== bookingId));
      setBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, ...updated } : b));
      showToast(
        isManual ? 'Marked as refunded manually.' :
        decision === 'admin_approved' ? 'Refund approved and processed via Stripe!' : 'Refund request rejected.',
        decision === 'admin_approved' ? 'success' : 'info'
      );
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setReviewing(null);
    }
  };

  // ── booking status update ─────────────────────────────────────────────────────
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
        const d = await res.json();
        throw new Error(d.message || 'Failed to update status');
      }
      showToast(
        newStatus === 'confirmed' ? 'Booking confirmed!' : 'Booking cancelled.',
        'success'
      );
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setShowStatusModal(false);
      setPendingStatusAction(null);
      setUpdating(false);
    }
  };

  // ── archive helpers ───────────────────────────────────────────────────────────
  const requestSingleArchive = (id) => { setPendingSingleArchiveId(id); setShowSingleArchiveModal(true); };
  const confirmSingleArchive = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${pendingSingleArchiveId}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      showToast('Booking archived', 'success');
      fetchBookings();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    finally { setShowSingleArchiveModal(false); setPendingSingleArchiveId(null); setClearing(false); }
  };

  const requestSingleUnarchive = (id) => { setPendingSingleUnarchiveId(id); setShowSingleUnarchiveModal(true); };
  const confirmSingleUnarchive = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${pendingSingleUnarchiveId}/unarchive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      showToast('Booking unarchived', 'success');
      fetchBookings();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    finally { setShowSingleUnarchiveModal(false); setPendingSingleUnarchiveId(null); setClearing(false); }
  };

  const handleArchiveCompleted = () => {
    const count = bookings.filter(
      (b) => ['confirmed', 'cancelled'].includes(b.status) && !b.isArchived
    ).length;
    if (count === 0) { showToast('No completed bookings to archive', 'info'); return; }
    setShowClearModal(true);
  };

  const confirmArchiveCompleted = async () => {
    setClearing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/clear-completed`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Failed'); }
      const d = await res.json();
      showToast(d.message || 'Bookings archived', 'success');
      fetchBookings();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    finally { setShowClearModal(false); setClearing(false); }
  };

  const toggleSelection = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);

  const handleBulkUnarchive = () => {
    if (!selectedIds.length) { showToast('No bookings selected', 'info'); return; }
    setShowBulkUnarchiveModal(true);
  };

  const confirmBulkUnarchive = async () => {
    setClearing(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${BASE_URL}/api/bookings/${id}/unarchive`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
        )
      );
      fetchBookings();
      setSelectedIds([]);
      showToast(`${selectedIds.length} bookings unarchived`, 'success');
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
    finally { setShowBulkUnarchiveModal(false); setClearing(false); }
  };

  const visibleBookings = showArchived
    ? bookings.filter((b) => b.isArchived === true)
    : bookings.filter((b) => b.isArchived === false);

  // ── loading / error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-xl text-gray-700">Loading bookings...</p>
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

  const hasActionableBookings = bookings.some(
    (b) => ['confirmed', 'cancelled'].includes(b.status) && !b.isArchived
  );

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pt-0 pb-12">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6">
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
                {clearing
                  ? <><Loader2 className="h-5 w-5 animate-spin" />Archiving...</>
                  : <><Trash2 className="h-5 w-5" />Archive Completed</>
                }
              </button>
            )}
          </div>
        </div>

        {/* ── Refund Review Queue (always visible at top when not in archived view) ── */}
        {!showArchived && (
          <RefundReviewPanel
            bookings={refundQueue}
            onDecision={handleRefundDecision}
            reviewing={reviewing}
            manualRefundTarget={manualRefundTarget}
            setManualRefundTarget={setManualRefundTarget}
          />
        )}

        {/* ── Bookings table ───────────────────────────────────────────────────── */}
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
                          onChange={() =>
                            setSelectedIds(
                              selectedIds.length === visibleBookings.length
                                ? []
                                : visibleBookings.map((b) => b._id)
                            )
                          }
                          className="w-5 h-5 text-blue-600 rounded border-gray-300"
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Refund</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleBookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-gray-50 transition-colors">
                      {showArchived && (
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(booking._id)}
                            onChange={() => toggleSelection(booking._id)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                      )}

                      {/* User */}
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user?.fullName || 'Deleted User'}
                        </div>
                        {booking.user && (
                          <div className="text-xs text-gray-500 break-all">{booking.user.email}</div>
                        )}
                      </td>

                      {/* Booking */}
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.type === 'flight'
                            ? `${booking.flight?.airline || 'Flight'} ${booking.flight?.flightNumber || ''}`
                            : booking.hotel?.name || 'Hotel Booking'}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 capitalize">{booking.type}</div>
                      </td>

                      {/* Route */}
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          {booking.type === 'flight'
                            ? `${booking.flight?.from || '-'} → ${booking.flight?.to || '-'}`
                            : booking.hotel?.destination?.name || booking.hotel?.country || 'Nepal'}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-6 py-5">
                        {booking.type === 'flight' ? (
                          <>
                            <div className="text-sm text-gray-900">
                              Dep: {booking.flight?.departureTime || '-'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {booking.passengersCount?.adults || 0}A,{' '}
                              {booking.passengersCount?.children || 0}C
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {booking.checkIn && booking.checkOut
                              ? `${new Date(booking.checkIn).toLocaleDateString()} – ${new Date(booking.checkOut).toLocaleDateString()}`
                              : '—'}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-900 flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">NPR</span>
                          {booking.totalAmount.toLocaleString()}
                        </div>
                      </td>

                      {/* Booking status */}
                      <td className="px-6 py-5">{statusBadge(booking.status)}</td>

                      {/* Payment status */}
                      <td className="px-6 py-5">{paymentBadge(booking.paymentStatus)}</td>

                      {/* Refund review status */}
                      <td className="px-6 py-5">
                        {booking.refundReviewStatus && booking.refundReviewStatus !== 'none' ? (
                          <div>
                            <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                              booking.refundReviewStatus === 'auto_approved'  ? 'bg-green-100 text-green-800' :
                              booking.refundReviewStatus === 'pending_review' ? 'bg-amber-100 text-amber-800' :
                              booking.refundReviewStatus === 'admin_approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.refundReviewStatus === 'auto_approved'  ? 'Auto-refunded' :
                               booking.refundReviewStatus === 'pending_review' ? '⏳ Review' :
                               booking.refundReviewStatus === 'admin_approved' ? '✓ Approved' :
                               '✗ Rejected'}
                            </span>
                            {booking.refundAmount > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                NPR {booking.refundAmount.toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5">
                        <div className="flex gap-3">
                          {/* Approve/Reject — only for unpaid pending bookings */}
                          {booking.status === 'pending' && booking.paymentStatus !== 'completed' && (
                            <>
                              <button
                                onClick={() => requestStatusUpdate(booking._id, 'confirmed')}
                                disabled={updating}
                                title="Confirm booking"
                                className={`text-green-600 hover:text-green-800 transition ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <CheckCircle className="h-6 w-6" />
                              </button>
                              <button
                                onClick={() => requestStatusUpdate(booking._id, 'cancelled')}
                                disabled={updating}
                                title="Reject booking"
                                className={`text-red-600 hover:text-red-800 transition ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <XCircle className="h-6 w-6" />
                              </button>
                            </>
                          )}

                          {/* Archive / Unarchive */}
                          {showArchived ? (
                            <button
                              onClick={() => requestSingleUnarchive(booking._id)}
                              disabled={clearing}
                              title="Unarchive"
                              className="text-blue-600 hover:text-blue-800 transition"
                            >
                              <RotateCcw className="h-6 w-6" />
                            </button>
                          ) : (
                            ['confirmed', 'cancelled'].includes(booking.status) && (
                              <button
                                onClick={() => requestSingleArchive(booking._id)}
                                disabled={clearing}
                                title="Archive"
                                className="text-red-600 hover:text-red-800 transition"
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

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}

      {/* Status change modal */}
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
              {pendingStatusAction.newStatus === 'confirmed' && (
                <p className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  The user will be notified and can then complete payment if they haven't already.
                </p>
              )}
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
                  updating ? 'bg-gray-400 cursor-not-allowed' :
                  pendingStatusAction.newStatus === 'confirmed'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                {pendingStatusAction.newStatus === 'confirmed' ? 'Confirm' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk archive modal */}
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
              <p className="mt-3 text-amber-600 font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Pending bookings will remain visible.
              </p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowClearModal(false)} disabled={clearing} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmArchiveCompleted} disabled={clearing} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${clearing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                Archive Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk unarchive modal */}
      {showBulkUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-blue-600" />
                Unarchive Selected
              </h3>
              <button onClick={() => setShowBulkUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Unarchive {selectedIds.length} selected booking(s)? They will reappear in the active list.</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowBulkUnarchiveModal(false)} disabled={clearing} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmBulkUnarchive} disabled={clearing} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${clearing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                Unarchive Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single archive modal */}
      {showSingleArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900">Archive Booking</h3>
              <button onClick={() => setShowSingleArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Archive this booking? It will be hidden from the active list.</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowSingleArchiveModal(false)} disabled={clearing} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmSingleArchive} disabled={clearing} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${clearing ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}>
                {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single unarchive modal */}
      {showSingleUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="h-6 w-6 text-blue-600" />
                Unarchive Booking
              </h3>
              <button onClick={() => setShowSingleUnarchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Bring this booking back to the active list?</p>
            </div>
            <div className="flex justify-end gap-4 px-6 py-5 border-t bg-gray-50">
              <button onClick={() => setShowSingleUnarchiveModal(false)} disabled={clearing} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel</button>
              <button onClick={confirmSingleUnarchive} disabled={clearing} className={`px-6 py-2.5 text-white rounded-lg flex items-center gap-2 transition ${clearing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
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
