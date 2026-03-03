// frontend/src/pages/Itinerary.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Loader2, Trash2, Edit,
  Hotel, Plane, UtensilsCrossed, Zap, X, Search
} from 'lucide-react';

const BASE_URL = 'http://localhost:5000';

const getIcon = (type) => {
  switch (type) {
    case 'hotel':       return <Hotel size={18} className="text-blue-500" />;
    case 'flight':      return <Plane size={18} className="text-indigo-500" />;
    case 'restaurant':  return <UtensilsCrossed size={18} className="text-orange-500" />;
    case 'activity':    return <Zap size={18} className="text-purple-500" />;
    case 'destination': return <MapPin size={18} className="text-green-500" />;
    default:            return <Calendar size={18} className="text-gray-500" />;
  }
};

// ─── Create Trip Modal ───────────────────────────────────────────────────────
const CreateTripModal = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Please enter a trip name');
    setLoading(true);
    await onCreate({ title, startDate, endDate });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">New Trip</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Summer Europe Trip"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Trip
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Add Destination Modal ───────────────────────────────────────────────────
const AddDestinationModal = ({ onClose, onAdd }) => {
  const [tab, setTab] = useState('search'); // 'search' | 'manual'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  // manual fields
  const [manualTitle, setManualTitle] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [adding, setAdding] = useState(false);

  const searchDestinations = async (q) => {
    if (!q.trim()) return setResults([]);
    setSearching(true);
    try {
      const res = await fetch(`${BASE_URL}/api/destinations?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : data.destinations || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchDestinations(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Load all destinations on open
  useEffect(() => { searchDestinations(' '); }, []);

  const handlePickExisting = async (dest) => {
    setAdding(true);
    await onAdd({
      type: 'destination',
      title: dest.name,
      notes,
      plannedDate,
      referenceId: dest._id,
    });
    setAdding(false);
  };

  const handleManual = async () => {
    if (!manualTitle.trim()) return alert('Please enter a destination name');
    setAdding(true);
    await onAdd({
      type: 'destination',
      title: manualTitle,
      notes: manualNotes,
      plannedDate: manualDate,
    });
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Destination</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Search Existing
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Enter Manually
          </button>
        </div>

        {tab === 'search' ? (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search destinations..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
              {searching && <p className="text-sm text-gray-400 text-center py-4">Searching…</p>}
              {!searching && results.length === 0 && query && <p className="text-sm text-gray-400 text-center py-4">No results found</p>}
              {results.map(dest => (
                <button
                  key={dest._id}
                  onClick={() => handlePickExisting(dest)}
                  disabled={adding}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    {dest.images?.[0]
                      ? <img src={`${BASE_URL}${dest.images[0]}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      : <MapPin size={18} className="text-green-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{dest.name}</p>
                    <p className="text-xs text-gray-500">{dest.country}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Planned Date</label>
                <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Name <span className="text-red-500">*</span></label>
              <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="e.g. Paris, France" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label>
              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button
              onClick={handleManual}
              disabled={adding}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Destination
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Add Hotel Modal ─────────────────────────────────────────────────────────
const AddHotelModal = ({ onClose, onAdd }) => {
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [adding, setAdding] = useState(false);

  const searchHotels = async (q) => {
    setSearching(true);
    try {
      const url = q.trim()
        ? `${BASE_URL}/api/hotels?search=${encodeURIComponent(q)}`
        : `${BASE_URL}/api/hotels`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : data.hotels || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => searchHotels(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => { searchHotels(''); }, []);

  const handlePickExisting = async (hotel) => {
    setAdding(true);
    await onAdd({
      type: 'hotel',
      title: hotel.name,
      notes,
      plannedDate,
      referenceId: hotel._id,
    });
    setAdding(false);
  };

  const handleManual = async () => {
    if (!manualTitle.trim()) return alert('Please enter a hotel name');
    setAdding(true);
    await onAdd({
      type: 'hotel',
      title: manualTitle,
      notes: manualNotes,
      plannedDate: manualDate,
    });
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Hotel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'search' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Search Existing
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Enter Manually
          </button>
        </div>

        {tab === 'search' ? (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search hotels..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
              {searching && <p className="text-sm text-gray-400 text-center py-4">Searching…</p>}
              {!searching && results.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hotels found</p>}
              {results.map(hotel => (
                <button
                  key={hotel._id}
                  onClick={() => handlePickExisting(hotel)}
                  disabled={adding}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {hotel.images?.[0]
                      ? <img src={`${BASE_URL}${hotel.images[0]}`} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      : <Hotel size={18} className="text-blue-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{hotel.name}</p>
                    <p className="text-xs text-gray-500">{hotel.country} {hotel.rating ? `· ★ ${hotel.rating}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Check-in Date</label>
                <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name <span className="text-red-500">*</span></label>
              <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="e.g. Hotel Grand Paris" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={manualNotes} onChange={e => setManualNotes(e.target.value)} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
              <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button
              onClick={handleManual}
              disabled={adding}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Hotel
            </button>
          </div>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ─── Add Generic Modal (flight / restaurant / activity) ──────────────────────
const AddGenericModal = ({ type, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [adding, setAdding] = useState(false);

  const labels = {
    flight: { title: 'Add Flight', placeholder: 'e.g. Qatar Airways QR501', dateLabel: 'Departure Date' },
    restaurant: { title: 'Add Restaurant', placeholder: 'e.g. Le Jules Verne', dateLabel: 'Reservation Date' },
    activity: { title: 'Add Activity', placeholder: 'e.g. Eiffel Tower Visit', dateLabel: 'Planned Date' },
  };
  const cfg = labels[type] || { title: 'Add Item', placeholder: 'Title', dateLabel: 'Date' };

  const handleSubmit = async () => {
    if (!title.trim()) return alert('Please enter a title');
    setAdding(true);
    await onAdd({ type, title, notes, plannedDate });
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{cfg.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={cfg.placeholder} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{cfg.dateLabel}</label>
            <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={adding}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const Itinerary = () => {
  const [itineraries, setItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [genericModal, setGenericModal] = useState(null); // 'flight' | 'restaurant' | 'activity' | null

  const navigate = useNavigate();

  useEffect(() => { fetchItineraries(); }, []);

  const token = () => localStorage.getItem('token');

  const fetchItineraries = async () => {
    if (!token()) return navigate('/login');
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load itineraries');
      const data = await res.json();
      setItineraries(data);
      if (data.length > 0) {
        setSelectedItinerary(data[0]);
        fetchItems(data[0]._id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (itineraryId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries/${itineraryId}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error('Failed to load items');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTrip = async ({ title, startDate, endDate }) => {
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ title, startDate: startDate || undefined, endDate: endDate || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create itinerary');
      const newItin = await res.json();
      setItineraries(prev => [newItin, ...prev]);
      setSelectedItinerary(newItin);
      setItems([]);
      setShowCreateModal(false);
    } catch (err) {
      alert('Error creating itinerary: ' + err.message);
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      const res = await fetch(`${BASE_URL}/api/itineraries/${selectedItinerary._id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(itemData),
      });
      if (!res.ok) throw new Error('Failed to add item');
      const newItem = await res.json();
      setItems(prev => [...prev, newItem]);
      setShowDestModal(false);
      setShowHotelModal(false);
      setGenericModal(null);
    } catch (err) {
      alert('Error adding item: ' + err.message);
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await fetch(`${BASE_URL}/api/itineraries/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      setItems(prev => prev.filter(i => i._id !== itemId));
    } catch {
      alert('Failed to remove item');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-12 w-12" /></div>;
  if (error) return <div className="text-red-600 text-center py-10">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">

      {/* Modals */}
      {showCreateModal && (
        <CreateTripModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTrip} />
      )}
      {showDestModal && selectedItinerary && (
        <AddDestinationModal onClose={() => setShowDestModal(false)} onAdd={handleAddItem} />
      )}
      {showHotelModal && selectedItinerary && (
        <AddHotelModal onClose={() => setShowHotelModal(false)} onAdd={handleAddItem} />
      )}
      {genericModal && selectedItinerary && (
        <AddGenericModal type={genericModal} onClose={() => setGenericModal(null)} onAdd={handleAddItem} />
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Trip Planner</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            <Plus size={20} /> New Itinerary
          </button>
        </div>

        {itineraries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <Calendar className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4">No itineraries yet</h2>
            <p className="text-gray-600 mb-8">
              Create your first trip plan and start adding destinations, hotels, flights, restaurants, and activities.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Start Planning
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

            {/* Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow p-6">
              <h3 className="text-xl font-bold mb-4">Your Trips</h3>
              <div className="space-y-2">
                {itineraries.map((itin) => (
                  <button
                    key={itin._id}
                    onClick={() => { setSelectedItinerary(itin); fetchItems(itin._id); }}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedItinerary?._id === itin._id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    {itin.title}
                    <p className="text-xs opacity-70">
                      {new Date(itin.createdAt).toLocaleDateString()}
                    </p>
                    {(itin.startDate || itin.endDate) && (
                      <p className="text-xs opacity-60 mt-0.5">
                        {itin.startDate ? new Date(itin.startDate).toLocaleDateString() : '?'}
                        {' → '}
                        {itin.endDate ? new Date(itin.endDate).toLocaleDateString() : '?'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main content */}
            <div className="lg:col-span-3">
              {selectedItinerary ? (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-3xl font-bold">{selectedItinerary.title}</h2>
                      {(selectedItinerary.startDate || selectedItinerary.endDate) && (
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedItinerary.startDate ? new Date(selectedItinerary.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}
                          {' → '}
                          {selectedItinerary.endDate ? new Date(selectedItinerary.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}
                        </p>
                      )}
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Edit size={18} /> Edit Title
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl">
                      <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium mb-3">Nothing planned yet</h3>
                      <p className="text-gray-600 mb-6">
                        Start by adding a destination, then add hotels, flights, restaurants, or activities.
                      </p>
                      <button
                        onClick={() => setShowDestModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add First Destination
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item._id} className="border-l-4 border-blue-600 pl-6 py-4 relative">
                          <div className="absolute -left-3 top-5 w-6 h-6 bg-blue-600 rounded-full"></div>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                {getIcon(item.type)}
                                <h3 className="font-semibold text-lg">{item.title}</h3>
                              </div>
                              <p className="text-sm text-gray-600">
                                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </p>
                              {item.notes && <p className="text-sm italic mt-2">{item.notes}</p>}
                              {item.plannedDate && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Planned: {new Date(item.plannedDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <button onClick={() => handleRemove(item._id)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick add buttons */}
                  <div className="mt-12 pt-8 border-t">
                    <h3 className="text-xl font-semibold mb-6">Quick Add</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button
                        onClick={() => setShowHotelModal(true)}
                        className="p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition text-center"
                      >
                        <Hotel className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                        <div className="font-medium">Hotel</div>
                      </button>
                      <button
                        onClick={() => setGenericModal('flight')}
                        className="p-6 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition text-center"
                      >
                        <Plane className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                        <div className="font-medium">Flight</div>
                      </button>
                      <button
                        onClick={() => setGenericModal('restaurant')}
                        className="p-6 bg-orange-50 rounded-xl hover:bg-orange-100 transition text-center"
                      >
                        <UtensilsCrossed className="h-10 w-10 text-orange-600 mx-auto mb-3" />
                        <div className="font-medium">Restaurant</div>
                      </button>
                      <button
                        onClick={() => setGenericModal('activity')}
                        className="p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition text-center"
                      >
                        <Zap className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                        <div className="font-medium">Activity</div>
                      </button>
                    </div>
                    {/* Destination add button separately since it's important */}
                    <button
                      onClick={() => setShowDestModal(true)}
                      className="mt-4 w-full p-4 bg-green-50 rounded-xl hover:bg-green-100 transition flex items-center justify-center gap-3"
                    >
                      <MapPin className="h-6 w-6 text-green-600" />
                      <span className="font-medium text-green-700">Add Destination</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-xl text-gray-600">Select or create an itinerary to start planning</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Itinerary;