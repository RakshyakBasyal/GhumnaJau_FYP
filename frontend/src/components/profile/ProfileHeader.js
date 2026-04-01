const normalizeAvatar = (avatar) => {
  if (!avatar) return "";
  if (String(avatar).startsWith("http://") || String(avatar).startsWith("https://")) return avatar;
  return `http://localhost:5000${avatar}`;
};

const ProfileHeader = ({
  name = "Traveler",
  bio = "",
  avatar = "",
  editable = false,
  onEdit,
  children,
}) => {
  const src = normalizeAvatar(avatar);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex items-center gap-4">
          {src ? (
            <img src={src} alt={name} className="w-20 h-20 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center">
              {name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-600 mt-1">{bio?.trim() ? bio : "Not specified"}</p>
          </div>
        </div>

        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
};

export default ProfileHeader;

