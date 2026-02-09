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
  Calendar,
  CheckCircle,     // ← ADD THIS
  XCircle,
} from 'lucide-react';
import { getAdminStats } from '../services/api';
import AdminNavbar from '../components/AdminNavbar';

const BASE_URL = "http://localhost:5000";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDestinations: 0,
    totalHotels: 0,
    totalFlights: 0,
    periodDays: 7,
    trends: { usersPercent: 0, destinationsPercent: 0 },
  });

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

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
          trends: data.trends,
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

  const trendBadge = (percent) => {
    const isUp = percent >= 0;
    const Icon = isUp ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center mt-2">
        <Icon className={`h-4 w-4 mr-1 ${isUp ? 'text-green-500' : 'text-red-500'}`} />
        <span className={`text-sm ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {Math.abs(percent)}% (last {stats.periodDays} days)
        </span>
      </div>
    );
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      trendPercent: stats.trends.usersPercent,
    },
    {
      title: 'Destinations',
      value: stats.totalDestinations,
      icon: MapPin,
      color: 'bg-green-500',
      trendPercent: stats.trends.destinationsPercent,
    },
    {
      title: 'Hotels',
      value: stats.totalHotels,
      icon: Hotel,
      color: 'bg-purple-500',
      trendPercent: stats.trends.hotelsPercent || 0, // Use real trend if backend provides, else 0
    },
    {
      title: 'Flights',
      value: stats.totalFlights,
      icon: PlaneTakeoff,
      color: 'bg-orange-500',
      trendPercent: 0,
      comingSoon: true,
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
                      {stat.comingSoon ? (
                        <p className="text-sm text-gray-400 mt-2">Coming soon</p>
                      ) : (
                        trendBadge(stat.trendPercent)
                      )}
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
                <>
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
                                    onClick={() => handleUpdateStatus(booking._id, 'confirmed')}
                                    className="text-green-600 hover:text-green-900"
                                    title="Confirm"
                                  >
                                    <CheckCircle className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(booking._id, 'cancelled')}
                                    className="text-red-600 hover:text-red-900"
                                    title="Cancel"
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
                  </div>

                  {/* View All Bookings Button */}
                  {bookings.length > 5 && (
                    <div className="mt-6 text-center">
                      <Link
                        to="/admin/bookings"
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
                      >
                        View All Bookings ({bookings.length})
                      </Link>
                    </div>
                  )}
                </>
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
    </div>
  );
};

export default AdminDashboard;