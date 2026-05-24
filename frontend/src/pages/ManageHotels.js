// frontend/src/pages/ManageHotels.jsx
import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Star, MapPin } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import { getHotels, createHotel, updateHotel, deleteHotel, getDestinations } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LocationPicker from '../components/admin/LocationPicker';
import Modal from '../components/Modal';

const BASE_URL = 'http://localhost:5000';

const ManageHotels = () => {
  const [hotels,       setHotels]       = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [loading,      setLoading]      = useState(false);

  const [formData, setFormData] = useState({
    name: '', destination: '', country: '',
    description: '', shortDescription: '',
    amenities: '', roomTypes: [],
  });

  // Map location
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);

  const [files,           setFiles]           = useState([]);
  const [existingImages,  setExistingImages]  = useState([]);
  const [imagesToDelete,  setImagesToDelete]  = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId,        setDeleteId]        = useState(null);
  const { showToast } = useToast();
  const formRef = useRef(null);

  useEffect(() => { fetchHotels(); fetchDestinations(); }, []);

  const fetchHotels = async () => {
    try { const res = await getHotels(); setHotels(res.data || []); }
    catch (_) { showToast('Failed to load hotels', 'error'); }
  };

  const fetchDestinations = async () => {
    try { const res = await getDestinations(); setDestinations(res.data || []); }
    catch (_) {}
  };

  const preventWheelChange = (e) => {
    e.target.blur();
    setTimeout(() => e.target.focus(), 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeNewFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDeleteExisting = (imgPath) => {
    setImagesToDelete(prev =>
      prev.includes(imgPath) ? prev.filter(p => p !== imgPath) : [...prev, imgPath]
    );
    setExistingImages(prev => prev.filter(img => img !== imgPath));
  };

  const addRoomType = () => {
    setFormData(prev => ({
      ...prev,
      roomTypes: [...(prev.roomTypes || []), { name: '', pricePerNight: '', maxCapacity: 2 }],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('name',             formData.name);
    data.append('destination',      formData.destination);
    data.append('country',          formData.country);
    data.append('description',      formData.description);
    data.append('shortDescription', formData.shortDescription);
    data.append('amenities',        formData.amenities);
    data.append('roomTypes',        JSON.stringify(formData.roomTypes));

    // Send coordinates (or empty string to clear)
    data.append('lat', pinLat !== null ? pinLat : '');
    data.append('lng', pinLng !== null ? pinLng : '');

    files.forEach(file => data.append('images', file));
    if (editingId && imagesToDelete.length > 0) {
      data.append('deleteImages', JSON.stringify(imagesToDelete));
    }

    try {
      if (editingId) {
        await updateHotel(editingId, data);
        showToast('Hotel updated successfully!', 'success');
      } else {
        await createHotel(data);
        showToast('Hotel added successfully!', 'success');
      }
      resetForm();
      fetchHotels();
    } catch (_) {
      showToast('Failed to save hotel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (hotel) => {
    setFormData({
      name:             hotel.name || '',
      destination:      hotel.destination?._id || '',
      country:          hotel.country || '',
      description:      hotel.description || '',
      shortDescription: hotel.shortDescription || '',
      amenities:        hotel.amenities?.join(', ') || '',
      roomTypes:        hotel.roomTypes || [],
    });
    setExistingImages(hotel.images || []);
    setImagesToDelete([]);
    setFiles([]);
    setPinLat(hotel.location?.lat || null);
    setPinLng(hotel.location?.lng || null);
    setEditingId(hotel._id);
    setShowForm(true);
    setTimeout(() => {
      if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    try {
      await deleteHotel(deleteId);
      showToast('Hotel deleted successfully!', 'success');
      fetchHotels();
    } catch (_) {
      showToast('Delete failed', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', destination: '', country: '', description: '', shortDescription: '', amenities: '', roomTypes: [] });
    setFiles([]); setExistingImages([]); setImagesToDelete([]);
    setPinLat(null); setPinLng(null);
    setEditingId(null); setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Hotels</h1>
            <p className="text-gray-600 mt-2">Add, edit, or remove hotels</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            {showForm
              ? <><X className="h-5 w-5" /><span>Close</span></>
              : <><Plus className="h-5 w-5" /><span>Add Hotel</span></>}
          </button>
        </div>

        {showForm && (
          <Modal
            isOpen={showForm}
            onClose={resetForm}
            title={editingId ? 'Edit Hotel' : 'Add New Hotel'}
            size="xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hotel Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <select name="destination" required value={formData.destination} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Destination</option>
                    {destinations.map(dest => (
                      <option key={dest._id} value={dest._id}>{dest.name} ({dest.country || 'Nepal'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <input type="text" name="country" required value={formData.country} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
                <input type="text" name="shortDescription" value={formData.shortDescription} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities (comma separated)</label>
                <input type="text" name="amenities" value={formData.amenities} onChange={handleChange}
                  placeholder="e.g. WiFi, Parking, Breakfast, Swimming Pool, AC"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              {/* Room Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room Types</label>
                {formData.roomTypes.map((room, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg bg-gray-50">
                    <input type="text" placeholder="Room Name (e.g. Single)" value={room.name} required
                      onChange={e => {
                        const t = [...formData.roomTypes]; t[index].name = e.target.value;
                        setFormData({ ...formData, roomTypes: t });
                      }}
                      className="px-4 py-2 border rounded-lg" />
                    <input type="number" placeholder="Price per night" value={room.pricePerNight} required min="0"
                      onWheel={preventWheelChange}
                      onChange={e => {
                        const t = [...formData.roomTypes]; t[index].pricePerNight = e.target.value;
                        setFormData({ ...formData, roomTypes: t });
                      }}
                      className="px-4 py-2 border rounded-lg" />
                    <input type="number" placeholder="Max Guests" value={room.maxCapacity} min="1"
                      onWheel={preventWheelChange}
                      onChange={e => {
                        const t = [...formData.roomTypes]; t[index].maxCapacity = e.target.value;
                        setFormData({ ...formData, roomTypes: t });
                      }}
                      className="px-4 py-2 border rounded-lg" />
                    <button type="button"
                      onClick={() => setFormData({ ...formData, roomTypes: formData.roomTypes.filter((_, i) => i !== index) })}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200">
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addRoomType}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  + Add Room Type
                </button>
              </div>

              {/* ── Location Map Picker ─────────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Location on Map <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <LocationPicker
                  lat={pinLat}
                  lng={pinLng}
                  onChange={(lat, lng) => { setPinLat(lat); setPinLng(lng); }}
                  onClear={() => { setPinLat(null); setPinLng(null); }}
                />
              </div>

              {/* Existing Images */}
              {editingId && existingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Images</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {existingImages.map((img) => (
                      <div key={img} className="relative">
                        <img src={`${BASE_URL}${img}`} alt="existing" className="w-full h-24 object-cover rounded-lg" />
                        <button type="button" onClick={() => toggleDeleteExisting(img)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Images</label>
                <input type="file" multiple accept="image/*" onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {files.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(file)} alt="new" className="w-full h-24 object-cover rounded-lg" />
                        <button type="button" onClick={() => removeNewFile(i)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  {loading ? 'Saving...' : editingId ? 'Update Hotel' : 'Add Hotel'}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition">
                  Close
                </button>
              </div>
            </form>
            </Modal>
          )}

        {/* Hotels grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.length === 0 ? (
            <p className="text-center text-gray-600 col-span-full py-12">No hotels found</p>
          ) : (
            hotels.map((hotel) => (
              <div key={hotel._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {hotel.images?.[0] ? (
                  <img src={`${BASE_URL}${hotel.images[0]}`} alt={hotel.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{hotel.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{hotel.shortDescription || 'No description'}</p>

                  {/* Pin status badge */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <MapPin className={`h-3.5 w-3.5 ${hotel.location?.lat ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={`text-xs font-medium ${hotel.location?.lat ? 'text-green-600' : 'text-gray-400'}`}>
                      {hotel.location?.lat ? 'Map pin set' : 'No map pin'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-4">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">
                      {hotel.rating ? `${hotel.rating} / 5` : 'No reviews yet'}
                    </span>
                    <span className="text-xs text-gray-400">(from user reviews)</span>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={() => startEdit(hotel)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(hotel._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
        onConfirm={confirmDelete}
        title="Delete Hotel"
        message="Are you sure you want to delete this hotel permanently? This action cannot be undone."
      />
    </div>
  );
};

export default ManageHotels;