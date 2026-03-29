// backend/src/controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { sendBookingConfirmationEmail } = require('../utils/bookingEmail');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

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
              name: `Booking - ${bookingId}`,
              description: `Payment for ${booking.type} booking on Ghumna Jau`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
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

// Handle successful payment redirect — auto-confirms paid bookings
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
        booking.status = 'confirmed'; // ✅ auto-confirm on payment
        await booking.save();

        const populated = await Booking.findById(booking._id)
          .populate('user', 'fullName email')
          .populate({
            path: 'hotel',
            select: 'name country destination',
            populate: { path: 'destination', select: 'name country' }
          })
          .populate({
            path: 'flight',
            select: 'airline flightNumber from to departureTime arrivalTime departureDate class'
          });

        // Emit socket so admin dashboard updates live
        const io = req.app.get('io');
        if (io) {
          io.emit('bookingUpdated', populated);
        }

        try {
          await sendBookingConfirmationEmail({ booking: populated, source: 'payment' });
        } catch (mailErr) {
          console.error('Booking confirmation email failed (payment):', mailErr.message);
        }
      }
      return res.redirect(`${FRONTEND_URL}/payment/result?status=success&bookingId=${bookingId}`);
    }

    res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId}`);
  } catch (err) {
    console.error('Success redirect error:', err.message);
    res.redirect(`${FRONTEND_URL}/payment/result?status=failed`);
  }
};

// Handle cancelled/failed payment redirect
exports.handleStripeFailureRedirect = (req, res) => {
  const { bookingId } = req.query;
  res.redirect(`${FRONTEND_URL}/payment/result?status=failed&bookingId=${bookingId || ''}`);
};

// Process refund (called when user cancels a paid booking)
exports.refundBookingPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Unauthorized: Not your booking' });
    }

    if (booking.paymentStatus !== 'completed') {
      return res.status(400).json({ msg: 'Only completed payments can be refunded' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ msg: 'Booking already cancelled' });
    }

    if (!booking.transactionId) {
      return res.status(400).json({ msg: 'No transaction ID found' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: booking.transactionId,
    });

    booking.paymentStatus = 'refunded';
    booking.status = 'cancelled';
    await booking.save();

    // Restore seats if flight booking
    if (booking.type === 'flight' && booking.flight && booking.passengersCount) {
      const flight = await Flight.findById(booking.flight);
      if (flight) {
        const totalPax =
          (booking.passengersCount.adults || 0) +
          (booking.passengersCount.children || 0) +
          (booking.passengersCount.infants || 0);
        flight.availableSeats += totalPax;
        await flight.save();
      }
    }

    const populated = await Booking.findById(booking._id)
      .populate('user', 'fullName email')
      .populate(booking.type === 'hotel' ? 'hotel' : 'flight');

    req.app.get('io')?.emit('bookingRefunded', populated);

    res.json({
      success: true,
      message: 'Refund processed and booking cancelled',
      amountRefunded: booking.totalAmount,
      refundId: refund.id,
    });
  } catch (err) {
    console.error('Refund error:', err.message);
    res.status(500).json({ msg: 'Refund failed', error: err.message });
  }
};