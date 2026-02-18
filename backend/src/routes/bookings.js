//backend/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// ── ADMIN: GET ALL BOOKINGS (this was missing) ──
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
        select: 'airline flightNumber from to departureTime arrivalTime price class destination',
        populate: { path: 'destination', select: 'name' }
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Admin bookings fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch all bookings' });
  }
});

// ── CREATE BOOKING (hotel or flight) ──
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
      if (!hotelId) return res.status(400).json({ message: 'hotelId required for hotel booking' });
      bookingData.hotel = hotelId;
    }

    if (type === 'flight') {
      if (!flightId) return res.status(400).json({ message: 'flightId required for flight booking' });
      bookingData.flight = flightId;

      if (!passengersCount || !passengersCount.adults) {
        return res.status(400).json({ message: 'passengersCount.adults required for flight booking' });
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
        return res.status(400).json({ message: 'Not enough seats available' });
      }

      flight.availableSeats -= totalPassengers;
      await flight.save();
    }

    const booking = new Booking(bookingData);
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate(type === 'hotel' ? 'hotel' : 'flight')
      .populate('user', 'fullName email');

    const io = req.app.get('io');
    io?.emit('newBooking', populated);

    res.status(201).json({
      message: `${type} booking request sent successfully`,
      booking: populated,
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: err.message || 'Server error while creating booking' });
  }
});

// ── GET MY BOOKINGS ──
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
    console.error(err);
    res.status(500).json({ message: 'Failed to load your bookings' });
  }
});

// ── UPDATE STATUS (admin) ──
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
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('user', 'fullName email')
      .populate(booking.type === 'hotel' ? 'hotel' : 'flight');

    req.app.get('io')?.emit('bookingUpdated', updated);

    res.json({ message: `Booking marked as ${status}`, booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update booking status' });
  }
});

// ── USER CANCEL ──
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });

    if (booking.status !== 'pending') return res.status(400).json({ message: 'Only pending bookings can be cancelled' });

    booking.status = 'cancelled';
    await booking.save();

    if (booking.type === 'flight' && booking.flight) {
      const flight = await Flight.findById(booking.flight);
      if (flight && booking.passengersCount) {
        const totalPax = 
          (booking.passengersCount.adults || 0) +
          (booking.passengersCount.children || 0) +
          (booking.passengersCount.infants || 0);
        flight.availableSeats += totalPax;
        await flight.save();
      }
    }

    const updated = await Booking.findById(booking._id)
      .populate(booking.type === 'hotel' ? 'hotel' : 'flight');

    req.app.get('io')?.emit('bookingUpdated', updated);

    res.json({ message: 'Booking cancelled successfully', booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// ── USER ARCHIVE ──
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    if (booking.isUserArchived) return res.status(400).json({ message: 'Already archived' });

    booking.isUserArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ── USER UNARCHIVE ──
router.patch('/my/:id/unarchive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    if (!booking.isUserArchived) return res.status(400).json({ message: 'Not archived' });

    booking.isUserArchived = false;
    await booking.save();

    res.json({ message: 'Booking unarchived', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

// ── ADMIN BULK ARCHIVE COMPLETED ──
router.patch('/clear-completed', auth, admin, async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { status: { $in: ['confirmed', 'cancelled'] }, isArchived: false },
      { $set: { isArchived: true } }
    );

    res.json({ message: `Archived ${result.modifiedCount} booking(s)` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ── ADMIN SINGLE ARCHIVE ──
router.patch('/:id/archive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (booking.isArchived) return res.status(400).json({ message: 'Already archived' });

    booking.isArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived by admin', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// ── ADMIN SINGLE UNARCHIVE ──
router.patch('/:id/unarchive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (!booking.isArchived) return res.status(400).json({ message: 'Not archived' });

    booking.isArchived = false;
    await booking.save();

    res.json({ message: 'Booking unarchived by admin', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

module.exports = router;