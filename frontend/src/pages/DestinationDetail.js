// frontend/src/pages/DestinationDetail.js
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { MapPin, DollarSign, Calendar, Plane, Hotel, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [showPhotos, setShowPhotos] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0); // New: for swipe

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/destinations/${id}`);
        setDestination(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDestination();
  }, [id]);

  if (loading) return <p className="text-center py-20 text-xl">Loading destination...</p>;
  if (!destination) return <p className="text-center py-20 text-xl text-gray-600">Destination not found</p>;

  const coverImage =
    destination.images && destination.images[0]
      ? `${BASE_URL}${destination.images[0]}`
      : "https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg";

  const allImages = destination.images || [];
  const previewImages = allImages.slice(0, 3);

  // Swipe functions
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{ backgroundImage: `url(${coverImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
          <h1 className="text-6xl font-bold mb-4">{destination.name}</h1>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            <span className="text-2xl">{destination.country || 'Nepal'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* About */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            About {destination.name}
          </h2>

          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            {destination.description || 'No description available yet.'}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Best Time to Visit</p>
                <p className="font-semibold text-gray-800">
                  {destination.bestTimeToVisit || 'Year-round'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Average Cost</p>
                <p className="font-semibold text-gray-800">
                  {formatCostNPR(destination)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">
                  {destination.country || 'Nepal'}
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
                  alt={`${destination.name} ${i + 1}`}
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

        {/* Hotels & Flights */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Hotel className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Hotels</h2>
            </div>
            <p className="text-gray-600">Hotel listings coming soon...</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Plane className="w-8 h-8 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Flights</h2>
            </div>
            <p className="text-gray-600">Flight options coming soon...</p>
          </div>
        </div>
      </div>

      {/* Full-screen Swipeable Photo Modal */}
      {showPhotos && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setShowPhotos(false)}
            className="absolute top-6 right-6 z-10 bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/40 transition"
          >
            <X className="h-7 w-7 text-white" />
          </button>

          {/* Previous */}
          <button
            onClick={prevPhoto}
            className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition"
          >
            <ChevronLeft className="h-8 w-8 text-white" />
          </button>

          {/* Next */}
          <button
            onClick={nextPhoto}
            className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm p-4 rounded-full hover:bg-white/40 transition"
          >
            <ChevronRight className="h-8 w-8 text-white" />
          </button>

          {/* Current Photo */}
          <div className="relative max-w-5xl w-full px-4">
            <img
              src={`${BASE_URL}${allImages[currentPhotoIndex]}`}
              alt={`${destination.name} photo ${currentPhotoIndex + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="text-white text-center mt-4 text-lg">
              {currentPhotoIndex + 1} / {allImages.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DestinationDetail;