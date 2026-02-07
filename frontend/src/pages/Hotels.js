// frontend/src/pages/Hotels.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import { getHotels } from '../services/api';

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [destinations, setDestinations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await getHotels();
        const data = res.data || [];
        setHotels(data);

        // Extract unique destinations
        const uniqueDest = [...new Set(data.map(h => h.destination?.name || 'Unknown'))];
        setDestinations(uniqueDest);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHotels();
  }, []);

  const filteredHotels =
    selectedDestination === 'all'
      ? hotels
      : hotels.filter(h => h.destination?.name === selectedDestination);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hotels</h1>
          <p className="text-xl text-gray-600">
            Find the perfect accommodation for your stay
          </p>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Destination
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">All Destinations</option>
            {destinations.map((dest) => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel._id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
              onClick={() => navigate(`/hotels/${hotel._id}`)}
            >
              <div className="relative h-56">
                <img
                  src={hotel.images?.[0] ? `http://localhost:5000${hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full flex items-center space-x-1 shadow">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{hotel.rating || 5}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{hotel.destination?.name || 'Unknown'}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {hotel.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {hotel.shortDescription || 'No short description'}
                </p>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Amenities:</p>
                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities?.slice(0, 3).map((amenity, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Starting from</p>
                    <p className="text-2xl font-bold text-blue-600">
                      NPR {hotel.pricePerNight?.toLocaleString() || 'Varies'}
                    </p>
                  </div>
                  <button
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hotels;


