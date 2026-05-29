// frontend/src/pages/Destinations.js
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDestinations, getImageUrl } from '../services/api';
import { MapPin, Calendar, DollarSign, Star, Search, X, ChevronDown } from 'lucide-react';


// Returns a single numeric value used purely for sorting
const getCostValue = (dest) => {
  if (dest.averageCost !== undefined && dest.averageCost !== null && dest.averageCost !== '')
    return Number(dest.averageCost);
  if (dest.averageCostMin !== undefined && dest.averageCostMin !== null && dest.averageCostMin !== '')
    return Number(dest.averageCostMin);
  if (dest.averageCostMax !== undefined && dest.averageCostMax !== null && dest.averageCostMax !== '')
    return Number(dest.averageCostMax);
  return 0;
};

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

const Destinations = () => {
  const [searchParams] = useSearchParams();
  const [destinations, setDestinations] = useState([]);
  const [displayDestinations, setDisplayDestinations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [selectedSort, setSelectedSort] = useState('Highest Rated');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const sortRef = useRef(null);
  const regionRef = useRef(null);

  useEffect(() => {
    getDestinations()
      .then(res => {
        const data = res.data || [];
        setDestinations(data);
        setDisplayDestinations(data);

        const urlQuery = searchParams.get('search');
        if (urlQuery) {
          setSearchQuery(urlQuery);
          filterResults(urlQuery, data);
        }
      })
      .catch(err => {
        console.error(err);
        setDestinations([]);
        setDisplayDestinations([]);
      });
  }, [searchParams]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
      if (regionRef.current && !regionRef.current.contains(event.target)) {
        setShowRegionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterResults = (query, list = destinations) => {
    let filtered = list;
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(dest =>
        (dest.name && dest.name.toLowerCase().includes(lowerQuery)) ||
        (dest.country && dest.country.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (selectedRegion !== 'All Regions') {
      filtered = filtered.filter(d => d.region === selectedRegion);
    }

    applySort(filtered, selectedSort);
  };

  const applySort = (list, sortType) => {
    const sorted = [...list];
    if (sortType === 'Highest Rated') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortType === 'Price: Low to High') {
      sorted.sort((a, b) => getCostValue(a) - getCostValue(b));
    } else if (sortType === 'Price: High to Low') {
      sorted.sort((a, b) => getCostValue(b) - getCostValue(a));
    }
    setDisplayDestinations(sorted);
  };

  useEffect(() => {
    filterResults(searchQuery);
  }, [selectedRegion, selectedSort]);

  const suggestions = destinations
    .filter(dest => dest.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 8);

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
        selectDestination(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        selectDestination(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const selectDestination = (dest) => {
    setSearchQuery(dest.name || '');
    setDisplayDestinations([dest]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDisplayDestinations(destinations);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const getRatingText = (rating) => {
    const n = Number(rating);
    if (Number.isFinite(n)) return n.toFixed(1);
    return "5.0";
  };

  const regions = [...new Set(destinations.map(d => d.region).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* Hero Section */}
      <div
        className="relative w-full h-[280px] md:h-[360px] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1553886334-43d24f24d3bd?q=80&w=1477&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/45" />
        
        {/* Hero Content — Centered */}
        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            Explore Nepal
          </h1>
          <p className="text-white/90 text-base md:text-lg mb-6 max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Discover the most beautiful places in Nepal
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
                  placeholder="Where do you want to go?"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); setHighlightedIndex(-1); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white placeholder-white/60 focus:bg-white/20 focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
                {/* Suggestions dropdown */}
                {showSuggestions && searchQuery && (
                  <div className="absolute z-30 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-72">
                    {suggestions.length > 0 ? suggestions.map((dest, index) => (
                      <div
                        key={dest._id}
                        onClick={() => selectDestination(dest)}
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
                          <p className="text-xs text-gray-400">{dest.location || dest.country || 'Nepal'}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">No destinations found</div>
                    )}
                  </div>
                )}
              </div>

                {/* Region Filter */}
                <div className="relative w-full md:w-56" ref={regionRef}>
                  <button
                    onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white hover:bg-white/20 transition-all"
                  >
                    <span className="truncate">{selectedRegion}</span>
                    <ChevronDown className={`h-5 w-5 text-white/60 flex-shrink-0 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showRegionDropdown && (
                    <div className="absolute z-30 w-full mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
                      <button 
                        onClick={() => { setSelectedRegion('All Regions'); setShowRegionDropdown(false); }} 
                        className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedRegion === 'All Regions' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        All Regions
                      </button>
                      {regions.map(region => (
                        <button 
                          key={region} 
                          onClick={() => { setSelectedRegion(region); setShowRegionDropdown(false); }} 
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedRegion === region ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort Filter */}
                <div className="relative w-full md:w-56" ref={sortRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-white/10 border border-white/10 rounded-xl text-base text-white hover:bg-white/20 transition-all"
                  >
                    <span className="truncate">{selectedSort}</span>
                    <ChevronDown className={`h-5 w-5 text-white/60 flex-shrink-0 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 z-30 w-full mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl py-1">
                      {['Highest Rated', 'Price: Low to High', 'Price: High to Low'].map(option => (
                        <button 
                          key={option} 
                          onClick={() => { setSelectedSort(option); setShowSortDropdown(false); }} 
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedSort === option ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex items-center gap-2 mb-6 text-gray-500 text-sm font-medium">
          <Search className="h-4 w-4" />
          <span>{displayDestinations.length} {displayDestinations.length === 1 ? 'destination' : 'destinations'} found</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayDestinations.map((destination) => (
            <div
              key={destination._id}
              className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
              onClick={() => navigate(`/destinations/${destination._id}`)}
            >
              {/* Image */}
              <div className="relative h-56 overflow-hidden">
                {destination.images?.[0] ? (
                  <img
                    src={getImageUrl(destination.images[0])}
                    alt={destination.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-gray-800">{getRatingText(destination.rating)}</span>
                </div>

                {/* Title + location overlay */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3
                    className="text-xl font-bold leading-tight mb-1"
                    style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
                  >
                    {destination.name}
                  </h3>
                  <p
                    className="text-sm flex items-center gap-1"
                    style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {destination.location || destination.country || 'Nepal'}
                  </p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1">
                {/* Best Time + Est. Cost */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Best Time</p>
                      <p className="text-xs font-bold text-gray-800 leading-snug">{destination.bestTimeToVisit || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Est. Cost</p>
                      <p className="text-xs font-bold text-gray-800 leading-snug">{formatCostNPR(destination)}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {destination.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-full">
                      {tag}
                    </span>
                  ))}
                  {destination.tags?.length > 2 && (
                    <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-400 text-xs font-medium rounded-full">
                      +{destination.tags.length - 2} more
                    </span>
                  )}
                </div>

                {/* Reviews */}
                <div className="mt-auto pt-3 border-t border-gray-100 text-xs text-gray-400 font-medium">
                  {destination.reviewCount || 0} reviews
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {displayDestinations.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center mt-4">
            <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800 mb-1">No destinations found</h3>
            <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedRegion('All Regions'); }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
            >
              Clear Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Destinations;