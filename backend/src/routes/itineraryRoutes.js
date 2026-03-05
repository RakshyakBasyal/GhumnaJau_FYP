const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Itinerary = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');

router.post('/', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.create({
      user: req.user._id,
      title: req.body.title || 'New Trip',
      startDate: req.body.startDate || undefined,
      endDate: req.body.endDate || undefined,
    });
    res.status(201).json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(itineraries);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to load itineraries' });
  }
});

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

// IMPORTANT: items route must be before /:id delete
router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.findOneAndDelete({ _id: req.params.itemId, user: req.user._id });
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json({ msg: 'Removed' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

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