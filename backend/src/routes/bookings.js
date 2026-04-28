// backend/src/routes/bookings.js
const express = require('express');
const router  = express.Router();
const Booking = require('../models/Booking');
const Flight  = require('../models/Flight');
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');
const { sendBookingConfirmationEmail, sendRefundConfirmationEmail } = require('../utils/bookingEmail');
const { emitAdminStats } = require('../controllers/adminController');

const PREDEFINED_REASONS = [
  'Booking mistake', 'Change of plans', 'Found a better deal',
  'Duplicate booking', 'Medical emergency', 'Weather or natural issues',
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
const restaurantPop = { path: 'restaurant', select: 'name cuisine address images openingHours' };
const activityPop   = { path: 'activity',   select: 'name category duration price images' };
const tripDestPop   = { path: 'tripPlanDestination', select: 'name country images' };
const userPop       = { path: 'user', select: 'fullName email' };

function populateAll(query) {
  return query
    .populate(userPop)
    .populate(hotelPop)
    .populate(flightPop)
    .populate(restaurantPop)
    .populate(activityPop)
    .populate(tripDestPop);
}

// ── GET /api/bookings  — admin all bookings ───────────────────────────────────
router.get('/', auth, admin, async (req, res) => {
  try {
    const filter = req.query.includeArchived === 'true' ? {} : { isArchived: false };
    const bookings = await populateAll(Booking.find(filter).sort({ createdAt: -1 }));
    res.json(bookings);
  } catch (err) {
    console.error('Admin get bookings error:', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// ── GET /api/bookings/refund-review ───────────────────────────────────────────
router.get('/refund-review', auth, admin, async (req, res) => {
  try {
    const bookings = await populateAll(
      Booking.find({ refundReviewStatus: 'pending_review' }).sort({ cancelledAt: 1 })
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load refund queue' });
  }
});

// ── GET /api/bookings/my ──────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await populateAll(
      Booking.find({ user: req.user.id }).sort({ createdAt: -1 })
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load your bookings' });
  }
});

// ── POST /api/bookings ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      type, totalAmount,
      // hotel
      hotelId, roomType, checkIn, checkOut, guests,
      // flight
      flightId, passengersCount, contactInfo,
      // restaurant reservation
      restaurantId, reservationDate, reservationTime, tableSize,
      // activity
      activityId, activityDate, activityGuests,
      // trip plan
      tripPlanName, tripPlanDestination, tripPlanItems,
    } = req.body;

    const VALID = ['hotel', 'flight', 'reservation', 'activity', 'trip_plan'];
    if (!type || !VALID.includes(type))
      return res.status(400).json({ message: 'Invalid booking type' });
    if (totalAmount === undefined || totalAmount < 0)
      return res.status(400).json({ message: 'totalAmount is required' });

    const bookingData = { user: req.user.id, type, totalAmount };

    // ── Hotel ─────────────────────────────────────────────────────────────────
    if (type === 'hotel') {
      if (!hotelId) return res.status(400).json({ message: 'hotelId required' });
      bookingData.hotel    = hotelId;
      bookingData.roomType = roomType;
      bookingData.checkIn  = checkIn;
      bookingData.checkOut = checkOut;
      bookingData.guests   = guests;
    }

    // ── Flight ────────────────────────────────────────────────────────────────
    if (type === 'flight') {
      if (!flightId) return res.status(400).json({ message: 'flightId required' });
      if (!passengersCount?.adults)
        return res.status(400).json({ message: 'passengersCount.adults required' });

      const flight = await Flight.findById(flightId);
      if (!flight)          return res.status(404).json({ message: 'Flight not found' });
      if (!flight.isActive) return res.status(400).json({ message: 'Flight not active' });

      const totalPax = (passengersCount.adults || 0) + (passengersCount.children || 0) + (passengersCount.infants || 0);
      if (flight.availableSeats < totalPax)
        return res.status(400).json({ message: 'Not enough seats available' });

      flight.availableSeats -= totalPax;
      await flight.save();

      bookingData.flight          = flightId;
      bookingData.passengersCount = passengersCount;
      bookingData.contactInfo     = contactInfo || {};
    }

    // ── Restaurant reservation ────────────────────────────────────────────────
    if (type === 'reservation') {
      if (!restaurantId) return res.status(400).json({ message: 'restaurantId required' });
      bookingData.restaurant      = restaurantId;
      bookingData.reservationDate = reservationDate;
      bookingData.reservationTime = reservationTime;
      bookingData.tableSize       = tableSize || 2;
    }

    // ── Activity ──────────────────────────────────────────────────────────────
    if (type === 'activity') {
      if (!activityId) return res.status(400).json({ message: 'activityId required' });
      bookingData.activity       = activityId;
      bookingData.activityDate   = activityDate;
      bookingData.activityGuests = activityGuests || 1;
    }

    // ── Trip plan ─────────────────────────────────────────────────────────────
    if (type === 'trip_plan') {
      if (!tripPlanItems || tripPlanItems.length === 0)
        return res.status(400).json({ message: 'Trip plan must have at least one item' });
      bookingData.tripPlanName        = tripPlanName || 'My Trip';
      bookingData.tripPlanDestination = tripPlanDestination;
      bookingData.tripPlanItems       = tripPlanItems;

      // Deduct flight seats if flight is included in plan
      const flightItem = tripPlanItems.find(i => i.type === 'flight' && i.flight);
      if (flightItem) {
        const flight = await Flight.findById(flightItem.flight);
        if (flight && flight.isActive && flight.availableSeats >= 1) {
          flight.availableSeats -= 1;
          await flight.save();
        }
      }
    }

    const booking   = new Booking(bookingData);
    await booking.save();

    const populated = await populateAll(Booking.findById(booking._id));
    req.app.get('io')?.emit('newBooking', populated);
    await emitAdminStats(req.app.get('io'));
    res.status(201).json({ message: type + ' booking created', booking: populated });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /:id/status — admin confirm/cancel ──────────────────────────────────
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'pending')
      return res.status(400).json({ message: 'Only pending bookings can be updated' });
    if (booking.paymentStatus === 'completed')
      return res.status(400).json({ message: 'Paid bookings are auto-confirmed by Stripe' });

    booking.status = status;
    if (status === 'cancelled') {
      booking.cancelledBy = 'admin';
      booking.cancelledAt = new Date();
      if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
        const flight = await Flight.findById(booking.flight);
        if (flight) {
          const pax = (booking.passengersCount.adults || 0) + (booking.passengersCount.children || 0) + (booking.passengersCount.infants || 0);
          flight.availableSeats += pax;
          await flight.save();
        }
      }
    }

    await booking.save();
    const updated = await populateAll(Booking.findById(booking._id));

    if (status === 'confirmed') {
      try { await sendBookingConfirmationEmail({ booking: updated, source: 'admin' }); }
      catch (e) { console.error('Email failed:', e.message); }
    }

    req.app.get('io')?.emit('bookingUpdated', updated);
    await emitAdminStats(req.app.get('io'));
    res.json({ message: 'Booking ' + status, booking: updated });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ── PATCH /my/:id/cancel — user cancels unpaid booking ───────────────────────
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const { cancellationReason = '', cancellationNote = '' } = req.body || {};
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    if (!['pending', 'confirmed'].includes(booking.status))
      return res.status(400).json({ message: 'Cannot cancel in current status' });
    if (booking.paymentStatus === 'completed')
      return res.status(400).json({ message: 'Use the refund flow instead' });

    booking.status             = 'cancelled';
    booking.cancelledBy        = 'user';
    booking.cancelledAt        = new Date();
    booking.cancellationReason = cancellationReason;
    booking.cancellationNote   = cancellationNote;
    booking.refundPercent      = 0;
    booking.refundAmount       = 0;
    booking.refundReviewStatus = 'none';
    await booking.save();

    if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
      const flight = await Flight.findById(booking.flight);
      if (flight) {
        const pax = (booking.passengersCount.adults || 0) + (booking.passengersCount.children || 0) + (booking.passengersCount.infants || 0);
        flight.availableSeats += pax;
        await flight.save();
      }
    }

    const updated = await populateAll(Booking.findById(booking._id));
    req.app.get('io')?.emit('bookingCancelled', updated);
    req.app.get('io')?.emit('bookingUpdated', updated);
    await emitAdminStats(req.app.get('io'));
    res.json({ message: 'Booking cancelled', booking: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// ── PATCH /:id/refund-review ──────────────────────────────────────────────────
router.patch('/:id/refund-review', auth, admin, async (req, res) => {
  try {
    const { decision, adminRefundNote = '', isManualRefund } = req.body;
    if (!['admin_approved', 'admin_rejected'].includes(decision))
      return res.status(400).json({ message: 'Invalid decision' });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.refundReviewStatus !== 'pending_review')
      return res.status(400).json({ message: 'Not awaiting review' });

    booking.refundReviewStatus = decision;
    booking.adminRefundNote    = adminRefundNote;
    booking.refundReviewedAt   = new Date();
    booking.refundReviewedBy   = req.user.id;

    if (decision === 'admin_approved' && booking.transactionId && booking.refundAmount > 0) {
      if (isManualRefund) {
        booking.paymentStatus     = 'refunded';
        booking.refundProcessedAt = new Date();
      } else {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const refund = await stripe.refunds.create(
            { payment_intent: booking.transactionId, amount: Math.round(booking.refundAmount * 100) },
            { timeout: 10000 }
          );
          booking.refundId          = refund.id;
          booking.paymentStatus     = 'refunded';
          booking.refundProcessedAt = new Date();
        } catch (stripeErr) {
          return res.status(500).json({ message: 'Stripe refund failed: ' + stripeErr.message, canManual: true });
        }
      }
    }

    await booking.save();
    const updated = await populateAll(Booking.findById(booking._id));
    req.app.get('io')?.emit('bookingRefundReviewed', updated);
    await emitAdminStats(req.app.get('io'));

    if (decision === 'admin_approved') {
      try { await sendRefundConfirmationEmail({ booking: updated }); }
      catch (e) { console.error('Refund email failed:', e.message); }
    }

    res.json({ message: decision === 'admin_approved' ? 'Refund approved' : 'Refund rejected', booking: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to process refund review' });
  }
});

// ── Archive routes ────────────────────────────────────────────────────────────
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    if (booking.isUserArchived) return res.status(400).json({ message: 'Already archived' });
    if (!['confirmed', 'cancelled'].includes(booking.status))
      return res.status(400).json({ message: 'Only confirmed or cancelled bookings can be archived' });
    booking.isUserArchived = true;
    await booking.save();
    res.json({ message: 'Archived', booking });
  } catch (err) { res.status(500).json({ message: 'Failed' }); }
});

router.patch('/my/:id/unarchive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    booking.isUserArchived = false;
    await booking.save();
    res.json({ message: 'Unarchived', booking });
  } catch (err) { res.status(500).json({ message: 'Failed' }); }
});

router.patch('/clear-completed', auth, admin, async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { status: { $in: ['confirmed', 'cancelled'] }, isArchived: false },
      { $set: { isArchived: true } }
    );
    res.json({ message: 'Archived ' + result.modifiedCount + ' bookings' });
  } catch (err) { res.status(500).json({ message: 'Failed' }); }
});

router.patch('/:id/archive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.isArchived = true;
    await booking.save();
    res.json({ message: 'Archived', booking });
  } catch (err) { res.status(500).json({ message: 'Failed' }); }
});

router.patch('/:id/unarchive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.isArchived = false;
    await booking.save();
    res.json({ message: 'Unarchived', booking });
  } catch (err) { res.status(500).json({ message: 'Failed' }); }
});

module.exports = router;