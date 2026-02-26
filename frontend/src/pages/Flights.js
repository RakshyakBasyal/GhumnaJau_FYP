// frontend/src/pages/Flights.jsx
import { useEffect, useState, useRef } from 'react';
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

  // After booking is created — show success + pay option
  const [successBooking, setSuccessBooking] = useState(null); // { bookingId, totalAmount, flightName }

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
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
    fetchInitialData();
  }, []);

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

  const handleBookFlight = async (flight) => {
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

      // ✅ Show success panel with Pay Now option
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

  // ── STRIPE PAYMENT ──
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
      // Redirect to Stripe checkout
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
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-900 truncate">{dest.name}</p>
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
            {selectedDestination ? `Flights to ${selectedDestination.name}` : 'All Flights'}
          </h2>
          <p className="text-gray-600 mt-2">
            {filteredFlights.length} {filteredFlights.length === 1 ? 'flight' : 'flights'} found
          </p>
        </div>

        {filteredFlights.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-600">
            No flights found. Try another destination.
          </div>
        ) : (
          <div className="space-y-8">
            {filteredFlights.map(flight => (
              <div key={flight._id}>

                {/* Flight Card */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex flex-col md:flex-row items-center p-6 gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Plane className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{flight.airline}</h3>
                        <p className="text-sm text-gray-600">{flight.flightNumber} • {flight.class}</p>
                      </div>
                    </div>

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

                    <div className="flex items-center gap-6 md:gap-10">
                      <div className="text-center md:text-right">
                        <p className="text-sm text-gray-600">Price per adult</p>
                        <p className="text-2xl md:text-3xl font-bold text-blue-600">
                          NPR {Number(flight.price).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => openBookingForm(flight._id)}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-medium whitespace-nowrap"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>

                {/* Booking Form */}
                {openBookingFlightId === flight._id && !successBooking && (
                  <div className="mt-4 bg-white rounded-xl shadow-lg p-8 border border-blue-100">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Book: {flight.airline} {flight.flightNumber}
                      </h2>
                      <button onClick={closeBookingForm} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    {bookingError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        {bookingError}
                      </div>
                    )}

                    {/* Passengers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adults (12+ years) — NPR {Number(flight.price).toLocaleString()} each
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setAdults(Math.max(1, adults - 1))}
                            className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 text-lg font-bold"
                          >
                            −
                          </button>
                          <span className="text-xl font-bold w-10 text-center">{adults}</span>
                          <button
                            onClick={() => setAdults(adults + 1)}
                            className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 text-lg font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Children (2–11 years) — NPR {Number(flight.price * 0.5).toLocaleString()} each
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setChildren(Math.max(0, children - 1))}
                            className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 text-lg font-bold"
                          >
                            −
                          </button>
                          <span className="text-xl font-bold w-10 text-center">{children}</span>
                          <button
                            onClick={() => setChildren(children + 1)}
                            className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 text-lg font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={bookerPhone}
                          onChange={(e) => setBookerPhone(e.target.value)}
                          placeholder="e.g. 98XXXXXXXX"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={bookerEmail}
                          onChange={(e) => setBookerEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Total + Submit */}
                    <div className="pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-6">
                      <div>
                        <p className="text-sm text-gray-600">
                          {adults} adult{adults !== 1 ? 's' : ''}
                          {children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}
                        </p>
                        <p className="text-3xl font-bold text-blue-600 mt-1">
                          NPR {calculateTotal(flight).toLocaleString()}
                        </p>
                      </div>

                      <button
                        onClick={() => handleBookFlight(flight)}
                        disabled={bookingLoading}
                        className={`px-12 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md ${
                          bookingLoading
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        {bookingLoading ? (
                          <span className="flex items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          'Confirm Booking'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ✅ Success Panel — shown after booking created */}
                {openBookingFlightId === flight._id && successBooking && (
                  <div className="mt-4 bg-green-50 rounded-xl shadow-lg p-8 border border-green-200">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
                          <p className="text-gray-600 mt-1">
                            {successBooking.flightName} — your booking is <strong>pending admin approval</strong>.
                          </p>
                        </div>
                      </div>
                      <button onClick={closeBookingForm} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                      </button>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-green-100 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-500">Total Amount</p>
                          <p className="text-3xl font-bold text-blue-600">
                            NPR {successBooking.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Payment Status</p>
                          <span className="inline-block mt-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                            Unpaid
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Pay Now */}
                      <button
                        onClick={handlePayNow}
                        disabled={paymentLoading}
                        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-white font-bold text-lg transition shadow-md ${
                          paymentLoading
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                        }`}
                      >
                        {paymentLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Pay Now
                          </>
                        )}
                      </button>

                      {/* Pay Later */}
                      <button
                        onClick={closeBookingForm}
                        className="flex-1 py-4 rounded-xl border-2 border-gray-300 text-gray-700 font-bold text-lg hover:bg-gray-50 transition"
                      >
                        Pay Later
                      </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-4">
                      You can pay later from <strong>My Bookings</strong> page.
                    </p>
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