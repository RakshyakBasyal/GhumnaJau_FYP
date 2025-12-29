import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin, DollarSign, Calendar, Star, Plane, Hotel } from 'lucide-react';

const DestinationDetail = () => {
  const { id } = useParams();
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/destinations/${id}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-96 bg-cover bg-center"
        style={{
          backgroundImage: destination.images && destination.images[0] 
            ? `ur[](http://localhost:5000${destination.images[0]})` 
            : 'ur[](https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg)'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
          <h1 className="text-6xl font-bold mb-4">{destination.name}</h1>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            <span className="text-2xl">{destination.location || 'Nepal'}</span>
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
                  {destination.averageCost || '$800 - $1500'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <MapPin className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-gray-800">
                  {destination.location || 'Nepal'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        {destination.images && destination.images.length > 1 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {destination.images.slice(1).map((img, i) => (
                <img 
                  key={i}
                  src={`http://localhost:5000${img}`} 
                  alt={`${destination.name} gallery`}
                  className="w-full h-64 object-cover rounded-xl shadow-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Hotels & Flights Placeholders */}
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
    </div>
  );
};

export default DestinationDetail;