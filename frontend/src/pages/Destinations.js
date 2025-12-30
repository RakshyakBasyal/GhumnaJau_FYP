import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDestinations } from '../services/api';
import { MapPin, Calendar, DollarSign, Star, Search, X } from 'lucide-react';

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
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filterResults = (query, list = destinations) => {
    if (!query.trim()) {
      setDisplayDestinations(list);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = list.filter(dest =>
      (dest.name && dest.name.toLowerCase().includes(lowerQuery)) ||
      (dest.country && dest.country.toLowerCase().includes(lowerQuery))
    );
    setDisplayDestinations(filtered);
  };

  const handleInputChange = (value) => {
    setSearchQuery(value);
    setShowDropdown(value.trim() !== '');
  };

  const handleSearch = () => {
    filterResults(searchQuery);
    setShowDropdown(false);
  };

  const selectDestination = (dest) => {
    setSearchQuery(dest.name || '');
    setDisplayDestinations([dest]);
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDisplayDestinations(destinations);
    setShowDropdown(false);
  };

  const getRatingText = (rating) => {
    const n = Number(rating);
    if (Number.isFinite(n)) return n.toFixed(1);
    return "5.0";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Explore Destinations
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Discover amazing places across Nepal
          </p>

          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <div className="bg-white rounded-full shadow-lg flex items-center overflow-hidden border border-gray-200">
                <Search className="h-6 w-6 text-gray-400 ml-6" />
                <input
                  type="text"
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-6 py-4 text-gray-800 outline-none text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="mr-4 text-gray-400 hover:text-gray-600"
                    type="button"
                  >
                    <X className="h-6 w-6" />
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-10 py-4 hover:bg-blue-700 transition font-medium text-lg"
                  type="button"
                >
                  Search
                </button>
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-20">
                  {destinations
                    .filter(dest =>
                      (dest.name || '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((dest) => (
                      <div
                        key={dest._id}
                        onClick={() => selectDestination(dest)}
                        className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center space-x-4 border-b border-gray-100 last:border-0"
                      >
                        {dest.images?.[0] ? (
                          <img
                            src={`http://localhost:5000${dest.images[0]}`}
                            alt={dest.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{dest.name}</p>
                          <p className="text-sm text-gray-600">{dest.country || 'Nepal'}</p>
                        </div>
                      </div>
                    ))}

                  {destinations.filter(dest =>
                    (dest.name || '').toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center text-gray-500 py-8">No destinations found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {displayDestinations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600">No destinations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayDestinations.map((destination) => (
              <div
                key={destination._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition cursor-pointer"
                onClick={() => navigate(`/destinations/${destination._id}`)}
              >
                <div className="relative h-56">
                  {destination.images?.[0] ? (
                    <img
                      src={`http://localhost:5000${destination.images[0]}`}
                      alt={destination.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full flex items-center space-x-1 shadow">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-sm">
                      {getRatingText(destination.rating)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{destination.country || 'Nepal'}</span>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {destination.name}
                  </h3>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-3 text-blue-600" />
                      <span className="text-sm">
                        Best time: {destination.bestTimeToVisit || 'Year-round'}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-5 w-5 mr-3 text-blue-600" />
                      <span className="text-sm">
                        Avg cost: {formatCostNPR(destination)}
                      </span>
                    </div>

                    <button
                      className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                      type="button"
                    >
                      View Details
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

export default Destinations;
