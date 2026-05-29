// frontend/src/pages/Hotels.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Search, X, ChevronDown } from 'lucide-react';
import { getHotels, getDestinations, getImageUrl } from '../services/api';

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [sortPrice, setSortPrice] = useState('');
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hotelsRes = await getHotels();
        setHotels(hotelsRes.data || []);

        const destRes = await getDestinations();
        setDestinations(destRes.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let result = hotels;

    if (selectedDestination) {
      result = result.filter(h => h.destination?._id === selectedDestination._id);
    }

    if (sortPrice) {
      result = [...result].sort((a, b) => {
        const priceA = Math.min(...(a.roomTypes?.map(r => r.pricePerNight) || [Infinity]));
        const priceB = Math.min(...(b.roomTypes?.map(r => r.pricePerNight) || [Infinity]));
        return sortPrice === 'low' ? priceA - priceB : priceB - priceA;
      });
    }

    setFilteredHotels(result);
  }, [hotels, selectedDestination, sortPrice]);

  const suggestions = destinations
    .filter(dest => dest.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        handleSelectDestination(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectDestination(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelectDestination = (dest) => {
    setSelectedDestination(dest);
    setSearchTerm(dest.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setSortPrice('');
  };

  // Clear only search & destination (price sort resets automatically)
  const clearSearch = () => {
    setSelectedDestination(null);
    setSearchTerm('');
    setSortPrice('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* Hero Section */}
      <div
        className="relative w-full h-[280px] md:h-[360px] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/45" />
        
        {/* Hero Content — Centered */}
        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            Discover Hotels
          </h1>
          <p className="text-white/90 text-base md:text-lg mb-6 max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Find your perfect stay in Nepal's most beautiful destinations
          </p>

          {/* Integrated Search Bar — Larger and Centered */}
          <div className="bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">

              {/* Search Input */}
              <div className="relative flex-1" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/70 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Where do you want to stay?"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                    if (selectedDestination) setSelectedDestination(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white placeholder-white/60 focus:bg-white/20 focus:outline-none transition-all"
                />
                {searchTerm && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
                {/* Suggestions dropdown */}
                {showSuggestions && searchTerm && (
                  <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-72">
                    {suggestions.length > 0 ? suggestions.map((dest, index) => (
                      <div
                        key={dest._id}
                        onClick={() => handleSelectDestination(dest)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-none ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          {dest.images?.[0] ? (
                            <img src={getImageUrl(dest.images[0])} alt={dest.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><MapPin className="h-4 w-4 text-gray-300" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">{dest.name}</p>
                          <p className="text-xs text-gray-400">{dest.country || 'Nepal'}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">No destinations found</div>
                    )}
                  </div>
                )}
              </div>

                {/* Price Sort Filter */}
                <div className="relative w-full md:w-56" ref={sortRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white hover:bg-white/20 focus:bg-white/20 focus:outline-none transition-all cursor-pointer"
                  >
                    <span className="truncate">{sortPrice === 'low' ? 'Price: Low to High' : sortPrice === 'high' ? 'Price: High to Low' : 'Sort by Price'}</span>
                    <ChevronDown className={`h-5 w-5 text-white/60 flex-shrink-0 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute z-30 w-full mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl py-1 overflow-hidden">
                      <button 
                        onClick={() => { setSortPrice(''); setShowSortDropdown(false); }} 
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${sortPrice === '' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Default
                      </button>
                      <button 
                        onClick={() => { setSortPrice('low'); setShowSortDropdown(false); }} 
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${sortPrice === 'low' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Price: Low to High
                      </button>
                      <button 
                        onClick={() => { setSortPrice('high'); setShowSortDropdown(false); }} 
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${sortPrice === 'high' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        Price: High to Low
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {selectedDestination
                ? `Hotels in ${selectedDestination.name}`
                : 'Explore All Hotels'}
            </h2>
          </div>
        </div>

        {/* Hotel Cards */}
        {filteredHotels.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-600">
            No hotels found. Try another destination.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredHotels.map((hotel) => {
              const startingPrice = hotel.roomTypes?.length > 0
                ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight))
                : 0;

              return (
                <div
                  key={hotel._id}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  onClick={() => navigate(`/hotels/${hotel._id}`)}
                >
                  {/* Image with Overlays */}
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={hotel.images?.[0] ? getImageUrl(hotel.images[0]) : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
                      alt={hotel.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-gray-800">
                        {hotel.rating?.toFixed(1) || '5.0'}
                        {hotel.reviewCount > 0 && <span className="text-[10px] text-gray-400 font-normal ml-1">({hotel.reviewCount})</span>}
                      </span>
                    </div>

                    {/* Title + Location Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <h3
                        className="text-xl font-bold leading-tight mb-1"
                        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                      >
                        {hotel.name}
                      </h3>
                      <p
                        className="text-sm flex items-center gap-1"
                        style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
                      >
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {hotel.destination?.name || 'Nepal'}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Amenities Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {hotel.amenities?.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
                          {amenity}
                        </span>
                      ))}
                      {hotel.amenities?.length > 3 && (
                        <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-400 text-xs font-medium rounded-full">
                          +{hotel.amenities.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Price + Book Now */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Starting from</p>
                        <p className="text-lg font-bold text-blue-600 leading-tight">
                          NPR {startingPrice.toLocaleString()}
                        </p>
                      </div>
                      <button className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hotels;