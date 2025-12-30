const User = require("../models/User");
const Destination = require("../models/Destination");

function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100; // went from 0 to something
  return Math.round(((current - previous) / previous) * 100);
}

exports.getAdminStats = async (req, res) => {
  try {
    const now = new Date();

    // choose your period: 7 days (weekly trend)
    const periodDays = 7;

    const startCurrent = new Date(now);
    startCurrent.setDate(now.getDate() - periodDays);

    const startPrevious = new Date(now);
    startPrevious.setDate(now.getDate() - periodDays * 2);

    // totals
    const [totalUsers, totalDestinations] = await Promise.all([
      User.countDocuments({}),
      Destination.countDocuments({}),
    ]);

    // current period
    const [newUsersCurrent, newDestinationsCurrent] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
      Destination.countDocuments({ createdAt: { $gte: startCurrent, $lt: now } }),
    ]);

    // previous period
    const [newUsersPrev, newDestinationsPrev] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
      Destination.countDocuments({ createdAt: { $gte: startPrevious, $lt: startCurrent } }),
    ]);

    const usersTrend = calcTrend(newUsersCurrent, newUsersPrev);
    const destinationsTrend = calcTrend(newDestinationsCurrent, newDestinationsPrev);

    return res.json({
      totals: {
        users: totalUsers,
        destinations: totalDestinations,
        hotels: 0,
        flights: 0,
      },
      periodDays,
      newThisPeriod: {
        users: newUsersCurrent,
        destinations: newDestinationsCurrent,
      },
      newPrevPeriod: {
        users: newUsersPrev,
        destinations: newDestinationsPrev,
      },
      trends: {
        usersPercent: usersTrend,
        destinationsPercent: destinationsTrend,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
