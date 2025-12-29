
// // // src/pages/ManageDestinations.jsx
// // import { useEffect, useState } from 'react';
// // import { Plus, Edit2, Trash2 } from 'lucide-react';
// // import AdminNavbar from '../components/AdminNavbar';
// // import { getDestinations, createDestination, updateDestination, deleteDestination } from '../services/api';

// // const ManageDestinations = () => {
// //   const [destinations, setDestinations] = useState([]);
// //   const [showForm, setShowForm] = useState(false);
// //   const [editingId, setEditingId] = useState(null);
// //   const [loading, setLoading] = useState(false);

// //   const [formData, setFormData] = useState({
// //     name: '',
// //     country: '',
// //     description: '',
// //     shortDescription: '',
// //     rating: 5,
// //     bestTimeToVisit: '',
// //   });

// //   const [files, setFiles] = useState([]);
// //   const [previewImages, setPreviewImages] = useState([]);

// //   useEffect(() => {
// //     fetchDestinations();
// //   }, []);

// //   const fetchDestinations = async () => {
// //     try {
// //       const res = await getDestinations();
// //       setDestinations(res.data);
// //     } catch (err) {
// //       alert('Failed to load destinations');
// //     }
// //   };

// //   const handleChange = (e) => {
// //     const { name, value } = e.target;
// //     setFormData(prev => ({
// //       ...prev,
// //       [name]: name === 'rating' ? parseFloat(value) : value
// //     }));
// //   };

// //   const handleFileChange = (e) => {
// //     const newFiles = Array.from(e.target.files);
// //     setFiles(newFiles);
// //     const newPreviews = newFiles.map(file => URL.createObjectURL(file));
// //     setPreviewImages(prev => [...prev, ...newPreviews]);
// //   };

// //   const removePreview = (index) => {
// //     setFiles(files.filter((_, i) => i !== index));
// //     setPreviewImages(previewImages.filter((_, i) => i !== index));
// //   };

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     setLoading(true);

// //     const data = new FormData();
// //     data.append('name', formData.name);
// //     data.append('country', formData.country);
// //     data.append('description', formData.description);
// //     data.append('shortDescription', formData.shortDescription);
// //     data.append('rating', formData.rating);
// //     data.append('bestTimeToVisit', formData.bestTimeToVisit);

// //     files.forEach(file => data.append('images', file));

// //     try {
// //       if (editingId) {
// //         await updateDestination(editingId, data);
// //         alert('Destination updated!');
// //       } else {
// //         await createDestination(data);
// //         alert('Destination added!');
// //       }
// //       resetForm();
// //       fetchDestinations();
// //     } catch (err) {
// //       console.error(err);
// //       alert('Operation failed');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const startEdit = (dest) => {
// //     setFormData({
// //       name: dest.name,
// //       country: dest.country || '',
// //       description: dest.description || '',
// //       shortDescription: dest.shortDescription || '',
// //       rating: dest.rating || 5,
// //       bestTimeToVisit: dest.bestTimeToVisit || '',
// //     });
// //     setPreviewImages(dest.images ? dest.images.map(img => `http://localhost:5000${img}`) : []);
// //     setFiles([]);
// //     setEditingId(dest._id);
// //     setShowForm(true);
// //   };

// //   const handleDelete = async (id) => {
// //     if (window.confirm('Are you sure you want to delete this destination?')) {
// //       try {
// //         await deleteDestination(id);
// //         fetchDestinations();
// //       } catch (err) {
// //         alert('Delete failed');
// //       }
// //     }
// //   };

// //   const resetForm = () => {
// //     setFormData({
// //       name: '',
// //       country: '',
// //       description: '',
// //       shortDescription: '',
// //       rating: 5,
// //       bestTimeToVisit: '',
// //     });
// //     setFiles([]);
// //     setPreviewImages([]);
// //     setEditingId(null);
// //     setShowForm(false);
// //   };

// //   return (
// //     <div className="min-h-screen bg-gray-100">
// //       <AdminNavbar />
// //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
// //         <div className="flex justify-between items-center mb-8">
// //           <div>
// //             <h1 className="text-3xl font-bold text-gray-900">Manage Destinations</h1>
// //             <p className="text-gray-600 mt-2">Add, edit, or remove destinations</p>
// //           </div>
// //           <button
// //             onClick={() => setShowForm(!showForm)}
// //             className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
// //           >
// //             <Plus className="h-5 w-5" />
// //             <span>Add Destination</span>
// //           </button>
// //         </div>

// //         {showForm && (
// //           <div className="bg-white rounded-xl shadow-md p-8 mb-8">
// //             <h2 className="text-2xl font-bold text-gray-900 mb-6">
// //               {editingId ? 'Edit Destination' : 'Add New Destination'}
// //             </h2>
// //             <form onSubmit={handleSubmit} className="space-y-6">
// //               <div className="grid md:grid-cols-2 gap-6">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Destination Name
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="name"
// //                     required
// //                     value={formData.name}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   />
// //                 </div>
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Country
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="country"
// //                     required
// //                     value={formData.country}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   />
// //                 </div>
// //               </div>

// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Short Description
// //                 </label>
// //                 <input
// //                   type="text"
// //                   name="shortDescription"
// //                   required
// //                   value={formData.shortDescription}
// //                   onChange={handleChange}
// //                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                 />
// //               </div>

// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Full Description
// //                 </label>
// //                 <textarea
// //                   name="description"
// //                   required
// //                   value={formData.description}
// //                   onChange={handleChange}
// //                   rows={4}
// //                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
// //                 />
// //               </div>

// //               <div className="grid md:grid-cols-2 gap-6">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Best Time to Visit
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="bestTimeToVisit"
// //                     required
// //                     value={formData.bestTimeToVisit}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                     placeholder="e.g., October - December"
// //                   />
// //                 </div>
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Rating
// //                   </label>
// //                   <select
// //                     name="rating"
// //                     value={formData.rating}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   >
// //                     {[4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((r) => (
// //                       <option key={r} value={r}>{r}</option>
// //                     ))}
// //                   </select>
// //                 </div>
// //               </div>

// //               {/* Image Upload */}
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Images (add multiple)
// //                 </label>
// //                 <input
// //                   type="file"
// //                   multiple
// //                   onChange={handleFileChange}
// //                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
// //                 />
// //                 <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-4">
// //                   {previewImages.map((src, i) => (
// //                     <div key={i} className="relative">
// //                       <img src={src} alt="preview" className="w-full h-24 object-cover rounded-lg" />
// //                       <button type="button" onClick={() => removePreview(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs">×</button>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               <div className="flex space-x-4">
// //                 <button
// //                   type="submit"
// //                   disabled={loading}
// //                   className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
// //                 >
// //                   {loading ? 'Saving...' : editingId ? 'Update Destination' : 'Add Destination'}
// //                 </button>
// //                 <button
// //                   type="button"
// //                   onClick={resetForm}
// //                   className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
// //                 >
// //                   Cancel
// //                 </button>
// //               </div>
// //             </form>
// //           </div>
// //         )}

// //         {/* Destinations Grid */}
// //         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
// //           {destinations.length === 0 ? (
// //             <p className="text-center text-gray-600 col-span-full py-12">No destinations found</p>
// //           ) : (
// //             destinations.map((destination) => (
// //               <div key={destination._id} className="bg-white rounded-xl shadow-md overflow-hidden">
// //                 {destination.images?.[0] ? (
// //                   <img
// //                     src={`http://localhost:5000${destination.images[0]}`}
// //                     alt={destination.name}
// //                     className="w-full h-48 object-cover"
// //                   />
// //                 ) : (
// //                   <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
// //                     <span className="text-gray-500">No image</span>
// //                   </div>
// //                 )}
// //                 <div className="p-6">
// //                   <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
// //                   <p className="text-gray-600 text-sm mb-4">{destination.shortDescription || 'No description'}</p>
// //                   <div className="flex items-center justify-between">
// //                     <span className="text-yellow-500 font-semibold">★ {destination.rating || 5}</span>
// //                     <div className="flex space-x-2">
// //                       <button
// //                         onClick={() => startEdit(destination)}
// //                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
// //                       >
// //                         <Edit2 className="h-5 w-5" />
// //                       </button>
// //                       <button
// //                         onClick={() => handleDelete(destination._id)}
// //                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
// //                       >
// //                         <Trash2 className="h-5 w-5" />
// //                       </button>
// //                     </div>
// //                   </div>
// //                 </div>
// //               </div>
// //             ))
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default ManageDestinations;



// // // src/pages/ManageDestinations.jsx
// // import { useEffect, useState } from 'react';
// // import { Plus, Edit2, Trash2 } from 'lucide-react';
// // import AdminNavbar from '../components/AdminNavbar';
// // import { getDestinations, createDestination, updateDestination, deleteDestination } from '../services/api';

// // const ManageDestinations = () => {
// //   const [destinations, setDestinations] = useState([]);
// //   const [showForm, setShowForm] = useState(false);
// //   const [editingId, setEditingId] = useState(null);
// //   const [loading, setLoading] = useState(false);

// //   const [formData, setFormData] = useState({
// //     name: '',
// //     country: '',
// //     description: '',
// //     shortDescription: '',
// //     rating: 5,
// //     bestTimeToVisit: '',
// //   });

// //   const [files, setFiles] = useState([]);
// //   const [previewImages, setPreviewImages] = useState([]);

// //   useEffect(() => {
// //     fetchDestinations();
// //   }, []);

// //   const fetchDestinations = async () => {
// //     try {
// //       const res = await getDestinations();
// //       setDestinations(res.data || []);
// //     } catch (err) {
// //       console.error('Failed to load destinations:', err);
// //     }
// //   };

// //   const handleChange = (e) => {
// //     const { name, value } = e.target;
// //     setFormData((prev) => ({
// //       ...prev,
// //       [name]: name === 'rating' ? parseFloat(value) : value,
// //     }));
// //   };

// //   const handleFileChange = (e) => {
// //     const newFiles = Array.from(e.target.files);
// //     setFiles(newFiles);
// //     const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
// //     setPreviewImages((prev) => [...prev, ...newPreviews]);
// //   };

// //   const removePreview = (index) => {
// //     setFiles((prev) => prev.filter((_, i) => i !== index));
// //     setPreviewImages((prev) => prev.filter((_, i) => i !== index));
// //   };

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     setLoading(true);

// //     const data = new FormData();
// //     data.append('name', formData.name);
// //     data.append('country', formData.country);
// //     data.append('description', formData.description);
// //     data.append('shortDescription', formData.shortDescription);
// //     data.append('rating', formData.rating);
// //     data.append('bestTimeToVisit', formData.bestTimeToVisit);

// //     files.forEach((file) => data.append('images', file));

// //     try {
// //       if (editingId) {
// //         await updateDestination(editingId, data);
// //         alert('Destination updated successfully!');
// //       } else {
// //         await createDestination(data);
// //         alert('Destination added successfully!');
// //       }
// //       resetForm();
// //       fetchDestinations();
// //     } catch (err) {
// //       console.error('Save error:', err);
// //       alert('Failed to save destination');
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const startEdit = (dest) => {
// //     setFormData({
// //       name: dest.name,
// //       country: dest.country || '',
// //       description: dest.description || '',
// //       shortDescription: dest.shortDescription || '',
// //       rating: dest.rating || 5,
// //       bestTimeToVisit: dest.bestTimeToVisit || '',
// //     });
// //     setPreviewImages(dest.images ? dest.images.map((img) => `http://localhost:5000${img}`) : []);
// //     setFiles([]);
// //     setEditingId(dest._id);
// //     setShowForm(true);
// //   };

// // const handleDelete = async (id) => {
// //   if (!window.confirm('Are you sure you want to delete this destination permanently?')) {
// //     return;
// //   }

// //   try {
// //     const response = await deleteDestination(id);
// //     console.log('Delete response:', response); // Check this in console
// //     alert('Destination deleted successfully!');
// //     fetchDestinations(); // Re-fetch to be safe
// //   } catch (err) {
// //     console.error('Delete error:', err.response || err);
// //     const msg = err.response?.data?.msg || 'Failed to delete. Are you logged in as admin?';
// //     alert(msg);
// //     fetchDestinations(); // Restore list if failed
// //   }
// // };

// //   const resetForm = () => {
// //     setFormData({
// //       name: '',
// //       country: '',
// //       description: '',
// //       shortDescription: '',
// //       rating: 5,
// //       bestTimeToVisit: '',
// //     });
// //     setFiles([]);
// //     setPreviewImages([]);
// //     setEditingId(null);
// //     setShowForm(false);
// //   };

// //   return (
// //     <div className="min-h-screen bg-gray-100">
// //       <AdminNavbar />
// //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
// //         <div className="flex justify-between items-center mb-8">
// //           <div>
// //             <h1 className="text-3xl font-bold text-gray-900">Manage Destinations</h1>
// //             <p className="text-gray-600 mt-2">Add, edit, or remove destinations</p>
// //           </div>
// //           <button
// //             onClick={() => setShowForm(!showForm)}
// //             className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
// //           >
// //             <Plus className="h-5 w-5" />
// //             <span>Add Destination</span>
// //           </button>
// //         </div>

// //         {showForm && (
// //           <div className="bg-white rounded-xl shadow-md p-8 mb-8">
// //             <h2 className="text-2xl font-bold text-gray-900 mb-6">
// //               {editingId ? 'Edit Destination' : 'Add New Destination'}
// //             </h2>
// //             <form onSubmit={handleSubmit} className="space-y-6">
// //               <div className="grid md:grid-cols-2 gap-6">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Destination Name
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="name"
// //                     required
// //                     value={formData.name}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   />
// //                 </div>
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Country
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="country"
// //                     required
// //                     value={formData.country}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   />
// //                 </div>
// //               </div>

// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Short Description
// //                 </label>
// //                 <input
// //                   type="text"
// //                   name="shortDescription"
// //                   required
// //                   value={formData.shortDescription}
// //                   onChange={handleChange}
// //                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                 />
// //               </div>

// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Full Description
// //                 </label>
// //                 <textarea
// //                   name="description"
// //                   required
// //                   value={formData.description}
// //                   onChange={handleChange}
// //                   rows={4}
// //                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
// //                 />
// //               </div>

// //               <div className="grid md:grid-cols-2 gap-6">
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Best Time to Visit
// //                   </label>
// //                   <input
// //                     type="text"
// //                     name="bestTimeToVisit"
// //                     required
// //                     value={formData.bestTimeToVisit}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                     placeholder="e.g., October - December"
// //                   />
// //                 </div>
// //                 <div>
// //                   <label className="block text-sm font-medium text-gray-700 mb-2">
// //                     Rating
// //                   </label>
// //                   <select
// //                     name="rating"
// //                     value={formData.rating}
// //                     onChange={handleChange}
// //                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
// //                   >
// //                     {[4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((r) => (
// //                       <option key={r} value={r}>
// //                         {r}
// //                       </option>
// //                     ))}
// //                   </select>
// //                 </div>
// //               </div>

// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// //                   Images (add multiple)
// //                 </label>
// //                 <input
// //                   type="file"
// //                   multiple
// //                   onChange={handleFileChange}
// //                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
// //                 />
// //                 <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-4">
// //                   {previewImages.map((src, i) => (
// //                     <div key={i} className="relative">
// //                       <img src={src} alt="preview" className="w-full h-24 object-cover rounded-lg" />
// //                       <button
// //                         type="button"
// //                         onClick={() => removePreview(i)}
// //                         className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs"
// //                       >
// //                         ×
// //                       </button>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               <div className="flex space-x-4">
// //                 <button
// //                   type="submit"
// //                   disabled={loading}
// //                   className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
// //                 >
// //                   {loading ? 'Saving...' : editingId ? 'Update Destination' : 'Add Destination'}
// //                 </button>
// //                 <button
// //                   type="button"
// //                   onClick={resetForm}
// //                   className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
// //                 >
// //                   Cancel
// //                 </button>
// //               </div>
// //             </form>
// //           </div>
// //         )}

// //         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
// //           {destinations.length === 0 ? (
// //             <p className="text-center text-gray-600 col-span-full py-12">No destinations found</p>
// //           ) : (
// //             destinations.map((destination) => (
// //               <div key={destination._id} className="bg-white rounded-xl shadow-md overflow-hidden">
// //                 {destination.images?.[0] ? (
// //                   <img
// //                     src={`http://localhost:5000${destination.images[0]}`}
// //                     alt={destination.name}
// //                     className="w-full h-48 object-cover"
// //                   />
// //                 ) : (
// //                   <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
// //                     <span className="text-gray-500">No image</span>
// //                   </div>
// //                 )}
// //                 <div className="p-6">
// //                   <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
// //                   <p className="text-gray-600 text-sm mb-4">{destination.shortDescription || 'No description'}</p>
// //                   <div className="flex items-center justify-between">
// //                     <span className="text-yellow-500 font-semibold">★ {destination.rating || 5}</span>
// //                     <div className="flex space-x-2">
// //                       <button
// //                         onClick={() => startEdit(destination)}
// //                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
// //                       >
// //                         <Edit2 className="h-5 w-5" />
// //                       </button>
// //                       <button
// //                         onClick={() => handleDelete(destination._id)}
// //                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
// //                       >
// //                         <Trash2 className="h-5 w-5" />
// //                       </button>
// //                     </div>
// //                   </div>
// //                 </div>
// //               </div>
// //             ))
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default ManageDestinations;


// // src/pages/ManageDestinations.jsx
// import { useEffect, useState } from "react";
// import { Plus, Edit2, Trash2, X } from "lucide-react";
// import AdminNavbar from "../components/AdminNavbar";
// import {
//   getDestinations,
//   createDestination,
//   updateDestination,
//   deleteDestination,
// } from "../services/api";

// const BASE_URL = "http://localhost:5000";

// const ManageDestinations = () => {
//   const [destinations, setDestinations] = useState([]);
//   const [showForm, setShowForm] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const [formData, setFormData] = useState({
//     name: "",
//     country: "",
//     description: "",
//     shortDescription: "",
//     rating: 5,
//     bestTimeToVisit: "",
//   });

//   // ✅ new uploads
//   const [files, setFiles] = useState([]);

//   // ✅ existing images from DB
//   const [existingImages, setExistingImages] = useState([]);

//   // ✅ which existing images to delete
//   const [imagesToDelete, setImagesToDelete] = useState([]);

//   useEffect(() => {
//     fetchDestinations();
//   }, []);

//   const fetchDestinations = async () => {
//     try {
//       const res = await getDestinations();
//       setDestinations(res.data || []);
//     } catch (err) {
//       console.error("Failed to load destinations:", err);
//     }
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: name === "rating" ? parseFloat(value) : value,
//     }));
//   };

//   // ✅ add new files (append)
//   const handleFileChange = (e) => {
//     const newFiles = Array.from(e.target.files);
//     setFiles((prev) => [...prev, ...newFiles]);
//   };

//   const removeNewFile = (index) => {
//     setFiles((prev) => prev.filter((_, i) => i !== index));
//   };

//   // ✅ toggle existing image delete
//   const toggleDeleteExisting = (imgPath) => {
//     setImagesToDelete((prev) =>
//       prev.includes(imgPath) ? prev.filter((p) => p !== imgPath) : [...prev, imgPath]
//     );
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     const data = new FormData();
//     data.append("name", formData.name);
//     data.append("country", formData.country);
//     data.append("description", formData.description);
//     data.append("shortDescription", formData.shortDescription);
//     data.append("rating", formData.rating);
//     data.append("bestTimeToVisit", formData.bestTimeToVisit);

//     // ✅ new uploads
//     files.forEach((file) => data.append("images", file));

//     // ✅ tell backend which existing images to delete
//     if (editingId) {
//       data.append("deleteImages", JSON.stringify(imagesToDelete));
//     }

//     try {
//       if (editingId) {
//         await updateDestination(editingId, data);
//         alert("Destination updated successfully!");
//       } else {
//         await createDestination(data);
//         alert("Destination added successfully!");
//       }
//       resetForm();
//       fetchDestinations();
//     } catch (err) {
//       console.error("Save error:", err);
//       alert("Failed to save destination");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const startEdit = (dest) => {
//     setFormData({
//       name: dest.name,
//       country: dest.country || "",
//       description: dest.description || "",
//       shortDescription: dest.shortDescription || "",
//       rating: dest.rating || 5,
//       bestTimeToVisit: dest.bestTimeToVisit || "",
//     });

//     setExistingImages(dest.images || []);
//     setImagesToDelete([]);
//     setFiles([]);
//     setEditingId(dest._id);
//     setShowForm(true);
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this destination permanently?")) return;

//     try {
//       await deleteDestination(id);
//       alert("Destination deleted successfully!");
//       fetchDestinations();
//     } catch (err) {
//       console.error("Delete error:", err.response || err);
//       alert(err.response?.data?.msg || "Failed to delete");
//     }
//   };

//   const resetForm = () => {
//     setFormData({
//       name: "",
//       country: "",
//       description: "",
//       shortDescription: "",
//       rating: 5,
//       bestTimeToVisit: "",
//     });
//     setFiles([]);
//     setExistingImages([]);
//     setImagesToDelete([]);
//     setEditingId(null);
//     setShowForm(false);
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       <AdminNavbar />
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex justify-between items-center mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">Manage Destinations</h1>
//             <p className="text-gray-600 mt-2">Add, edit, or remove destinations</p>
//           </div>
//           <button
//             onClick={() => setShowForm(!showForm)}
//             className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
//           >
//             <Plus className="h-5 w-5" />
//             <span>{showForm ? "Close" : "Add Destination"}</span>
//           </button>
//         </div>

//         {showForm && (
//           <div className="bg-white rounded-xl shadow-md p-8 mb-8">
//             <h2 className="text-2xl font-bold text-gray-900 mb-6">
//               {editingId ? "Edit Destination" : "Add New Destination"}
//             </h2>

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div className="grid md:grid-cols-2 gap-6">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Destination Name
//                   </label>
//                   <input
//                     type="text"
//                     name="name"
//                     required
//                     value={formData.name}
//                     onChange={handleChange}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
//                   <input
//                     type="text"
//                     name="country"
//                     required
//                     value={formData.country}
//                     onChange={handleChange}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Short Description
//                 </label>
//                 <input
//                   type="text"
//                   name="shortDescription"
//                   required
//                   value={formData.shortDescription}
//                   onChange={handleChange}
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Full Description
//                 </label>
//                 <textarea
//                   name="description"
//                   required
//                   value={formData.description}
//                   onChange={handleChange}
//                   rows={4}
//                   className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
//                 />
//               </div>

//               <div className="grid md:grid-cols-2 gap-6">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Best Time to Visit
//                   </label>
//                   <input
//                     type="text"
//                     name="bestTimeToVisit"
//                     required
//                     value={formData.bestTimeToVisit}
//                     onChange={handleChange}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                     placeholder="e.g., October - December"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
//                   <select
//                     name="rating"
//                     value={formData.rating}
//                     onChange={handleChange}
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
//                   >
//                     {[4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((r) => (
//                       <option key={r} value={r}>
//                         {r}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* ✅ Existing Images (only when editing) */}
//               {editingId && existingImages.length > 0 && (
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Current Images (click X to mark delete)
//                   </label>
//                   <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
//                     {existingImages.map((img) => {
//                       const marked = imagesToDelete.includes(img);
//                       return (
//                         <div key={img} className="relative">
//                           <img
//                             src={`${BASE_URL}${img}`}
//                             alt="existing"
//                             className={`w-full h-24 object-cover rounded-lg ${
//                               marked ? "opacity-40" : ""
//                             }`}
//                           />
//                           <button
//                             type="button"
//                             onClick={() => toggleDeleteExisting(img)}
//                             className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center"
//                             title={marked ? "Undo delete" : "Delete"}
//                           >
//                             <X className={`h-4 w-4 ${marked ? "text-red-400" : ""}`} />
//                           </button>
//                           {marked && (
//                             <div className="absolute inset-0 border-2 border-red-500 rounded-lg pointer-events-none" />
//                           )}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 </div>
//               )}

//               {/* ✅ New Uploads */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Add New Images
//                 </label>
//                 <input
//                   type="file"
//                   multiple
//                   onChange={handleFileChange}
//                   className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
//                 />

//                 {files.length > 0 && (
//                   <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
//                     {files.map((file, i) => (
//                       <div key={i} className="relative">
//                         <img
//                           src={URL.createObjectURL(file)}
//                           alt="new"
//                           className="w-full h-24 object-cover rounded-lg"
//                         />
//                         <button
//                           type="button"
//                           onClick={() => removeNewFile(i)}
//                           className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center"
//                           title="Remove"
//                         >
//                           <X className="h-4 w-4" />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               <div className="flex space-x-4">
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
//                 >
//                   {loading ? "Saving..." : editingId ? "Update Destination" : "Add Destination"}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={resetForm}
//                   className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         )}

//         {/* List */}
//         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {destinations.length === 0 ? (
//             <p className="text-center text-gray-600 col-span-full py-12">No destinations found</p>
//           ) : (
//             destinations.map((destination) => (
//               <div key={destination._id} className="bg-white rounded-xl shadow-md overflow-hidden">
//                 {destination.images?.[0] ? (
//                   <img
//                     src={`${BASE_URL}${destination.images[0]}`}
//                     alt={destination.name}
//                     className="w-full h-48 object-cover"
//                   />
//                 ) : (
//                   <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
//                     <span className="text-gray-500">No image</span>
//                   </div>
//                 )}

//                 <div className="p-6">
//                   <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
//                   <p className="text-gray-600 text-sm mb-4">
//                     {destination.shortDescription || "No description"}
//                   </p>
//                   <div className="flex items-center justify-between">
//                     <span className="text-yellow-500 font-semibold">
//                       ★ {destination.rating || 5}
//                     </span>
//                     <div className="flex space-x-2">
//                       <button
//                         onClick={() => startEdit(destination)}
//                         className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
//                       >
//                         <Edit2 className="h-5 w-5" />
//                       </button>
//                       <button
//                         onClick={() => handleDelete(destination._id)}
//                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
//                       >
//                         <Trash2 className="h-5 w-5" />
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ManageDestinations;


// src/pages/ManageDestinations.jsx
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import AdminNavbar from "../components/AdminNavbar";
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
} from "../services/api";

const BASE_URL = "http://localhost:5000";

const ManageDestinations = () => {
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    description: "",
    shortDescription: "",
    rating: 5,
    bestTimeToVisit: "",
  });

  // ✅ new uploads
  const [files, setFiles] = useState([]);

  // ✅ existing images from DB
  const [existingImages, setExistingImages] = useState([]);

  // ✅ existing images to delete (sent to backend)
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
      [name]: name === "rating" ? parseFloat(value) : value,
    }));
  };

  // ✅ append new uploads
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeNewFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ✅ remove existing image instantly from UI + remember for backend delete
  const deleteExistingNow = (imgPath) => {
    setImagesToDelete((prev) => (prev.includes(imgPath) ? prev : [...prev, imgPath]));
    setExistingImages((prev) => prev.filter((img) => img !== imgPath));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("country", formData.country);
    data.append("description", formData.description);
    data.append("shortDescription", formData.shortDescription);
    data.append("rating", formData.rating);
    data.append("bestTimeToVisit", formData.bestTimeToVisit);

    // ✅ new uploads
    files.forEach((file) => data.append("images", file));

    // ✅ deletions for backend
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

  const startEdit = (dest) => {
    setFormData({
      name: dest.name,
      country: dest.country || "",
      description: dest.description || "",
      shortDescription: dest.shortDescription || "",
      rating: dest.rating || 5,
      bestTimeToVisit: dest.bestTimeToVisit || "",
    });

    setExistingImages(dest.images || []);
    setImagesToDelete([]);
    setFiles([]);
    setEditingId(dest._id);
    setShowForm(true);
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
    });

    setFiles([]);
    setExistingImages([]);
    setImagesToDelete([]);
    setEditingId(null);
    setShowForm(false);
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

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>{showForm ? "Close" : "Add Destination"}</span>
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
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
                  Short Description
                </label>
                <input
                  type="text"
                  name="shortDescription"
                  required
                  value={formData.shortDescription}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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

              {/* ✅ Existing images (edit only) */}
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

              {/* ✅ New uploads */}
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

        {/* Destinations list */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.length === 0 ? (
            <p className="text-center text-gray-600 col-span-full py-12">No destinations found</p>
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{destination.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {destination.shortDescription || "No description"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-500 font-semibold">
                      ★ {destination.rating || 5}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(destination)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(destination._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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
