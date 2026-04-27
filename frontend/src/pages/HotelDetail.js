// frontend/src/pages/HotelDetail.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHotel } from '../services/api';
import {
  MapPin, DollarSign, Star, X, ChevronLeft, ChevronRight,
  Loader2, CheckCircle, CreditCard, User, Navigation,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const BASE_URL    = 'http://localhost:5000';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Same CartoDB Voyager style as the admin picker
const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

// ── Read-only map shown on the hotel detail page ──────────────────────────────
function HotelMap({ lat, lng, hotelName }) {
  const mapRef = useRef(null);
  const MAP_ID = 'hotel-detail-map';

  useEffect(() => {
    loadLeaflet().then((L) => {
      const container = document.getElementById(MAP_ID);
      if (!container) return;
      if (container._leaflet_id) container._leaflet_id = null;

      const map = L.map(MAP_ID, { scrollWheelZoom: false, dragging: true, zoomControl: true })
        .setView([lat, lng], 15);
      mapRef.current = map;

      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19 }).addTo(map);

      // Blue teardrop pin matching the admin picker style
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:36px;height:46px;position:relative;">
          <div style="
            width:36px;height:36px;
            background:#2563eb;
            border:3px solid white;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            box-shadow:0 4px 14px rgba(0,0,0,0.35);
          "></div>
        </div>`,
        iconSize:   [36, 46],
        iconAnchor: [18, 46],
        popupAnchor:[0, -46],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`<strong style="font-size:13px">${hotelName}</strong>`)
        .openPopup();
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [lat, lng, hotelName]);

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-3xl font-bold text-gray-800">Location</h2>
        <a
          href={'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <Navigation size={14} /> Open in Google Maps
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div id={MAP_ID} style={{ height: 380, width: '100%', zIndex: 0 }} />
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500">
          <MapPin size={14} className="text-blue-600 flex-shrink-0" />
          <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const HotelDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { showToast } = useToast();

  const [hotel,       setHotel]       = useState(null);
  const [reviews,     setReviews]     = useState([]);
  const [avgRating,   setAvgRating]   = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  const [showPhotos,        setShowPhotos]        = useState(false);
  const [showAllReviews,    setShowAllReviews]    = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showBookingModal,  setShowBookingModal]  = useState(false);

  const [checkIn,          setCheckIn]          = useState('');
  const [checkOut,         setCheckOut]         = useState('');
  const [guests,           setGuests]           = useState(1);
  const [selectedRoomType, setSelectedRoomType] = useState('');
  const [email,            setEmail]            = useState('');
  const [phone,            setPhone]            = useState('');
  const [submitting,       setSubmitting]       = useState(false);
  const [paymentLoading,   setPaymentLoading]   = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successBooking,   setSuccessBooking]   = useState(null);

  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token  = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: 'Bearer ' + token } } : {};
        const [hotelRes, revRes] = await Promise.all([
          getHotel(id),
          axios.get(BASE_URL + '/api/posts/reviews?reviewType=hotel&reviewRefId=' + id, config),
        ]);
        setHotel(hotelRes.data);
        if (hotelRes.data.roomTypes?.length > 0) setSelectedRoomType(hotelRes.data.roomTypes[0].name);
        setReviews(revRes.data.posts || []);
        setAvgRating(revRes.data.avgRating);
        setReviewCount(revRes.data.count || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetch_();
  }, [id]);

  const startingPrice = hotel?.roomTypes?.length > 0
    ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight)) : 0;

  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000)) : 1;

  const selectedRoom = hotel?.roomTypes?.find(r => r.name === selectedRoomType);
  const roomPrice    = selectedRoom?.pricePerNight || 0;
  const maxCapacity  = selectedRoom?.maxCapacity   || 10;
  const totalPrice   = roomPrice * nights;

  const handleBookClick = () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: '/hotels/' + id } }); return; }
    setSuccessBooking(null); setShowBookingModal(true);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!email || !phone || !checkIn || !checkOut || !selectedRoomType) {
      showToast('Please fill all required fields', 'error'); return;
    }
    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(checkIn) < today)                { showToast('Check-in must be today or later', 'error'); return; }
    if (new Date(checkOut) <= new Date(checkIn))  { showToast('Check-out must be after check-in', 'error'); return; }
    if (guests > maxCapacity)                     { showToast('Max ' + maxCapacity + ' guests for ' + selectedRoomType, 'error'); return; }
    setShowConfirmModal(true);
  };

  const confirmBooking = async () => {
    setSubmitting(true); setShowConfirmModal(false);
    try {
      const res = await fetch(BASE_URL + '/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ type: 'hotel', hotelId: hotel._id, roomType: selectedRoomType, checkIn, checkOut, guests, totalAmount: totalPrice }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Booking failed'); }
      const data = await res.json();
      setSuccessBooking({ bookingId: data.booking._id, totalAmount: totalPrice });
      showToast('Hotel booked!', 'success');
    } catch (err) { showToast(err.message || 'Something went wrong', 'error'); }
    finally { setSubmitting(false); }
  };

  const handlePayNow = async () => {
    if (!successBooking) return;
    setPaymentLoading(true);
    try {
      const res = await fetch(BASE_URL + '/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({ bookingId: successBooking.bookingId, amount: successBooking.totalAmount }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.msg || 'Payment failed'); }
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (err) { showToast('Payment failed: ' + err.message, 'error'); }
    finally { setPaymentLoading(false); }
  };

  const nextPhoto = () => setCurrentPhotoIndex(p => (p + 1) % (hotel?.images?.length || 1));
  const prevPhoto = () => setCurrentPhotoIndex(p => (p - 1 + (hotel?.images?.length || 1)) % (hotel?.images?.length || 1));

  if (loading) return <p className="text-center py-20 text-xl">Loading hotel...</p>;
  if (!hotel)  return <p className="text-center py-20 text-gray-600 text-xl">Hotel not found</p>;

  const coverImage    = hotel.images?.[0] ? BASE_URL + hotel.images[0] : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg';
  const allImages     = hotel.images || [];
  const previewImages = allImages.slice(0, 3);
  const hasPin        = !!(hotel.location?.lat && hotel.location?.lng);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="relative h-96 bg-cover bg-center" style={{ backgroundImage: 'url(' + coverImage + ')' }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
          <h1 className="text-6xl font-bold mb-4">{hotel.name}</h1>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              <span className="text-2xl">{hotel.destination?.name || hotel.country || 'Nepal'}</span>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-lg">{avgRating || '5.0'}</span>
                <span className="text-white/80 text-sm">| {reviewCount} reviews</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* About */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">About {hotel.name}</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">{hotel.description || 'No description available.'}</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Starting from</p>
                <p className="font-semibold text-gray-800">NPR {startingPrice.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="font-semibold text-gray-800">
                  {avgRating || hotel.rating || 5.0}
                  {reviewCount > 0 && <span className="text-xs text-gray-400 ml-1">({reviewCount})</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">{hotel.destination?.name || hotel.country || 'Nepal'}</p>
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
                <button onClick={() => setShowPhotos(true)} className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                  View all ({allImages.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {previewImages.map((img, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer"
                  onClick={() => { setCurrentPhotoIndex(i); setShowPhotos(true); }}>
                  <img src={BASE_URL + img} alt={hotel.name + ' ' + (i + 1)} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium">Click to enlarge</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Map — only shown when admin has set a pin ─────────────────── */}
        {hasPin && (
          <HotelMap lat={hotel.location.lat} lng={hotel.location.lng} hotelName={hotel.name} />
        )}

        {/* Book Button */}
        <div className="text-center mb-16">
          <button onClick={handleBookClick}
            className="px-12 py-5 bg-blue-600 text-white rounded-xl text-xl font-bold hover:bg-blue-700 transition shadow-lg">
            Book This Hotel
          </button>
        </div>

        {/* Community Reviews */}
        <div id="reviews">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-4 rounded-full">
                <Star className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Community Reviews</h2>
            </div>
            {reviews.length > 1 && (
              <button onClick={() => setShowAllReviews(true)} className="text-blue-600 font-bold hover:underline">
                View All ({reviews.length})
              </button>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
              No reviews yet. Be the first to share your experience!
            </div>
          ) : (
            <div className="space-y-6">
              {[reviews[0]].map((review) => (
                <div key={review._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                        {review.author?.avatar
                          ? <img src={BASE_URL + review.author.avatar} alt={review.author.fullName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User className="w-6 h-6 text-blue-600" /></div>}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{review.author?.fullName || 'Anonymous'}</h4>
                        <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-amber-700">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{review.content}</p>
                  {review.images?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={BASE_URL + img} alt="Review" className="h-24 w-24 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                          onClick={() => { setCurrentPhotoIndex(idx); setShowPhotos(true); }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Reviews Modal */}
      {showAllReviews && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAllReviews(false)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
              <X className="h-7 w-7" />
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">All Reviews — {hotel.name}</h2>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                        {review.author?.avatar
                          ? <img src={BASE_URL + review.author.avatar} alt={review.author.fullName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User className="w-6 h-6 text-blue-600" /></div>}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{review.author?.fullName || 'Anonymous'}</h4>
                        <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-amber-700">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">{review.content}</p>
                  {review.images?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={BASE_URL + img} alt="Review" className="h-32 w-32 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                          onClick={() => { setCurrentPhotoIndex(idx); setShowPhotos(true); }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {showPhotos && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button onClick={() => setShowPhotos(false)} className="absolute top-6 right-6 z-10 bg-white/20 p-4 rounded-full hover:bg-white/40 transition">
            <X className="h-8 w-8 text-white" />
          </button>
          <button onClick={prevPhoto} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 p-5 rounded-full hover:bg-white/40 transition">
            <ChevronLeft className="h-10 w-10 text-white" />
          </button>
          <button onClick={nextPhoto} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 p-5 rounded-full hover:bg-white/40 transition">
            <ChevronRight className="h-10 w-10 text-white" />
          </button>
          <div className="relative max-w-5xl w-full px-4">
            <img src={BASE_URL + allImages[currentPhotoIndex]} alt={'Photo ' + (currentPhotoIndex + 1)}
              className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            <p className="text-white text-center mt-4 text-lg">{currentPhotoIndex + 1} / {allImages.length}</p>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowBookingModal(false); setSuccessBooking(null); }} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900">
              <X className="h-7 w-7" />
            </button>
            <h2 className="text-3xl font-bold text-gray-900 mb-5 text-center">Book {hotel.name}</h2>

            {successBooking ? (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-5">
                  <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Booking Confirmed!</h3>
                    <p className="text-gray-600 mt-0.5">Pending admin approval.</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-green-100 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                    <div><p className="text-gray-500">Check-in</p><p className="font-semibold">{new Date(checkIn).toLocaleDateString()}</p></div>
                    <div><p className="text-gray-500">Check-out</p><p className="font-semibold">{new Date(checkOut).toLocaleDateString()}</p></div>
                    <div><p className="text-gray-500">Room Type</p><p className="font-semibold">{selectedRoomType}</p></div>
                    <div><p className="text-gray-500">Guests</p><p className="font-semibold">{guests}</p></div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-3xl font-bold text-blue-600">NPR {successBooking.totalAmount.toLocaleString()}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">Unpaid</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={handlePayNow} disabled={paymentLoading}
                    className={'flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-white font-bold text-lg transition shadow-md ' + (paymentLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                    {paymentLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Redirecting...</> : <><CreditCard className="h-5 w-5" /> Pay Now</>}
                  </button>
                  <button onClick={() => { setShowBookingModal(false); setSuccessBooking(null); }}
                    className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50 transition">
                    Pay Later
                  </button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">You can pay later from <strong>My Bookings</strong>.</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1.5">Check-in Date</label>
                    <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={new Date().toISOString().split('T')[0]} required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1.5">Check-out Date</label>
                    <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split('T')[0]} required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1.5">Number of Guests</label>
                    <input type="number" min="1" max={maxCapacity} value={guests} onWheel={e => e.target.blur()}
                      onChange={e => setGuests(Math.max(1, Math.min(maxCapacity, parseInt(e.target.value) || 1)))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-1.5">Room Type</label>
                    <select value={selectedRoomType} onChange={e => setSelectedRoomType(e.target.value)} required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      {hotel.roomTypes?.length > 0
                        ? hotel.roomTypes.map((r, i) => <option key={i} value={r.name}>{r.name} — NPR {r.pricePerNight.toLocaleString()} / night</option>)
                        : <option value="">No rooms available</option>}
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+977 9876543210"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 p-5 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Price Summary</h3>
                  <div className="space-y-2 text-base text-gray-700">
                    <div className="flex justify-between"><span>Nights</span><span>{nights}</span></div>
                    <div className="flex justify-between"><span>Guests</span><span>{guests}</span></div>
                    <div className="flex justify-between"><span>Room</span><span>{selectedRoomType || '—'}</span></div>
                    <div className="flex justify-between"><span>Per night</span><span>NPR {roomPrice.toLocaleString()}</span></div>
                    <div className="border-t border-gray-300 pt-3 mt-3 flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">NPR {totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className={'w-full py-3.5 text-white rounded-xl text-lg font-bold transition flex items-center justify-center gap-2 ' + (submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                  {submitting ? <><Loader2 className="h-6 w-6 animate-spin" /> Booking...</> : 'Confirm Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">Confirm Booking</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="h-6 w-6 text-gray-600" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">Book <strong>{hotel.name}</strong>?</p>
              <p className="mt-4 text-sm text-gray-700">
                Total: <span className="font-bold text-blue-700">NPR {totalPrice.toLocaleString()}</span><br />
                {checkIn && new Date(checkIn).toLocaleDateString()} — {checkOut && new Date(checkOut).toLocaleDateString()}
              </p>
              <p className="mt-3 text-sm text-gray-500">You can choose to pay now or later.</p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button onClick={() => setShowConfirmModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
              <button onClick={confirmBooking} disabled={submitting}
                className={'px-6 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 ' + (submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetail;

