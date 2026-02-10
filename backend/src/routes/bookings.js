// backend/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Create a new booking (user authenticated)
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

// Get user's own bookings (all bookings, including archived by user/admin)
router.get('/my', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('hotel', 'name images destination country')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('My bookings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get ALL bookings (admin only) - supports ?includeArchived=true
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
    console.error('All bookings error:', err.message);
    res.status(500).json({ message: 'Failed to fetch all bookings' });
  }
});

// Update booking status (admin only)
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

// User cancels their own pending booking
router.patch('/my/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own bookings' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be cancelled by user' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err) {
    console.error('User cancel error:', err);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// User archives their own booking
router.patch('/my/:id/archive', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only archive your own bookings' });
    }

    if (booking.isUserArchived) {
      return res.status(400).json({ message: 'Booking is already archived' });
    }

    booking.isUserArchived = true;
    await booking.save();

    res.json({ message: 'Booking archived successfully', booking });
  } catch (err) {
    console.error('User archive error:', err);
    res.status(500).json({ message: 'Failed to archive booking' });
  }
});

// Archive completed bookings (admin only) - soft archive
router.patch('/clear-completed', auth, admin, async (req, res) => {
  try {
    const result = await Booking.updateMany(
      {
        status: { $in: ['confirmed', 'cancelled'] },
        isArchived: false
      },
      { $set: { isArchived: true } }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ message: 'No completed bookings to archive' });
    }

    res.json({ 
      message: `Successfully archived ${result.modifiedCount} booking(s)` 
    });
  } catch (err) {
    console.error('Archive bookings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;