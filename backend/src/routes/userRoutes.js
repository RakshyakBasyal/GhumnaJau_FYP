// backend/src/routes/userRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
  getAllUsers,
  deleteUser,
  getMe,
  deleteMe,
} = require("../controllers/userController");

// ────────────────────────────────────────────────
// Multer setup for avatar upload
// ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Reuse your existing uploads folder + avatars subfolder
    cb(null, path.join(__dirname, '../../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user.id}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only .jpg, .jpeg, .png files are allowed!"));
  },
});

// ────────────────────────────────────────────────
// PATCH /api/users/profile (update name/phone + optional avatar)
// ────────────────────────────────────────────────
router.patch(
  "/profile",
  auth,
  upload.single("avatar"), // frontend must send file with field name 'avatar'
  async (req, res) => {
    try {
      const updates = {};

      if (req.body.fullName) updates.fullName = req.body.fullName;
      if (req.body.phone) updates.phone = req.body.phone;
      if (req.file) {
        updates.avatar = `/uploads/avatars/${req.file.filename}`;
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) return res.status(404).json({ msg: "User not found" });

      res.json(user);
    } catch (err) {
      console.error("Profile update error:", err);
      res.status(400).json({ msg: err.message || "Failed to update profile" });
    }
  }
);

// Existing self routes
router.get("/me", auth, getMe);
router.delete("/me", auth, deleteMe);

// Admin routes
router.get("/", auth, admin, getAllUsers);
router.delete("/:id", auth, admin, deleteUser);

module.exports = router;