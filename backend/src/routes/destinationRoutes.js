// backend/src/routes/destinationRoutes.js
const express = require('express');
const { uploadDestination } = require('../middleware/upload'); // ← NEW IMPORT
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  createDestination,
  getAllDestinations,
  getDestination,
  updateDestination,
  deleteDestination
} = require('../controllers/destinationController');

const router = express.Router();

// Public routes
router.get('/', getAllDestinations);
router.get('/:id', getDestination);

// Admin routes – use uploadDestination
router.post('/', auth, admin, uploadDestination.array('images', 10), createDestination);
router.put('/:id', auth, admin, uploadDestination.array('images', 10), updateDestination);
router.delete('/:id', auth, admin, deleteDestination);

module.exports = router;