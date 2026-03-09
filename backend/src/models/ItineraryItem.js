// backend/src/models/ItineraryItem.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary:     { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  type: {
    type: String,
    enum: ['destination', 'hotel', 'flight', 'restaurant', 'activity', 'custom'],
    required: true,
  },
  title:         { type: String, default: '' },
  notes:         { type: String },
  plannedDate:   { type: Date },
  referenceId:   { type: mongoose.Schema.Types.ObjectId },
  estimatedCost: { type: Number, default: 0 },
  actualCost:    { type: Number, default: null },   // null = not yet recorded
  isDone:        { type: Boolean, default: false },
  doneAt:        { type: Date },
  order:         { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ItineraryItem', schema);