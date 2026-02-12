// frontend/src/pages/Flights.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Clock, ArrowRight, MapPin, IndianRupee } from 'lucide-react';

// Dummy flight data (replace with real API later)
const flights = [
  {
    id: 1,
    airline: 'Yeti Airlines',
    flightNumber: 'YT-101',
    from: 'Kathmandu (KTM)',
    to: 'Pokhara (PKR)',
    departureTime: '07:30 AM',
    arrivalTime: '08:20 AM',
    duration: '50m',
    price: 4500,
    class: 'Economy',
    destinationId: 'pokhara',
  },
  {
    id: 2,
    airline: 'Buddha Air',
    flightNumber: 'BDA-231',
    from: 'Kathmandu (KTM)',
    to: 'Bharatpur (BHR)',
    departureTime: '09:15 AM',
    arrivalTime: '09:45 AM',
    duration: '30m',
    price: 3800,
    class: 'Economy',
    destinationId: 'chitwan',
  },
  // ... add more as needed
];

export const Flights = () => {
  const [selectedDestination, setSelectedDestination] = useState('all');
  const navigate = useNavigate();

  // Get unique destinations for filter
  const destinations = Array.from(new Set(flights.map((f) => f.to)));

  const filteredFlights =
    selectedDestination === 'all'
      ? flights
      : flights.filter((f) => f.to === selectedDestination);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Find Your Next Flight
          </h1>
          <p className="text-xl text-gray-600">
            Book domestic flights to amazing destinations across Nepal
          </p>
        </div>

        {/* Filter */}
        <div className="mb-10 max-w-xs mx-auto md:mx-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Destination
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm bg-white"
          >
            <option value="all">All Destinations</option>
            {destinations.map((dest) => (
              <option key={dest} value={dest}>
                {dest}
              </option>
            ))}
          </select>
        </div>

        {/* Flight List */}
        {filteredFlights.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-md">
            <Plane className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">
              No flights found
            </h3>
            <p className="text-gray-600">
              Try changing the destination filter or check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFlights.map((flight) => (
              <div
                key={flight.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Flight Info */}
                  <div className="flex-1 p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <Plane className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {flight.airline}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {flight.flightNumber} • {flight.class}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-700">
                          NPR {flight.price.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">per person</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">From</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {flight.from}
                        </p>
                        <p className="text-sm text-gray-600">
                          {flight.departureTime}
                        </p>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center space-x-4 w-full">
                          <div className="flex-1 h-px bg-gray-300" />
                          <ArrowRight className="h-6 w-6 text-gray-400" />
                          <div className="flex-1 h-px bg-gray-300" />
                        </div>
                        <div className="mt-3 flex items-center space-x-2">
                          <Clock className="h-5 w-5 text-gray-600" />
                          <span className="font-medium text-gray-700">
                            {flight.duration}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">To</p>
                        <p className="text-xl font-semibold text-gray-900">
                          {flight.to}
                        </p>
                        <p className="text-sm text-gray-600">
                          {flight.arrivalTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Book Button */}
                  <div className="bg-gray-50 md:bg-transparent p-6 md:p-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-200">
                    <button
                      onClick={() =>
                        navigate(
                          `/booking/${flight.destinationId}?type=flight&id=${flight.id}`
                        )
                      }
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-2"
                    >
                      Book Flight
                      <ArrowRight className="h-5 w-5" />
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