// backend/src/controllers/adminController.js
const User = require("../models/User");
const Destination = require("../models/Destination");
const Hotel = require("../models/Hotel");
const Flight = require("../models/Flight");  
const Booking = require("../models/Booking");

function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

// ── Reusable Stats Calculation ───────────────────────────────────────────────
const calculateAdminStats = async () => {
  const now = new Date();
  const periodDays = 7;

  const startCurrent = new Date(now);
  startCurrent.setDate(now.getDate() - periodDays);

  const startPrevious = new Date(now);
  startPrevious.setDate(now.getDate() - periodDays * 2);

  // Totals
  const [totalUsers, totalDestinations, totalHotels, totalFlights] = await Promise.all([
    User.countDocuments({}),
    Destination.countDocuments({}),
    Hotel.countDocuments({}),
    Flight.countDocuments({}),
  ]);

  // Current period
  const [newUsersCurrent, newDestinationsCurrent, newHotelsCurrent, newFlightsCurrent] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
    Destination.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
    Hotel.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
    Flight.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
  ]);

  // Previous period
  const [newUsersPrev, newDestinationsPrev, newHotelsPrev, newFlightsPrev] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
    Destination.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
    Hotel.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
    Flight.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
  ]);

  // Booking Statistics & Payment Summary
  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    cancelledBookings,
    awaitingPaymentAgg,
    paymentAgg
  ] = await Promise.all([
    Booking.countDocuments({}),
    Booking.countDocuments({ status: 'pending' }),
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({ status: 'cancelled' }),
    Booking.aggregate([
      { $match: { status: 'confirmed', paymentStatus: 'pending' } },
      { $group: { _id: null, totalAwaiting: { $sum: "$totalAmount" } } }
    ]),
    Booking.aggregate([
      { $match: { paymentStatus: { $in: ['completed', 'refunded'] } } },
      { $group: { _id: null, totalGross: { $sum: "$totalAmount" }, totalRefunds: { $sum: "$refundAmount" } } }
    ])
  ]);

  const payStats = {
    totalGross: paymentAgg[0]?.totalGross || 0,
    totalRefunds: paymentAgg[0]?.totalRefunds || 0
  };
  const awaitingStats = {
    totalAwaiting: awaitingPaymentAgg[0]?.totalAwaiting || 0
  };

  const usersTrend = calcTrend(newUsersCurrent, newUsersPrev);
  const destinationsTrend = calcTrend(newDestinationsCurrent, newDestinationsPrev);
  const hotelsTrend = calcTrend(newHotelsCurrent, newHotelsPrev);
  const flightsTrend = calcTrend(newFlightsCurrent, newFlightsPrev);

  return {
    totals: {
      users: totalUsers,
      destinations: totalDestinations,
      hotels: totalHotels,
      flights: totalFlights,
    },
    bookingStats: {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
    },
    paymentSummary: {
      totalAmount: payStats.totalGross,
      netRevenue: payStats.totalGross - payStats.totalRefunds,
      awaitingPayment: awaitingStats.totalAwaiting,
    },
    periodDays,
    newThisPeriod: {
      users: newUsersCurrent,
      destinations: newDestinationsCurrent,
      hotels: newHotelsCurrent,
      flights: newFlightsCurrent,
    },
    newPrevPeriod: {
      users: newUsersPrev,
      destinations: newDestinationsPrev,
      hotels: newHotelsPrev,
      flights: newFlightsPrev,
    },
    trends: {
      usersPercent: usersTrend,
      destinationsPercent: destinationsTrend,
      hotelsPercent: hotelsTrend,
      flightsPercent: flightsTrend,
    },
  };
};

// ── Exported Socket Helper ───────────────────────────────────────────────────
exports.emitAdminStats = async (io) => {
  try {
    if (!io) return;
    const stats = await calculateAdminStats();
    io.emit('statsUpdated', stats);
  } catch (err) {
    console.error("Socket stats emit error:", err);
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const stats = await calculateAdminStats();
    return res.json(stats);
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};