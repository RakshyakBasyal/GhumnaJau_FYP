const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: String,
    enum: ['Budget Traveler', 'Mid-Range Traveler', 'Luxury Traveler', ''],
    default: ''
  },
  travelStyle: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, { timestamps: true });

tripSchema.index({ destination: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Trip', tripSchema);
