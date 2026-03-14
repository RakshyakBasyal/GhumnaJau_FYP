// backend/src/routes/itineraryRoutes.js
// NOTE: You need multer installed — run: npm install multer
const express   = require('express');
const router    = express.Router();
const multer    = require('multer');
const path      = require('path');
const auth      = require('../middleware/auth');
const Itinerary     = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');

// ── Multer for cover photo uploads ────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `cover_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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

// Upload cover photo
router.patch('/:id/cover', auth, upload.single('coverImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    const coverImage = `/uploads/${req.file.filename}`;
    const itinerary  = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { coverImage } },
      { new: true }
    );
    if (!itinerary) return res.status(404).json({ msg: 'Not found' });
    res.json({ coverImage });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update trip status — only planning→active, active→completed (no going back)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'completed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status transition' });
    }
    const itin = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itin) return res.status(404).json({ msg: 'Not found' });
    // Guard: completed trips stay completed
    if (itin.status === 'completed') return res.status(400).json({ msg: 'Trip is already completed' });
    // Guard: can only go planning→active or active→completed
    if (status === 'completed' && itin.status !== 'active') return res.status(400).json({ msg: 'Start the trip first' });

    const update = { status };
    if (status === 'active')    update.startedAt   = new Date();
    if (status === 'completed') update.completedAt = new Date();

    const updated = await Itinerary.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: update },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// ── Item routes — MUST come before /:id delete ────────────────────────────────

router.post('/:id/items', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
    if (!itinerary) return res.status(404).json({ msg: 'Itinerary not found' });
    const item = await ItineraryItem.create({ user: req.user._id, itinerary: req.params.id, ...req.body });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Mark item done / undone
router.patch('/items/:itemId/done', auth, async (req, res) => {
  try {
    const { isDone, actualCost } = req.body;
    const update = { isDone, doneAt: isDone ? new Date() : null, actualCost: isDone ? (actualCost ?? null) : null };
    const item   = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id },
      { $set: update }, { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Edit actual cost
router.patch('/items/:itemId/cost', auth, async (req, res) => {
  try {
    const item = await ItineraryItem.findOneAndUpdate(
      { _id: req.params.itemId, user: req.user._id },
      { $set: { actualCost: req.body.actualCost ?? null } }, { new: true }
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