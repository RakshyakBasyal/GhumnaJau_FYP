// src/pages/Landing.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDestinations } from '../services/api';
import { Search, MapPin, Calendar, DollarSign, Shield, Users, Star, TrendingUp } from 'lucide-react';


const Landing = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getDestinations()
      .then(res => setDestinations(res.data))
      .catch(() => setDestinations([]));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/destinations?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const popular = destinations.slice(0, 6); // Show only 6 

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        className="relative h-[550px] bg-cover bg-center flex items-center justify-center"
        style={{

          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://plus.unsplash.com/premium_photo-1692976236758-817620ab62ba?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
        }}
      >
        <div className="text-center text-white px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Your Next Adventure
          </h1>
          <p className="text-lg md:text-xl mb-8">
            Explore breathtaking destinations across Nepal with Ghumna Jau
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="bg-white rounded-full shadow-xl flex items-center p-2 h-15 w-350">
              <MapPin className="h-5 w-5 text-gray-500 ml-2" />
              <input
                type="text"
                placeholder="Where do you want to go?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-2 py-3 text-gray-800 outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-3 rounded-full hover:bg-blue-700 transition flex items-center space-x-2 mr-2"
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>


      {/* Why Choose Us Section */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Why Choose Ghumna Jau?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your trusted companion for unforgettable travel experiences
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition">
              <div className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Best Destinations</h3>
              <p className="text-gray-600 text-sm">
                Curated selection of Nepal's most stunning locations
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition">
              <div className="bg-green-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600 text-sm">
                Verified hotels, flights, and restaurants for your safety
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition">
              <div className="bg-purple-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Travel Community</h3>
              <p className="text-gray-600 text-sm">
                Connect with fellow travelers and find travel buddies
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition">
              <div className="bg-orange-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Top Rated</h3>
              <p className="text-gray-600 text-sm">
                Highly rated services and experiences by travelers
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Popular Destinations
            </h2>
            <p className="text-xl text-gray-600">
              Explore the most loved destinations in Nepal
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {popular.length === 0 ? (
              <p className="text-center text-gray-600 col-span-3 py-10">
                No destinations added yet
              </p>
            ) : (
              popular.map((destination) => (
                <div
                  key={destination._id}
                  className="relative h-80 bg-cover bg-center rounded-xl overflow-hidden group cursor-pointer"
                  onClick={() => navigate(`/destinations/${destination._id}`)}
                  style={{
                    backgroundImage: destination.images?.[0]
                      ? `url(http://localhost:5000${destination.images[0]})`
                      : `url(https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg)`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 group-hover:from-black/80 transition">
                    <div>
                      <h3 className="text-white text-2xl font-bold mb-2">
                        {destination.name}
                      </h3>
                      <p className="text-white/90">
                        {destination.shortDescription || "Explore this destination"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/destinations')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
            >
              <span>View All Destinations</span>
              {/* <TrendingUp className="h-5 w-5" /> */}
              <Star className="h-5 w-5" />

            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;

