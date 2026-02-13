// frontend/src/pages/Flights.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Clock, ArrowRight, MapPin, Search, X, ChevronDown, Loader2 } from 'lucide-react';

const BASE_URL = "http://localhost:5000";

const Flights = () => {
  const [flights, setFlights] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [sortPrice, setSortPrice] = useState('');
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Fetch destinations (real DB destinations)
        const destRes = await fetch(`${BASE_URL}/api/destinations`);
        if (!destRes.ok) throw new Error('Failed to fetch destinations');
        const destData = await destRes.json();
        setDestinations(destData);

        // Fetch all flights
        const flightsRes = await fetch(`${BASE_URL}/api/flights`);
        if (!flightsRes.ok) throw new Error('Failed to fetch flights');
        const flightData = await flightsRes.json();
        setFlights(flightData);
        setFilteredFlights(flightData);
      } catch (err) {
        console.error("Initial fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Sorting only (no local filtering - backend handles nearest airport)
  useEffect(() => {
    let result = [...flights];
    if (sortPrice) {
      result.sort((a, b) =>
        sortPrice === "low"
          ? (a.price || 0) - (b.price || 0)
          : (b.price || 0) - (a.price || 0)
      );
    }
    setFilteredFlights(result);
  }, [flights, sortPrice]);

  // Strict name match for suggestions
  const suggestions = destinations
    .filter(dest => dest.name.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    .slice(0, 6);

  // Select destination → fetch flights via backend (which handles nearest airport)
  const handleSelectDestination = async (dest) => {
    setSelectedDestination(dest);
    setSearchTerm(dest.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setSortPrice('');

    try {
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/api/flights?destination=${dest._id}&isActive=true`
      );
      if (!res.ok) throw new Error('Failed to fetch flights');
      const data = await res.json();
      setFlights(data);
      setFilteredFlights(data);
    } catch (err) {
      console.error("Destination search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clear search → reload all flights
  const clearSearch = async () => {
    setSelectedDestination(null);
    setSearchTerm('');
    setSortPrice('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);

    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/flights`);
      if (!res.ok) throw new Error('Failed to fetch flights');
      const data = await res.json();
      setFlights(data);
      setFilteredFlights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev =>
        (prev - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelectDestination(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        handleSelectDestination(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xl text-gray-700">Loading flights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Find Your Next Flight
          </h1>
          <p className="text-lg text-gray-600">
            Book domestic flights to amazing destinations across Nepal
          </p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-12 max-w-4xl mx-auto">
          {/* Search Box */}
          <div className="relative flex-1 w-full md:w-auto" ref={searchRef}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                  if (selectedDestination) setSelectedDestination(null);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search destination..."
                className="w-full pl-11 pr-11 py-3.5 bg-white border border-gray-200 rounded-full text-base shadow-sm focus:shadow-md focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all duration-200"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Suggestions – strict name match only */}
            {showSuggestions && searchTerm && (
              <div className="absolute z-20 w-full mt-3 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-80">
                {suggestions.length > 0 ? (
                  suggestions.map((dest, index) => (
                    <div
                      key={dest._id}
                      onClick={() => handleSelectDestination(dest)}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition ${
                        index === highlightedIndex ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
                        <MapPin className="h-5 w-5 text-gray-400 m-2.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{dest.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-center text-gray-500 text-sm">
                    No destinations found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Price Sort – only after selection */}
          {selectedDestination && (
            <div className="relative w-full md:w-56">
              <select
                value={sortPrice}
                onChange={(e) => setSortPrice(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none shadow-sm transition cursor-pointer"
              >
                <option value="">Sort by Price</option>
                <option value="low">Low to High</option>
                <option value="high">High to Low</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Results Header – with "Nearest Flights" when isAirport: false */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900">
            {selectedDestination ? (
              selectedDestination.isAirport ? (
                `Flights to ${selectedDestination.name}`
              ) : (
                `Nearest Flights to ${selectedDestination.name}`
              )
            ) : (
              'All Flights'
            )}
          </h2>
          <p className="text-gray-600 mt-2">
            {filteredFlights.length} {filteredFlights.length === 1 ? 'flight' : 'flights'} found
          </p>
        </div>

        {/* Results */}
        {filteredFlights.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-600">
            No flights found. Try another destination.
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFlights.map(flight => (
              <div
                key={flight._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100"
              >
                <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                  {/* Airline & Class */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <Plane className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {flight.airline}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {flight.flightNumber} • {flight.class}
                      </p>
                    </div>
                  </div>

                  {/* Route & Duration */}
                  <div className="flex items-center gap-6 flex-1 justify-center">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-semibold text-gray-900">{flight.from}</p>
                      <p className="text-sm text-gray-600">{flight.departureTime}</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="h-px w-12 bg-gray-300" />
                        <ArrowRight className="h-5 w-5" />
                        <div className="h-px w-12 bg-gray-300" />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">{flight.duration}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-semibold text-gray-900">{flight.to}</p>
                      <p className="text-sm text-gray-600">{flight.arrivalTime}</p>
                    </div>
                  </div>

                  {/* Price & Book */}
                  <div className="flex items-center gap-6 md:gap-10">
                    <div className="text-center md:text-right">
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="text-2xl md:text-3xl font-bold text-blue-600">
                        NPR {Number(flight.price).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/flight-booking/${flight._id}`)}
                      className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-medium whitespace-nowrap"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flights;