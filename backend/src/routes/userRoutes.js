const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
  getAllUsers,
  deleteUser,
  getMe,
  updateMe,
  deleteMe,
} = require("../controllers/userController");

// ✅ Self routes (NORMAL USER) — no admin middleware
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
router.delete("/me", auth, deleteMe);

// ✅ Admin routes
router.get("/", auth, admin, getAllUsers);
router.delete("/:id", auth, admin, deleteUser);

module.exports = router;
