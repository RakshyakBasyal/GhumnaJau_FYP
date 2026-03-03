// backend/src/models/ItineraryItem.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true }, // ← ADD THIS
  title: { type: String, default: 'My Trip' },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  type: {
    type: String,
    enum: ['destination', 'hotel', 'flight', 'restaurant', 'activity', 'custom'],
    required: true,
  },
  referenceId: mongoose.Schema.Types.ObjectId,
  customTitle: String,
  notes: String,
  plannedDate: Date,
  createdAt: { type: Date, default: Date.now },
  order: { type: Number, default: 0 },
});

module.exports = mongoose.model('ItineraryItem', schema);