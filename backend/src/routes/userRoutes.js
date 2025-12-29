// backend/src/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const { getAllUsers, deleteUser } = require("../controllers/userController");

// GET all users (Admin only)
router.get("/", auth, admin, getAllUsers);

// DELETE user (Admin only)
router.delete("/:id", auth, admin, deleteUser);

module.exports = router;
