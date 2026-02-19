// frontend/src/pages/Landing.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDestinations } from '../services/api';
import { Search, MapPin, Shield, Users, Star, X } from 'lucide-react';
import { motion } from 'framer-motion';

const BASE_URL = "http://localhost:5000";

const Landing = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getDestinations()
      .then(res => setDestinations(res.data || []))
      .catch(() => setDestinations([]));
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = destinations
        .filter(dest => dest.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 6);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, destinations]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (dest) => {
    setSearchQuery(dest.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    navigate(`/destinations?search=${encodeURIComponent(dest.name)}`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/destinations?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Hero Section */}
      <section
        className="relative h-[600px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('https://plus.unsplash.com/premium_photo-1692976236758-817620ab62ba?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0')`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center text-white px-4 max-w-4xl z-10"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-5 drop-shadow-lg">
            Discover Your Next Adventure
          </h1>
          <p className="text-lg md:text-2xl mb-10 drop-shadow-md">
            Explore breathtaking destinations across Nepal with Ghumna Jau
          </p>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Where do you want to go?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-28 py-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full text-lg text-gray-900 placeholder-gray-500 shadow-lg focus:shadow-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300"
                />

                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 pointer-events-none" />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                )}

                <button
                  type="submit"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Suggestions */}
            {showSuggestions && searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 w-full mt-3 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-80"
              >
                {suggestions.length > 0 ? (
                  suggestions.map((dest, index) => (
                    <div
                      key={dest._id}
                      onClick={() => handleSelect(dest)}
                      className={`flex items-center gap-4 px-5 py-3 hover:bg-blue-50 cursor-pointer transition ${index === highlightedIndex ? 'bg-blue-50' : ''}`}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {dest.images?.[0] ? (
                          <img
                            src={`${BASE_URL}${dest.images[0]}`}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{dest.name}</p>
                        <p className="text-sm text-gray-600">{dest.country || 'Nepal'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-6 text-center text-gray-500">
                    No destinations found
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

{/* Why Choose Us – scroll reveal + jitter-free hover */}
<section className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }} // higher amount = triggers later/more reliably
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="text-center mb-12"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Why Choose Ghumna Jau?
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
        Your trusted companion for unforgettable travel experiences in Nepal
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[
        { icon: MapPin, color: 'blue', title: 'Best Destinations', desc: 'Curated selection of Nepal’s most stunning locations' },
        { icon: Shield, color: 'green', title: 'Safe & Secure', desc: 'Verified hotels, flights, and experiences for peace of mind' },
        { icon: Users, color: 'purple', title: 'Travel Community', desc: 'Connect with fellow travelers and share stories' },
        { icon: Star, color: 'orange', title: 'Top Rated', desc: 'Highly rated services trusted by thousands of travelers' },
      ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
          whileHover={{
            y: -10,
            scale: 1.04,
            transition: { duration: 0.25, ease: "easeOut" }
          }}
          className="group text-center p-8 bg-gray-50 rounded-2xl hover:shadow-2xl transition-all duration-300 border border-gray-100 transform-gpu"
        >
          <div className={`bg-${item.color}-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <item.icon className={`h-8 w-8 text-${item.color}-600`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>
          <p className="text-gray-600">
            {item.desc}
          </p>
        </motion.div>
      ))}
    </div>
  </div>
</section>

{/* Popular Destinations – same scroll reveal + jitter-free hover */}
<section className="py-20 bg-blue-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-center mb-16"
    >
      <h2 className="text-4xl font-bold text-gray-900 mb-4">
        Popular Destinations
      </h2>
      <p className="text-xl text-gray-600">
        Explore the most loved destinations in Nepal
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {destinations.slice(0, 6).map((destination, i) => (
        <motion.div
          key={destination._id}
          initial={{ opacity: 0, y: 70, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: i * 0.1, duration: 0.7, ease: "easeOut" }}
          whileHover={{
            y: -12,
            scale: 1.05,
            transition: { duration: 0.25, ease: "easeOut" }
          }}
          className="group relative h-80 bg-cover bg-center rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300 transform-gpu"
          onClick={() => navigate(`/destinations/${destination._id}`)}
          style={{
            backgroundImage: destination.images?.[0]
              ? `url(${BASE_URL}${destination.images[0]})`
              : `url('https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 transition group-hover:from-black/85">
            <div>
              <h3 className="text-white text-2xl font-bold mb-2 group-hover:text-blue-300 transition-colors duration-300">
                {destination.name}
              </h3>
              <p className="text-white/90 text-sm">
                {destination.shortDescription || 'Explore this destination'}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <div className="text-center mt-12">
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/destinations')}
        className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center gap-3 mx-auto font-medium text-lg"
      >
        <span>View All Destinations</span>
        <Star className="h-5 w-5" />
      </motion.button>
    </div>
  </div>
</section>
    </div>
  );
};

export default Landing;

