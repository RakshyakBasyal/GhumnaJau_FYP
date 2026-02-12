// backend/src/models/Flight.js
const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  airline: {
    type: String,
    required: true,
    trim: true,
  },
  flightNumber: {
    type: String,
    required: true,
    trim: true,
  },
  from: {
    type: String,
    required: true,
    trim: true,
  },
  to: {
    type: String,
    required: true,
    trim: true,
  },
  departureTime: {
    type: String, // e.g. "07:30 AM"
    required: true,
  },
  arrivalTime: {
    type: String, // e.g. "08:20 AM"
    required: true,
  },
  duration: {
    type: String, // e.g. "50m", "1h 45m"
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  class: {
    type: String,
    enum: ['Economy', 'Business', 'First'],
    default: 'Economy',
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required: true,
  },
  departureDate: {
    type: Date,
    required: true,
  },
  availableSeats: {
    type: Number,
    default: 100,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Flight', flightSchema);