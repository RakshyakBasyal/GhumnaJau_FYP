import { useEffect, useRef, useState } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
} from "../services/api";

const BASE_URL = "http://localhost:5000";


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

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    description: "",
    shortDescription: "",
    rating: 5,
    bestTimeToVisit: "",

   
    averageCost: "",
    averageCostMin: "",
    averageCostMax: "",
  });


  const [files, setFiles] = useState([]);

  
  const [existingImages, setExistingImages] = useState([]);

  const [imagesToDelete, setImagesToDelete] = useState([]);

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const res = await getDestinations();
      setDestinations(res.data || []);
    } catch (err) {
      console.error("Failed to load destinations:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) : value,
    }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeNewFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExistingNow = (imgPath) => {
    setImagesToDelete((prev) =>
      prev.includes(imgPath) ? prev : [...prev, imgPath]
    );
    setExistingImages((prev) => prev.filter((img) => img !== imgPath));
  };

  const normalizeCostFields = () => {
    if (costMode === "single") {
      return {
        averageCost: formData.averageCost,
        averageCostMin: "",
        averageCostMax: "",
      };
    }

    return {
      averageCost: "",
      averageCostMin: formData.averageCostMin,
      averageCostMax: formData.averageCostMax,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("country", formData.country);
    data.append("description", formData.description);
    data.append("shortDescription", formData.shortDescription);
    data.append("rating", String(formData.rating));
    data.append("bestTimeToVisit", formData.bestTimeToVisit);

   
    const costs = normalizeCostFields();

    if (costs.averageCost !== "") {
      const v = toInt(costs.averageCost);
      if (v !== undefined) data.append("averageCost", String(v));
    }

    if (costs.averageCostMin !== "") {
      const v = toInt(costs.averageCostMin);
      if (v !== undefined) data.append("averageCostMin", String(v));
    }

    if (costs.averageCostMax !== "") {
      const v = toInt(costs.averageCostMax);
      if (v !== undefined) data.append("averageCostMax", String(v));
    }

    files.forEach((file) => data.append("images", file));

    if (editingId) {
      data.append("deleteImages", JSON.stringify(imagesToDelete));
    }

    try {
      if (editingId) {
        await updateDestination(editingId, data);
        alert("Destination updated successfully!");
      } else {
        await createDestination(data);
        alert("Destination added successfully!");
      }

      resetForm();
      fetchDestinations();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save destination");
    } finally {
      setLoading(false);
    }
  };

  const inferCostModeFromDest = (dest) => {
    if (
      dest.averageCost !== undefined &&
      dest.averageCost !== null &&
      dest.averageCost !== ""
    ) {
      return "single";
    }
    if (dest.averageCostMin !== undefined || dest.averageCostMax !== undefined) {
      return "range";
    }
    return "range";
  };

  const startEdit = (dest) => {
    const inferredMode = inferCostModeFromDest(dest);
    setCostMode(inferredMode);

    setFormData({
      name: dest.name || "",
      country: dest.country || "",
      description: dest.description || "",
      shortDescription: dest.shortDescription || "",
      rating: dest.rating || 5,
      bestTimeToVisit: dest.bestTimeToVisit || "",

      averageCost: dest.averageCost ?? "",
      averageCostMin: dest.averageCostMin ?? "",
      averageCostMax: dest.averageCostMax ?? "",
    });

    setExistingImages(dest.images || []);
    setImagesToDelete([]);
    setFiles([]);
    setEditingId(dest._id);
    setShowForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this destination permanently?")) return;

    try {
      await deleteDestination(id);
      alert("Destination deleted successfully!");
      fetchDestinations();
    } catch (err) {
      console.error("Delete error:", err.response || err);
      const msg = err.response?.data?.msg || "Failed to delete";
      alert(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      country: "",
      description: "",
      shortDescription: "",
      rating: 5,
      bestTimeToVisit: "",

      averageCost: "",
      averageCostMin: "",
      averageCostMax: "",
    });

    setCostMode("range");
    setFiles([]);
    setExistingImages([]);
    setImagesToDelete([]);
    setEditingId(null);
    setShowForm(false);
  };

  const renderCostPreview = (dest) => {
    if (
      dest.averageCost !== undefined &&
      dest.averageCost !== null &&
      dest.averageCost !== ""
    ) {
      return `NPR ${Math.round(Number(dest.averageCost))}`;
    }

    const hasMin =
      dest.averageCostMin !== undefined &&
      dest.averageCostMin !== null &&
      dest.averageCostMin !== "";
    const hasMax =
      dest.averageCostMax !== undefined &&
      dest.averageCostMax !== null &&
      dest.averageCostMax !== "";

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

          {/* ✅ FIXED ICON: Plus when closed, X when open */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
            type="button"
          >
            {showForm ? (
              <>
                <X className="h-5 w-5" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span>Add Destination</span>
              </>
            )}
          </button>
        </div>

        {showForm && (
          <div ref={formRef} className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? "Edit Destination" : "Add New Destination"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Description (Landing Card)
                </label>
                <input
                  type="text"
                  name="shortDescription"
                  required
                  value={formData.shortDescription}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Gateway to the Himalayas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Description
                </label>
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Best Time to Visit
                  </label>
                  <input
                    type="text"
                    name="bestTimeToVisit"
                    required
                    value={formData.bestTimeToVisit}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="e.g., October - December"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <select
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    {[4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Average Cost Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">Average Cost (NPR)</h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCostMode("range")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        costMode === "range"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      Min / Max
                    </button>
                    <button
                      type="button"
                      onClick={() => setCostMode("single")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        costMode === "single"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      Single Value
                    </button>
                  </div>
                </div>

                {costMode === "single" ? (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Average Cost (NPR)
                    </label>
                    <input
                      type="number"
                      name="averageCost"
                      min="0"
                      step="1"
                      value={formData.averageCost}
                      onChange={handleChange}
                      onWheel={preventWheelChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g., 1200"
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Average Cost Min (NPR)
                      </label>
                      <input
                        type="number"
                        name="averageCostMin"
                        min="0"
                        step="1"
                        value={formData.averageCostMin}
                        onChange={handleChange}
                        onWheel={preventWheelChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="e.g., 800"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Average Cost Max (NPR)
                      </label>
                      <input
                        type="number"
                        name="averageCostMax"
                        min="0"
                        step="1"
                        value={formData.averageCostMax}
                        onChange={handleChange}
                        onWheel={preventWheelChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="e.g., 1500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {editingId && existingImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Images
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {existingImages.map((img) => (
                      <div key={img} className="relative">
                        <img
                          src={`${BASE_URL}${img}`}
                          alt="existing"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => deleteExistingNow(img)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Images
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {files.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
                    {files.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="new"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingId ? "Update Destination" : "Add Destination"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.length === 0 ? (
            <p className="text-center text-gray-600 col-span-full py-12">
              No destinations found
            </p>
          ) : (
            destinations.map((destination) => (
              <div key={destination._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                {destination.images?.[0] ? (
                  <img
                    src={`${BASE_URL}${destination.images[0]}`}
                    alt={destination.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No image</span>
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {destination.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-3">
                    {destination.shortDescription || "No short description"}
                  </p>

                  <div className="text-sm text-gray-700 mb-4">
                    <span className="font-semibold">Avg Cost:</span>{" "}
                    {renderCostPreview(destination)}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-yellow-500 font-semibold">
                      ★ {destination.rating || 5}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(destination)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        type="button"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(destination._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        type="button"
                      >
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
    </div>
  );
};

export default ManageDestinations;
