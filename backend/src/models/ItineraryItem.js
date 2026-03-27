// backend/src/models/ItineraryItem.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itinerary: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },

  type: {
    type: String,
    enum: [
      'destination',
      'hotel',
      'flight',
      'restaurant',
      'activity',
      'custom',          // legacy — kept for backward compat
      'custom_expense',
    ],
    required: true,
  },

  title:       { type: String, default: '' },
  notes:       { type: String, default: '' },
  plannedDate: { type: Date, default: null },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },

  estimatedCost: { type: Number, default: 0 },
  actualCost:    { type: Number, default: null },
  isDone:        { type: Boolean, default: false },
  doneAt:        { type: Date, default: null },

  // Hotel-specific
  roomTypeName:          { type: String, default: null },
  roomTypePricePerNight: { type: Number, default: null },
  numberOfNights:        { type: Number, default: null },

  // Flight-specific
  pricePerTicket:     { type: Number, default: null },
  numberOfPassengers: { type: Number, default: null },

  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ItineraryItem', schema);