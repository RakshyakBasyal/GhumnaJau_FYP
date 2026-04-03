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

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: { type: String, enum: ['hotel', 'flight'], required: true },

  // Hotel-specific
  hotel:    { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
  roomType: String,
  checkIn:  Date,
  checkOut: Date,
  guests:   Number,

  // Flight-specific
  flight:          { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  passengersCount: passengerCountSchema,
  contactInfo:     contactInfoSchema,

  // Common
  totalAmount: { type: Number, required: true, min: 0 },

  // ── BOOKING STATUS ──────────────────────────────────────────────────────────
  // pending   → created, waiting for admin approval (unpaid) OR waiting for payment (admin-approved unpaid)
  // confirmed → admin approved AND paid via Stripe (auto), OR admin manually confirmed unpaid booking
  // cancelled → rejected by admin or cancelled by user
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  },

  // ── PAYMENT STATUS ──────────────────────────────────────────────────────────
  // pending   → no payment yet
  // completed → Stripe payment succeeded → booking auto-confirmed
  // failed    → Stripe payment failed
  // refunded  → full or partial refund processed via Stripe
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },

  // ── REFUND REVIEW STATUS ────────────────────────────────────────────────────
  // none           → no refund request (unpaid cancellations)
  // auto_approved  → predefined reason → refund processed automatically
  // pending_review → custom reason → waiting for admin decision
  // admin_approved → admin approved the refund → Stripe refund triggered
  // admin_rejected → admin rejected the refund request
  refundReviewStatus: {
    type: String,
    enum: ['none', 'auto_approved', 'pending_review', 'admin_approved', 'admin_rejected'],
    default: 'none',
  },

  // Cancellation info
  cancellationReason: { type: String, default: '' },
  cancellationNote:   { type: String, default: '' },
  cancelledAt:        { type: Date },
  cancelledBy:        { type: String, enum: ['user', 'admin'], default: 'user' },

  // Refund info
  refundPercent:      { type: Number, default: 0 },
  refundAmount:       { type: Number, default: 0 },
  refundId:           { type: String },           // Stripe refund ID
  refundProcessedAt:  { type: Date },

  // Admin refund review info
  adminRefundNote:    { type: String, default: '' },
  refundReviewedAt:   { type: Date },
  refundReviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Payment info
  transactionId: { type: String },               // Stripe payment_intent id
  paidAt:        { type: Date },

  // Archiving
  isUserArchived: { type: Boolean, default: false },
  isArchived:     { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', bookingSchema);