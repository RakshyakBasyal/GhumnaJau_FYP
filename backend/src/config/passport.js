// backend/src/config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:5000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 1. Check if user already exists by googleId
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // 2. Check if email already exists (merge/link account)
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Link Google account to existing email
            user.googleId = profile.id;
            user.fullName = user.fullName || profile.displayName;
            // Removed automatic Google avatar sync
            await user.save();
            return done(null, user);
          }

          // 3. Create brand new user
          const newUser = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            fullName: profile.displayName,
            avatar: '', // No avatar by default for Google users
            // No password needed for Google users
            role: 'USER',
          });

          return done(null, newUser);
        } catch (err) {
          console.error('Google Strategy Error:', err);
          return done(err, null);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};