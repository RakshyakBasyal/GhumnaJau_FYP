// backend/src/routes/itineraryRoutes.js
const express   = require('express');
const router    = express.Router();
const path      = require('path');
const auth      = require('../middleware/auth');
const { uploadItinerary } = require('../middleware/upload');
const Itinerary     = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');
const ItineraryPlan = require('../models/ItineraryPlan');

let Destination;
try { Destination = require('../models/Destination'); } catch { Destination = null; }

// ── Create itinerary ──────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { title, startDate, endDate, destinationId, destinationName } = req.body;
    let resolvedDestName  = destinationName || null;
    let resolvedDestImage = null;
    if (destinationId && Destination) {
      try {
        const dest = await Destination.findById(destinationId);
        if (dest) { resolvedDestName = dest.name; resolvedDestImage = dest.images?.[0] || null; }
      } catch { }
    }
    const itinerary = await Itinerary.create({
      user: req.user._id,
      title: title || 'New Trip',
      startDate: startDate || undefined,
      endDate:   endDate   || undefined,
      status: 'planning',
      destinationId:    destinationId    || null,
      destinationName:  resolvedDestName || null,
      destinationImage: resolvedDestImage || null,
    });
    res.status(201).json(itinerary);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ── List itineraries ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ user: req.user._id }).sort({ createdAt: -1 });
    const withCounts  = await Promise.all(itineraries.map(async (itin) => {
      const itemCount = await ItineraryItem.countDocuments({ itinerary: itin._id });
      const doneCount = await ItineraryItem.countDocuments({ itinerary: itin._id, isDone: true });
      return { ...itin.toObject(), itemCount, doneCount };
    }));
    res.json(withCounts);
  } catch (err) { res.status(500).json({ msg: 'Failed to load itineraries' }); }
});

// ── IMPORTANT: Specific named routes BEFORE /:id ──────────────────────────────

// ── PUBLIC VIEW — no auth, no ownership check ─────────────────────────────────
// Anyone with a shared link (/itinerary/public/:id) can view this itinerary.
// This route MUST come before /:id to prevent Express matching "public" as an ID.
router.get('/public/:id', async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    if (!itinerary) return res.status(404).json({ msg: 'Itinerary not found' });

    const items = await ItineraryItem.find({ itinerary: req.params.id })
      .sort({ order: 1, plannedDate: 1 });
    const plans = await ItineraryPlan.find({ itinerary: req.params.id })
      .sort({ plannedDate: 1, order: 1 });

    res.json({ ...itinerary.toObject(), items, plans, isPublicView: true });
  } catch (err) {
    console.error('Public itinerary error:', err);
    res.status(500).json({ msg: 'Failed to load itinerary' });
  }
});

// ── Item routes ───────────────────────────────────────────────────────────────
router.patch('/items/:itemId/done', auth, async (req, res) => {
  try {
    const { isDone, actualCost } = req.body;
    const update = { isDone, doneAt: isDone ? new Date() : null, actualCost: isDone ? (actualCost ?? null) : null };
    const item = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id }, { $set: update }, { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.patch('/items/:itemId/cost', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id },
      { $set: { actualCost: req.body.actualCost ?? null } },
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/items/:itemId', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.findOneAndDelete({ _id: req.params.itemId, user: req.user._id });
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json({ msg: 'Removed' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ── Plan CRUD ─────────────────────────────────────────────────────────────────
router.patch('/plans/:planId', auth, async (req, res) => {
  try {
    const plan = await ItineraryPlan.findOneAndUpdate(
      { _id: req.params.planId, user: req.user._id },
      { $set: { title: req.body.title } },
      { new: true }
    );
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    res.json(plan);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/plans/:planId', auth, async (req, res) => {
  try {
    const plan = await ItineraryPlan.findOneAndDelete({ _id: req.params.planId, user: req.user._id });
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    await ItineraryItem.deleteMany({ planId: req.params.planId });
    res.json({ msg: 'Plan deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.post('/plans/:planId/items', auth, async (req, res) => {
  try {
    const plan = await ItineraryPlan.findOne({ _id: req.params.planId, user: req.user._id });
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    const item = await ItineraryItem.create({
      user: req.user._id, itinerary: plan.itinerary, planId: plan._id,
      plannedDate: plan.plannedDate, ...req.body,
    });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// ── Itinerary :id routes ──────────────────────────────────────────────────────
// All routes below use /:id — they come AFTER the named routes above

router.get('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    const items = await ItineraryItem.find({ itinerary: req.params.id }).sort({ order: 1, plannedDate: 1 });
    const plans = await ItineraryPlan.find({ itinerary: req.params.id }).sort({ plannedDate: 1, order: 1 });
    res.json({ ...itinerary.toObject(), items, plans });
  } catch (err) { res.status(500).json({ msg: 'Failed to load' }); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, { $set: req.body }, { new: true }
    );
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    res.json(itinerary);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.patch('/:id/cover', auth, uploadItinerary.single('coverImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    const coverImage = req.file.path;
    const itinerary  = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, { $set: { coverImage } }, { new: true }
    );
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    res.json({ coverImage });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'completed'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
    const itin = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itin) return res.status(404).json({ msg: 'Not found' });
    if (itin.status === 'completed') return res.status(400).json({ msg: 'Trip is already completed' });
    if (status === 'completed' && itin.status !== 'active') return res.status(400).json({ msg: 'Start the trip first' });
    const update = { status };
    if (status === 'active')    update.startedAt   = new Date();
    if (status === 'completed') update.completedAt = new Date();
    const updated = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, { $set: update }, { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Create a plan step
router.post('/:id/plans', auth, async (req, res) => {
  try {
    const itin = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itin) return res.status(404).json({ msg: 'Itinerary not found' });
    const plan = await ItineraryPlan.create({
      user: req.user._id, itinerary: req.params.id,
      title: req.body.title, plannedDate: req.body.plannedDate || null, order: req.body.order || 0,
    });
    res.status(201).json(plan);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

// Add item directly to itinerary (no plan) — backward compat
router.post('/:id/items', auth, async (req, res) => {
  try {
    const itin = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itin) return res.status(404).json({ msg: 'Itinerary not found' });
    const item = await ItineraryItem.create({ user: req.user._id, itinerary: req.params.id, ...req.body });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    await ItineraryItem.deleteMany({ itinerary: req.params.id });
    await ItineraryPlan.deleteMany({ itinerary: req.params.id });
    res.json({ msg: 'Itinerary deleted' });
  } catch (err) { res.status(500).json({ msg: err.message }); }
});

module.exports = router;