// frontend/src/pages/Flights.jsx
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plane, Clock, ArrowRight, MapPin, Search, X, ChevronDown, Loader2, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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

  // Booking form state
  const [openBookingFlightId, setOpenBookingFlightId] = useState(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [bookerPhone, setBookerPhone] = useState('');
  const [bookerEmail, setBookerEmail] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState(null);

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const searchRef = useRef(null);
  const sortRef = useRef(null);
  const inputRef = useRef(null);
  const { showToast } = useToast();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const destRes = await fetch(`${BASE_URL}/api/destinations`);
        if (!destRes.ok) throw new Error('Failed destinations');
        setDestinations(await destRes.json());

        const flightsRes = await fetch(`${BASE_URL}/api/flights`);
        if (!flightsRes.ok) throw new Error('Failed flights');
        const flightData = await flightsRes.json();
        setFlights(flightData);
        setFilteredFlights(flightData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  // ✅ Auto-open booking form if openFlight param is in URL
  useEffect(() => {
    if (filteredFlights.length === 0) return;
    const params = new URLSearchParams(location.search);
    const openFlightId = params.get('openFlight');
    if (openFlightId) {
      openBookingForm(openFlightId);
      setTimeout(() => {
        const el = document.getElementById(`flight-${openFlightId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [filteredFlights, location.search]);

  useEffect(() => {
    let result = [...flights];
    if (sortPrice) {
      result.sort((a, b) =>
        sortPrice === 'low' ? a.price - b.price : b.price - a.price
      );
    }
    setFilteredFlights(result);
  }, [flights, sortPrice]);

  const suggestions = destinations
    .filter(dest => dest.name.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    .slice(0, 6);

  const handleSelectDestination = async (dest) => {
    setSelectedDestination(dest);
    setSearchTerm(dest.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setSortPrice('');
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/flights?destination=${dest._id}&isActive=true`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setFlights(data);
      setFilteredFlights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = async () => {
    setSelectedDestination(null);
    setSearchTerm('');
    setSortPrice('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/flights`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setFlights(data);
      setFilteredFlights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      if (highlightedIndex >= 0) handleSelectDestination(suggestions[highlightedIndex]);
      else if (suggestions.length > 0) handleSelectDestination(suggestions[0]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ── BOOKING FORM ──
  const openBookingForm = (flightId) => {
    setOpenBookingFlightId(flightId);
    setAdults(1);
    setChildren(0);
    setBookerPhone('');
    setBookerEmail('');
    setBookingError('');
    setSuccessBooking(null);
  };

  const closeBookingForm = () => {
    setOpenBookingFlightId(null);
    setBookingError('');
    setSuccessBooking(null);
  };

  const calculateTotal = (flight) => {
    if (!flight) return 0;
    return flight.price * adults + flight.price * children * 0.5;
  };

  const handleBookFlight = async (flight, isPayLater = false) => {
    if (!bookerPhone.trim() || !bookerEmail.trim()) {
      setBookingError('Please enter your contact details');
      return;
    }
    if (adults + children === 0) {
      setBookingError('At least one passenger required');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please login to book', 'error');
        return;
      }

      const total = calculateTotal(flight);

      const res = await fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'flight',
          flightId: flight._id,
          passengersCount: { adults, children },
          contactInfo: { phone: bookerPhone, email: bookerEmail },
          totalAmount: total,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Booking failed');
      }

      const data = await res.json();

      if (isPayLater) {
        showToast('Flight reserved! You can pay later from your profile.', 'success');
        closeBookingForm();
        return;
      }

      setSuccessBooking({
        bookingId: data.booking._id,
        totalAmount: total,
        flightName: `${flight.airline} ${flight.flightNumber}`,
      });

      showToast('Flight booked successfully!', 'success');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!successBooking) return;
    setPaymentLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/api/payments/stripe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: successBooking.bookingId,
          amount: successBooking.totalAmount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.msg || 'Failed to initiate payment');
      }

      const data = await res.json();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      showToast('Payment initiation failed: ' + err.message, 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-3 text-xl text-gray-700">Loading flights...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* Hero Section */}
      <div
        className="relative w-full h-[280px] md:h-[360px] flex items-center justify-center text-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1659458449810-e9b40a63958d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/45" />
        
        {/* Hero Content — Centered */}
        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
            Find Your Next Flight
          </h1>
          <p className="text-white/90 text-base md:text-lg mb-6 max-w-2xl mx-auto" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}>
            Book domestic flights to amazing destinations across Nepal
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
                  placeholder="Where do you want to fly?"
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
                  <div className="absolute z-30 w-full mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-72">
                    {suggestions.length > 0 ? suggestions.map((dest, index) => (
                      <div
                        key={dest._id}
                        onClick={() => handleSelectDestination(dest)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-none ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-gray-400" />
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
        
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            {selectedDestination ? `Flights to ${selectedDestination.name}` : 'All Flights'}
          </h2>
        </div>

        {filteredFlights.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-600">
            No flights found. Try another destination.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlights.map(flight => (
              <div key={flight._id} id={`flight-${flight._id}`} className="flex flex-col">
                {/* Flight Card */}
                <div 
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                  onClick={() => openBookingForm(flight._id)}
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        {flight.airline} {flight.flightNumber}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1 font-medium">
                        {flight.from} → {flight.to}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                      {flight.class || 'Economy'}
                    </span>
                  </div>

                  {/* Details Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm font-medium">Departure</span>
                      <span className="text-gray-900 text-sm font-bold">{flight.departureTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm font-medium">Duration</span>
                      <span className="text-gray-900 text-sm font-bold">{flight.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 text-sm font-medium">Seats Available</span>
                      <span className="text-gray-900 text-sm font-bold">{flight.seatsAvailable || '100'}</span>
                    </div>
                  </div>

                  {/* Separator + Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs font-semibold mb-0.5 uppercase tracking-wider">Price</p>
                      <p className="text-2xl font-bold text-blue-600 leading-tight">
                        NPR {Number(flight.price).toLocaleString()}
                      </p>
                    </div>
                    <button className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
                      Book Now
                    </button>
                  </div>
                </div>

                {/* Booking Form — Inline below card if open */}
                {openBookingFlightId === flight._id && !successBooking && (
                  <div className="mt-4 bg-white rounded-xl shadow-lg p-6 border border-blue-100 z-10 lg:absolute lg:left-0 lg:right-0 lg:mt-2 lg:max-w-2xl lg:mx-auto">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        Book: {flight.airline} {flight.flightNumber}
                      </h2>
                      <button onClick={closeBookingForm} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {bookingError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {bookingError}
                      </div>
                    )}

                    {/* Passengers */}
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700">
                          Adults (12+ years)
                        </label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">−</button>
                          <span className="font-bold w-4 text-center">{adults}</span>
                          <button onClick={() => setAdults(adults + 1)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700">
                          Children (2–11 years)
                        </label>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setChildren(Math.max(0, children - 1))} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">−</button>
                          <span className="font-bold w-4 text-center">{children}</span>
                          <button onClick={() => setChildren(children + 1)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200">+</button>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-3 mb-6">
                      <input
                        type="tel"
                        value={bookerPhone}
                        onChange={(e) => setBookerPhone(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="email"
                        value={bookerEmail}
                        onChange={(e) => setBookerEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-xl font-bold text-blue-600">NPR {calculateTotal(flight).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleBookFlight(flight)}
                          disabled={bookingLoading}
                          className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:bg-blue-400"
                        >
                          {bookingLoading ? 'Processing...' : 'Book & Pay Now'}
                        </button>
                      </div>
                      <button
                        onClick={() => handleBookFlight(flight, true)}
                        disabled={bookingLoading}
                        className="w-full py-2.5 text-blue-600 font-bold text-sm border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {bookingLoading ? 'Processing...' : 'Reserve & Pay Later'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Success Panel */}
                {openBookingFlightId === flight._id && successBooking && (
                  <div className="mt-4 bg-green-50 rounded-xl shadow-lg p-6 border border-green-200 z-10 lg:absolute lg:left-0 lg:right-0 lg:mt-2 lg:max-w-md lg:mx-auto">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h2 className="text-lg font-bold text-gray-900">Confirmed!</h2>
                      </div>
                      <button onClick={closeBookingForm} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">Your booking for {successBooking.flightName} is pending approval.</p>
                    <div className="bg-white rounded-lg p-4 border border-green-100 mb-4 flex justify-between items-center">
                      <p className="text-xl font-bold text-blue-600">NPR {successBooking.totalAmount.toLocaleString()}</p>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase">Unpaid</span>
                    </div>
                    <button
                      onClick={handlePayNow}
                      disabled={paymentLoading}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      {paymentLoading ? 'Redirecting...' : <><CreditCard className="h-4 w-4" /> Pay Now</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flights;