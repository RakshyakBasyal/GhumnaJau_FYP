//backend/src/models/Booking.js
const mongoose = require('mongoose');

const passengerCountSchema = new mongoose.Schema({
  adults: { type: Number, min: 0, default: 0 },
  children: { type: Number, min: 0, default: 0 },
  infants: { type: Number, min: 0, default: 0 },
}, { _id: false });

const contactInfoSchema = new mongoose.Schema({
  phone: String,
  email: String,
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

  // Hotel-specific (optional)
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  roomType: String,
  checkIn: Date,
  checkOut: Date,
  guests: Number,

  // Flight-specific (optional)
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  passengersCount: passengerCountSchema,   // { adults, children, infants }
  contactInfo: contactInfoSchema,          // booker's phone & email

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
  isArchived: { type: Boolean, default: false }, // admin archive

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);