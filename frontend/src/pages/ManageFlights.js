// frontend/src/pages/ManageFlights.jsx
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Plane, X, Loader2 } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import {
  createFlight,
  updateFlight,
  deleteFlight,
  getDestinations,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';

const BASE_URL = "http://localhost:5000";

const ManageFlights = () => {
  const [flights, setFlights] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    airline: '',
    flightNumber: '',
    from: '',
    to: '',
    departureTime: '',
    arrivalTime: '',
    duration: '',
    price: '',
    class: 'Economy',
    destination: '',
    departureDate: '',
    availableSeats: 100,
    isActive: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchFlights();
    fetchDestinations();
  }, []);

  const preventWheelChange = (e) => {
    e.target.blur();
    setTimeout(() => e.target.focus(), 0);
  };

  const fetchFlights = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/flights/admin`, {
        headers: { 'x-auth-token': localStorage.getItem('token') },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setFlights(data);
    } catch (err) {
      console.error(err);
      showToast('Failed to load flights', 'error');
    }
  };

  const fetchDestinations = async () => {
    try {
      const res = await getDestinations();
      // Filter to show only airports
      const airports = res.data.filter(dest => dest.isAirport === true);
      setDestinations(airports);
      
      if (airports.length === 0) {
        showToast('No airports found. Please mark some destinations as airports first.', 'warning');
      }
    } catch (err) {
      console.error('Failed to load destinations:', err);
      showToast('Failed to load airports for dropdown', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      airline: '', flightNumber: '', from: '', to: '', departureTime: '',
      arrivalTime: '', duration: '', price: '', class: 'Economy',
      destination: '', departureDate: '', availableSeats: 100, isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (flight) => {
    setEditingId(flight._id);
    setFormData({
      airline: flight.airline || '',
      flightNumber: flight.flightNumber || '',
      from: flight.from || '',
      to: flight.to || '',
      departureTime: flight.departureTime || '',
      arrivalTime: flight.arrivalTime || '',
      duration: flight.duration || '',
      price: flight.price || '',
      class: flight.class || 'Economy',
      destination: flight.destination?._id || flight.destination || '',
      departureDate: flight.departureDate
        ? new Date(flight.departureDate).toISOString().split('T')[0]
        : '',
      availableSeats: flight.availableSeats || 100,
      isActive: flight.isActive !== false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteFlight(deleteId);
      showToast('Flight deleted successfully', 'success');
      fetchFlights();
    } catch (err) {
      showToast('Failed to delete flight', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.destination) {
      showToast('Please select an airport', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = { ...formData };
      if (payload.price) payload.price = Number(payload.price);
      if (payload.availableSeats) payload.availableSeats = Number(payload.availableSeats);

      if (editingId) {
        await updateFlight(editingId, payload);
        showToast('Flight updated successfully', 'success');
      } else {
        await createFlight(payload);
        showToast('Flight created successfully', 'success');
      }

      resetForm();
      fetchFlights();
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Flights</h1>
            <p className="text-gray-600 mt-1">Create, update or remove flight entries</p>
          </div>

          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow transition font-medium"
            >
              <Plus className="h-5 w-5" />
              Add New Flight
            </button>
          )}
        </div>

        {/* Inline Form */}
        {showForm && (
          <Modal
            isOpen={showForm}
            onClose={resetForm}
            title={editingId ? 'Edit Flight' : 'Add New Flight'}
            size="lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Airline *</label>
                  <input type="text" name="airline" value={formData.airline} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flight Number *</label>
                  <input type="text" name="flightNumber" value={formData.flightNumber} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From *</label>
                  <input type="text" name="from" value={formData.from} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                  <input type="text" name="to" value={formData.to} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date *</label>
                  <input type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departure Time *</label>
                  <input type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time *</label>
                  <input type="time" name="arrivalTime" value={formData.arrivalTime} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration *</label>
                  <input type="text" name="duration" value={formData.duration} onChange={handleChange} required placeholder="e.g. 1h 30m" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (NPR) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} onWheel={preventWheelChange} required min="0" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Seats *</label>
                  <input type="number" name="availableSeats" value={formData.availableSeats} onChange={handleChange} onWheel={preventWheelChange} required min="1" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select name="class" value={formData.class} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500">
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Airport / Hub *</label>
                  <select
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an airport</option>
                    {destinations.map(dest => (
                      <option key={dest._id} value={dest._id}>
                        {dest.name} ({dest.country})
                      </option>
                    ))}
                  </select>
                  {destinations.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No airports found. Please add or mark some destinations as airports in Manage Destinations.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-5 w-5 text-blue-600 rounded border-gray-300" />
                  <label className="text-sm font-medium text-gray-700">Active (visible to users)</label>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-8 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 min-w-[160px] justify-center ${
                    loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {editingId ? 'Update Flight' : 'Create Flight'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Flight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flights.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
              No flights found. {showForm ? 'Fill the form above' : 'Click "Add New Flight"'} to get started.
            </div>
          ) : (
            flights.map(flight => (
              <div
                key={flight._id}
                className="bg-white rounded-xl shadow-sm hover:shadow transition border border-gray-200 overflow-hidden"
              >
                <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Plane className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {flight.airline} · {flight.flightNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {flight.from} → {flight.to}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      flight.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {flight.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Departure</span>
                    <span className="font-medium">
                      {flight.departureDate ? new Date(flight.departureDate).toLocaleDateString() : '—'} {flight.departureTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-medium">{flight.duration || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price</span>
                    <span className="font-bold text-blue-700">
                      NPR {Number(flight.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seats</span>
                    <span className="font-medium">{flight.availableSeats}</span>
                  </div>
                  {flight.destination?.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Destination</span>
                      <span className="font-medium">{flight.destination.name}</span>
                    </div>
                  )}
                </div>

                <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => handleEdit(flight)}
                    className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(flight._id)}
                    className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Flight"
        message="Are you sure you want to delete this flight permanently? This action cannot be undone."
      />
    </div>
  );
};

export default ManageFlights;