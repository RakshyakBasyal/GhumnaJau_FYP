// frontend/src/pages/Profile.js
import {
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Calendar,
  Trash2,
  MapPin,
  IndianRupee,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { deleteMyAccount, getMe, updateMe } from "../services/api";

const BASE_URL = "http://localhost:5000";

const Profile = () => {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [originalData, setOriginalData] = useState({});

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // My Bookings
  const [bookings, setBookings] = useState([]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getMe();
        const user = res.data;

        const loadedData = {
          fullName: user.fullName || "User",
          email: user.email || "Not set",
          phone: user.phone || "",
        };

        setUserData(loadedData);
        setOriginalData(loadedData);

        // Sync localStorage
        localStorage.setItem("username", loadedData.fullName);
        localStorage.setItem("userEmail", loadedData.email);
        localStorage.setItem("userPhone", loadedData.phone);
      } catch (err) {
        console.error("Profile load error:", err);
        if (err?.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [navigate]);

  // Load user's bookings
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(`${BASE_URL}/api/bookings/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load bookings");
        }

        const data = await res.json();
        setBookings(data);
      } catch (err) {
        console.error("Bookings load error:", err);
      } finally {
        setLoadingBookings(false);
      }
    };

    loadBookings();
  }, []);

  const handleEdit = () => setIsEditing(true);

  const handleSave = async () => {
    try {
      const payload = {
        fullName: userData.fullName,
        phone: userData.phone,
      };

      const res = await updateMe(payload);
      const updatedUser = res.data;

      const updatedData = {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
      };

      setUserData(updatedData);
      setOriginalData(updatedData);
      setIsEditing(false);

      localStorage.setItem("username", updatedData.fullName);
      localStorage.setItem("userPhone", updatedData.phone);

      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      alert(err?.response?.data?.msg || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setUserData(originalData);
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteText.trim().toUpperCase() !== "DELETE") return;

    try {
      setDeleting(true);
      await deleteMyAccount();

      localStorage.clear();
      alert("Your account has been deleted.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.msg || "Failed to delete account";
      alert(msg);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteText("");
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 py-20 text-xl">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32" />
          <div className="px-8 pb-8">
            <div className="flex items-end space-x-6 -mt-16">
              <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                <User className="h-16 w-16 text-gray-400" />
              </div>

              <div className="flex-1 pb-4">
                <h2 className="text-3xl font-bold text-gray-900">
                  {userData.fullName}
                </h2>
                <p className="text-gray-600">{userData.email}</p>
                {userData.phone && (
                  <p className="text-gray-600 mt-1">{userData.phone}</p>
                )}
              </div>

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

        {/* Edit Form or Info + Bookings */}
        {isEditing ? (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Edit Profile
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={userData.fullName}
                    onChange={(e) =>
                      setUserData({ ...userData, fullName: e.target.value })
                    }
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) =>
                      setUserData({ ...userData, phone: e.target.value })
                    }
                    placeholder="+977 98xxxxxxxx"
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
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
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Account Information
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userData.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userData.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userData.phone || "Not set"}
                  </p>
                </div>
              </div>
            </div>

            {/* My Bookings Preview */}
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">My Bookings</h3>
                {bookings.length > 0 && (
                  <button
                    onClick={() => navigate("/my-bookings")}
                    className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                  >
                    View All →
                  </button>
                )}
              </div>

              {loadingBookings ? (
                <p className="text-center text-gray-600 py-8">Loading bookings...</p>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-lg text-gray-600">No bookings yet</p>
                  <p className="text-gray-500 mt-2">
                    Explore hotels and start planning your trip!
                  </p>
                  <button
                    onClick={() => navigate("/hotels")}
                    className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    Browse Hotels
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-4">
                        {/* Hotel Image */}
                        <div className="w-20 h-20 flex-shrink-0">
                          <img
                            src={
                              booking.hotel?.images?.[0]
                                ? `${BASE_URL}${booking.hotel.images[0]}`
                                : "https://images.pexels.com/photos/1134176/pexels-photo-1134176.jpeg"
                            }
                            alt={booking.hotel?.name || "Hotel"}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>

                        {/* Booking Info */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-base mb-1">
                            {booking.hotel?.name || "Hotel Name"}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                            <MapPin className="h-4 w-4" />
                            {booking.hotel?.destination?.name || "Location"}
                          </p>

                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-gray-500">Dates:</span>{" "}
                              {new Date(booking.checkIn).toLocaleDateString()} -{" "}
                              {new Date(booking.checkOut).toLocaleDateString()}
                            </p>
                            <p>
                              <span className="text-gray-500">Room:</span> {booking.roomType}
                            </p>
                            <p>
                              <span className="text-gray-500">Guests:</span> {booking.guests}
                            </p>
                          </div>

                          <div className="mt-3 flex justify-between items-center">
                            <p className="font-semibold text-blue-600">
                              NPR {booking.totalAmount.toLocaleString()}
                            </p>
                            <span
                              className={`text-xs px-3 py-1 rounded-full ${
                                booking.status === "confirmed"
                                  ? "bg-green-100 text-green-800"
                                  : booking.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {bookings.length > 3 && (
                    <button
                      onClick={() => navigate("/my-bookings")}
                      className="w-full mt-4 text-blue-600 hover:text-blue-800 font-medium text-center"
                    >
                      View all {bookings.length} bookings →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Account Actions
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-black transition inline-flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                Confirm Account Deletion
              </h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteText("");
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Type <span className="font-bold">DELETE</span> to confirm. This will permanently remove your account.
              </p>

              <input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteText("");
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition"
                  type="button"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteText.trim().toUpperCase() !== "DELETE"}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;