// // //backend/src/models/Hotel.js
// const mongoose = require('mongoose');

// const roomTypeSchema = new mongoose.Schema({
//   name: { type: String, required: true },           
//   pricePerNight: { type: Number, required: true },  
//   maxCapacity: { type: Number, required: true },   
//   description: { type: String }                   
// });

// const hotelSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
//   country: { type: String, required: true },
//   description: { type: String },
//   shortDescription: { type: String },
//   rating: { type: Number, default: 5 },
//   reviewCount: { type: Number, default: 0 },
//   amenities: [{ type: String }],
//   images: [{ type: String }],
//   roomTypes: [roomTypeSchema],   
// }, { timestamps: true });

// module.exports = mongoose.model('Hotel', hotelSchema);


// backend/src/models/Hotel.js
const mongoose = require('mongoose');

const roomTypeSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  pricePerNight:{ type: Number, required: true },
  maxCapacity:  { type: Number, required: true },
  description:  { type: String },
});

const hotelSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  destination:      { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  country:          { type: String, required: true },
  description:      { type: String },
  shortDescription: { type: String },
  rating:           { type: Number, default: 5 },
  reviewCount:      { type: Number, default: 0 },
  amenities:        [{ type: String }],
  images:           [{ type: String }],
  roomTypes:        [roomTypeSchema],
  // Map pin set by admin
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model('Hotel', hotelSchema);