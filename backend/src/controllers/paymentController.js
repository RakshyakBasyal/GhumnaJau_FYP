const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// 1. Create Stripe Checkout Session
exports.createStripeCheckoutSession = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({ msg: 'Invalid booking ID or amount' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized: Booking does not belong to you' });
    }

    if (booking.paymentStatus !== 'pending') {
      return res.status(400).json({ msg: 'Payment already processed or not pending' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'npr',
            product_data: {
              name: `Booking Payment - ${bookingId}`,
              description: `Payment for ${booking.type} booking on Ghumna Jau`,
            },
            unit_amount: Math.round(amount * 100), // to paisa
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // IMPORTANT FIX: success & cancel must point to BACKEND first
      success_url: `${BACKEND_URL}/api/payments/stripe/success?bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BACKEND_URL}/api/payments/stripe/cancel?bookingId=${bookingId}`,
      metadata: { bookingId: bookingId.toString() },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ msg: 'Failed to create checkout session', error: err.message });
  }
};

// 2. Handle successful payment (backend endpoint)
exports.handleStripeSuccessRedirect = async (req, res) => {
  try {
    const { bookingId, session_id } = req.query;

    console.log('=== STRIPE SUCCESS HIT ===');
    console.log('Query:', req.query);

    if (!bookingId || !session_id) {
      console.log('Missing params → failed');
      return res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Session status:', session.payment_status);

    if (session.payment_status === 'paid') {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        console.log(`Before: paymentStatus = ${booking.paymentStatus}`);
        booking.paymentStatus = 'completed';
        booking.transactionId = session.payment_intent;
        booking.paidAt = new Date();
        await booking.save();
        console.log(`After save: paymentStatus = ${booking.paymentStatus}`);
      } else {
        console.log('Booking not found');
      }

      return res.redirect(`${FRONTEND_URL}/payment/result?status=success&bookingId=${bookingId}`);
    }

    res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId}`);
  } catch (err) {
    console.error('Success handler error:', err.stack);
    res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
  }
};

// 3. Handle cancel/failure
exports.handleStripeFailureRedirect = (req, res) => {
  const { bookingId } = req.query;
  console.log('Payment cancelled/failed for booking:', bookingId);
  res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId || ''}`);
};

// 4. User refund endpoint
exports.refundBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not your booking' });
    }

    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json({ msg: 'Only completed payments can be refunded' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ msg: 'Already cancelled' });
    }

    if (!booking.transactionId) {
      return res.status(400).json({ msg: 'No transaction ID' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: booking.transactionId,
    });

    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
    await booking.save();

    // Restore flight seats if flight
    if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
      const flight = await Flight.findById(booking.flight);
      if (flight) {
        const total = (booking.passengersCount.adults || 0) +
                      (booking.passengersCount.children || 0) +
                      (booking.passengersCount.infants || 0);
        flight.availableSeats += total;
        await flight.save();
      }
    }

    req.app.get('io')?.emit('bookingRefunded', booking);

    res.json({ success: true, message: 'Refunded & cancelled', refundId: refund.id });
  } catch (err) {
    console.error('Refund error:', err.message);
    res.status(500).json({ msg: 'Refund failed', error: err.message });
  }
};