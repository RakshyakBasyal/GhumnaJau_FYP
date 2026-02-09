// frontend/src/pages/MyBookings.jsx
import { useEffect, useState } from 'react';
import { Calendar, Users, IndianRupee, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BASE_URL = "http://localhost:5000";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(`${BASE_URL}/api/bookings/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Bookings</h1>
        <p className="text-xl text-gray-600 mb-10">
          View and manage your hotel reservations
        </p>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              No bookings yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start exploring hotels and make your first reservation today!
            </p>
            <button
              onClick={() => navigate('/hotels')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Browse Hotels
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Hotel Image */}
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

                  {/* Booking Details */}
                  <div className="p-6 flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {booking.hotel?.name || 'Hotel Name'}
                        </h3>
                        <p className="text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="h-4 w-4" />
                          {booking.hotel?.destination?.name || 'Destination'}
                        </p>
                      </div>

                      <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
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
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-600 flex items-center justify-end gap-1">
                          <IndianRupee className="h-5 w-5" />
                          {booking.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;