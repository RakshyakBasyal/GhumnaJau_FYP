const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create Stripe Checkout Session
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
              name: `Hotel Booking - ${bookingId}`,
              description: 'Travel booking payment via Ghumna Jau',
            },
            unit_amount: Math.round(amount * 100), // paisa
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/payment/result?status=success&bookingId=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/payment/result?status=cancelled&bookingId=${bookingId}`,
      metadata: { bookingId: bookingId.toString() },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ msg: 'Failed to create Stripe checkout session' });
  }
};

// Handle success redirect from Stripe (Option A: only update paymentStatus)
exports.handleStripeSuccessRedirect = async (req, res) => {
  try {
    const { bookingId, session_id } = req.query;

    if (!bookingId || !session_id) {
      return res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'completed';
        booking.transactionId = session.payment_intent;
        booking.paidAt = new Date();
        // IMPORTANT: Do NOT change status to 'confirmed' here
        // Let admin do it manually in AdminBookings
        await booking.save();
      }
      return res.redirect(`${FRONTEND_URL}/payment/result?status=success&bookingId=${bookingId}`);
    }

    res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId}`);
  } catch (err) {
    console.error('Stripe success redirect error:', err.message);
    res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
  }
};

// Handle cancel/failure redirect
exports.handleStripeFailureRedirect = (req, res) => {
  const { bookingId } = req.query;
  res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId || ''}`);
};