//backend/src/models/ItineraryItems.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary:    { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  type: {
    type: String,
    enum: ['destination', 'hotel', 'flight', 'restaurant', 'activity', 'custom'],
    required: true,
  },
  title:        { type: String, default: '' },
  notes:        { type: String },
  plannedDate:  { type: Date },
  referenceId:  { type: mongoose.Schema.Types.ObjectId },   // links to Hotel/Flight/Destination doc
  estimatedCost: { type: Number, default: 0 },              // for cost calculation
  order:        { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ItineraryItem', schema);