const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  description: { type: String },
  shortDescription: { type: String },
  rating: { type: Number, default: 5 },
  bestTimeToVisit: { type: String },
  images: [{ type: String }],
});

module.exports = mongoose.model('Destination', destinationSchema);