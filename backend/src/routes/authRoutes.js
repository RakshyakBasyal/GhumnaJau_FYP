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

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account consent',
    access_type: 'offline', 
  })
);

// Step 2: Google redirects back here after the user approves
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
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

    res.redirect(`${process.env.FRONTEND_URL}/auth/google/success?token=${token}`);
  }
);

module.exports = router;