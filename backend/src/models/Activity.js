// backend/src/models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name:             { type: String, required: true },
  destination:      { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  description:      { type: String },
  shortDescription: { type: String },
  category:         { type: String, enum: ['Adventure', 'Cultural', 'Nature', 'Sightseeing', 'Spiritual', 'Water Sports', 'Other'], default: 'Other' },
  duration:         { type: String },
  price:            { type: Number },
  difficulty:       { type: String, enum: ['Easy', 'Moderate', 'Hard'], default: 'Easy' },
  includes:         [{ type: String }],
  address:          { type: String },
  phone:            { type: String },
  images:           [{ type: String }],
  isActive:         { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);