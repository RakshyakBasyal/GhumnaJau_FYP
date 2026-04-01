const InterestsTags = ({ items = [], limit = null, emptyText = "Not specified" }) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const shown = limit ? safeItems.slice(0, limit) : safeItems;

  if (shown.length === 0) {
    return <span className="text-sm text-gray-500">{emptyText}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((item) => (
        <span
          key={item}
          className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

export default InterestsTags;

