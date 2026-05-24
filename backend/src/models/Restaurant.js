// backend/src/models/Restaurant.js
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  destination:      { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  description:      { type: String },
  shortDescription: { type: String },
  cuisine:          [{ type: String }],
  priceRange:       { type: String, enum: ['Budget', 'Mid-range', 'Fine Dining'], default: 'Mid-range' },
  avgCostPerPerson: { type: Number },
  openingHours:     { type: String },
  address:          { type: String },
  phone:            { type: String },
  images:           [{ type: String }],
  isActive:         { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);