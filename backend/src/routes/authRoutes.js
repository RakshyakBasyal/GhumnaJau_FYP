// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { register, login } = require('../controllers/authController');

// Your existing email/password routes
router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
// Step 1: Redirect user to Google login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Step 2: Google redirects back here after approval
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login?error=google_failed',
    session: false, // We use JWT, no session needed
  }),
  (req, res) => {
    // User authenticated successfully — create JWT
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role || 'USER',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token in URL
    res.redirect(`http://localhost:3000/auth/google/success?token=${token}`);
  }
);

module.exports = router;