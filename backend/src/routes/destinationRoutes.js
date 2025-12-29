

// backend/routes/destinationRoutes.js
const express = require('express');
const multer = require('multer');
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

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Public routes (anyone can view)
router.get('/', getAllDestinations);
router.get('/:id', getDestination);

// Admin-only routes (protected with auth + admin middleware)
router.post('/', auth, admin, upload.array('images', 10), createDestination);
router.put('/:id', auth, admin, upload.array('images', 10), updateDestination);
router.delete('/:id', auth, admin, deleteDestination);

module.exports = router;