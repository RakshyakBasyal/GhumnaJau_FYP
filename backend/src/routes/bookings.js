const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Get all bookings (admin)
router.get('/', auth, admin, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = includeArchived ? {} : { isArchived: false };

    const bookings = await Booking.find(filter)
      .populate('user', 'fullName email')
      .populate({
        path: 'hotel',
        select: 'name images country',
        populate: { path: 'destination', select: 'name' }
      })
      .populate({
        path: 'flight',
        select: 'airline flightNumber from to departureTime arrivalTime price class',
        populate: { path: 'destination', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Admin get bookings error:', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// Create booking
router.post('/', auth, async (req, res) => {
  try {
    const { type, hotelId, flightId, totalAmount, passengersCount, contactInfo, ...rest } = req.body;

    if (!type || !['hotel', 'flight'].includes(type)) {
      return res.status(400).json({ message: 'type must be "hotel" or "flight"' });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: 'totalAmount is required and must be positive' });
    }

    const bookingData = {
      user: req.user.id,
      type,
      totalAmount,
      ...rest,
    };

    if (type === 'hotel') {
      if (!hotelId) return res.status(400).json({ message: 'hotelId required' });
      bookingData.hotel = hotelId;
    }

    if (type === 'flight') {
      if (!flightId) return res.status(400).json({ message: 'flightId required' });
      bookingData.flight = flightId;

      if (!passengersCount || !passengersCount.adults) {
        return res.status(400).json({ message: 'passengersCount.adults required' });
      }
      bookingData.passengersCount = passengersCount;
      bookingData.contactInfo = contactInfo || {};

      const flight = await Flight.findById(flightId);
      if (!flight) return res.status(404).json({ message: 'Flight not found' });
      if (!flight.isActive) return res.status(400).json({ message: 'Flight is not active' });

      const totalPassengers =
        (passengersCount.adults || 0) +
        (passengersCount.children || 0) +
        (passengersCount.infants || 0);

      if (flight.availableSeats < totalPassengers) {
        return res.status(400).json({ message: 'Not enough seats' });
      }

      flight.availableSeats -= totalPassengers;
      await flight.save();
    }

    const booking = new Booking(bookingData);
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate(type === 'hotel' ? 'hotel' : 'flight')
      .populate('user', 'fullName email');

    req.app.get('io')?.emit('newBooking', populated);

    res.status(201).json({
      message: `${type} booking created`,
      booking: populated,
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my bookings (user)
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate({
        path: 'hotel',
        select: 'name images country',
        populate: { path: 'destination', select: 'name' }
      })
      .populate({
        path: 'flight',
        select: 'airline flightNumber from to departureTime arrivalTime price class',
        populate: { path: 'destination', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ message: 'Failed to load your bookings' });
  }
});

// Update status (admin)
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be updated' });
    }

    booking.status = status;

    // ✅ If admin cancels a paid booking, process refund automatically
    if (status === 'cancelled' && booking.paymentStatus === 'completed' && booking.transactionId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        await stripe.refunds.create({ payment_intent: booking.transactionId });
        booking.paymentStatus = 'refunded';

        // Restore flight seats if applicable
        if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
          const flight = await Flight.findById(booking.flight);
          if (flight) {
            const totalPax =
              (booking.passengersCount.adults || 0) +
              (booking.passengersCount.children || 0) +
              (booking.passengersCount.infants || 0);
            flight.availableSeats += totalPax;
            await flight.save();
          }
        }
      } catch (refundErr) {
        console.error('Refund failed during admin cancel:', refundErr.message);
        // Still cancel the booking even if refund fails
      }
    }

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('user', 'fullName email')
      .populate(booking.type === 'hotel' ? 'hotel' : 'flight');

    req.app.get('io')?.emit('bookingUpdated', updated);

    res.json({ message: `Booking updated to ${status}`, booking: updated });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// User cancel booking (allows pending OR confirmed/paid bookings)
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your booking' });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be cancelled in current status' });
    }

    booking.status = 'cancelled';
    await booking.save();

    // Restore flight seats if flight booking
    if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
      const flight = await Flight.findById(booking.flight);
      if (flight) {
        const totalPax =
          (booking.passengersCount.adults || 0) +
          (booking.passengersCount.children || 0) +
          (booking.passengersCount.infants || 0);
        flight.availableSeats += totalPax;
        await flight.save();
      }
    }

    const updated = await Booking.findById(booking._id)
      .populate('user', 'fullName email')
      .populate(booking.type === 'hotel' ? 'hotel' : 'flight');

    req.app.get('io')?.emit('bookingCancelled', updated);
    req.app.get('io')?.emit('bookingUpdated', updated);

    res.json({ message: 'Booking cancelled successfully', booking: updated });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// User archive booking
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your booking' });
    }

    if (booking.isUserArchived) {
      return res.status(400).json({ message: 'Already archived' });
    }

    if (!['confirmed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only confirmed or cancelled can be archived' });
    }

    booking.isUserArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived', booking });
  } catch (err) {
    console.error('Archive error:', err);
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// User unarchive booking
router.patch('/my/:id/unarchive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your booking' });
    }

    if (!booking.isUserArchived) {
      return res.status(400).json({ message: 'Not archived' });
    }

    booking.isUserArchived = false;
    await booking.save();

    res.json({ message: 'Booking unarchived', booking });
  } catch (err) {
    console.error('Unarchive error:', err);
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

// Admin bulk archive completed
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

// Admin single archive
router.patch('/:id/archive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.isArchived) {
      return res.status(400).json({ message: 'Already archived' });
    }

    booking.isArchived = true;
    await booking.save();

    res.json({ message: 'Archived', booking });
  } catch (err) {
    console.error('Admin archive error:', err);
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// Admin single unarchive
router.patch('/:id/unarchive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.isArchived) {
      return res.status(400).json({ message: 'Not archived' });
    }

    booking.isArchived = false;
    await booking.save();

    res.json({ message: 'Unarchived', booking });
  } catch (err) {
    console.error('Admin unarchive error:', err);
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

module.exports = router;