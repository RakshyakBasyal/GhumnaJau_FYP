// backend/src/controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { sendBookingConfirmationEmail } = require('../utils/bookingEmail');
const { calculateRefundPolicy, calculateRefundAmount } = require('../utils/refundPolicy');
const { emitAdminStats } = require('./adminController');

// Must match the list in bookings.js and frontend AUTO_REFUND_REASONS
const PREDEFINED_REASONS = [
  'Booking mistake',
  'Change of plans',
  'Found a better deal',
  'Duplicate booking',
  'Medical emergency',
  'Weather or natural issues',
];

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:5000';

// ── populate helper ───────────────────────────────────────────────────────────
const fullPopulate = (bookingId) =>
  Booking.findById(bookingId)
    .populate('user', 'fullName email')
    .populate({
      path: 'hotel',
      select: 'name images country destination',
      populate: { path: 'destination', select: 'name country' },
    })
    .populate({
      path: 'flight',
      select: 'airline flightNumber from to departureTime arrivalTime departureDate class',
    });

// ── Create Stripe Checkout Session ────────────────────────────────────────────
exports.createStripeCheckoutSession = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !amount || amount <= 0)
      return res.status(400).json({ msg: 'Invalid booking ID or amount' });

    const booking = await Booking.findById(bookingId);
    if (!booking)              return res.status(404).json({ msg: 'Booking not found' });
    if (booking.user.toString() !== req.user.id)
                               return res.status(403).json({ msg: 'Unauthorized' });
    if (booking.paymentStatus === 'completed')
                               return res.status(400).json({ msg: 'Already paid' });
    if (booking.status === 'cancelled')
                               return res.status(400).json({ msg: 'Cannot pay for a cancelled booking' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'npr',
          product_data: {
            name: `Booking - ${bookingId}`,
            description: `Payment for ${booking.type} booking on Ghumna Jau`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BACKEND_URL}/api/payments/stripe/success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BACKEND_URL}/api/payments/stripe/cancel?bookingId=${bookingId}`,
      metadata: { bookingId: bookingId.toString() },
    });

    res.json({ success: true, checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ msg: 'Failed to create checkout session', error: err.message });
  }
};

// ── Handle Stripe success redirect ───────────────────────────────────────────
// Stripe calls this after payment. We:
//   1. Mark paymentStatus = 'completed'
//   2. Set status = 'confirmed'  ← PAY NOW always auto-confirms
//   3. Send confirmation email
exports.handleStripeSuccessRedirect = async (req, res) => {
  try {
    const { bookingId, session_id } = req.query;
    if (!bookingId || !session_id)
      return res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'completed';
        booking.transactionId = session.payment_intent;
        booking.paidAt        = new Date();
        booking.status        = 'confirmed'; // Pay Now → always auto-confirm
        await booking.save();

        const populated = await fullPopulate(booking._id);
        req.app.get('io')?.emit('bookingUpdated', populated);
        await emitAdminStats(req.app.get('io'));

        try {
          await sendBookingConfirmationEmail({ booking: populated, source: 'payment' });
        } catch (mailErr) {
          console.error('Confirmation email failed (payment):', mailErr.message);
        }
      }
      return res.redirect(
        `${FRONTEND_URL}/payment/result?status=success&bookingId=${bookingId}`
      );
    }

    res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId}`);
  } catch (err) {
    console.error('Success redirect error:', err.message);
    res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
  }
};

// ── Handle Stripe cancel/failure redirect ─────────────────────────────────────
exports.handleStripeFailureRedirect = (req, res) => {
  const { bookingId } = req.query;
  res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId || ''}`);
};

// ── Refund paid booking (user-initiated cancellation) ─────────────────────────
//
// Decision tree:
//   • Predefined reason  → calculate refund → hit Stripe immediately → auto_approved
//   • Custom/free-text reason → calculate refund, save amounts, set pending_review → admin decides
//   • No refund window   → cancel cleanly, mark auto_approved with 0 refund
//
exports.refundBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { cancellationReason = '', cancellationNote = '' } = req.body || {};

    const booking = await Booking.findById(bookingId).populate('flight', 'departureDate');
    if (!booking)
      return res.status(404).json({ msg: 'Booking not found' });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ msg: 'Unauthorized' });
    if (booking.paymentStatus !== 'completed')
      return res.status(400).json({ msg: 'Only paid bookings can request a refund' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ msg: 'Already cancelled' });
    if (!booking.transactionId)
      return res.status(400).json({ msg: 'No transaction found for this booking' });

    // Calculate refund based on time-to-travel
    const { refundPercent } = calculateRefundPolicy(booking);
    const refundAmount = calculateRefundAmount(booking.totalAmount, refundPercent);

    // Cancel booking + set common fields
    booking.status             = 'cancelled';
    booking.cancelledBy        = 'user';
    booking.cancelledAt        = new Date();
    booking.cancellationReason = cancellationReason;
    booking.cancellationNote   = cancellationNote;
    booking.refundPercent      = refundPercent;
    booking.refundAmount       = refundAmount;

    // Restore flight seats immediately
    if (booking.type === 'flight' && booking.passengersCount) {
      const flightId = booking.flight?._id || booking.flight;
      const flight = await Flight.findById(flightId);
      if (flight) {
        const totalPax =
          (booking.passengersCount.adults   || 0) +
          (booking.passengersCount.children || 0) +
          (booking.passengersCount.infants  || 0);
        flight.availableSeats += totalPax;
        await flight.save();
      }
    }

    const isPredefined = PREDEFINED_REASONS.includes(cancellationReason);

    // ── Path A: Predefined reason → try auto-refund ───────────────────────────
    if (isPredefined) {
      if (refundAmount > 0) {
        try {
          if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('Stripe API key is missing on the server.');
          }

          const refund = await stripe.refunds.create({
            payment_intent: booking.transactionId,
            amount: Math.round(refundAmount * 100),
          }, {
            timeout: 10000, // 10s timeout
          });

          booking.paymentStatus      = 'refunded';
          booking.refundId           = refund.id;
          booking.refundReviewStatus = 'auto_approved';
          booking.refundProcessedAt  = new Date();
          await booking.save();

          const populated = await fullPopulate(booking._id);
          req.app.get('io')?.emit('bookingRefunded', populated);
          await emitAdminStats(req.app.get('io'));

          return res.json({
            success: true,
            autoRefunded: true,
            message: `Booking cancelled. NPR ${refundAmount.toLocaleString()} refund is being processed to your original payment method.`,
            amountRefunded: refundAmount,
            refundPercent,
            refundId: refund.id,
            booking: populated,
          });
        } catch (stripeErr) {
          // Stripe failed → fall through to admin review
          console.error('Auto-refund stripe error, falling back to review:', stripeErr.message);
          booking.refundReviewStatus = 'pending_review';
          booking.cancellationNote   =
            (cancellationNote ? cancellationNote + ' | ' : '') +
            `[Auto-refund failed — queued for admin review] Error: ${stripeErr.message}`;
        }
      } else {
        // No refund window but still a predefined reason → close cleanly
        booking.refundReviewStatus = 'auto_approved';
        await booking.save();

        const populated = await fullPopulate(booking._id);
        req.app.get('io')?.emit('bookingCancelled', populated);

        return res.json({
          success: true,
          autoRefunded: false,
          message: 'Booking cancelled. No refund applies (cancellation is outside the refund window).',
          amountRefunded: 0,
          refundPercent: 0,
          booking: populated,
        });
      }
    } else {
      // ── Path B: Custom/free-text reason → queue for admin review ─────────────
      booking.refundReviewStatus = 'pending_review';
    }

    await booking.save();

    const populated = await fullPopulate(booking._id);
    req.app.get('io')?.emit('bookingCancelled', populated);
    req.app.get('io')?.emit('refundReviewQueued', populated);
    await emitAdminStats(req.app.get('io'));

    return res.json({
      success: true,
      autoRefunded: false,
      pendingReview: true,
      message:
        'Booking cancelled. Your refund request has been sent for admin review. ' +
        'You will be notified once a decision is made.',
      amountRequested: refundAmount,
      refundPercent,
      booking: populated,
    });
  } catch (err) {
    console.error('Refund error:', err.message);
    res.status(500).json({ msg: 'Refund failed', error: err.message });
  }
};