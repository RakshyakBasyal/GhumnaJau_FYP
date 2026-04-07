// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, MapPin, Hotel, PlaneTakeoff, BarChart,
  TrendingUp, TrendingDown, CheckCircle, XCircle, Calendar,
  X, Loader2, ArrowUpRight, RotateCcw, Clock,
  Layers, Package, AlertCircle, FileText, Wallet, Landmark, AlertTriangle,
} from 'lucide-react';
import { getAdminStats } from '../services/api';
import AdminNavbar from '../components/AdminNavbar';
import { useToast } from '../context/ToastContext';
import io from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate      = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    totalUsers: 0, totalDestinations: 0, totalHotels: 0, totalFlights: 0,
    periodDays: 7,
    newThisPeriod: { users: 0, destinations: 0, hotels: 0, flights: 0 },
    bookingStats: { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
    paymentSummary: { totalAmount: 0, netRevenue: 0, awaitingPayment: 0 },
  });

  const [bookings, setBookings]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction]     = useState(null);

  // ── Derived Styles ──────────────────────────────────────────────────────────
  const glassEffect = "bg-white/70 backdrop-blur-md border border-white/20 shadow-xl";
  const cardBase    = "rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden";

  // ── socket ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token  = localStorage.getItem('token');
    if (!token) return;
    const socket = io(BASE_URL, { auth: { token }, reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });

    socket.on('newBooking', (b) => {
      setBookings((prev) => [b, ...prev]);
      showToast('New booking request received!', 'success');
    });
    socket.on('bookingUpdated', (u) => {
      // Local state update only if it doesn't conflict with current UI expectations
      setBookings((prev) => prev.map((b) => b._id === u._id ? { ...b, ...u } : b));
    });
    socket.on('bookingCancelled', (c) => {
      setBookings((prev) => prev.map((b) => b._id === c._id ? { ...b, ...c } : b));
      showToast('A booking was cancelled by user', 'warning');
    });
    socket.on('bookingRefunded', (r) => {
      setBookings((prev) => prev.map((b) => b._id === r._id ? { ...b, ...r } : b));
      showToast('A booking was auto-refunded', 'info');
    });
    socket.on('bookingRefundReviewed', (r) => {
      setBookings((prev) => prev.map((b) => b._id === r._id ? { ...b, ...r } : b));
    });

    socket.on('statsUpdated', (newStats) => {
      console.log('Real-time stats received:', newStats);
      setStats({
        totalUsers: newStats.totals?.users ?? 0,
        totalDestinations: newStats.totals?.destinations ?? 0,
        totalHotels: newStats.totals?.hotels ?? 0,
        totalFlights: newStats.totals?.flights ?? 0,
        periodDays: newStats.periodDays ?? 7,
        newThisPeriod: newStats.newThisPeriod || { users: 0, destinations: 0, hotels: 0, flights: 0 },
        bookingStats: newStats.bookingStats || { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
        paymentSummary: {
          totalAmount: newStats.paymentSummary?.totalAmount ?? 0,
          netRevenue: newStats.paymentSummary?.netRevenue ?? 0,
          awaitingPayment: newStats.paymentSummary?.awaitingPayment ?? 0,
        },
      });
    });

    return () => socket.disconnect();
  }, []);

  // ── fetch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res  = await getAdminStats();
        const data = res.data;
        setStats({
          totalUsers: data.totals?.users ?? 0,
          totalDestinations: data.totals?.destinations ?? 0,
          totalHotels: data.totals?.hotels ?? 0,
          totalFlights: data.totals?.flights ?? 0,
          periodDays: data.periodDays ?? 7,
          newThisPeriod: data.newThisPeriod || { users: 0, destinations: 0, hotels: 0, flights: 0 },
          bookingStats: data.bookingStats || { total: 0, pending: 0, confirmed: 0, cancelled: 0 },
          paymentSummary: {
            totalAmount: data.paymentSummary?.totalAmount ?? 0,
            netRevenue: data.paymentSummary?.netRevenue ?? 0,
            awaitingPayment: data.paymentSummary?.awaitingPayment ?? 0,
          },
        });
      } catch (err) {
        console.error('Admin stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not logged in');
        const res = await fetch(`${BASE_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { const d = await res.json(); throw new Error(d.msg || 'Failed'); }
        setBookings(await res.json());
      } catch (err) {
        console.error('Bookings fetch error:', err);
      } finally {
        setLoadingBookings(false);
      }
    };

    fetchDashboard();
    fetchBookings();
  }, []);

  // ── status update ─────────────────────────────────────────────────────────────
  const requestStatusUpdate = (bookingId, newStatus) => { setPendingAction({ bookingId, newStatus }); setShowConfirmModal(true); };

  const confirmStatusUpdate = async () => {
    if (!pendingAction) return;
    const { bookingId, newStatus } = pendingAction;
    
    // Close modal immediately to prevent double-click or confusion
    setShowConfirmModal(false);
    setPendingAction(null);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update status');
      }
      
      // Update local state directly with the response to ensure consistency
      if (data.booking) {
        setBookings((prev) => prev.map((b) => b._id === bookingId ? data.booking : b));
      }
      
      showToast(newStatus === 'confirmed' ? 'Booking confirmed!' : 'Booking cancelled.', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // ── badge helpers ─────────────────────────────────────────────────────────────
  const paymentBadge = (paymentStatus) => {
    const map = {
      completed: { cls: 'bg-blue-100 text-blue-800',    label: 'Paid' },
      refunded:  { cls: 'bg-purple-100 text-purple-800', label: 'Refunded' },
      failed:    { cls: 'bg-red-100 text-red-700',      label: 'Failed' },
      pending:   { cls: 'bg-gray-100 text-gray-600',    label: 'Unpaid' },
    };
    const { cls, label } = map[paymentStatus] || map.pending;
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>{label}</span>;
  };

  const trendDisplay = (change) => {
    if (change > 0) return (
      <div className="flex items-center mt-2 text-sm text-green-600">
        <TrendingUp className="h-4 w-4 mr-1" /><span>+{change} in {stats.periodDays} days</span>
      </div>
    );
    if (change < 0) return (
      <div className="flex items-center mt-2 text-sm text-red-600">
        <TrendingDown className="h-4 w-4 mr-1" /><span>{change} in {stats.periodDays} days</span>
      </div>
    );
    return <div className="flex items-center mt-2 text-sm text-gray-500"><span>0 in {stats.periodDays} days</span></div>;
  };

  const statCards = [
    { title: 'Total Users',   value: stats.totalUsers,        icon: Users,        color: 'bg-blue-500',   change: stats.newThisPeriod?.users        || 0 },
    { title: 'Destinations',  value: stats.totalDestinations, icon: MapPin,       color: 'bg-green-500',  change: stats.newThisPeriod?.destinations  || 0 },
    { title: 'Hotels',        value: stats.totalHotels,       icon: Hotel,        color: 'bg-purple-500', change: stats.newThisPeriod?.hotels        || 0 },
    { title: 'Flights',       value: stats.totalFlights,      icon: PlaneTakeoff, color: 'bg-orange-500', change: stats.newThisPeriod?.flights       || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome to Ghumna Jau Admin Panel</p>
          </div>
          <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
            Explore Main Site
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></div>
        ) : (
          <div className="space-y-10">
            
            {/* ── Overview Cards (Top Row) ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-500 uppercase mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      {trendDisplay(stat.change)}
                    </div>
                    <div className={`${stat.color} p-4 rounded-xl shadow-sm`}>
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── LEFT COLUMN: Bookings & Activity (8/12) ───────────────────── */}
              <div className="lg:col-span-8 space-y-10">
                
                {/* Booking Statistics */}
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Layers className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Booking Statistics</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Total Bookings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition">
                          <Package className="h-6 w-6 text-gray-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Global</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{stats.bookingStats.total}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Total Bookings</p>
                        <p className="text-[10px] text-gray-400 mt-1">All bookings ever made</p>
                      </div>
                    </div>

                    {/* Pending Bookings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition">
                          <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Review</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{stats.bookingStats.pending}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Pending Approval</p>
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Requires admin action</p>
                      </div>
                    </div>

                    {/* Confirmed Bookings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">Active</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{stats.bookingStats.confirmed}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Confirmed</p>
                        <p className="text-[10px] text-green-600 mt-1 font-medium">Accepted (Paid or Unpaid)</p>
                      </div>
                    </div>

                    {/* Cancelled Bookings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition">
                          <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">Void</span>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900">{stats.bookingStats.cancelled}</p>
                        <p className="text-sm font-medium text-gray-500 mt-1">Cancelled/Rejected</p>
                        <p className="text-[10px] text-red-500 mt-1 font-medium">By user or admin</p>
                      </div>
                    </div>

                  </div>
                </section>

                {/* Recent Activity Table */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <BarChart className="h-5 w-5 text-gray-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                    </div>
                    <Link to="/admin/bookings" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition uppercase">
                      View all →
                    </Link>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">User</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Booking</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Status</th>
                          <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bookings.slice(0, 8).map((booking) => (
                          <tr key={booking._id} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">{booking.user?.fullName || 'Guest'}</div>
                              <div className="text-xs text-gray-400">{booking.user?.email}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-800">{booking.hotel?.name || booking.flight?.airline || 'Booking'}</div>
                              <div className="text-[10px] font-bold uppercase text-gray-400 mt-1">{booking.type}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-bold text-gray-900">NPR {booking.totalAmount.toLocaleString()}</div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-full uppercase ${
                                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-center">
                              {booking.status === 'pending' && booking.paymentStatus !== 'completed' && (
                                <div className="flex justify-center gap-2">
                                  <button onClick={() => requestStatusUpdate(booking._id, 'confirmed')} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition shadow-sm" title="Confirm">
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => requestStatusUpdate(booking._id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition shadow-sm" title="Reject">
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* ── RIGHT COLUMN: Payment & Links (4/12) ──────────────────────── */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Payment Status Summary (Stacked Vertically) */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Payment Summary</h2>
                  </div>

                  {/* Total Amount (Gross) */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md p-6 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Gross</span>
                      </div>
                      <p className="text-blue-100 text-xs font-medium uppercase mb-1">Total Amount</p>
                      <h3 className="text-2xl font-bold">NPR {stats.paymentSummary.totalAmount.toLocaleString()}</h3>
                      <p className="text-[10px] text-blue-200 mt-2 flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Includes refunds
                      </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <FileText className="h-24 w-24" />
                    </div>
                  </div>

                  {/* Net Revenue */}
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl shadow-md p-6 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Landmark className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Net</span>
                      </div>
                      <p className="text-emerald-100 text-xs font-medium uppercase mb-1">Net Revenue</p>
                      <h3 className="text-2xl font-bold">NPR {stats.paymentSummary.netRevenue.toLocaleString()}</h3>
                      <p className="text-[10px] text-emerald-200 mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> After refunds
                      </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                      <Landmark className="h-24 w-24" />
                    </div>
                  </div>

                  {/* Awaiting Payment */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-50 rounded-xl">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Pending</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Awaiting Payment</p>
                      <h3 className="text-2xl font-bold text-gray-900">NPR {stats.paymentSummary.awaitingPayment.toLocaleString()}</h3>
                    </div>
                    <p className="text-[10px] text-gray-400 italic mt-3">Confirmed bookings, unpaid</p>
                  </div>
                </section>

                {/* Quick Actions Panel */}
                <div className="bg-slate-900 rounded-xl shadow-xl p-6 text-white">
                  <h2 className="text-lg font-bold mb-6 flex items-center gap-3">
                    <BarChart className="h-5 w-5 text-blue-400" />
                    Quick Links
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { to: '/admin/destinations', icon: MapPin, label: 'Manage Destinations', color: 'bg-blue-600' },
                      { to: '/admin/hotels', icon: Hotel, label: 'Manage Hotels', color: 'bg-emerald-600' },
                      { to: '/admin/flights', icon: PlaneTakeoff, label: 'Manage Flights', color: 'bg-indigo-600' },
                      { to: '/admin/users', icon: Users, label: 'Manage Users', color: 'bg-slate-700' }
                    ].map((link, i) => (
                      <Link key={i} to={link.to} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition border border-white/10 group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${link.color} rounded-lg shadow-lg`}>
                            <link.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-xs font-bold">{link.label}</span>
                        </div>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                      </Link>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                {pendingAction.newStatus === 'confirmed' ? 'Confirm Booking' : 'Cancel Booking'}
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 rounded-full hover:bg-gray-100 transition">
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 text-base leading-relaxed">
                Are you sure you want to {pendingAction.newStatus} this booking?
                {pendingAction.newStatus === 'cancelled' && (
                  <span className="block mt-2 font-medium text-red-600">This action cannot be undone.</span>
                )}
              </p>
              {pendingAction.newStatus === 'confirmed' && (
                <p className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  The user will be notified and can complete payment if they haven't already.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setShowConfirmModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium">Cancel</button>
              <button
                onClick={confirmStatusUpdate}
                className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition ${pendingAction.newStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
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
