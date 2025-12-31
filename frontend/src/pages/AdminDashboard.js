import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, MapPin, Hotel, PlaneTakeoff, BarChart, TrendingUp, TrendingDown } from 'lucide-react';
import { getAdminStats } from '../services/api';
import AdminNavbar from '../components/AdminNavbar';

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

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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

        const mockBookings = [
          { user: 'Rajesh Sharma', destination: 'Pokhara', type: 'Hotel', date: '2024-12-25', status: 'Confirmed' },
          { user: 'Sita Rai', destination: 'Chitwan', type: 'Flight', date: '2024-12-28', status: 'Pending' },
          { user: 'Maya Gurung', destination: 'Lumbini', type: 'Hotel', date: '2025-01-05', status: 'Confirmed' },
        ];
        setRecentBookings(mockBookings);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const trendBadge = (percent) => {
    const isUp = percent >= 0;
    const Icon = isUp ? TrendingUp : TrendingDown;

    return (
      <div className="flex items-center mt-2">
        <Icon className={`h-4 w-4 mr-1 ${isUp ? "text-green-500" : "text-red-500"}`} />
        <span className={`text-sm ${isUp ? "text-green-500" : "text-red-500"}`}>
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
      trendPercent: 0,
      comingSoon: true,
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
        {/* Header + Explore button */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome to Ghumna Jau Admin Panel</p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            type="button"
          >
            Explore Main Site
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>

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

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <BarChart className="h-6 w-6 mr-2 text-blue-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/admin/destinations" className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center">
                    <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Destinations</p>
                  </Link>
                  <Link to="/admin/hotels" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center">
                    <Hotel className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Hotels</p>
                  </Link>
                  <Link to="/admin/flights" className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center">
                    <PlaneTakeoff className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Flights</p>
                  </Link>
                  <Link to="/admin/users" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition text-center">
                    <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Users</p>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No recent activity</p>
                  ) : (
                    recentBookings.map((booking, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{booking.user}</p>
                          <p className="text-sm text-gray-600">
                            {booking.destination} • {booking.type}
                          </p>
                          <p className="text-xs text-gray-500">{booking.date}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'Confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    ))
                  )}
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

