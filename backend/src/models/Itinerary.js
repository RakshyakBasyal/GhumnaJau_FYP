// backend/src/models/Itinerary.js
const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, default: 'New Trip' },
  startDate:   Date,
  endDate:     Date,
  coverImage:  { type: String, default: null },   // uploaded cover photo path
  status: {
    type:    String,
    enum:    ['planning', 'active', 'completed'],
    default: 'planning',
  },
  startedAt:   Date,
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', itinerarySchema);