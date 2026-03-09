// backend/src/routes/itineraryRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Itinerary     = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');

// ── Itinerary CRUD ────────────────────────────────────────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.create({
      user:      req.user._id,
      title:     req.body.title || 'New Trip',
      startDate: req.body.startDate || undefined,
      endDate:   req.body.endDate   || undefined,
      status:    'planning',
    });
    res.status(201).json(itinerary);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    const withCounts  = await Promise.all(itineraries.map(async (itin) => {
      const itemCount = await ItineraryItem.countDocuments({ itinerary: itin._id });
      const doneCount = await ItineraryItem.countDocuments({ itinerary: itin._id, isDone: true });
      return { ...itin.toObject(), itemCount, doneCount };
    }));
    res.json(withCounts);
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

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['planning', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    const update = { status };
    if (status === 'active')    update.startedAt   = new Date();
    if (status === 'completed') update.completedAt = new Date();
    if (status === 'planning')  { update.startedAt = null; update.completedAt = null; }

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

// ── Item Routes — /items routes MUST come before /:id ─────────────────────────

router.post('/:id/items', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Itinerary not found' });
    const item = await ItineraryItem.create({
      user:      req.user._id,
      itinerary: req.params.id,
      ...req.body,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Mark item done / undone — enters actual cost at time of marking done
router.patch('/items/:itemId/done', auth, async (req, res) => {
  try {
    const { isDone, actualCost } = req.body;
    const update = {
      isDone,
      doneAt:     isDone ? new Date() : null,
      actualCost: isDone ? (actualCost ?? null) : null,
    };
    const item = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id },
      { $set: update },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Edit actual cost independently (after already marked done)
router.patch('/items/:itemId/cost', auth, async (req, res) => {
  try {
    const { actualCost } = req.body;
    const item = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id },
      { $set: { actualCost: actualCost ?? null } },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

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

module.exports = router;