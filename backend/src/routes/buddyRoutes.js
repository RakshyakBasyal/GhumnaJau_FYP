const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  sendBuddyRequest,
  getBuddyRequests,
  respondBuddyRequest,
  getBuddyConnections,
  getBuddyStatus,
  getConversation,
  sendMessage,
} = require("../controllers/buddyController");

router.post("/requests", auth, sendBuddyRequest);
router.get("/requests", auth, getBuddyRequests);
router.patch("/requests/:requestId", auth, respondBuddyRequest);

router.get("/connections", auth, getBuddyConnections);
router.get("/status/:userId", auth, getBuddyStatus);

router.get("/messages/:userId", auth, getConversation);
router.post("/messages", auth, sendMessage);

module.exports = router;
