const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  createStripeCheckoutSession,
  handleStripeSuccessRedirect,
  handleStripeFailureRedirect,
  refundBookingPayment,
} = require('../controllers/paymentController');

router.post('/stripe/checkout', auth, createStripeCheckoutSession);
router.get('/stripe/success', handleStripeSuccessRedirect);
router.get('/stripe/cancel', handleStripeFailureRedirect);
router.post('/stripe/refund/:bookingId', auth, refundBookingPayment);

module.exports = router;