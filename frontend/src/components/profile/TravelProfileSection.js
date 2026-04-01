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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Travel Profile</h3>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Compass className="h-4 w-4 text-blue-600" /> Travel Style
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
            <p className="text-gray-700">{toDisplay(profile.travelStyle)}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Clock3 className="h-4 w-4 text-blue-600" /> Travel Pace
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
            <p className="text-gray-700">{toDisplay(profile.travelPace)}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Globe2 className="h-4 w-4 text-blue-600" /> Preferred Destinations
          </label>
          {editable ? (
            <input
              value={toInputText(profile.preferredDestinations)}
              onChange={(e) => setField("preferredDestinations", e.target.value)}
              placeholder="e.g. Pokhara, Mustang, Bali"
              className={fieldCls}
            />
          ) : (
            <p className="text-gray-700">{toDisplay(profile.preferredDestinations)}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-blue-600" /> Travel Interests
          </label>
          {editable ? (
            <input
              value={toInputText(profile.travelInterests)}
              onChange={(e) => setField("travelInterests", e.target.value)}
              placeholder="e.g. Trekking, Food, Culture, Nightlife"
              className={fieldCls}
            />
          ) : (
            <p className="text-gray-700">{toDisplay(profile.travelInterests)}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <Languages className="h-4 w-4 text-blue-600" /> Languages
          </label>
          {editable ? (
            <input
              value={toInputText(profile.languages)}
              onChange={(e) => setField("languages", e.target.value)}
              placeholder="e.g. English, Nepali"
              className={fieldCls}
            />
          ) : (
            <p className="text-gray-700">{toDisplay(profile.languages)}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            <NotebookText className="h-4 w-4 text-blue-600" /> Bio
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
            <p className="text-gray-700">{toDisplay(profile.bio)}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelProfileSection;

