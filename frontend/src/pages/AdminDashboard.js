// frontend/src/pages/AdminDashboard.js
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  MapPin,
  Hotel,
  PlaneTakeoff,
  BarChart,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import { getAdminStats } from '../services/api';
import AdminNavbar from '../components/AdminNavbar';
import { useToast } from '../context/ToastContext';
import io from 'socket.io-client';

const BASE_URL = "http://localhost:5000";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDestinations: 0,
    totalHotels: 0,
    totalFlights: 0,
    periodDays: 7,
    newThisPeriod: { users: 0, destinations: 0, hotels: 0, flights: 0 },
  });

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { bookingId, newStatus }

  // Socket.IO – live booking updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Admin Dashboard Socket connected');
    });

    socket.on('newBooking', (newBooking) => {
      console.log('New booking received:', newBooking._id);
      setBookings((prev) => [newBooking, ...prev]);
      showToast('New booking request received!', 'success');
    });

    socket.on('bookingUpdated', (updatedBooking) => {
      console.log('Booking updated:', updatedBooking._id, updatedBooking.status);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === updatedBooking._id ? updatedBooking : b
        )
      );
      showToast(`Booking updated to ${updatedBooking.status}`, 'info');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => socket.disconnect();
  }, [showToast]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await getAdminStats();
        const data = res.data;

        setStats({
          totalUsers: data.totals.users,
          totalDestinations: data.totals.destinations,
          totalHotels: data.totals.hotels,
          totalFlights: data.totals.flights,
          periodDays: data.periodDays,
          newThisPeriod: data.newThisPeriod || { users: 0, destinations: 0, hotels: 0, flights: 0 },
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not logged in');

        const res = await fetch(`${BASE_URL}/api/bookings`, {
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
        console.error('Bookings fetch error:', err);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchDashboard();
    fetchBookings();
  }, []);

  const requestStatusUpdate = (bookingId, newStatus) => {
    setPendingAction({ bookingId, newStatus });
    setShowConfirmModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!pendingAction) return;

    const { bookingId, newStatus } = pendingAction;

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

      // Update UI instantly
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, status: newStatus } : b
        )
      );

      showToast(`Booking ${newStatus} successfully!`, 'success');
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    } finally {
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  const cancelStatusUpdate = () => {
    setShowConfirmModal(false);
    setPendingAction(null);
  };

  // New trend display: absolute change + period (instead of %)
  const trendDisplay = (change) => {
    if (change > 0) {
      return (
        <div className="flex items-center mt-2 text-sm text-green-600">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>+{change} in {stats.periodDays} days</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center mt-2 text-sm text-red-600">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>{change} in {stats.periodDays} days</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center mt-2 text-sm text-gray-500">
          <span>0 in {stats.periodDays} days</span>
        </div>
      );
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: stats.newThisPeriod?.users || 0,
    },
    {
      title: 'Destinations',
      value: stats.totalDestinations,
      icon: MapPin,
      color: 'bg-green-500',
      change: stats.newThisPeriod?.destinations || 0,
    },
    {
      title: 'Hotels',
      value: stats.totalHotels,
      icon: Hotel,
      color: 'bg-purple-500',
      change: stats.newThisPeriod?.hotels || 0,
    },
    {
      title: 'Flights',
      value: stats.totalFlights,
      icon: PlaneTakeoff,
      color: 'bg-orange-500',
      change: stats.newThisPeriod?.flights || 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome to Ghumna Jau Admin Panel</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Explore Main Site
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">Loading dashboard...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      {trendDisplay(stat.change)}
                    </div>
                    <div className={`${stat.color} p-4 rounded-full`}>
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Bookings – Latest 5 */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-6 w-6 mr-2 text-blue-600" />
                Recent Bookings
              </h2>

              {loadingBookings ? (
                <p className="text-center text-gray-600 py-8">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No recent bookings</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hotel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount (NPR)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.slice(0, 5).map((booking) => (
                        <tr key={booking._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.user?.fullName || 'User'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {booking.hotel?.name || 'Hotel'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(booking.checkIn).toLocaleDateString()} -{' '}
                              {new Date(booking.checkOut).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600 flex items-center">
                              NPR {booking.totalAmount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                booking.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {booking.status === 'pending' && (
                              <div className="flex gap-3">
                                <button
                                  onClick={() => requestStatusUpdate(booking._id, 'confirmed')}
                                  className="text-green-600 hover:text-green-900 transition"
                                  title="Confirm Booking"
                                >
                                  <CheckCircle className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => requestStatusUpdate(booking._id, 'cancelled')}
                                  className="text-red-600 hover:text-red-900 transition"
                                  title="Cancel Booking"
                                >
                                  <XCircle className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* View All Bookings Button */}
                  <div className="mt-6 text-center">
                    <Link
                      to="/admin/bookings"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                      View All Bookings ({bookings.length})
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <BarChart className="h-6 w-6 mr-2 text-blue-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/admin/destinations"
                    className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
                  >
                    <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Destinations</p>
                  </Link>
                  <Link
                    to="/admin/hotels"
                    className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
                  >
                    <Hotel className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Hotels</p>
                  </Link>
                  <Link
                    to="/admin/flights"
                    className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
                  >
                    <PlaneTakeoff className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Flights</p>
                  </Link>
                  <Link
                    to="/admin/users"
                    className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition text-center"
                  >
                    <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Users</p>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingAction.newStatus === 'confirmed' ? 'Confirm Booking' : 'Cancel Booking'}
              </h3>
              <button
                onClick={cancelStatusUpdate}
                className="p-1 rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-gray-700 text-base leading-relaxed">
                Are you sure you want to {pendingAction.newStatus} this booking?
                {pendingAction.newStatus === 'cancelled' && (
                  <span className="block mt-2 font-medium text-red-600">
                    This action cannot be undone.
                  </span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cancelStatusUpdate}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusUpdate}
                className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition ${
                  pendingAction.newStatus === 'confirmed'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingAction.newStatus === 'confirmed' ? 'Confirm' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;