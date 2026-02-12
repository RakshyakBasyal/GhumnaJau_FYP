// // backend/src/controllers/adminController.js
const User = require("../models/User");
const Destination = require("../models/Destination");
const Hotel = require("../models/Hotel");   

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

    // Count totals
    const [totalUsers, totalDestinations, totalHotels] = await Promise.all([
      User.countDocuments({}),
      Destination.countDocuments({}),
      Hotel.countDocuments({}),   
    ]);

    // Current period counts
    const [newUsersCurrent, newDestinationsCurrent, newHotelsCurrent] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Destination.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Hotel.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),   
    ]);

    // Previous period counts
    const [newUsersPrev, newDestinationsPrev, newHotelsPrev] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Destination.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Hotel.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }), 
    ]);

    const usersTrend = calcTrend(newUsersCurrent, newUsersPrev);
    const destinationsTrend = calcTrend(newDestinationsCurrent, newDestinationsPrev);
    const hotelsTrend = calcTrend(newHotelsCurrent, newHotelsPrev);  

    return res.json({
      totals: {
        users: totalUsers,
        destinations: totalDestinations,
        hotels: totalHotels,  
        flights: 0,
      },
      periodDays,
      newThisPeriod: {
        users: newUsersCurrent,
        destinations: newDestinationsCurrent,
        hotels: newHotelsCurrent,   
      },
      newPrevPeriod: {
        users: newUsersPrev,
        destinations: newDestinationsPrev,
        hotels: newHotelsPrev,   
      },
      trends: {
        usersPercent: usersTrend,
        destinationsPercent: destinationsTrend,
        hotelsPercent: hotelsTrend,  
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};