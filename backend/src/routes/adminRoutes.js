const router = require("express").Router();
const { getAdminStats } = require("../controllers/adminController");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

router.get("/stats", auth, admin, getAdminStats);

module.exports = router;
