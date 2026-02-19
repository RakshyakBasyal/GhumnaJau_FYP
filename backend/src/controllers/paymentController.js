// backend/src/controllers/paymentController.js
const Booking = require('../models/Booking');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initiate eSewa payment
exports.initiateESewaPayment = async (req, res) => {
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

    const params = {
      amt: amount,
      pdc: 0,
      psc: 0,
      txAmt: 0,
      tAmt: amount,
      pid: `BK-${bookingId}-${Date.now()}`,
      scd: 'EPAYTEST',
      su: `${BASE_URL}/api/payments/esewa/success`,
      fu: `${BASE_URL}/api/payments/esewa/failure`,
    };

    res.json({
      success: true,
      paymentUrl: 'https://uat.esewa.com.np/epay/main',
      params,
    });
  } catch (err) {
    console.error('Initiate eSewa error:', err.message);
    res.status(500).json({ msg: 'Server error while initiating payment' });
  }
};

// eSewa success callback
exports.eSewaSuccessCallback = async (req, res) => {
  try {
    const { amt, pid, refId } = req.body;

    if (!pid || !refId) {
      return res.redirect(`${FRONTEND_URL}/payment/failed`);
    }

    // Extract bookingId from pid format: BK-bookingId-timestamp
    const parts = pid.split('-');
    if (parts.length < 3 || parts[0] !== 'BK') {
      return res.redirect(`${FRONTEND_URL}/payment/failed`);
    }

    const bookingId = parts[1];

    // Verify transaction with eSewa
    const formData = new URLSearchParams();
    formData.append('amt', amt);
    formData.append('rid', refId);
    formData.append('pid', pid);
    formData.append('scd', 'EPAYTEST');

    const verification = await fetch('https://uat.esewa.com.np/epay/transrec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const responseText = await verification.text();

    if (responseText.includes('Success')) {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'completed';
        booking.transactionId = refId;
        booking.paidAt = new Date();
        booking.status = 'confirmed';
        await booking.save();
      }

      return res.redirect(`${FRONTEND_URL}/payment/success?bookingId=${bookingId}`);
    }

    res.redirect(`${FRONTEND_URL}/payment/failed`);
  } catch (err) {
    console.error('eSewa success error:', err.message);
    res.redirect(`${FRONTEND_URL}/payment/failed`);
  }
};

// eSewa failure callback
exports.eSewaFailureCallback = (req, res) => {
  res.redirect(`${FRONTEND_URL}/payment/failed`);
};