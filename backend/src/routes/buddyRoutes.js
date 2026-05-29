// backend/src/routes/buddyRoutes.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const {
  connect,
  getConnections,
  getConversation,
  sendMessage,
  getBuddyStatus,
} = require("../controllers/buddyController");

// Instant connect (seeds a conversation, no approval)
router.post("/connect",         auth, connect);
router.get("/connections",      auth, getConnections);

// Messaging
router.get("/messages/:userId", auth, getConversation);
router.post("/messages",        auth, sendMessage);

// Connection status (connected = has a conversation)
router.get("/status/:userId",   auth, getBuddyStatus);

module.exports = router;