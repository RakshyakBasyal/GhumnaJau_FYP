// backend/src/routes/flights.js
const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const Destination = require('../models/Destination'); // Import Destination for lookup
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const { emitAdminStats } = require('../controllers/adminController');

// ADMIN ONLY - Get all flights (including inactive) — put this FIRST
router.get('/admin', auth, admin, async (req, res) => {
  try {
    const flights = await Flight.find()
      .populate('destination', 'name country')
      .sort({ createdAt: -1 });
    res.json(flights);
  } catch (err) {
    console.error('Admin flights error:', err.stack);
    res.status(500).json({ message: 'Server error fetching flights' });
  }
});

// PUBLIC - Get active flights (with destination + nearestAirport fallback) — for users
router.get('/', async (req, res) => {
  try {
    const { destination, isActive = 'true' } = req.query;

    if (!destination) {
      const flights = await Flight.find({ isActive: isActive === 'true' || isActive === true })
        .populate('destination', 'name country')
        .sort({ departureDate: 1 });
      return res.json(flights);
    }

    // Look up the destination to see if it has a nearest airport
    const dest = await Destination.findById(destination).select('nearestAirport');

    let flightFilter = {
      isActive: isActive === 'true' || isActive === true,
      $or: [
        { destination: destination },
      ]
    };

    if (dest && dest.nearestAirport) {
      flightFilter.$or.push({ destination: dest.nearestAirport });
    }

    const flights = await Flight.find(flightFilter)
      .populate('destination', 'name country')
      .sort({ departureDate: 1 });

    res.json(flights);
  } catch (err) {
    console.error('Public flights error:', err.stack);
    res.status(500).json({ message: 'Server error fetching flights' });
  }
});

// Get single flight (public) — put this LAST because it uses :id
router.get('/:id', async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id)
      .populate('destination', 'name country');
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    await emitAdminStats(req.app.get('io'));
    res.json(flight);
  } catch (err) {
    console.error('Single flight error:', err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN - Create flight
router.post('/', auth, admin, async (req, res) => {
  try {
    const flight = new Flight(req.body);
    await flight.save();
    await flight.populate('destination', 'name country');
    await emitAdminStats(req.app.get('io'));
    res.status(201).json(flight);
  } catch (err) {
    console.error('Create flight error:', err.stack);
    res.status(400).json({ message: err.message || 'Failed to create flight' });
  }
});

// ADMIN - Update flight
router.patch('/:id', auth, admin, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('destination', 'name country');
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    res.json(flight);
  } catch (err) {
    console.error('Update flight error:', err.stack);
    res.status(400).json({ message: err.message || 'Failed to update flight' });
  }
});

// ADMIN - Delete flight
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    await emitAdminStats(req.app.get('io'));
    res.json({ message: 'Flight deleted' });
  } catch (err) {
    console.error('Delete flight error:', err.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;