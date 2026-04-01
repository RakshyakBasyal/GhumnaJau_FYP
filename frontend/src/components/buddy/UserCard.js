import InterestsTags from "../profile/InterestsTags";

const normalizeAvatar = (avatar) => {
  if (!avatar) return "";
  if (String(avatar).startsWith("http://") || String(avatar).startsWith("https://")) return avatar;
  return `http://localhost:5000${avatar}`;
};

const UserCard = ({ user, compatibility = 0, connectStatus = "none", onViewProfile, onConnect, onOpenChat }) => {
  const avatarSrc = normalizeAvatar(user.avatar);
  const topInterests = (user.travelInterests || []).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-3">
        {avatarSrc ? (
          <img src={avatarSrc} alt={user.fullName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
            {user.fullName?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.fullName || "Traveler"}</p>
          <p className="text-xs text-gray-500">{user.travelStyle || "Not specified"}</p>
        </div>
      </div>

      <InterestsTags items={topInterests} emptyText="No interests yet" />

      <p className="text-sm font-medium text-emerald-700">Compatibility: {compatibility}%</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onViewProfile}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={onConnect}
          disabled={connectStatus === "connected" || connectStatus === "sent"}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
            connectStatus === "connected"
              ? "bg-emerald-100 text-emerald-700"
              : connectStatus === "received"
              ? "bg-purple-100 text-purple-700"
              : connectStatus === "sent"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {connectStatus === "connected"
            ? "Connected"
            : connectStatus === "received"
            ? "Check Requests"
            : connectStatus === "sent"
            ? "Request Sent"
            : "Connect"}
        </button>
        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
          >
            Chat
          </button>
        )}
      </div>
    </div>
  );
};

export default UserCard;

