// src/pages/AdminDashboard.jsx
// import { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { getDestinations, createDestination, updateDestination, deleteDestination } from '../services/api';
// import { getUsers, deleteUser } from '../services/api';
// import { LogOut, Globe, User, Hotel, Plane, Utensils, Activity } from 'lucide-react';

// const AdminDashboard = () => {
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState('destinations');
//   const [destinations, setDestinations] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [formData, setFormData] = useState({
//     name: '',
//     description: '',
//     location: '',
//     bestTimeToVisit: '',
//     averageCost: ''
//   });
//   const [files, setFiles] = useState([]);
//   const [previewImages, setPreviewImages] = useState([]);
//   const [editingId, setEditingId] = useState(null);

//   useEffect(() => {
//     fetchData();
//   }, [activeTab]);

//   const fetchData = async () => {
//     try {
//       if (activeTab === 'destinations') {
//         const res = await getDestinations();
//         setDestinations(res.data);
//       } else if (activeTab === 'users') {
//         const res = await getUsers();
//         setUsers(res.data);
//       }
//     } catch (err) {
//       alert('Failed to load data');
//     }
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     navigate('/login');
//   };

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleFileChange = (e) => {
//     const newFiles = Array.from(e.target.files);
//     setFiles(newFiles);
//     const newPreviews = newFiles.map(file => URL.createObjectURL(file));
//     setPreviewImages(prev => [...prev, ...newPreviews]);
//   };

//   const removePreview = (index) => {
//     setFiles(files.filter((_, i) => i !== index));
//     setPreviewImages(previewImages.filter((_, i) => i !== index));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const data = new FormData();
//     Object.keys(formData).forEach(key => data.append(key, formData[key]));
//     files.forEach(file => data.append('images', file));

//     try {
//       if (editingId) {
//         await updateDestination(editingId, data);
//         alert('Destination updated!');
//       } else {
//         await createDestination(data);
//         alert('Destination added!');
//       }
//       resetForm();
//       fetchData();
//     } catch (err) {
//       alert('Operation failed');
//     }
//   };

//   const startEdit = (dest) => {
//     setFormData({
//       name: dest.name,
//       description: dest.description || '',
//       location: dest.location || '',
//       bestTimeToVisit: dest.bestTimeToVisit || '',
//       averageCost: dest.averageCost || ''
//     });
//     setPreviewImages(dest.images ? dest.images.map(img => `http://localhost:5000${img}`) : []);
//     setFiles([]);
//     setEditingId(dest._id);
//   };

//   const handleDelete = async (id, type) => {
//     if (!window.confirm('Are you sure you want to delete?')) return;
//     try {
//       if (type === 'destination') await deleteDestination(id);
//       if (type === 'user') await deleteUser(id);
//       fetchData();
//     } catch (err) {
//       alert('Delete failed');
//     }
//   };

//   const resetForm = () => {
//     setFormData({ name: '', description: '', location: '', bestTimeToVisit: '', averageCost: '' });
//     setFiles([]);
//     setPreviewImages([]);
//     setEditingId(null);
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white">
//       <div className="max-w-7xl mx-auto px-4 py-8">
//         {/* Admin Header */}
//         <div className="flex justify-between items-center mb-10 border-b border-gray-700 pb-6">
//           <h1 className="text-4xl font-bold">Admin Panel</h1>
//           <div className="flex items-center space-x-6">
//             <Link to="/" className="text-blue-400 hover:text-blue-300 text-lg font-medium">
//               ← Back to Site
//             </Link>
//             <button
//               onClick={handleLogout}
//               className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition"
//             >
//               <LogOut className="h-5 w-5" />
//               <span>Logout</span>
//             </button>
//           </div>
//         </div>

//         {/* Tabs */}
//         <div className="flex flex-wrap gap-3 mb-10 border-b border-gray-700 pb-4">
//           <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'users' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <User className="inline h-5 w-5 mr-2" /> Users
//           </button>
//           <button onClick={() => setActiveTab('destinations')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'destinations' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <Globe className="inline h-5 w-5 mr-2" /> Destinations
//           </button>
//           <button onClick={() => setActiveTab('hotels')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'hotels' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <Hotel className="inline h-5 w-5 mr-2" /> Hotels
//           </button>
//           <button onClick={() => setActiveTab('flights')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'flights' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <Plane className="inline h-5 w-5 mr-2" /> Flights
//           </button>
//           <button onClick={() => setActiveTab('restaurants')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'restaurants' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <Utensils className="inline h-5 w-5 mr-2" /> Restaurants
//           </button>
//           <button onClick={() => setActiveTab('activities')} className={`px-6 py-3 rounded-t-lg font-medium transition ${activeTab === 'activities' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
//             <Activity className="inline h-5 w-5 mr-2" /> Activities
//           </button>
//         </div>

//         {/* Users Tab */}
//         {activeTab === 'users' && (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {users.length === 0 ? (
//               <p className="text-gray-400 col-span-full text-center py-10">No users found</p>
//             ) : (
//               users.map(user => (
//                 <div key={user._id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
//                   <h3 className="text-xl font-bold mb-3">{user.fullName || 'No Name'}</h3>
//                   <p className="text-gray-400">Email: {user.email}</p>
//                   <p className="text-gray-400">Phone: {user.phone || 'N/A'}</p>
//                   <p className="text-gray-400 mb-4">Role: <span className="text-blue-400">{user.role}</span></p>
//                   <button
//                     onClick={() => handleDelete(user._id, 'user')}
//                     className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg transition"
//                   >
//                     Delete User
//                   </button>
//                 </div>
//               ))
//             )}
//           </div>
//         )}

//         {/* Destinations Tab */}
//         {activeTab === 'destinations' && (
//           <>
//             {/* Add/Edit Form */}
//             <div className="bg-gray-800 rounded-2xl p-8 mb-10 border border-gray-700">
//               <h3 className="text-2xl font-bold mb-6">{editingId ? 'Update Destination' : 'Add New Destination'}</h3>
//               <form onSubmit={handleSubmit} className="space-y-6">
//                 <div className="grid md:grid-cols-2 gap-6">
//                   <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                   <input name="location" value={formData.location} onChange={handleChange} placeholder="Location" required className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                 </div>
//                 <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" rows="4" className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
//                 <div className="grid md:grid-cols-2 gap-6">
//                   <input name="bestTimeToVisit" value={formData.bestTimeToVisit} onChange={handleChange} placeholder="Best Time to Visit" className="w-full px-4 py-3 bg-gray-700 rounded-lg" />
//                   <input name="averageCost" value={formData.averageCost} onChange={handleChange} placeholder="Average Cost" className="w-full px-4 py-3 bg-gray-700 rounded-lg" />
//                 </div>
//                 <div>
//                   <input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
//                   <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mt-4">
//                     {previewImages.map((src, i) => (
//                       <div key={i} className="relative">
//                         <img src={src} alt="preview" className="w-full h-24 object-cover rounded-lg" />
//                         <button type="button" onClick={() => removePreview(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs">×</button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//                 <div className="flex gap-4">
//                   <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-4 rounded-lg font-bold text-lg transition">
//                     {editingId ? 'Update' : 'Add'} Destination
//                   </button>
//                   {editingId && (
//                     <button type="button" onClick={resetForm} className="px-8 py-4 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold">
//                       Cancel
//                     </button>
//                   )}
//                 </div>
//               </form>
//             </div>

//             {/* Existing Destinations */}
//             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//               {destinations.map(dest => (
//                 <div key={dest._id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
//                   {dest.images?.[0] ? (
//                     <img src={`http://localhost:5000${dest.images[0]}`} alt={dest.name} className="w-full h-56 object-cover" />
//                   ) : (
//                     <div className="w-full h-56 bg-gray-700 flex items-center justify-center text-gray-500">No Image</div>
//                   )}
//                   <div className="p-6">
//                     <h3 className="text-2xl font-bold mb-2">{dest.name}</h3>
//                     <p className="text-gray-400 mb-4">{dest.location}</p>
//                     <div className="flex gap-3">
//                       <button onClick={() => startEdit(dest)} className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded-lg font-medium">
//                         Edit
//                       </button>
//                       <button onClick={() => handleDelete(dest._id, 'destination')} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-medium">
//                         Delete
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </>
//         )}

//         {/* Placeholder Tabs */}
//         {(activeTab === 'hotels' || activeTab === 'flights' || activeTab === 'restaurants' || activeTab === 'activities') && (
//           <div className="text-center py-20 text-gray-400">
//             <h3 className="text-2xl mb-4">Coming Soon</h3>
//             <p>This section will be available in the next update</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AdminDashboard;



// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, Hotel, PlaneTakeoff, BarChart , TrendingUp} from 'lucide-react';
import { getUsers, getDestinations } from '../services/api'; // Add getHotels, getFlights later
import AdminNavbar from '../components/AdminNavbar';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDestinations: 0,
    totalHotels: 0,
    totalFlights: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, destinationsRes] = await Promise.all([
          getUsers(),
          getDestinations(),
          // getHotels(), getFlights() — add when ready
        ]);

        setStats({
          totalUsers: usersRes.data.length,
          totalDestinations: destinationsRes.data.length,
          totalHotels: 0, // placeholder until hotels added
          totalFlights: 0, // placeholder
        });

        // Mock recent bookings until real booking system
        const mockBookings = [
          { user: 'Rajesh Sharma', destination: 'Pokhara', type: 'Hotel', date: '2024-12-25', status: 'Confirmed' },
          { user: 'Sita Rai', destination: 'Chitwan', type: 'Flight', date: '2024-12-28', status: 'Pending' },
          { user: 'Maya Gurung', destination: 'Lumbini', type: 'Hotel', date: '2025-01-05', status: 'Confirmed' },
        ];
        setRecentBookings(mockBookings);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      trend: '+12%',
    },
    {
      title: 'Destinations',
      value: stats.totalDestinations,
      icon: MapPin,
      color: 'bg-green-500',
      trend: '+2',
    },
    {
      title: 'Hotels',
      value: stats.totalHotels,
      icon: Hotel,
      color: 'bg-purple-500',
      trend: '+3',
    },
    {
      title: 'Flights',
      value: stats.totalFlights,
      icon: PlaneTakeoff,
      color: 'bg-orange-500',
      trend: '+1',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to Ghumna Jau Admin Panel</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">{stat.trend}</span>
                      </div>
                    </div>
                    <div className={`${stat.color} p-4 rounded-full`}>
                      <stat.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions & Recent Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <BarChart className="h-6 w-6 mr-2 text-blue-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/admin/destinations"
                    className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
                  >
                    <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Destinations</p>
                  </Link>
                  <Link
                    to="/admin/hotels"
                    className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
                  >
                    <Hotel className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Hotels</p>
                  </Link>
                  <Link
                    to="/admin/flights"
                    className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
                  >
                    <PlaneTakeoff className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Flights</p>
                  </Link>
                  <Link
                    to="/admin/users"
                    className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition text-center"
                  >
                    <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Manage Users</p>
                  </Link>
                </div>
              </div>

              {/* Recent Bookings - Placeholder until real bookings */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentBookings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No recent activity</p>
                  ) : (
                    recentBookings.map((booking, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{booking.user}</p>
                          <p className="text-sm text-gray-600">
                            {booking.destination} • {booking.type}
                          </p>
                          <p className="text-xs text-gray-500">{booking.date}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'Confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;