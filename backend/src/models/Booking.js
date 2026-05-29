// backend/src/models/Booking.js
const mongoose = require('mongoose');

const passengerCountSchema = new mongoose.Schema({
  adults:   { type: Number, min: 0, default: 0 },
  children: { type: Number, min: 0, default: 0 },
  infants:  { type: Number, min: 0, default: 0 },
}, { _id: false });

const contactInfoSchema = new mongoose.Schema({
  phone: String,
  email: String,
}, { _id: false });

const tripPlanItemSchema = new mongoose.Schema({
  type:            { type: String, enum: ['hotel', 'flight', 'restaurant', 'activity'] },
  hotel:           { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  flight:          { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  restaurant:      { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  activity:        { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
  roomType:        String,
  checkIn:         Date,
  checkOut:        Date,
  guests:          Number,
  reservationDate: Date,
  reservationTime: String,
  tableSize:       Number,
  activityDate:    Date,
  activityGuests:  Number,
  amount:          { type: Number, default: 0 },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: ['hotel', 'flight', 'reservation', 'activity', 'trip_plan'],
    required: true,
  },

  // ── Hotel ──────────────────────────────────────────────────────────────────
  hotel:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  roomType: String,
  checkIn:  Date,
  checkOut: Date,
  guests:   Number,

  // ── Flight ─────────────────────────────────────────────────────────────────
  flight:          { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  passengersCount: passengerCountSchema,
  contactInfo:     contactInfoSchema,

  // ── Restaurant reservation ─────────────────────────────────────────────────
  restaurant:      { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  reservationDate: Date,
  reservationTime: String,
  tableSize:       { type: Number, default: 2 },

  // ── Activity booking ───────────────────────────────────────────────────────
  activity:       { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
  activityDate:   Date,
  activityGuests: { type: Number, default: 1 },

  // ── User-built trip plan ───────────────────────────────────────────────────
  tripPlanName:        String,
  tripPlanDestination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' },
  tripPlanItems:       [tripPlanItemSchema],

  // ── Common ─────────────────────────────────────────────────────────────────
  totalAmount: { type: Number, required: true, min: 0 },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  refundReviewStatus: {
    type: String,
    enum: ['none', 'auto_approved', 'pending_review', 'admin_approved', 'admin_rejected'],
    default: 'none',
  },

  cancellationReason: { type: String, default: '' },
  cancellationNote:   { type: String, default: '' },
  cancelledAt:        { type: Date },
  cancelledBy:        { type: String, enum: ['user', 'admin'], default: 'user' },

  refundPercent:     { type: Number, default: 0 },
  refundAmount:      { type: Number, default: 0 },
  refundId:          { type: String },
  refundProcessedAt: { type: Date },

  adminRefundNote:  { type: String, default: '' },
  refundReviewedAt: { type: Date },
  refundReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  transactionId: { type: String },
  paidAt:        { type: Date },

  isUserArchived: { type: Boolean, default: false },
  isArchived:     { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);