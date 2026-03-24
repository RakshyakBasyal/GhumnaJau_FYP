// backend/src/models/ItineraryItem.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary:     { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  type: {
    type: String,
    enum: ['destination', 'hotel', 'flight', 'restaurant', 'activity', 'custom', 'custom_expense'],
    required: true,
  },
  title:         { type: String, default: '' },
  notes:         { type: String },
  plannedDate:   { type: Date },
  referenceId:   { type: mongoose.Schema.Types.ObjectId },

  // Cost tracking
  estimatedCost: { type: Number, default: 0 },
  actualCost:    { type: Number, default: null },
  isDone:        { type: Boolean, default: false },
  doneAt:        { type: Date },

  // Hotel-specific
  roomTypeName:          { type: String },   // e.g. "Deluxe Room"
  roomTypePricePerNight: { type: Number },   // e.g. 5000
  numberOfNights:        { type: Number },   // e.g. 3

  // Flight-specific
  pricePerTicket:      { type: Number },     // e.g. 8500
  numberOfPassengers:  { type: Number },     // e.g. 2

  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ItineraryItem', schema);