// // backend/src/routes/buddyRoutes.js
// const express = require("express");
// const router  = express.Router();
// const auth    = require("../middleware/auth");
// const {
//   connect,
//   getConnections,
//   getConversation,
//   sendMessage,
//   sendBuddyRequest,
//   getBuddyRequests,
//   respondBuddyRequest,
//   getBuddyConnections,
//   getBuddyStatus,
// } = require("../controllers/buddyController");

// // ── New: instant connect (no approval) ───────────────────────────────────────
// router.post("/connect",           auth, connect);
// router.get("/connections",        auth, getConnections);   // chat-based connections

// // ── Messaging ─────────────────────────────────────────────────────────────────
// router.get("/messages/:userId",   auth, getConversation);
// router.post("/messages",          auth, sendMessage);

// // ── Status ────────────────────────────────────────────────────────────────────
// router.get("/status/:userId",     auth, getBuddyStatus);

// // ── Legacy: buddy requests (profile social graph only) ───────────────────────
// router.post("/requests",          auth, sendBuddyRequest);
// router.get("/requests",           auth, getBuddyRequests);
// router.patch("/requests/:requestId", auth, respondBuddyRequest);
// router.get("/legacy-connections", auth, getBuddyConnections); // for profile buddy count

// module.exports = router;

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