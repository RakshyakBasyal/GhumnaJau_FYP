// backend/src/routes/itineraryRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Itinerary = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');

// Create itinerary
router.post('/', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.create({
      user: req.user._id,
      title: req.body.title || 'New Trip',
      startDate: req.body.startDate || undefined,
      endDate: req.body.endDate || undefined,
      status: 'planning',
    });
    res.status(201).json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all itineraries for user
router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    // Attach item count
    const withCounts = await Promise.all(itineraries.map(async (itin) => {
      const count = await ItineraryItem.countDocuments({ itinerary: itin._id });
      return { ...itin.toObject(), itemCount: count };
    }));
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to load itineraries' });
  }
});

// Get single itinerary with items
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

// Update itinerary (title, dates)
router.patch('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    res.json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update trip status — start or complete a trip
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['planning', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    const update = { status };
    if (status === 'active') update.startedAt = new Date();
    if (status === 'completed') update.completedAt = new Date();
    if (status === 'planning') { update.startedAt = null; update.completedAt = null; }

    const itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: update },
      { new: true }
    );
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    res.json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete item — MUST be before /:id delete
router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.findOneAndDelete({ _id: req.params.itemId, user: req.user._id });
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json({ msg: 'Removed' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete itinerary
router.delete('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    await ItineraryItem.deleteMany({ itinerary: req.params.id });
    res.json({ msg: 'Itinerary deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Add item to itinerary
router.post('/:id/items', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Itinerary not found' });
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

module.exports = router;