// frontend/src/pages/Landing.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDestinations, getImageUrl } from '../services/api';
import { Search, MapPin, Shield, Users, Star, X } from 'lucide-react';
import { motion } from 'framer-motion';

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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

      {/* Hero Section - Adjusted Height */}
      <section
        className="relative h-[360px] md:h-[480px] bg-cover bg-center flex items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('https://plus.unsplash.com/premium_photo-1692976236758-817620ab62ba?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center text-white px-4 max-w-5xl z-10"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-3xl md:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-2xl"
          >
            Nepal is Calling, <br />
            <span className="text-blue-400">Ghumna Jau!</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-base md:text-xl mb-10 drop-shadow-lg max-w-3xl mx-auto font-light leading-relaxed opacity-95"
          >
            Your ultimate gateway to discover breathtaking landscapes, 
            rich culture, and hidden gems across the Himalayas.
          </motion.p>

          {/* Search Box — Original Fix Style */}
          <div className="relative max-w-4xl mx-auto" ref={searchRef}>
            <div className="bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for destinations"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white placeholder-white/60 focus:bg-white/20 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button 
                      type="button"
                      onClick={clearSearch} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl shadow-lg transition-all active:scale-95 font-bold flex items-center justify-center gap-2"
                >
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </button>
              </form>
            </div>

            {/* Suggestions */}
            {showSuggestions && searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-80"
              >
                {suggestions.length > 0 ? (
                  <div className="py-2 text-left">
                    <div className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Destinations
                    </div>
                    {suggestions.map((dest, index) => (
                      <div
                        key={dest._id}
                        onClick={() => handleSelect(dest)}
                        className={`flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50 cursor-pointer transition-colors ${index === highlightedIndex ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 shadow-sm">
                          {dest.images?.[0] ? (
                            <img
                              src={getImageUrl(dest.images[0])}
                              alt={dest.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-6 w-6 md:h-7 md:w-7 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-base md:text-lg">{dest.name}</p>
                          <div className="flex items-center text-xs md:text-sm text-gray-500 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 mr-1" />
                            <span>{dest.location || 'Nepal'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-gray-500">
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-lg">No destinations found for "{searchQuery}"</p>
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
                    ? `url(${getImageUrl(destination.images[0])})`
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

