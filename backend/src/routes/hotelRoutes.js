//backend/src/routes/hotelRoutes.js
const express = require('express');
const multer = require('multer');
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

// Public
router.get('/', getAllHotels);
router.get('/:id', getHotel);

// Admin
router.post('/', auth, admin, upload.array('images', 10), createHotel);
router.put('/:id', auth, admin, upload.array('images', 10), updateHotel);
router.delete('/:id', auth, admin, deleteHotel);

module.exports = router;