// backend/src/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
const passport = require('passport');
require('./config/passport')(passport);
app.use(passport.initialize());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const authRoutes        = require('./routes/authRoutes');
const userRoutes        = require('./routes/userRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const flightRoutes      = require('./routes/flights');

app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/destinations',   destinationRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/hotels',         require('./routes/hotelRoutes'));
app.use('/api/bookings',       require('./routes/bookings'));
app.use('/api/flights',        flightRoutes);
app.use('/api/itineraries',    require('./routes/itineraryRoutes'));
app.use('/api/payments',       require('./routes/paymentRoutes'));
app.use('/api/password-reset', require('./routes/passwordResetRoutes'));
app.use('/api/posts',          require('./routes/postRoutes'));
app.use('/api/comments',       require('./routes/commentRoutes.js'));
app.use('/api/follows',        require('./routes/followRoutes'));
app.use('/api/buddies',        require('./routes/buddyRoutes'));
app.use('/api/trips',          require('./routes/tripRoutes'));
app.use('/api/restaurants',    require('./routes/restaurantRoutes'));
app.use('/api/activities',     require('./routes/activityRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

module.exports = app;