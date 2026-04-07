// backend/src/routes/authRoutes.js
const express  = require('express');
const router   = express.Router();
const passport = require('passport');
const jwt      = require('jsonwebtoken');
const { register, login } = require('../controllers/authController');

// ── Email / password routes ───────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);

// ── Google OAuth routes ───────────────────────────────────────────────────────

// Step 1: Redirect user to Google
// prompt options:
//   'select_account'         → always show account picker (what you had)
//   'consent'                → always show the permissions consent screen
//   'select_account consent' → show both (best for dev/testing)
//   omit prompt entirely     → Google decides (skips both if already granted)
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    // Use 'select_account consent' while developing so you always see the full flow.
    // In production you can drop back to just 'select_account' — users only see
    // the consent screen on their very first login, which is the correct UX.
    prompt: 'select_account consent',
    access_type: 'offline', // needed if you ever want a refresh_token
  })
);

// Step 2: Google redirects back here after the user approves
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login?error=google_failed',
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      {
        id:       req.user._id,
        email:    req.user.email,
        fullName: req.user.fullName,
        role:     req.user.role || 'USER',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`http://localhost:3000/auth/google/success?token=${token}`);
  }
);

module.exports = router;