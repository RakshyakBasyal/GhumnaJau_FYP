// frontend/src/pages/HotelDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHotel } from '../services/api';
import { MapPin, DollarSign, Star, X, ChevronLeft, ChevronRight, Calendar, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const BASE_URL = "http://localhost:5000";

const HotelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPhotos, setShowPhotos] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking form states
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Booking submission states
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmBookingModal, setShowConfirmBookingModal] = useState(false);

  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const res = await getHotel(id);
        setHotel(res.data);
        if (res.data.roomTypes?.length > 0) {
          setSelectedRoomType(res.data.roomTypes[0].name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [id]);

  // Lowest price for "Starting from"
  const startingPrice = hotel?.roomTypes?.length > 0
    ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight))
    : hotel?.pricePerNight || 0;

  // Nights & total price
  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
    : 1;

  const selectedRoom = hotel?.roomTypes?.find(r => r.name === selectedRoomType);
  const roomPrice = selectedRoom ? selectedRoom.pricePerNight : 0;
  const maxCapacity = selectedRoom ? selectedRoom.maxCapacity : 10;
  const totalPrice = roomPrice * nights;

  const guestsWarning = guests > maxCapacity ? `Maximum ${maxCapacity} guests allowed for ${selectedRoomType}` : '';

  // Protected book button
  const handleBookClick = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/hotels/${id}` } });
      return;
    }
    setShowBookingModal(true);
  };

  // Trigger confirmation before submitting
  const handleBookingSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !phone || !checkIn || !checkOut || !selectedRoomType) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (guests > maxCapacity) {
      showToast(`Maximum ${maxCapacity} guests allowed for ${selectedRoomType}`, 'error');
      return;
    }

    // Show confirmation modal
    setShowConfirmBookingModal(true);
  };

  // Final submit after user confirms
  const confirmBooking = async () => {
    setSubmitting(true);
    setShowConfirmBookingModal(false);

    try {
      const response = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          hotelId: hotel._id,
          roomType: selectedRoomType,
          checkIn,
          checkOut,
          guests,
          totalAmount: totalPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Booking failed');
      }

      showToast('Booking confirmed successfully!', 'success');
      setShowBookingModal(false);

      // Clear form
      setCheckIn('');
      setCheckOut('');
      setGuests(1);
      setSelectedRoomType(hotel?.roomTypes?.[0]?.name || '');
      setEmail('');
      setPhone('');
    } catch (err) {
      console.error('Booking error:', err);
      showToast('Failed to book: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = () => {
    setShowConfirmBookingModal(false);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % (hotel?.images?.length || 1));
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + (hotel?.images?.length || 1)) % (hotel?.images?.length || 1));
  };

  if (loading) return <p className="text-center py-20 text-xl">Loading hotel...</p>;
  if (!hotel) return <p className="text-center py-20 text-xl text-gray-600">Hotel not found</p>;

  const coverImage = hotel.images?.[0]
    ? `${BASE_URL}${hotel.images[0]}`
    : "https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg";

  const allImages = hotel.images || [];
  const previewImages = allImages.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{ backgroundImage: `url(${coverImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
          <h1 className="text-6xl font-bold mb-4">{hotel.name}</h1>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            <span className="text-2xl">{hotel.destination?.name || hotel.country || 'Nepal'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Info Cards */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            About {hotel.name}
          </h2>

          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {hotel.description || 'No description available yet.'}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Starting from</p>
                <p className="font-semibold text-gray-800">
                  NPR {startingPrice.toLocaleString() || 'Varies'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="font-semibold text-gray-800">
                  {hotel.rating || 5}.0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">
                  {hotel.destination?.name || hotel.country || 'Nepal'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Gallery</h2>

              {allImages.length > 3 && (
                <button
                  onClick={() => setShowPhotos(true)}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  View all photos ({allImages.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {previewImages.map((img, i) => (
                <img
                  key={i}
                  src={`${BASE_URL}${img}`}
                  alt={`${hotel.name} ${i + 1}`}
                  className="w-full h-64 object-cover rounded-xl shadow-lg cursor-pointer"
                  onClick={() => {
                    setCurrentPhotoIndex(i);
                    setShowPhotos(true);
                  }}
                />
              ))}
            </div>

            {allImages.length <= 3 && allImages.length > 1 && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setCurrentPhotoIndex(0);
                    setShowPhotos(true);
                  }}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  View all photos ({allImages.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Book This Hotel Button */}
        <div className="text-center">
          <button
            onClick={handleBookClick}
            className="px-12 py-5 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 transition shadow-lg"
          >
            Book This Hotel
          </button>
        </div>
      </div>

      {/* Swipeable Photo Modal */}
      {showPhotos && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setShowPhotos(false)}
            className="absolute top-6 right-6 z-10 bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/40 transition"
          >
            <X className="h-7 w-7 text-white" />
          </button>

          <button
            onClick={prevPhoto}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>

          <button
            onClick={nextPhoto}
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>

          <div className="relative max-w-5xl w-full px-4">
            <img
              src={`${BASE_URL}${allImages[currentPhotoIndex]}`}
              alt={`${hotel.name} photo ${currentPhotoIndex + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="text-white text-center mt-4 text-lg">
              {currentPhotoIndex + 1} / {allImages.length}
            </p>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-8 relative">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-5 right-5 text-gray-600 hover:text-gray-900"
            >
              <X className="h-7 w-7" />
            </button>

            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Book {hotel.name}
            </h2>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {/* Dates */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Guests & Room Type */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {guestsWarning && (
                    <p className="mt-2 text-red-600 text-base flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {guestsWarning}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Room Type
                  </label>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    {hotel.roomTypes?.length > 0 ? (
                      hotel.roomTypes.map((room, i) => (
                        <option key={i} value={room.name}>
                          {room.name} - NPR {room.pricePerNight.toLocaleString()} / night
                        </option>
                      ))
                    ) : (
                      <option value="">No rooms available</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+977 9876543210"
                  />
                </div>
              </div>

              {/* Price Summary */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Summary</h3>
                <div className="space-y-3 text-base text-gray-700">
                  <div className="flex justify-between">
                    <span>Nights:</span>
                    <span>{nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span>{guests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Room Type:</span>
                    <span>{selectedRoomType || 'Not selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price per night:</span>
                    <span>NPR {roomPrice.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">NPR {totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 text-white rounded-xl text-lg font-bold transition mt-6 flex items-center justify-center gap-2 ${
                  submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Booking */}
      {showConfirmBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">Confirm Booking</h3>
              <button
                onClick={cancelBooking}
                className="p-1 rounded-full hover:bg-gray-100 transition"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 text-base">
                Are you sure you want to confirm this booking for <strong>{hotel.name}</strong>?
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Total: <span className="font-bold text-blue-600">NPR {totalPrice.toLocaleString()}</span>
                <br />
                Dates: {new Date(checkIn).toLocaleDateString()} - {new Date(checkOut).toLocaleDateString()}
              </p>
              <p className="mt-4 text-red-600 font-medium text-sm">
                This will create a booking request. Pending bookings require admin confirmation.
              </p>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={cancelBooking}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmBooking}
                disabled={submitting}
                className={`px-6 py-2.5 text-white rounded-lg font-medium transition flex items-center gap-2 ${
                  submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetail;