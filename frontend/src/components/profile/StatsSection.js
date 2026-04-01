const StatsSection = ({ stats }) => {
  const merged = {
    tripsCount: 0,
    countriesVisited: 0,
    totalPosts: 0,
    ...(stats || {}),
  };

  const entries = [
    { label: "Trips", value: merged.tripsCount },
    { label: "Countries", value: merged.countriesVisited },
    { label: "Posts", value: merged.totalPosts },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Travel Stats</h3>
      <div className="grid grid-cols-3 gap-3">
        {entries.map((entry) => (
          <div key={entry.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <p className="text-xl font-bold text-gray-900">{entry.value || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{entry.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsSection;

