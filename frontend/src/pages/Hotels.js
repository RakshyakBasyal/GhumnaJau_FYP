// // frontend/src/pages/Hotels.jsx
// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Star, MapPin } from 'lucide-react';
// import { getHotels } from '../services/api';

// const Hotels = () => {
//   const [hotels, setHotels] = useState([]);
//   const [selectedDestination, setSelectedDestination] = useState('all');
//   const [destinations, setDestinations] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchHotels = async () => {
//       try {
//         const res = await getHotels();
//         const data = res.data || [];
//         setHotels(data);

//         // Extract unique destinations
//         const uniqueDest = [...new Set(data.map(h => h.destination?.name || 'Unknown'))];
//         setDestinations(uniqueDest);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchHotels();
//   }, []);

//   const filteredHotels =
//     selectedDestination === 'all'
//       ? hotels
//       : hotels.filter(h => h.destination?.name === selectedDestination);

//   return (
//     <div className="min-h-screen bg-gray-50 py-12">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="mb-8">
//           <h1 className="text-4xl font-bold text-gray-900 mb-2">Hotels</h1>
//           <p className="text-xl text-gray-600">
//             Find the perfect accommodation for your stay
//           </p>
//         </div>

//         <div className="mb-8">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Filter by Destination
//           </label>
//           <select
//             value={selectedDestination}
//             onChange={(e) => setSelectedDestination(e.target.value)}
//             className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
//           >
//             <option value="all">All Destinations</option>
//             {destinations.map((dest) => (
//               <option key={dest} value={dest}>
//                 {dest}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {filteredHotels.map((hotel) => {
//             // Calculate lowest price from room types (same logic as HotelDetail)
//             const startingPrice = hotel.roomTypes?.length > 0
//               ? Math.min(...hotel.roomTypes.map(r => r.pricePerNight))
//               : hotel.pricePerNight || 0;

//             return (
//               <div
//                 key={hotel._id}
//                 className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
//                 onClick={() => navigate(`/hotels/${hotel._id}`)}
//               >
//                 <div className="relative h-56">
//                   <img
//                     src={hotel.images?.[0] ? `http://localhost:5000${hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
//                     alt={hotel.name}
//                     className="w-full h-full object-cover"
//                   />
//                   <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full flex items-center space-x-1 shadow">
//                     <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
//                     <span className="font-semibold">{hotel.rating || 5}</span>
//                   </div>
//                 </div>
//                 <div className="p-6">
//                   <div className="flex items-center space-x-2 text-gray-600 mb-2">
//                     <MapPin className="h-4 w-4" />
//                     <span className="text-sm">{hotel.destination?.name || 'Unknown'}</span>
//                   </div>
//                   <h3 className="text-xl font-bold text-gray-900 mb-2">
//                     {hotel.name}
//                   </h3>
//                   <p className="text-gray-600 text-sm mb-4">
//                     {hotel.shortDescription || 'No short description'}
//                   </p>

//                   <div className="mb-4">
//                     <p className="text-sm font-medium text-gray-700 mb-2">Amenities:</p>
//                     <div className="flex flex-wrap gap-2">
//                       {hotel.amenities?.slice(0, 3).map((amenity, index) => (
//                         <span
//                           key={index}
//                           className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
//                         >
//                           {amenity}
//                         </span>
//                       ))}
//                     </div>
//                   </div>

//                   <div className="border-t pt-4 flex items-center justify-between">
//                     <div>
//                       <p className="text-sm text-gray-600">Starting from</p>
//                       <p className="text-2xl font-bold text-blue-600">
//                         NPR {startingPrice.toLocaleString() || 'Varies'}
//                       </p>
//                     </div>
//                     <button
//                       className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
//                     >
//                       Book
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Hotels;


// frontend/src/pages/Hotels.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Search, X, ChevronDown } from 'lucide-react';
import { getHotels, getDestinations } from '../services/api';

const BASE_URL = "http://localhost:5000";

const Hotels = () => {
  const [hotels, setHotels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [sortPrice, setSortPrice] = useState('');
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);

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

    if (selectedDestination && sortPrice) {
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
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Discover Hotels
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find your perfect stay in Nepal's most beautiful destinations
          </p>
        </div>

        {/* Compact Search + Sort Row */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-12 max-w-4xl mx-auto">
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
                className="w-full pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-full text-base shadow-sm focus:shadow-md focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all duration-200"
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

            {/* Suggestions */}
            {showSuggestions && searchTerm && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-80">
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
                        {dest.images?.[0] ? (
                          <img
                            src={`${BASE_URL}${dest.images[0]}`}
                            alt={dest.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{dest.name}</p>
                        <p className="text-xs text-gray-500">{dest.country}</p>
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

          {/* Price Sort – right next to search, only after selection */}
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

        {/* Results Header */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900">
            {selectedDestination
              ? `Hotels in ${selectedDestination.name}`
              : 'Explore All Hotels'}
          </h2>
          <p className="text-gray-600 mt-2">
            {filteredHotels.length} {filteredHotels.length === 1 ? 'hotel' : 'hotels'} found
          </p>
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
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/hotels/${hotel._id}`)}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={hotel.images?.[0] ? `${BASE_URL}${hotel.images[0]}` : 'https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg'}
                      alt={hotel.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1 shadow">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-semibold">{hotel.rating || 5}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-2 text-gray-600 mb-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {hotel.destination?.name || 'Unknown'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {hotel.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {hotel.shortDescription || 'No description available'}
                    </p>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-2">
                        {hotel.amenities?.slice(0, 3).map((amenity, idx) => (
                          <span
                            key={idx}
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
                          NPR {startingPrice.toLocaleString() || 'Varies'}
                        </p>
                      </div>
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                        View & Book
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