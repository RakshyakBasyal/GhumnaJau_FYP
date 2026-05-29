// frontend/src/pages/HotelDetail.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHotel, getImageUrl } from '../services/api';
import {
  MapPin, DollarSign, Star, X, ChevronLeft, ChevronRight,
  Loader2, CheckCircle, CreditCard, User, Navigation,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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
    <div id={MAP_ID} className="w-full h-full" style={{ zIndex: 0 }} />
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

  const coverImage    = hotel.images?.[0] ? getImageUrl(hotel.images[0]) : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg';
  const allImages     = hotel.images || [];
  const previewImages = allImages.slice(0, 3);
  const hasPin        = !!(hotel.location?.lat && hotel.location?.lng);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero — improved height */}
      <div className="relative h-80 bg-cover bg-center" style={{ backgroundImage: 'url(' + coverImage + ')' }}>
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 text-center">
          <h1 className="text-5xl font-bold mb-2">{hotel.name}</h1>
          <div className="flex items-center gap-2 text-lg mb-2">
            <MapPin size={18} />
            <span>{hotel.destination?.name || hotel.country || 'Nepal'}</span>
          </div>
          {reviewCount > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm">
              <Star size={13} className="fill-yellow-400 text-yellow-400" />
              <span className="font-bold">{avgRating || '5.0'}</span>
              <span className="text-white/70">· {reviewCount} reviews</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">

          {/* About */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">About {hotel.name}</h2>
            <p className="text-gray-600 leading-relaxed mb-5">{hotel.description || 'No description available.'}</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                <DollarSign size={22} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Starting from</p>
                  <p className="font-semibold text-sm">NPR {startingPrice.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <Star size={22} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Rating</p>
                  <p className="font-semibold text-sm">
                    {avgRating || hotel.rating || 5.0}
                    {reviewCount > 0 && <span className="text-xs text-gray-400 ml-1">({reviewCount})</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl">
                <MapPin size={22} className="text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-semibold text-sm">{hotel.destination?.name || hotel.country || 'Nepal'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gallery */}
          {allImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Gallery</h2>
                {allImages.length > 3 && (
                  <button onClick={() => setShowPhotos(true)} className="text-sm text-blue-600 font-semibold hover:underline">
                    View all ({allImages.length})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {previewImages.map((img, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl cursor-pointer aspect-video"
                    onClick={() => { setCurrentPhotoIndex(i); setShowPhotos(true); }}>
                    <img src={img?.startsWith('http') ? img : BASE_URL + img} alt={hotel.name + ' ' + (i + 1)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & Room Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Location & Map Card */}
            {hasPin && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[450px]">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-orange-600" />
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 leading-none">Location</h2>
                      <p className="text-[10px] text-gray-400 mt-1">{hotel.destination?.name || hotel.country || 'Nepal'}</p>
                    </div>
                  </div>
                  <a
                    href={'https://www.google.com/maps/search/?api=1&query=' + hotel.location.lat + ',' + hotel.location.lng}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    <Navigation size={13} /> Google Maps
                  </a>
                </div>
                <div className="flex-1 relative">
                  <HotelMap lat={hotel.location.lat} lng={hotel.location.lng} hotelName={hotel.name} />
                </div>
                <div className="px-5 py-2.5 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-medium bg-white">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={10} className="text-blue-500" />
                    {hotel.location.lat.toFixed(4)}, {hotel.location.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            )}

            {/* Right Column: Room Types Vertical List */}
            {hotel.roomTypes?.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Room Types</h2>
                <div className="space-y-3">
                  {hotel.roomTypes.map((room, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1 text-sm">{room.name}</h3>
                        {room.description && <p className="text-xs text-gray-500 line-clamp-2">{room.description}</p>}
                        {room.maxCapacity && <p className="text-xs text-gray-400 mt-1 font-medium">Up to {room.maxCapacity} guests</p>}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-base text-blue-600 font-bold">NPR {room.pricePerNight.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">per night</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Book Button */}
          <div className="text-center py-6">
            <button onClick={handleBookClick}
              className="px-12 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition shadow-lg transform hover:-translate-y-1 active:translate-y-0">
              Book This Hotel
            </button>
          </div>

          {/* Community Reviews */}
          <div id="reviews">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Star size={16} className="fill-amber-400 text-amber-400" /> Community Reviews
              </h2>
              {reviews.length > 1 && (
                <button onClick={() => setShowAllReviews(true)} className="text-sm text-blue-600 font-semibold hover:underline">
                  View all ({reviews.length})
                </button>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-6 text-center text-sm text-gray-400">
                No reviews yet. Be the first to share your experience!
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                      {reviews[0].author?.avatar
                        ? <img src={BASE_URL + reviews[0].author.avatar} alt={reviews[0].author.fullName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User size={13} className="text-blue-600" /></div>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{reviews[0].author?.fullName || 'Anonymous'}</p>
                      <p className="text-xs text-gray-400">{new Date(reviews[0].createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-700">{reviews[0].rating}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{reviews[0].content}</p>
                {reviews[0].images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
                    {reviews[0].images.map((img, idx) => (
                      <img key={idx} src={img?.startsWith('http') ? img : BASE_URL + img} alt="Review" className="h-20 w-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                        onClick={() => { setCurrentPhotoIndex(idx); setShowPhotos(true); }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* All Reviews Modal */}
      {showAllReviews && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-5 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowAllReviews(false)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">All Reviews — {hotel.name}</h2>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                        {review.author?.avatar
                          ? <img src={getImageUrl(review.author.avatar)} alt={review.author.fullName} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-blue-100"><User size={13} className="text-blue-600" /></div>}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.author?.fullName || 'Anonymous'}</p>
                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-amber-700">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{review.content}</p>
                  {review.images?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={img?.startsWith('http') ? img : BASE_URL + img} alt="Review" className="h-20 w-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition"
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
          <button onClick={() => setShowPhotos(false)} className="absolute top-6 right-6 bg-white/20 p-3 rounded-full hover:bg-white/40 transition">
            <X size={20} className="text-white" />
          </button>
          <button onClick={prevPhoto} className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 p-4 rounded-full hover:bg-white/40 transition">
            <ChevronLeft size={24} className="text-white" />
          </button>
          <button onClick={nextPhoto} className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 p-4 rounded-full hover:bg-white/40 transition">
            <ChevronRight size={24} className="text-white" />
          </button>
          <div className="max-w-5xl w-full px-4">
            <img src={getImageUrl(allImages[currentPhotoIndex])} alt={'Photo ' + (currentPhotoIndex + 1)}
              className="w-full max-h-[85vh] object-contain rounded-xl" />
            <p className="text-white text-center mt-3 text-sm">{currentPhotoIndex + 1} / {allImages.length}</p>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setShowBookingModal(false); setSuccessBooking(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-5 text-center">Book {hotel.name}</h2>

            {successBooking ? (
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900">Booking Confirmed!</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Pending admin approval.</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-100 mb-4">
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 mb-3">
                    <div><p className="text-xs text-gray-400">Check-in</p><p className="font-semibold">{new Date(checkIn).toLocaleDateString()}</p></div>
                    <div><p className="text-xs text-gray-400">Check-out</p><p className="font-semibold">{new Date(checkOut).toLocaleDateString()}</p></div>
                    <div><p className="text-xs text-gray-400">Room Type</p><p className="font-semibold">{selectedRoomType}</p></div>
                    <div><p className="text-xs text-gray-400">Guests</p><p className="font-semibold">{guests}</p></div>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">NPR {successBooking.totalAmount.toLocaleString()}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Unpaid</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handlePayNow} disabled={paymentLoading}
                    className={'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold transition ' + (paymentLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                    {paymentLoading ? <><Loader2 size={15} className="animate-spin" /> Redirecting...</> : <><CreditCard size={15} /> Pay Now</>}
                  </button>
                  <button onClick={() => { setShowBookingModal(false); setSuccessBooking(null); }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition">
                    Pay Later
                  </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-3">You can pay later from <strong>My Bookings</strong>.</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Date</label>
                    <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} min={new Date().toISOString().split('T')[0]} required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Check-out Date</label>
                    <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split('T')[0]} required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Guests</label>
                    <input type="number" min="1" max={maxCapacity} value={guests} onWheel={e => e.target.blur()}
                      onChange={e => setGuests(Math.max(1, Math.min(maxCapacity, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Room Type</label>
                    <select value={selectedRoomType} onChange={e => setSelectedRoomType(e.target.value)} required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      {hotel.roomTypes?.length > 0
                        ? hotel.roomTypes.map((r, i) => <option key={i} value={r.name}>{r.name} — NPR {r.pricePerNight.toLocaleString()}/night</option>)
                        : <option value="">No rooms available</option>}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+977 9876543210"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Summary</h3>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Nights</span><span>{nights}</span></div>
                    <div className="flex justify-between"><span>Guests</span><span>{guests}</span></div>
                    <div className="flex justify-between"><span>Room</span><span>{selectedRoomType || '—'}</span></div>
                    <div className="flex justify-between"><span>Per night</span><span>NPR {roomPrice.toLocaleString()}</span></div>
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-blue-600">NPR {totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={submitting}
                  className={'w-full py-3 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 ' + (submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> Booking...</> : 'Confirm Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-base font-bold text-gray-900">Confirm Booking</h3>
              <button onClick={() => setShowConfirmModal(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={16} className="text-gray-500" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700">Book <strong>{hotel.name}</strong>?</p>
              <p className="mt-3 text-sm text-gray-700">
                Total: <span className="font-bold text-blue-700">NPR {totalPrice.toLocaleString()}</span><br />
                <span className="text-gray-400">{checkIn && new Date(checkIn).toLocaleDateString()} — {checkOut && new Date(checkOut).toLocaleDateString()}</span>
              </p>
              <p className="mt-2 text-xs text-gray-400">You can choose to pay now or later.</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50">
              <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">Cancel</button>
              <button onClick={confirmBooking} disabled={submitting}
                className={'px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 ' + (submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetail;