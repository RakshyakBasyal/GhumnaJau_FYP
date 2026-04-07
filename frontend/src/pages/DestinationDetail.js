// frontend/src/pages/DestinationDetail.js
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin, DollarSign, Calendar, Plane, Hotel, X, ChevronLeft, ChevronRight, Star, MessageSquare, User } from 'lucide-react';

const BASE_URL = "http://localhost:5000";

const formatCostNPR = (dest) => {
  const hasAvg = dest.averageCost !== undefined && dest.averageCost !== null && dest.averageCost !== "";
  const hasMin = dest.averageCostMin !== undefined && dest.averageCostMin !== null && dest.averageCostMin !== "";
  const hasMax = dest.averageCostMax !== undefined && dest.averageCostMax !== null && dest.averageCostMax !== "";

  if (hasAvg) return `NPR ${Math.round(Number(dest.averageCost))}`;

  if (hasMin || hasMax) {
    const min = hasMin ? Math.round(Number(dest.averageCostMin)) : "";
    const max = hasMax ? Math.round(Number(dest.averageCostMax)) : "";
    if (min !== "" && max !== "") return `NPR ${min} - ${max}`;
    if (min !== "") return `From NPR ${min}`;
    if (max !== "") return `Up to NPR ${max}`;
  }

  return "Varies";
};

const DestinationDetail = () => {
  const { id } = useParams();

  const [destination, setDestination] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [flights, setFlights] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPhotos, setShowPhotos] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const [destRes, hotelsRes, flightsRes, reviewsRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/destinations/${id}`),
          axios.get(`${BASE_URL}/api/hotels?destination=${id}`),
          axios.get(`${BASE_URL}/api/flights?destination=${id}&isActive=true`),
          axios.get(`${BASE_URL}/api/posts/reviews?reviewType=destination&reviewRefId=${id}`, config)
        ]);

        setDestination(destRes.data);
        setHotels(hotelsRes.data || []);
        setFlights(flightsRes.data || []);
        setReviews(reviewsRes.data.posts || []);
        setAvgRating(reviewsRes.data.avgRating);
        setReviewCount(reviewsRes.data.count || 0);
      } catch (err) {
        console.error("Error fetching destination data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <p className="text-center py-20 text-xl">Loading destination details...</p>;
  if (!destination) return <p className="text-center py-20 text-xl text-gray-600">Destination not found</p>;

  const coverImage = destination.images?.[0]
    ? `${BASE_URL}${destination.images[0]}`
    : "https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg";

  const allImages = destination.images || [];
  const previewImages = allImages.slice(0, 3);

  const nextPhoto = () => setCurrentPhotoIndex((prev) => (prev + 1) % allImages.length);
  const prevPhoto = () => setCurrentPhotoIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{ backgroundImage: `url(${coverImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{destination.name}</h1>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-xl mb-2">
              <MapPin className="w-6 h-6" />
              <span>{destination.country || 'Nepal'}</span>
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-lg">{avgRating || '5.0'}</span>
                </div>
                <span className="text-white/80 text-sm">| {reviewCount} reviews from community</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* About */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">About {destination.name}</h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-8">
            {destination.description || 'No detailed description available yet.'}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-xl">
              <Calendar className="w-10 h-10 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Best Time</p>
                <p className="font-semibold text-gray-900 text-lg">{destination.bestTimeToVisit || 'Year-round'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-green-50 rounded-xl">
              <DollarSign className="w-10 h-10 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Avg Cost</p>
                <p className="font-semibold text-gray-900 text-lg">{formatCostNPR(destination)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-5 bg-orange-50 rounded-xl">
              <MapPin className="w-10 h-10 text-orange-600 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600">Country</p>
                <p className="font-semibold text-gray-900 text-lg">{destination.country || 'Nepal'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {allImages.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Gallery</h2>
              {allImages.length > 3 && (
                <button
                  onClick={() => setShowPhotos(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  View All ({allImages.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewImages.map((img, i) => (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer"
                  onClick={() => { setCurrentPhotoIndex(i); setShowPhotos(true); }}
                >
                  <img
                    src={`${BASE_URL}${img}`}
                    alt={`${destination.name} photo ${i + 1}`}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium">Click to enlarge</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hotels */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-blue-100 p-4 rounded-full">
              <Hotel className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Hotels in {destination.name}</h2>
          </div>

          {hotels.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
              No hotels listed for this destination yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hotels.map(hotel => (
                <Link
                  key={hotel._id}
                  to={`/hotels/${hotel._id}`}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition group"
                >
                  {hotel.images?.[0] && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={`${BASE_URL}${hotel.images[0]}`}
                        alt={hotel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {hotel.name}
                    </h3>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(hotel.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 ml-1">
                        ({hotel.rating?.toFixed(1) || '5.0'})
                        {hotel.reviewCount > 0 && <span className="text-[10px] ml-1">({hotel.reviewCount})</span>}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {hotel.shortDescription || hotel.description?.substring(0, 120) || 'No description available'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Starting from</p>
                        <p className="text-xl font-bold text-blue-700">
                          NPR {Math.min(...(hotel.roomTypes?.map(rt => rt.pricePerNight) || [0])).toLocaleString() || '—'}
                        </p>
                      </div>
                      <span className="text-blue-600 font-medium group-hover:underline">View Details →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Flights */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-indigo-100 p-4 rounded-full">
              <Plane className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Flights to {destination.name}</h2>
          </div>

          {flights.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
              No active flights available to this destination at the moment.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {flights.map(flight => (
                <div
                  key={flight._id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {flight.airline} {flight.flightNumber}
                        </h3>
                        <p className="text-gray-600">{flight.from} → {flight.to}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {flight.class}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Departure</span>
                        <span className="font-medium">
                          {new Date(flight.departureDate).toLocaleDateString()} {flight.departureTime}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration</span>
                        <span className="font-medium">{flight.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Seats Available</span>
                        <span className="font-medium">{flight.availableSeats}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-4">
                      <div>
                        <p className="text-sm text-gray-600">Price</p>
                        <p className="text-2xl font-bold text-indigo-700">
                          NPR {Number(flight.price).toLocaleString()}
                        </p>
                      </div>
                      {/* ✅ Pass flight ID in URL so Flights page auto-opens booking form */}
                      <Link
                        to={`/flights?openFlight=${flight._id}`}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Reviews */}
        <div id="reviews" className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Community Reviews</h2>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-600">
              No reviews from the community yet. Be the first to share your experience on the feed!
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                        {review.author?.avatar ? (
                          <img src={`${BASE_URL}${review.author.avatar}`} alt={review.author.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                            <User className="w-6 h-6" />
                          </div>
                        )}
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
                        <img key={idx} src={`${BASE_URL}${img}`} alt="Review photo" className="h-24 w-24 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition" onClick={() => { setCurrentPhotoIndex(idx); setShowPhotos(true); }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen Photo Viewer */}
      {showPhotos && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setShowPhotos(false)}
            className="absolute top-6 right-6 z-10 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition"
          >
            <X className="h-8 w-8 text-white" />
          </button>
          <button
            onClick={prevPhoto}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-5 rounded-full hover:bg-white/40 transition"
          >
            <ChevronLeft className="h-10 w-10 text-white" />
          </button>
          <button
            onClick={nextPhoto}
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-5 rounded-full hover:bg-white/40 transition"
          >
            <ChevronRight className="h-10 w-10 text-white" />
          </button>
          <div className="relative max-w-6xl w-full px-6">
            <img
              src={`${BASE_URL}${allImages[currentPhotoIndex]}`}
              alt={`${destination.name} photo ${currentPhotoIndex + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <p className="text-white text-center mt-6 text-lg">
              {currentPhotoIndex + 1} of {allImages.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationDetail;