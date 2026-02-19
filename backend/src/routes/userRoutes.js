// backend/src/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const { uploadAvatar } = require("../middleware/upload"); // Centralized uploader

const {
  getAllUsers,
  deleteUser,
  getMe,
  deleteMe,
  updateMe,
} = require("../controllers/userController");

// PATCH /api/users/profile - update name/phone + avatar
router.patch(
  "/profile",
  auth,
  uploadAvatar.single("avatar"), // Handles file upload → req.file available
  updateMe                       // Calls controller with full req.body + req.file support
);

// Self routes
router.get("/me", auth, getMe);
router.delete("/me", auth, deleteMe);

// Admin routes
router.get("/", auth, admin, getAllUsers);
router.delete("/:id", auth, admin, deleteUser);

module.exports = router;