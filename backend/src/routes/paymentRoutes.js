const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  createStripeCheckoutSession,
  handleStripeSuccessRedirect,
  handleStripeFailureRedirect,
} = require('../controllers/paymentController');

// Create Stripe Checkout session (after booking creation)
router.post('/stripe/checkout', auth, createStripeCheckoutSession);

// Public redirect endpoints (Stripe calls these after payment)
router.get('/stripe/success', handleStripeSuccessRedirect);
router.get('/stripe/cancel', handleStripeFailureRedirect);

module.exports = router;