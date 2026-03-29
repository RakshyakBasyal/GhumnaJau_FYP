// backend/src/models/ItineraryPlan.js
const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary:   { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  title:       { type: String, required: true },          // e.g. "Take a flight to Pokhara"
  plannedDate: { type: Date, default: null },             // which day this belongs to
  order:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ItineraryPlan', planSchema);