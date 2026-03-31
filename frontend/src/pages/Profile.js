// frontend/src/pages/Profile.jsx
import { useEffect, useState } from "react";
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
  LogOut,
  Plane,
  Loader2,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import io from "socket.io-client";
import { getUserPosts, getFollowStats, getFollowers, getFollowing } from "../services/feedApi";

const BASE_URL = "http://localhost:5000";

const Profile = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    avatar: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Full-screen avatar viewer
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Bookings preview
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [myPostCount, setMyPostCount] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [followStats, setFollowStats] = useState({
    followersCount: 0,
    followingCount: 0,
  });
  const [loadingFollowStats, setLoadingFollowStats] = useState(true);

  const [followListTab, setFollowListTab] = useState('followers'); // 'followers' | 'following'
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingFollowLists, setLoadingFollowLists] = useState(false);

  const myId = (() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      return decoded?.id || decoded?._id || null;
    } catch (_) {
      return null;
    }
  })();

  const SmallAvatar = ({ name, avatar, size = 10 }) => {
    const sizePx = size * 4;
    if (avatar) {
      return (
        <img
          src={`${BASE_URL}${avatar}`}
          alt={name}
          className="rounded-full object-cover flex-shrink-0 ring-2 ring-white"
          style={{ width: sizePx, height: sizePx }}
        />
      );
    }
    return (
      <div
        className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white"
        style={{ width: sizePx, height: sizePx }}
      >
        {name?.charAt(0).toUpperCase() || 'U'}
      </div>
    );
  };

  const [loading, setLoading] = useState(true);

  // Socket.IO – live booking updates
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(BASE_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket connected in Profile");
    });

    socket.on("bookingUpdated", (updatedBooking) => {
      console.log("Live booking update:", updatedBooking);

      setBookings((prev) =>
        prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
      );

      if (updatedBooking.status === "confirmed") {
        showToast("Your booking has been confirmed!", "success");
      } else if (updatedBooking.status === "cancelled") {
        showToast("Your booking has been cancelled.", "error");
      } else {
        showToast(`Booking updated to ${updatedBooking.status}`, "info");
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
      if (err.message.includes("xhr poll error") || err.message.includes("401")) {
        localStorage.clear();
        navigate("/login");
        showToast("Session expired. Please login again.", "error");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [showToast, navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token found");

        const userRes = await fetch(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userRes.ok) {
          if (userRes.status === 401) {
            localStorage.clear();
            navigate("/login");
            showToast("Session expired. Please login again.", "error");
            return;
          }
          throw new Error("Failed to load user");
        }

        const user = await userRes.json();

        // ── FIXED GOOGLE AVATAR HANDLING ───────────────────────────────
        let avatarUrl = null;
        if (user.avatar) {
          if (user.avatar.startsWith("http") || user.avatar.startsWith("https")) {
            // Google photo → force high resolution
            let cleanUrl = user.avatar.replace(/=s\d+-c/g, "").replace(/sz=\d+/g, "");
            const separator = cleanUrl.includes("?") ? "&" : "?";
            avatarUrl = `${cleanUrl}${separator}sz=400`;   // 400px for profile card
          } else {
            // Local uploaded avatar
            avatarUrl = `${BASE_URL}${user.avatar}`;
          }
        }

        setUserData({
          fullName: user.fullName || "User",
          email: user.email || "Not set",
          phone: user.phone || "",
          avatar: user.avatar || "",
        });
        setAvatarPreview(avatarUrl);

        const bookingsRes = await fetch(`${BASE_URL}/api/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!bookingsRes.ok) {
          if (bookingsRes.status === 401) {
            localStorage.clear();
            navigate("/login");
            showToast("Session expired. Please login again.", "error");
            return;
          }
          throw new Error("Failed to load bookings");
        }

        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);

        // Fetch post count for dashboard-style profile
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]));
          const idForPosts = decoded?.id || decoded?._id;
          if (idForPosts) {
            const postsRes = await getUserPosts(idForPosts, { page: 1, limit: 1 });
            setMyPostCount(postsRes.data.total ?? 0);
          }
        } catch (_) {}

        // Fetch followers / following counts
        try {
          if (myId) {
            const statsRes = await getFollowStats(myId);
            setFollowStats({
              followersCount: statsRes.data.followersCount ?? 0,
              followingCount: statsRes.data.followingCount ?? 0,
            });

            // Also load follower/following lists (Instagram-like tabs)
            try {
              setLoadingFollowLists(true);
              const [followersRes, followingRes] = await Promise.all([
                getFollowers(myId),
                getFollowing(myId),
              ]);
              setFollowersList(followersRes.data.followers || []);
              setFollowingList(followingRes.data.following || []);
            } catch (_) {}
          }
        } catch (_) {}
      } catch (err) {
        console.error("Profile load error:", err);
        showToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
        setLoadingBookings(false);
        setLoadingPosts(false);
        setLoadingFollowStats(false);
        setLoadingFollowLists(false);
      }
    };

    loadData();
  }, [navigate, showToast]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("fullName", userData.fullName);
      formData.append("phone", userData.phone);
      if (avatarFile) formData.append("avatar", avatarFile);

      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          navigate("/login");
          showToast("Session expired. Please login again.", "error");
          return;
        }
        const errData = await res.json();
        throw new Error(errData.msg || "Failed to update profile");
      }

      const updated = await res.json();

      // Update avatar preview after save
      let updatedAvatarUrl = null;
      if (updated.avatar) {
        if (updated.avatar.startsWith("http") || updated.avatar.startsWith("https")) {
          let cleanUrl = updated.avatar.replace(/=s\d+-c/g, "").replace(/sz=\d+/g, "");
          const separator = cleanUrl.includes("?") ? "&" : "?";
          updatedAvatarUrl = `${cleanUrl}${separator}sz=400`;
        } else {
          updatedAvatarUrl = `${BASE_URL}${updated.avatar}`;
        }
      }

      setUserData({
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone || "",
        avatar: updated.avatar || "",
      });
      setAvatarPreview(updatedAvatarUrl);
      setAvatarFile(null);
      setIsEditing(false);

      showToast("Profile updated successfully!", "success");
    } catch (err) {
      console.error("Save error:", err);
      showToast(err.message || "Update failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    // Reset preview to original
    setAvatarPreview(
      userData.avatar
        ? (userData.avatar.startsWith("http") || userData.avatar.startsWith("https")
            ? userData.avatar.replace(/=s\d+-c/g, "").replace(/sz=\d+/g, "") + (userData.avatar.includes("?") ? "&" : "?") + "sz=400"
            : `${BASE_URL}${userData.avatar}`)
        : null
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteText.trim().toUpperCase() !== "DELETE") {
      showToast("Please type DELETE to confirm", "error");
      return;
    }

    setDeleting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/api/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.clear();
          navigate("/login");
          showToast("Session expired. Please login again.", "error");
          return;
        }
        throw new Error(data.msg || "Failed to delete account");
      }

      showToast("Account deleted successfully", "success");
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error("Delete account error:", err);
      showToast(err.message || "Failed to delete account", "error");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteText("");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    showToast("Logged out successfully", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-10 text-center">
          My Profile
        </h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-12 transition-all duration-300 hover:shadow-xl">
          <div className="p-6 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 transition-transform duration-300 group-hover:scale-105">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => avatarPreview && setShowAvatarModal(true)}
                      onError={(e) => {
                        console.log("Avatar load failed:", avatarPreview);
                        e.target.onerror = null;
                        e.target.src = "";
                        setAvatarPreview(null);
                      }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-16 w-16 sm:h-20 sm:w-20 text-blue-500 opacity-80" />
                    </div>
                  )}
                </div>

                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-4 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg transition-transform hover:scale-110">
                    <Upload className="h-6 w-6" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                {isEditing ? (
                  <input
                    type="text"
                    value={userData.fullName}
                    onChange={(e) => setUserData({ ...userData, fullName: e.target.value })}
                    className="text-4xl font-bold text-gray-900 border-b-2 border-blue-400 focus:outline-none focus:border-blue-600 bg-transparent w-full mb-3"
                  />
                ) : (
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">
                    {userData.fullName}
                  </h2>
                )}

                <div className="flex flex-col gap-3 text-gray-700 text-lg">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <Mail className="h-6 w-6 text-indigo-600" />
                    <span>{userData.email}</span>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <Phone className="h-6 w-6 text-green-600" />
                      <input
                        type="tel"
                        value={userData.phone}
                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                        placeholder="+977 98XXXXXXXX"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                      />
                    </div>
                  ) : (
                    userData.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-3">
                        <Phone className="h-6 w-6 text-green-600" />
                        <span>{userData.phone}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 mt-6 sm:mt-0 flex-wrap justify-center sm:justify-start">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={uploading}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-200 text-gray-800 px-8 py-4 rounded-xl hover:bg-gray-300 transition flex items-center gap-2"
                    >
                      <X className="h-5 w-5" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md flex items-center gap-2"
                  >
                    <Edit2 className="h-5 w-5" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Followers / Following (Instagram-like) */}
          <div className="mt-6 bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFollowListTab('followers')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  followListTab === 'followers'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Followers ({followStats.followersCount})
              </button>
              <button
                type="button"
                onClick={() => setFollowListTab('following')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  followListTab === 'following'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Following ({followStats.followingCount})
              </button>
            </div>

            <div className="mt-3 max-h-52 overflow-y-auto">
              {loadingFollowLists ? (
                <div className="py-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : followListTab === 'followers' ? (
                followersList.length === 0 ? (
                  <div className="text-sm text-gray-500 py-2 text-center">No followers yet</div>
                ) : (
                  followersList.slice(0, 10).map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition"
                      onClick={() => navigate(`/profile/${u._id}`)}
                    >
                      <SmallAvatar name={u.fullName} avatar={u.avatar} size={10} />
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.fullName || 'User'}</p>
                      </div>
                    </button>
                  ))
                )
              ) : followingList.length === 0 ? (
                <div className="text-sm text-gray-500 py-2 text-center">Not following anyone yet</div>
              ) : (
                followingList.slice(0, 10).map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white transition"
                    onClick={() => navigate(`/profile/${u._id}`)}
                  >
                    <SmallAvatar name={u.fullName} avatar={u.avatar} size={10} />
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.fullName || 'User'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent Bookings */}
          <div className="p-6 sm:p-10 border-t">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                Recent Bookings
              </h3>
              {bookings.length > 0 && (
                <button
                  onClick={() => navigate("/my-bookings")}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition"
                >
                  View All →
                </button>
              )}
            </div>

            {loadingBookings ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No bookings yet — start exploring Nepal!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.slice(0, 6).map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="p-5">
                      {booking.type === "flight" ? (
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-indigo-100 p-2 rounded-lg">
                            <Plane className="h-5 w-5 text-indigo-600" />
                          </div>
                          <h4 className="font-semibold text-lg">
                            {booking.flight?.airline || "Flight"} {booking.flight?.flightNumber || ""}
                          </h4>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-lg mb-3">
                          {booking.hotel?.name || "Hotel Booking"}
                        </h4>
                      )}

                      <div className="text-sm text-gray-700 space-y-2">
                        {booking.type === "flight" ? (
                          <>
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              {booking.flight?.from} → {booking.flight?.to}
                            </p>
                            <p>Departure: {booking.flight?.departureTime || "-"}</p>
                          </>
                        ) : (
                          <>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              {new Date(booking.checkIn).toLocaleDateString()} -{" "}
                              {new Date(booking.checkOut).toLocaleDateString()}
                            </p>
                            <p>Guests: {booking.guests || "-"}</p>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-blue-700 font-bold">
                          NPR {booking.totalAmount.toLocaleString()}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Posts (dashboard summary) */}
        <div className="p-6 sm:p-10 border-t">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <Plane className="h-6 w-6 text-blue-600" />
              My Posts
            </h3>
            <button
              onClick={() => myId && navigate(`/profile/${myId}`)}
              disabled={!myId}
              className={`text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition ${
                !myId ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              View all →
            </button>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="text-center py-4 text-gray-600">
              You have {myPostCount} post{myPostCount === 1 ? '' : 's'} on your travel profile.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-gray-800 text-white px-8 py-4 rounded-xl hover:bg-gray-900 transition shadow-md flex items-center justify-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Full-screen Avatar Viewer */}
      {showAvatarModal && avatarPreview && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAvatarModal(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-white bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition"
              onClick={() => setShowAvatarModal(false)}
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={
                avatarPreview.includes("googleusercontent.com")
                  ? avatarPreview.replace(/sz=\d+/, "sz=800")
                  : avatarPreview
              }
              alt="Profile Full View"
              className="w-full h-auto max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onError={(e) => console.log("Modal avatar failed:", avatarPreview)}
            />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-red-800 mb-4">Delete Account?</h3>
            <p className="text-gray-700 mb-6">
              This action is permanent. Type <strong className="text-red-600">DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteText.trim().toUpperCase() !== "DELETE"}
                className={`flex-1 py-3 rounded-lg text-white transition ${
                  deleting || deleteText.trim().toUpperCase() !== "DELETE"
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;