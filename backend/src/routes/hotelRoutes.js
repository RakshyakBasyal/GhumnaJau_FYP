// backend/src/routes/hotelRoutes.js
const express = require('express');
const { uploadHotel } = require('../middleware/upload'); // ← Import the hotel-specific uploader
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const {
  createHotel,
  getAllHotels,
  getHotel,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');

const router = express.Router();

// Public routes - anyone can view hotels
router.get('/', getAllHotels);
router.get('/:id', getHotel);

// Admin-only routes - require authentication + admin role
// Use uploadHotel.array('images', 10) for both create and update
router.post('/', auth, admin, uploadHotel.array('images', 10), createHotel);
router.put('/:id', auth, admin, uploadHotel.array('images', 10), updateHotel);
router.delete('/:id', auth, admin, deleteHotel);

module.exports = router;