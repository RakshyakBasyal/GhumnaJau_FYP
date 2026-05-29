// // frontend/src/pages/ManageDestinations.js
import { useEffect, useRef, useState } from "react";
import { Plus, Edit2, Trash2, X, Star } from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  getImageUrl,
} from "../services/api";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import Modal from "../components/Modal";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const toInt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
};

const preventWheelChange = (e) => {
  e.target.blur();
  setTimeout(() => e.target.focus(), 0);
};

const ManageDestinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const formRef = useRef(null);
  const [costMode, setCostMode] = useState("range");

  // ✅ rating removed from formData — it is set by user reviews automatically
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    description: "",
    shortDescription: "",
    bestTimeToVisit: "",
    averageCost: "",
    averageCostMin: "",
    averageCostMax: "",
    isAirport: false,
    nearestAirport: "",
  });

  const [files, setFiles] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { showToast } = useToast();

  useEffect(() => { fetchDestinations(); }, []);

  const fetchDestinations = async () => {
    try {
      const res = await getDestinations();
      setDestinations(res.data || []);
    } catch (err) {
      showToast("Failed to load destinations", "error");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  };

  const removeNewFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExistingNow = (imgPath) => {
    setImagesToDelete((prev) => prev.includes(imgPath) ? prev : [...prev, imgPath]);
    setExistingImages((prev) => prev.filter((img) => img !== imgPath));
  };

  const normalizeCostFields = () => {
    if (costMode === "single") {
      return { averageCost: formData.averageCost, averageCostMin: "", averageCostMax: "" };
    }
    return { averageCost: "", averageCostMin: formData.averageCostMin, averageCostMax: formData.averageCostMax };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    data.append("name", formData.name);
    data.append("country", formData.country);
    data.append("description", formData.description);
    data.append("shortDescription", formData.shortDescription);
    data.append("bestTimeToVisit", formData.bestTimeToVisit);
    data.append("isAirport", formData.isAirport);
    if (formData.nearestAirport) data.append("nearestAirport", formData.nearestAirport);

    // ✅ rating NOT appended — auto-computed from user reviews

    const costs = normalizeCostFields();
    if (costs.averageCost !== "") { const v = toInt(costs.averageCost); if (v !== undefined) data.append("averageCost", String(v)); }
    if (costs.averageCostMin !== "") { const v = toInt(costs.averageCostMin); if (v !== undefined) data.append("averageCostMin", String(v)); }
    if (costs.averageCostMax !== "") { const v = toInt(costs.averageCostMax); if (v !== undefined) data.append("averageCostMax", String(v)); }

    files.forEach((file) => data.append("images", file));
    if (editingId) data.append("deleteImages", JSON.stringify(imagesToDelete));

    try {
      if (editingId) {
        await updateDestination(editingId, data);
        showToast("Destination updated successfully!", "success");
      } else {
        await createDestination(data);
        showToast("Destination added successfully!", "success");
      }
      resetForm();
      fetchDestinations();
    } catch (err) {
      showToast("Failed to save destination", "error");
    } finally {
      setLoading(false);
    }
  };

  const inferCostModeFromDest = (dest) => {
    if (dest.averageCost !== undefined && dest.averageCost !== null && dest.averageCost !== "") return "single";
    return "range";
  };

  const startEdit = (dest) => {
    setCostMode(inferCostModeFromDest(dest));
    setFormData({
      name: dest.name || "",
      country: dest.country || "",
      description: dest.description || "",
      shortDescription: dest.shortDescription || "",
      bestTimeToVisit: dest.bestTimeToVisit || "",
      averageCost: dest.averageCost ?? "",
      averageCostMin: dest.averageCostMin ?? "",
      averageCostMax: dest.averageCostMax ?? "",
      isAirport: dest.isAirport || false,
      nearestAirport: dest.nearestAirport?._id || dest.nearestAirport || "",
    });
    setExistingImages(dest.images || []);
    setImagesToDelete([]);
    setFiles([]);
    setEditingId(dest._id);
    setShowForm(true);
    setTimeout(() => { formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 120);
  };

  const handleDelete = (id) => { setDeleteId(id); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    try {
      await deleteDestination(deleteId);
      showToast("Destination deleted successfully!", "success");
      fetchDestinations();
    } catch (err) {
      showToast(err.response?.data?.msg || "Failed to delete", "error");
    } finally {
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", country: "", description: "", shortDescription: "", bestTimeToVisit: "", averageCost: "", averageCostMin: "", averageCostMax: "", isAirport: false, nearestAirport: "" });
    setCostMode("range");
    setFiles([]);
    setExistingImages([]);
    setImagesToDelete([]);
    setEditingId(null);
    setShowForm(false);
  };

  const renderCostPreview = (dest) => {
    if (dest.averageCost !== undefined && dest.averageCost !== null && dest.averageCost !== "") return `NPR ${Math.round(Number(dest.averageCost))}`;
    const hasMin = dest.averageCostMin !== undefined && dest.averageCostMin !== null && dest.averageCostMin !== "";
    const hasMax = dest.averageCostMax !== undefined && dest.averageCostMax !== null && dest.averageCostMax !== "";
    if (hasMin || hasMax) {
      const min = hasMin ? Math.round(Number(dest.averageCostMin)) : "";
      const max = hasMax ? Math.round(Number(dest.averageCostMax)) : "";
      if (min !== "" && max !== "") return `NPR ${min} - ${max}`;
      if (min !== "") return `From NPR ${min}`;
      if (max !== "") return `Up to NPR ${max}`;
    }
    return "Varies";
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Destinations</h1>
            <p className="text-gray-600 mt-2">Add, edit, or remove destinations</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} type="button"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2">
            {showForm ? <><X className="h-5 w-5" /><span>Close</span></> : <><Plus className="h-5 w-5" /><span>Add Destination</span></>}
          </button>
        </div>

        {showForm && (
          <Modal
            isOpen={showForm}
            onClose={resetForm}
            title={editingId ? "Edit Destination" : "Add New Destination"}
            size="xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination Name</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input type="text" name="country" required value={formData.country} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Short Description (Landing Card)</label>
                <input type="text" name="shortDescription" required value={formData.shortDescription} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Gateway to the Himalayas" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                <textarea name="description" required value={formData.description} onChange={handleChange} rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Best Time to Visit</label>
                <input type="text" name="bestTimeToVisit" required value={formData.bestTimeToVisit} onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g., October - December" />
              </div>

              {/* Average Cost Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Average Cost (NPR)</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setCostMode("range")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${costMode === "range" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}>
                      Min / Max
                    </button>
                    <button type="button" onClick={() => setCostMode("single")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${costMode === "single" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"}`}>
                      Single Value
                    </button>
                  </div>
                </div>
                {costMode === "single" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Average Cost (NPR)</label>
                    <input type="number" name="averageCost" min="0" step="1" value={formData.averageCost} onChange={handleChange}
                      onWheel={preventWheelChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 1200" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Min (NPR)</label>
                      <input type="number" name="averageCostMin" min="0" step="1" value={formData.averageCostMin} onChange={handleChange}
                        onWheel={preventWheelChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 800" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max (NPR)</label>
                      <input type="number" name="averageCostMax" min="0" step="1" value={formData.averageCostMax} onChange={handleChange}
                        onWheel={preventWheelChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., 1500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Airport section */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Airport / Transport Hub Info</h3>
                <div className="flex items-center gap-3 mb-4">
                  <input type="checkbox" name="isAirport" checked={formData.isAirport} onChange={handleChange}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                  <label className="text-base font-medium text-gray-800">This destination has its own airport</label>
                </div>
                {!formData.isAirport && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nearest Airport</label>
                    <select name="nearestAirport" value={formData.nearestAirport} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">Select nearest airport</option>
                      {destinations.filter((d) => d.isAirport === true && d._id !== editingId).map((dest) => (
                        <option key={dest._id} value={dest._id}>{dest.name} ({dest.country})</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Flights to the selected airport will be shown on this destination's detail page.</p>
                  </div>
                )}
              </div>

              {/* Existing images */}
              {editingId && existingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Images</label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {existingImages.map((img) => (
                      <div key={img} className="relative">
                        <img src={getImageUrl(img)} alt="existing" className="w-full h-24 object-cover rounded-lg" />
                        <button type="button" onClick={() => deleteExistingNow(img)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add New Images</label>
                <input type="file" multiple onChange={handleFileChange}
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
                  {loading ? "Saving..." : editingId ? "Update Destination" : "Add Destination"}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Destinations grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.length === 0 ? (
            <p className="text-center text-gray-600 col-span-full py-12">No destinations found</p>
          ) : (
            destinations.map((destination) => (
              <div key={destination._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {destination.images?.[0] ? (
                  <img src={getImageUrl(destination.images[0])} alt={destination.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{destination.shortDescription || "No short description"}</p>
                  <div className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Avg Cost:</span> {renderCostPreview(destination)}
                  </div>
                  {/* ✅ Rating shown as user-computed, not admin-editable */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">
                      {destination.rating ? `${destination.rating} / 5` : "No reviews yet"}
                    </span>
                    <span className="text-xs text-gray-400">(from user reviews)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button onClick={() => startEdit(destination)} type="button"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDelete(destination._id)} type="button"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
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
        title="Delete Destination"
        message="Are you sure you want to delete this destination permanently? This action cannot be undone."
      />
    </div>
  );
};

export default ManageDestinations;