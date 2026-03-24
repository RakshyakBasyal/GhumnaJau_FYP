const User       = require('../models/User');
const transporter = require('../config/mailer');
const bcrypt     = require('bcryptjs');

// Generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// STEP 1 — Send reset code to email
exports.sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: 'Email is required' });

    const user = await User.findOne({ email });

    // Always respond the same way to prevent email enumeration
    if (!user) {
      return res.json({ msg: 'If this email exists, a code has been sent.' });
    }

    // Block Google-only accounts (no password to reset)
    if (user.googleId && !user.password) {
      return res.status(400).json({
        msg: 'This account uses Google Sign-In. No password to reset.',
        googleOnly: true,
      });
    }

    const code   = generateCode();
    const expiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    user.resetCode       = code;
    user.resetCodeExpiry = expiry;
    await user.save();

    await transporter.sendMail({
      from:    `"Ghumna Jau" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#1d4ed8;margin-bottom:8px;">Ghumna Jau</h2>
          <p style="color:#374151;">You requested a password reset. Use the code below:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;color:#1d4ed8;padding:24px 0;">
            ${code}
          </div>
          <p style="color:#6b7280;font-size:13px;">This code expires in <strong>2 minutes</strong>. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ msg: 'If this email exists, a code has been sent.' });
  } catch (err) {
    console.error('Send reset code error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// STEP 2 — Verify code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ msg: 'Email and code are required' });

    const user = await User.findOne({ email });
    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      return res.status(400).json({ msg: 'Invalid or expired code' });
    }

    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ msg: 'Code has expired. Please request a new one.' });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ msg: 'Incorrect code. Please try again.' });
    }

    res.json({ msg: 'Code verified', verified: true });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// STEP 3 — Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetCode || !user.resetCodeExpiry) {
      return res.status(400).json({ msg: 'Invalid or expired code' });
    }

    if (new Date() > user.resetCodeExpiry) {
      return res.status(400).json({ msg: 'Code has expired. Please request a new one.' });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ msg: 'Invalid code' });
    }

    // Save new password — pre('save') hook will hash it
    user.password        = newPassword;
    user.resetCode       = null;
    user.resetCodeExpiry = null;
    user.lastLogout      = new Date(); // invalidate all existing sessions
    await user.save();

    res.json({ msg: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};