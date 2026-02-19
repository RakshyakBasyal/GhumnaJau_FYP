// backend/src/controllers/adminController.js
const User = require("../models/User");
const Destination = require("../models/Destination");
const Hotel = require("../models/Hotel");
const Flight = require("../models/Flight");  

function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

exports.getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const periodDays = 7;

    const startCurrent = new Date(now);
    startCurrent.setDate(now.getDate() - periodDays);

    const startPrevious = new Date(now);
    startPrevious.setDate(now.getDate() - periodDays * 2);

    // Totals – add Flight
    const [totalUsers, totalDestinations, totalHotels, totalFlights] = await Promise.all([
      User.countDocuments({}),
      Destination.countDocuments({}),
      Hotel.countDocuments({}),
      Flight.countDocuments({}),  // ← added
    ]);

    // Current period – add Flight
    const [newUsersCurrent, newDestinationsCurrent, newHotelsCurrent, newFlightsCurrent] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Destination.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Hotel.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Flight.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),  // ← added
    ]);

    // Previous period – add Flight
    const [newUsersPrev, newDestinationsPrev, newHotelsPrev, newFlightsPrev] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Destination.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Hotel.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Flight.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),  // ← added
    ]);

    const usersTrend = calcTrend(newUsersCurrent, newUsersPrev);
    const destinationsTrend = calcTrend(newDestinationsCurrent, newDestinationsPrev);
    const hotelsTrend = calcTrend(newHotelsCurrent, newHotelsPrev);
    const flightsTrend = calcTrend(newFlightsCurrent, newFlightsPrev);  // ← added (optional)

    return res.json({
      totals: {
        users: totalUsers,
        destinations: totalDestinations,
        hotels: totalHotels,
        flights: totalFlights,  // ← now real count
      },
      periodDays,
      newThisPeriod: {
        users: newUsersCurrent,
        destinations: newDestinationsCurrent,
        hotels: newHotelsCurrent,
        flights: newFlightsCurrent,  // ← this was missing – critical!
      },
      newPrevPeriod: {
        users: newUsersPrev,
        destinations: newDestinationsPrev,
        hotels: newHotelsPrev,
        flights: newFlightsPrev,  // ← added
      },
      trends: {
        usersPercent: usersTrend,
        destinationsPercent: destinationsTrend,
        hotelsPercent: hotelsTrend,
        flightsPercent: flightsTrend,  // ← optional, but good for consistency
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};