// backend/src/routes/itineraryRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Itinerary = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');

// Create a new itinerary (trip)
router.post('/', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.create({
      user: req.user._id,
      title: req.body.title || 'New Trip',
    });
    res.status(201).json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all itineraries for current user
router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(itineraries);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to load itineraries' });
  }
});

// Get single itinerary + its items
router.get('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });

    const items = await ItineraryItem.find({ itinerary: req.params.id }).sort({ order: 1, plannedDate: 1 });
    res.json({ ...itinerary.toObject(), items });
  } catch (err) {
    res.status(500).json({ msg: 'Failed to load' });
  }
});

// Add item to an itinerary
router.post('/:id/items', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.create({
      user: req.user._id,
      itinerary: req.params.id,
      ...req.body,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete an item
router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    await ItineraryItem.findByIdAndDelete(req.params.itemId);
    res.json({ msg: 'Removed' });
  } catch (err) {
    res.status(500).json({ msg: 'Failed' });
  }
});

module.exports = router;