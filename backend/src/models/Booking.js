// // // backend/src/models/Booking.js
// const mongoose = require('mongoose');

// const bookingSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   hotel: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Hotel',
//     required: true,
//   },
//   roomType: {
//     type: String,
//     required: true,
//   },
//   checkIn: {
//     type: Date,
//     required: true,
//   },
//   checkOut: {
//     type: Date,
//     required: true,
//   },
//   guests: {
//     type: Number,
//     required: true,
//     min: 1,
//   },
//   totalAmount: {
//     type: Number,
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'confirmed', 'cancelled', 'completed'],
//     default: 'pending',
//   },
//   // Admin archiving (clears from admin view)
//   isArchived: {
//     type: Boolean,
//     default: false,
//   },
//   // User archiving (hides from user's main list)
//   isUserArchived: {
//     type: Boolean,
//     default: false,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model('Booking', bookingSchema);


const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true, min: 1 },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  contact: { type: String, required: true },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  type: {
    type: String,
    enum: ['hotel', 'flight'],
    required: true,
  },

  // Hotel fields (optional)
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  roomType: String,
  checkIn: Date,
  checkOut: Date,
  guests: Number,

  // Flight fields (optional)
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  passengers: [passengerSchema],

  // Common fields
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },

  isUserArchived: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false }, // admin

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);