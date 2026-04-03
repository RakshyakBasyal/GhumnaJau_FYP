// backend/src/routes/bookings.js
const express = require('express');
const router  = express.Router();
const Booking = require('../models/Booking');
const Flight  = require('../models/Flight');
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');
const { sendBookingConfirmationEmail } = require('../utils/bookingEmail');
const { 
  getAdminStats, 
  emitAdminStats 
} = require("../controllers/adminController");

// Must match paymentController.js and frontend AUTO_REFUND_REASONS
const PREDEFINED_REASONS = [
  'Booking mistake',
  'Change of plans',
  'Found a better deal',
  'Duplicate booking',
  'Medical emergency',
  'Weather or natural issues',
];
module.exports.PREDEFINED_REASONS = PREDEFINED_REASONS;

// ── Populate helpers ──────────────────────────────────────────────────────────
const hotelPop = {
  path: 'hotel',
  select: 'name images country destination',
  populate: { path: 'destination', select: 'name country' },
};
const flightPop = {
  path: 'flight',
  select: 'airline flightNumber from to departureTime arrivalTime departureDate price class',
};
const userPop = { path: 'user', select: 'fullName email' };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings  — all bookings (admin only)
// Query: ?includeArchived=true  to also return archived bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, admin, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = includeArchived ? {} : { isArchived: false };

    const bookings = await Booking.find(filter)
      .populate(userPop)
      .populate(hotelPop)
      .populate(flightPop)
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Admin get bookings error:', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/refund-review  — bookings waiting for admin refund decision
// ─────────────────────────────────────────────────────────────────────────────
router.get('/refund-review', auth, admin, async (req, res) => {
  try {
    const bookings = await Booking.find({ refundReviewStatus: 'pending_review' })
      .populate(userPop)
      .populate(hotelPop)
      .populate(flightPop)
      .sort({ cancelledAt: 1 }); // oldest first — handle in order
    res.json(bookings);
  } catch (err) {
    console.error('Refund review queue error:', err);
    res.status(500).json({ message: 'Failed to load refund queue' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/my  — current user's own bookings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate(hotelPop)
      .populate(flightPop)
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ message: 'Failed to load your bookings' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings  — create a new booking (authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      type, hotelId, flightId, totalAmount,
      passengersCount, contactInfo, ...rest
    } = req.body;

    if (!type || !['hotel', 'flight'].includes(type))
      return res.status(400).json({ message: 'type must be "hotel" or "flight"' });

    if (!totalAmount || totalAmount <= 0)
      return res.status(400).json({ message: 'totalAmount is required and must be positive' });

    const bookingData = { user: req.user.id, type, totalAmount, ...rest };

    // ── Hotel booking ─────────────────────────────────────────────────────────
    if (type === 'hotel') {
      if (!hotelId) return res.status(400).json({ message: 'hotelId required' });
      bookingData.hotel = hotelId;
    }

    // ── Flight booking ────────────────────────────────────────────────────────
    if (type === 'flight') {
      if (!flightId) return res.status(400).json({ message: 'flightId required' });
      if (!passengersCount?.adults)
        return res.status(400).json({ message: 'passengersCount.adults required' });

      bookingData.flight          = flightId;
      bookingData.passengersCount = passengersCount;
      bookingData.contactInfo     = contactInfo || {};

      const flight = await Flight.findById(flightId);
      if (!flight)          return res.status(404).json({ message: 'Flight not found' });
      if (!flight.isActive) return res.status(400).json({ message: 'Flight is not active' });

      const totalPax =
        (passengersCount.adults   || 0) +
        (passengersCount.children || 0) +
        (passengersCount.infants  || 0);

      if (flight.availableSeats < totalPax)
        return res.status(400).json({ message: 'Not enough seats available' });

      flight.availableSeats -= totalPax;
      await flight.save();
    }

    const booking   = new Booking(bookingData);
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate(type === 'hotel' ? hotelPop : flightPop)
      .populate(userPop);

    req.app.get('io')?.emit('newBooking', populated);
    await emitAdminStats(req.app.get('io'));
    res.status(201).json({ message: `${type} booking created`, booking: populated });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/status  — admin confirms or cancels a PENDING UNPAID booking
//
// Rules:
//   • Only works on status === 'pending' bookings
//   • Blocks paid bookings (they are auto-confirmed by Stripe)
//   • On confirm  → sends confirmation email; user can pay later from MyBookings
//   • On cancel   → restores flight seats if applicable
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status. Must be "confirmed" or "cancelled".' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'pending')
      return res.status(400).json({ message: 'Only pending bookings can be updated' });

    // Paid bookings are auto-confirmed by Stripe — admin should not touch them here
    if (booking.paymentStatus === 'completed')
      return res.status(400).json({
        message: 'Paid bookings are auto-confirmed by Stripe. Use the refund flow to cancel them.',
      });

    booking.status = status;

    if (status === 'cancelled') {
      booking.cancelledBy = 'admin';
      booking.cancelledAt = new Date();

      // Restore flight seats on admin cancellation
      if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
        const flight = await Flight.findById(booking.flight);
        if (flight) {
          const totalPax =
            (booking.passengersCount.adults   || 0) +
            (booking.passengersCount.children || 0) +
            (booking.passengersCount.infants  || 0);
          flight.availableSeats += totalPax;
          await flight.save();
        }
      }
    }

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate(userPop)
      .populate(hotelPop)
      .populate(flightPop);

    // Send confirmation email when admin confirms an unpaid booking
    if (status === 'confirmed') {
      try {
        await sendBookingConfirmationEmail({ booking: updated, source: 'admin' });
      } catch (mailErr) {
        console.error('Confirmation email failed (admin):', mailErr.message);
      }
    }

    req.app.get('io')?.emit('bookingUpdated', updated);
    await emitAdminStats(req.app.get('io'));
    res.json({ message: `Booking ${status}`, booking: updated });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/my/:id/cancel  — user cancels an UNPAID booking
//
// No Stripe refund is processed here (booking was never paid).
// For PAID booking cancellations → POST /api/payments/stripe/refund/:bookingId
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const { cancellationReason = '', cancellationNote = '' } = req.body || {};

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your booking' });

    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ message: 'Booking cannot be cancelled in its current status' });

    if (booking.paymentStatus === 'completed')
      return res.status(400).json({
        message: 'This booking is paid. Use the refund cancellation flow instead.',
      });

    booking.status             = 'cancelled';
    booking.cancelledBy        = 'user';
    booking.cancelledAt        = new Date();
    booking.cancellationReason = cancellationReason;
    booking.cancellationNote   = cancellationNote;
    booking.refundPercent      = 0;
    booking.refundAmount       = 0;
    booking.refundReviewStatus = 'none';
    await booking.save();

    // Restore flight seats
    if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
      const flight = await Flight.findById(booking.flight);
      if (flight) {
        const totalPax =
          (booking.passengersCount.adults   || 0) +
          (booking.passengersCount.children || 0) +
          (booking.passengersCount.infants  || 0);
        flight.availableSeats += totalPax;
        await flight.save();
      }
    }

    const updated = await Booking.findById(booking._id)
      .populate(userPop)
      .populate(booking.type === 'hotel' ? hotelPop : flightPop);

    req.app.get('io')?.emit('bookingCancelled', updated);
    req.app.get('io')?.emit('bookingUpdated', updated);
    await emitAdminStats(req.app.get('io'));
    res.json({ message: 'Booking cancelled successfully', booking: updated });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/refund-review  — admin approves or rejects a refund request
//
// Called after a user cancels a PAID booking with a CUSTOM reason.
// On admin_approved → Stripe refund is triggered for the pre-calculated refundAmount.
// On admin_rejected → booking stays cancelled, no money returned to user.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/refund-review', auth, admin, async (req, res) => {
  try {
    const { decision, adminRefundNote = '', isManualRefund } = req.body;

    if (!['admin_approved', 'admin_rejected'].includes(decision))
      return res.status(400).json({ message: 'decision must be "admin_approved" or "admin_rejected"' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.refundReviewStatus !== 'pending_review')
      return res.status(400).json({ message: 'This booking is not awaiting refund review' });

    booking.refundReviewStatus = decision;
    booking.adminRefundNote    = adminRefundNote;
    booking.refundReviewedAt   = new Date();
    booking.refundReviewedBy   = req.user.id;

    // ── If admin approves refund, process Stripe ─────────────────────────────
    if (decision === 'admin_approved' && booking.transactionId && booking.refundAmount > 0) {
      if (isManualRefund) {
        // Skip Stripe, just mark as refunded
        booking.paymentStatus     = 'refunded';
        booking.refundProcessedAt = new Date();
        booking.adminRefundNote   = (adminRefundNote ? adminRefundNote + ' | ' : '') + '[Manually marked as refunded by admin]';
      } else {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          
          // Use a timeout to avoid hanging if Stripe is unreachable
          const refund = await stripe.refunds.create({
            payment_intent: booking.transactionId,
            amount: Math.round(booking.refundAmount * 100),
          }, {
            timeout: 10000, // 10s timeout
          });

          booking.refundId          = refund.id;
          booking.paymentStatus     = 'refunded';
          booking.refundProcessedAt = new Date();
        } catch (stripeErr) {
          console.error('Stripe refund failed during admin review:', stripeErr.message);
          
          // Provide more descriptive error to admin
          let errorMsg = 'Stripe connection failed. Please check your internet or Stripe API key.';
          if (stripeErr.type === 'StripeInvalidRequestError') {
            errorMsg = 'Invalid request to Stripe: ' + stripeErr.message;
          } else if (stripeErr.message) {
            errorMsg = stripeErr.message;
          }
          
          return res.status(500).json({ 
            message: 'Stripe refund failed: ' + errorMsg,
            details: stripeErr.message,
            canManual: true // Hint to frontend to show manual option
          });
        }
      }
    }

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate(userPop)
      .populate(hotelPop)
      .populate(flightPop);

    req.app.get('io')?.emit('bookingRefundReviewed', updated);
    await emitAdminStats(req.app.get('io'));
    res.json({
      message: decision === 'admin_approved'
        ? 'Refund approved and processed via Stripe'
        : 'Refund request rejected',
      booking: updated,
    });
  } catch (err) {
    console.error('Refund review error:', err);
    res.status(500).json({ message: 'Failed to process refund review' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/my/:id/archive  — user archives a booking from their list
// Only confirmed or cancelled bookings can be archived
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your booking' });
    if (booking.isUserArchived)
      return res.status(400).json({ message: 'Already archived' });
    if (!['confirmed', 'cancelled'].includes(booking.status))
      return res.status(400).json({ message: 'Only confirmed or cancelled bookings can be archived' });

    booking.isUserArchived = true;
    await booking.save();
    res.json({ message: 'Booking archived', booking });
  } catch (err) {
    console.error('User archive error:', err);
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/my/:id/unarchive  — user restores a booking to their main list
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/my/:id/unarchive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not your booking' });
    if (!booking.isUserArchived)
      return res.status(400).json({ message: 'Not archived' });

    booking.isUserArchived = false;
    await booking.save();
    res.json({ message: 'Booking unarchived', booking });
  } catch (err) {
    console.error('User unarchive error:', err);
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/clear-completed  — admin bulk-archives all confirmed/cancelled
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/clear-completed', auth, admin, async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { status: { $in: ['confirmed', 'cancelled'] }, isArchived: false },
      { $set: { isArchived: true } }
    );
    res.json({ message: `Archived ${result.modifiedCount} bookings` });
  } catch (err) {
    console.error('Bulk archive error:', err);
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/archive  — admin archives a single booking
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/archive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking)           return res.status(404).json({ message: 'Booking not found' });
    if (booking.isArchived) return res.status(400).json({ message: 'Already archived' });

    booking.isArchived = true;
    await booking.save();
    res.json({ message: 'Archived', booking });
  } catch (err) {
    console.error('Admin archive error:', err);
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/unarchive  — admin unarchives a single booking
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/unarchive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking)            return res.status(404).json({ message: 'Booking not found' });
    if (!booking.isArchived) return res.status(400).json({ message: 'Not archived' });

    booking.isArchived = false;
    await booking.save();
    res.json({ message: 'Unarchived', booking });
  } catch (err) {
    console.error('Admin unarchive error:', err);
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

module.exports = router;