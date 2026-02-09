// backend/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create booking (user)
router.post('/', auth, async (req, res) => {
  try {
    const { hotelId, roomType, checkIn, checkOut, guests, totalAmount } = req.body;

    if (!hotelId || !roomType || !checkIn || !checkOut || !guests || !totalAmount) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const booking = new Booking({
      user: req.user.id,
      hotel: hotelId,
      roomType,
      checkIn,
      checkOut,
      guests,
      totalAmount,
    });

    await booking.save();
    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (err) {
    console.error('Booking creation error:', err.message);
    res.status(500).json({ message: 'Failed to create booking', error: err.message });
  }
});

// Get my bookings (user)
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('hotel', 'name images destination')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('My bookings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get ALL bookings (admin only) ← NEW ROUTE
router.get('/', auth, admin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'fullName email')
      .populate('hotel', 'name images destination')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('All bookings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch all bookings' });
  }
});

// Update status (admin only) ← optional, add if you want confirm/cancel from dashboard
router.patch('/:id/status', auth, admin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    res.json({ message: `Booking updated to ${status}`, booking });
  } catch (err) {
    console.error('Update booking status error:', err.message);
    res.status(500).json({ message: 'Failed to update booking status' });
  }
});

module.exports = router;