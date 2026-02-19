//backend/src/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const destinationRoutes = require('./routes/destinationRoutes'); 
const adminRoutes = require("./routes/adminRoutes");
const flightRoutes = require('./routes/flights');


app.use('/images', express.static(path.join(__dirname, '..', 'images')));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/destinations', destinationRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/hotels', require('./routes/hotelRoutes'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/flights', flightRoutes);
app.use('/api/payments', require('./routes/paymentRoutes'));
module.exports = app;
