// backend/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create booking + emit newBooking
router.post('/', auth, async (req, res) => {
  try {
    const { hotelId, roomType, checkIn, checkOut, guests, totalAmount } = req.body;

    if (!hotelId || !roomType || !checkIn || !checkOut || !guests || !totalAmount) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) return res.status(400).json({ message: 'Check-in must be today or future' });
    if (checkOutDate <= checkInDate) return res.status(400).json({ message: 'Check-out must be after check-in' });
    if (guests < 1) return res.status(400).json({ message: 'At least 1 guest required' });

    const booking = new Booking({
      user: req.user.id,
      hotel: hotelId,
      roomType,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests,
      totalAmount,
    });

    await booking.save();

    // Populate for full data in frontend
    const populated = await Booking.findById(booking._id)
      .populate('hotel', 'name images destination country')
      .populate('user', 'fullName email');

    // Emit live event
    const io = req.app.get('io');
    io.emit('newBooking', populated);

    res.status(201).json({ message: 'Booking request sent', booking: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my bookings
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('hotel', 'name images destination country')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// Get all bookings (admin)
router.get('/', auth, admin, async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const filter = includeArchived ? {} : { isArchived: false };

    const bookings = await Booking.find(filter)
      .populate('user', 'fullName email')
      .populate('hotel', 'name images destination country')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

// Update status + emit
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be updated' });
    }

    booking.status = status;
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('user', 'fullName email')
      .populate('hotel', 'name images destination country');

    const io = req.app.get('io');
    io.emit('bookingUpdated', updated);

    res.json({ message: `Booking ${status}`, booking: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// User cancel + emit
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });

    if (booking.status !== 'pending') return res.status(400).json({ message: 'Only pending can be cancelled' });

    booking.status = 'cancelled';
    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('hotel', 'name images destination country');

    const io = req.app.get('io');
    io.emit('bookingUpdated', updated);

    res.json({ message: 'Booking cancelled', booking: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel' });
  }
});

// User archive (no emit needed unless you want live update for admin too)
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not your booking' });
    if (booking.isUserArchived) return res.status(400).json({ message: 'Already archived' });
    if (!['confirmed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only confirmed or cancelled can be archived' });
    }

    booking.isUserArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// User unarchive
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

// Admin bulk archive
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

// Admin single archive
router.patch('/:id/archive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (booking.isArchived) return res.status(400).json({ message: 'Already archived' });

    booking.isArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to archive' });
  }
});

// Admin single unarchive
router.patch('/:id/unarchive', auth, admin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (!booking.isArchived) return res.status(400).json({ message: 'Not archived' });

    booking.isArchived = false;
    await booking.save();

    res.json({ message: 'Booking unarchived', booking });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unarchive' });
  }
});

module.exports = router;