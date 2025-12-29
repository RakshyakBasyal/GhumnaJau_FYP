// backend/src/controllers/userController.js
const User = require("../models/User");

// GET all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself (optional but recommended)
    if (req.user?.id === userId) {
      return res.status(400).json({ msg: "You can't delete your own admin account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Prevent deleting admin users (optional)
    if (user.role === "ADMIN") {
      return res.status(403).json({ msg: "Cannot delete an admin user" });
    }

    await User.findByIdAndDelete(userId);
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
