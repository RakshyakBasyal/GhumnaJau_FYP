const User = require("../models/User");

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.updateMe = async (req, res) => {
  try {
    const { fullName, phone } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
      { new: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ msg: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

   
    if (user.role === "ADMIN") {
      return res.status(403).json({ msg: "Admin account cannot be deleted here" });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: "Your account has been deleted" });
  } catch (err) {
    console.error("Delete me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself (admin)
    if (req.user?.id === userId) {
      return res.status(400).json({ msg: "You can't delete your own admin account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

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
