// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const {
  initiateESewaPayment,
  eSewaSuccessCallback,
  eSewaFailureCallback,
} = require('../controllers/paymentController');

// User must be authenticated to start payment
router.post('/esewa/initiate', auth, initiateESewaPayment);

// eSewa callbacks — public (no auth needed)
router.post('/esewa/success', eSewaSuccessCallback);
router.post('/esewa/failure', eSewaFailureCallback);

module.exports = router;