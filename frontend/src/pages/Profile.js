import { User, Mail, Phone, Edit2, Save, X, LogOut, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    const fullName = localStorage.getItem('username') || 'User';
    const email = localStorage.getItem('userEmail') || 'Not set';
    const phone = localStorage.getItem('userPhone') || '';

    const loadedData = { fullName, email, phone };
    setUserData(loadedData);
    setOriginalData(loadedData);
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleSave = () => {
    localStorage.setItem('username', userData.fullName);
    localStorage.setItem('userPhone', userData.phone);
    setOriginalData(userData);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handleCancel = () => {
    setUserData(originalData);
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Hero Card with Gradient Header */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32" />
          <div className="px-8 pb-8">
            <div className="flex items-end space-x-6 -mt-16">
              {/* Avatar */}
              <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <User className="h-16 w-16 text-gray-400" />
              </div>

              {/* User Info */}
              <div className="flex-1 pb-4">
                <h2 className="text-3xl font-bold text-white-900">{userData.fullName}</h2>
                <p className="text-gray-600">{userData.email}</p>
                {userData.phone && <p className="text-gray-600 mt-1">{userData.phone}</p>}
              </div>

              {/* Edit Button */}
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="mb-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                >
                  <Edit2 className="h-5 w-5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing ? (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={userData.fullName}
                    onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    placeholder="+977 98xxxxxxxx"
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={userData.email}
                    disabled
                    className="pl-10 w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition flex items-center justify-center space-x-2"
                >
                  <X className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Account Information */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900">{userData.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="text-lg font-semibold text-gray-900">{userData.email}</p>
                </div>
                {userData.phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">{userData.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* My Bookings */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h3>
              <div className="text-center py-12">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-lg text-gray-600">No bookings yet</p>
                <p className="text-gray-500 mt-2">Explore destinations and start planning your trip!</p>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Account Actions</h3>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;