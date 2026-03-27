// // backend/src/models/Itinerary.js
// const mongoose = require('mongoose');

// const itinerarySchema = new mongoose.Schema({
//   user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   title:       { type: String, default: 'New Trip' },
//   startDate:   Date,
//   endDate:     Date,
//   coverImage:  { type: String, default: null },
//   budget:      { type: Number, default: null },   // user-defined total trip budget
//   status: {
//     type:    String,
//     enum:    ['planning', 'active', 'completed'],
//     default: 'planning',
//   },
//   startedAt:   Date,
//   completedAt: Date,
// }, { timestamps: true });

// module.exports = mongoose.model('Itinerary', itinerarySchema);

// backend/src/models/Itinerary.js
const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:            { type: String, default: 'New Trip' },
  startDate:        Date,
  endDate:          Date,
  coverImage:       { type: String, default: null },
  budget:           { type: Number, default: null },

  // Destination — set at trip creation, drives hotel/flight filtering
  destinationId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', default: null },
  destinationName:  { type: String, default: null },   // denormalized for fast display
  destinationImage: { type: String, default: null },   // first image of destination for card cover

  status: {
    type:    String,
    enum:    ['planning', 'active', 'completed'],
    default: 'planning',
  },
  startedAt:   Date,
  completedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', itinerarySchema);