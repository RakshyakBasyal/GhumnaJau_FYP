import { Compass, Globe2, Heart, Clock3, NotebookText, Languages } from "lucide-react";

const toInputText = (value) => (Array.isArray(value) ? value.join(", ") : "");
const toDisplay = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not specified";
  if (typeof value === "string") return value.trim() ? value : "Not specified";
  return "Not specified";
};

const TravelProfileSection = ({ profile, editable = false, onChange }) => {
  const setField = (key, value) => onChange?.(key, value);

  const fieldCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none";

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gray-50/50 border-b border-gray-50 flex items-center gap-2">
        <Compass className="text-blue-600" size={18} />
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Travel Profile</h3>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Travel Style
            </label>
            {editable ? (
              <select
                value={profile.travelStyle || ""}
                onChange={(e) => setField("travelStyle", e.target.value)}
                className={fieldCls}
              >
                <option value="">Select style</option>
                <option value="budget">Budget</option>
                <option value="luxury">Luxury</option>
                <option value="backpacking">Backpacking</option>
                <option value="adventure">Adventure</option>
                <option value="family">Family</option>
              </select>
            ) : (
              <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{toDisplay(profile.travelStyle)}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Travel Pace
            </label>
            {editable ? (
              <select
                value={profile.travelPace || ""}
                onChange={(e) => setField("travelPace", e.target.value)}
                className={fieldCls}
              >
                <option value="">Select pace</option>
                <option value="slow">Slow</option>
                <option value="moderate">Moderate</option>
                <option value="fast">Fast</option>
              </select>
            ) : (
              <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{toDisplay(profile.travelPace)}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Preferred Destinations
            </label>
            {editable ? (
              <input
                value={toInputText(profile.preferredDestinations)}
                onChange={(e) => setField("preferredDestinations", e.target.value)}
                placeholder="e.g. Pokhara, Mustang, Bali"
                className={fieldCls}
              />
            ) : (
              <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{toDisplay(profile.preferredDestinations)}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Travel Interests
            </label>
            {editable ? (
              <input
                value={toInputText(profile.travelInterests)}
                onChange={(e) => setField("travelInterests", e.target.value)}
                placeholder="e.g. Trekking, Food, Culture, Nightlife"
                className={fieldCls}
              />
            ) : (
              <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{toDisplay(profile.travelInterests)}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Languages
            </label>
            {editable ? (
              <input
                value={toInputText(profile.languages)}
                onChange={(e) => setField("languages", e.target.value)}
                placeholder="e.g. English, Nepali"
                className={fieldCls}
              />
            ) : (
              <div className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{toDisplay(profile.languages)}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Bio
            </label>
            {editable ? (
              <textarea
                value={profile.bio || ""}
                onChange={(e) => setField("bio", e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Short bio for fellow travelers..."
                className={`${fieldCls} resize-none`}
              />
            ) : (
              <div className="bg-blue-50/50 px-5 py-4 rounded-2xl border border-blue-100 italic">
                <p className="text-sm font-medium text-gray-600">"{toDisplay(profile.bio)}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelProfileSection;

