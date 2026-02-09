// frontend/src/pages/AdminBookings.jsx
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Calendar, IndianRupee, MapPin } from 'lucide-react';

const BASE_URL = "http://localhost:5000";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    if (!window.confirm(`Are you sure you want to ${newStatus} this booking?`)) return;

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

      // Update UI
      setBookings(prev =>
        prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b)
      );

      alert(`Booking ${newStatus} successfully!`);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  if (loading) return <p className="text-center py-20 text-lg">Loading all bookings...</p>;
  if (error) return <p className="text-center py-20 text-red-600 text-lg">{error}</p>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">All Bookings</h1>
        <p className="text-xl text-gray-600 mb-10">
          View and manage every user hotel reservation
        </p>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">No bookings found</h3>
            <p className="text-gray-600">No hotel bookings have been made yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Hotel</th>
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
                              onClick={() => handleUpdateStatus(booking._id, 'confirmed')}
                              className="text-green-600 hover:text-green-800 transition"
                              title="Confirm Booking"
                            >
                              <CheckCircle className="h-6 w-6" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(booking._id, 'cancelled')}
                              className="text-red-600 hover:text-red-800 transition"
                              title="Cancel Booking"
                            >
                              <XCircle className="h-6 w-6" />
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
    </div>
  );
};

export default AdminBookings;