// // backend/src/controllers/buddyController.js
// const mongoose = require("mongoose");
// const BuddyRequest = require("../models/BuddyRequest");
// const BuddyMessage = require("../models/BuddyMessage");
// const User = require("../models/User");

// // ── helpers ───────────────────────────────────────────────────────────────────
// const toKey = (a, b) => [String(a), String(b)].sort().join("_");

// // Two users are "connected" if they have at least one message between them
// // OR have an accepted BuddyRequest (kept for backwards-compat)
// const isConnected = async (a, b) => {
//   const key = toKey(a, b);
//   const hasMessage = await BuddyMessage.exists({ conversationKey: key });
//   if (hasMessage) return true;
//   const accepted = await BuddyRequest.findOne({
//     status: "accepted",
//     $or: [
//       { requester: a, recipient: b },
//       { requester: b, recipient: a },
//     ],
//   }).select("_id");
//   return Boolean(accepted);
// };

// // ── CONNECT (instant 1-on-1 chat, no approval needed) ────────────────────────
// // POST /api/buddies/connect
// // Body: { userId }
// // Creates a conversation immediately. If one already exists, just returns it.
// exports.connect = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const { userId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ msg: "Invalid user id" });
//     }
//     if (String(me) === String(userId)) {
//       return res.status(400).json({ msg: "Cannot connect with yourself" });
//     }

//     const target = await User.findById(userId).select("_id fullName avatar role");
//     if (!target || target.role !== "USER") {
//       return res.status(404).json({ msg: "User not found" });
//     }

//     const conversationKey = toKey(me, userId);

//     // Check if conversation already exists
//     const existing = await BuddyMessage.findOne({ conversationKey }).select("conversationKey");

//     if (!existing) {
//       // Seed the conversation with a silent system message so the chat is visible
//       // even before the first real message is sent
//       await BuddyMessage.create({
//         conversationKey,
//         participants: [me, userId],
//         sender: me,
//         text: "__connected__", // filtered out in the frontend
//         isSystem: true,
//       });
//     }

//     // Notify the other user via socket
//     const io = req.app.get("io");
//     if (io) {
//       io.to(`user:${String(userId)}`).emit("buddy:connected", {
//         userId:         String(me),
//         conversationKey,
//       });
//     }

//     res.json({
//       msg: "Connected",
//       conversationKey,
//       user: {
//         _id:        target._id,
//         fullName:   target.fullName,
//         avatar:     target.avatar,
//       },
//     });
//   } catch (err) {
//     console.error("connect error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // ── GET CONNECTIONS (users I have a conversation with) ────────────────────────
// // Returns everyone I've exchanged messages with (= everyone I'm "connected" to)
// exports.getConnections = async (req, res) => {
//   try {
//     const me = req.user.id;

//     // Find all conversations this user participates in
//     const conversations = await BuddyMessage.aggregate([
//       { $match: { participants: new mongoose.Types.ObjectId(me) } },
//       { $sort: { createdAt: -1 } },
//       {
//         $group: {
//           _id:         "$conversationKey",
//           lastMessage: { $first: "$text" },
//           lastAt:      { $first: "$createdAt" },
//           participants: { $first: "$participants" },
//         },
//       },
//       { $sort: { lastAt: -1 } },
//     ]);

//     // Collect the other user's ID from each conversation
//     const meId = String(me);
//     const otherIds = conversations
//       .map(c => c.participants.find(p => String(p) !== meId))
//       .filter(Boolean);

//     if (otherIds.length === 0) {
//       return res.json({ connections: [] });
//     }

//     const users = await User.find({ _id: { $in: otherIds } })
//       .select("fullName avatar travelStyle city");

//     // Preserve conversation order
//     const userMap = {};
//     users.forEach(u => { userMap[String(u._id)] = u; });

//     const connections = otherIds
//       .map(id => userMap[String(id)])
//       .filter(Boolean);

//     res.json({ connections });
//   } catch (err) {
//     console.error("getConnections error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // ── GET CONVERSATION ──────────────────────────────────────────────────────────
// exports.getConversation = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const other = req.params.userId;

//     if (!mongoose.Types.ObjectId.isValid(other)) {
//       return res.status(400).json({ msg: "Invalid user id" });
//     }

//     const conversationKey = toKey(me, other);

//     const messages = await BuddyMessage.find({
//       conversationKey,
//       isSystem: { $ne: true }, // hide the seed message
//     })
//       .populate("sender", "fullName avatar")
//       .sort({ createdAt: 1 })
//       .limit(200);

//     res.json({ messages, conversationKey });
//   } catch (err) {
//     console.error("getConversation error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // ── SEND MESSAGE ──────────────────────────────────────────────────────────────
// // No connection check — any user can message any other user
// // (connection is established by the act of messaging)
// exports.sendMessage = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const { userId, text } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ msg: "Invalid user id" });
//     }
//     if (!String(text || "").trim()) {
//       return res.status(400).json({ msg: "Message cannot be empty" });
//     }

//     const conversationKey = toKey(me, userId);

//     const message = await BuddyMessage.create({
//       conversationKey,
//       participants: [me, userId],
//       sender:       me,
//       text:         String(text).trim(),
//     });

//     const fullMessage = await BuddyMessage.findById(message._id)
//       .populate("sender", "fullName avatar");

//     const io = req.app.get("io");
//     if (io) {
//       // Send to both users
//       io.to(`user:${String(userId)}`).emit("buddy:message:new", {
//         conversationKey,
//         message: fullMessage,
//       });
//       io.to(`user:${String(me)}`).emit("buddy:message:new", {
//         conversationKey,
//         message: fullMessage,
//       });
//     }

//     res.json({ msg: "Message sent", message: fullMessage });
//   } catch (err) {
//     console.error("sendMessage error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // ── LEGACY: Buddy requests (kept for profile social graph only) ───────────────
// // These are NOT used by Find Buddy anymore — kept for profile follow/connect UX

// exports.sendBuddyRequest = async (req, res) => {
//   try {
//     const requester = req.user.id;
//     const { userId } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ msg: "Invalid user id" });
//     }
//     if (String(requester) === String(userId)) {
//       return res.status(400).json({ msg: "Cannot send request to yourself" });
//     }

//     const recipientUser = await User.findById(userId).select("_id role");
//     if (!recipientUser || recipientUser.role !== "USER") {
//       return res.status(404).json({ msg: "Target user not found" });
//     }

//     const alreadyAccepted = await BuddyRequest.findOne({
//       status: "accepted",
//       $or: [
//         { requester, recipient: userId },
//         { requester: userId, recipient: requester },
//       ],
//     });
//     if (alreadyAccepted) {
//       return res.status(400).json({ msg: "Already connected" });
//     }

//     let request = await BuddyRequest.findOne({ requester, recipient: userId });

//     if (request?.status === "pending") {
//       return res.status(400).json({ msg: "Request already sent" });
//     }
//     if (request && request.status !== "pending") {
//       request.status = "pending";
//       request.respondedAt = null;
//       await request.save();
//       return res.json({ msg: "Buddy request sent", request });
//     }

//     const inversePending = await BuddyRequest.findOne({
//       requester: userId, recipient: requester, status: "pending",
//     });
//     if (inversePending) {
//       return res.status(400).json({ msg: "This user already requested you." });
//     }

//     request = await BuddyRequest.create({ requester, recipient: userId, status: "pending" });

//     req.app.get("io")?.to(`user:${String(userId)}`).emit("buddy:request:new", {
//       requestId:   String(request._id),
//       fromUserId:  String(requester),
//     });

//     return res.json({ msg: "Buddy request sent", request });
//   } catch (err) {
//     console.error("sendBuddyRequest error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// exports.getBuddyRequests = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const [incoming, outgoing] = await Promise.all([
//       BuddyRequest.find({ recipient: me, status: "pending" })
//         .populate("requester", "fullName avatar travelStyle travelInterests preferredDestinations")
//         .sort({ createdAt: -1 }),
//       BuddyRequest.find({ requester: me, status: "pending" })
//         .populate("recipient", "fullName avatar travelStyle travelInterests preferredDestinations")
//         .sort({ createdAt: -1 }),
//     ]);
//     res.json({ incoming, outgoing });
//   } catch (err) {
//     console.error("getBuddyRequests error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// exports.respondBuddyRequest = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const { requestId } = req.params;
//     const { action } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(requestId)) {
//       return res.status(400).json({ msg: "Invalid request id" });
//     }
//     if (!["accept", "reject"].includes(String(action || "").toLowerCase())) {
//       return res.status(400).json({ msg: "Invalid action" });
//     }

//     const request = await BuddyRequest.findById(requestId);
//     if (!request) return res.status(404).json({ msg: "Request not found" });
//     if (String(request.recipient) !== String(me)) {
//       return res.status(403).json({ msg: "Not allowed" });
//     }
//     if (request.status !== "pending") {
//       return res.status(400).json({ msg: "Request already processed" });
//     }

//     request.status      = action === "accept" ? "accepted" : "rejected";
//     request.respondedAt = new Date();
//     await request.save();

//     const io = req.app.get("io");
//     if (io) {
//       io.to(`user:${String(request.requester)}`).emit("buddy:request:updated", {
//         requestId: String(request._id),
//         status:    request.status,
//         byUserId:  String(me),
//       });
//     }

//     res.json({ msg: `Request ${request.status}`, request });
//   } catch (err) {
//     console.error("respondBuddyRequest error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// // Legacy — kept for profile page buddy count
// exports.getBuddyConnections = async (req, res) => {
//   try {
//     const me = req.user.id;
//     const accepted = await BuddyRequest.find({
//       status: "accepted",
//       $or: [{ requester: me }, { recipient: me }],
//     })
//       .populate("requester", "fullName avatar travelStyle")
//       .populate("recipient", "fullName avatar travelStyle")
//       .sort({ updatedAt: -1 });

//     const buddies = accepted.map(r => {
//       const isRequester = String(r.requester?._id) === String(me);
//       return isRequester ? r.recipient : r.requester;
//     });

//     res.json({ buddies });
//   } catch (err) {
//     console.error("getBuddyConnections error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };

// exports.getBuddyStatus = async (req, res) => {
//   try {
//     const me    = req.user.id;
//     const other = req.params.userId;

//     if (!mongoose.Types.ObjectId.isValid(other)) {
//       return res.status(400).json({ msg: "Invalid user id" });
//     }

//     // "connected" now means: has a conversation
//     const conversationKey = toKey(me, other);
//     const hasChat = await BuddyMessage.exists({ conversationKey });
//     if (hasChat) return res.json({ status: "connected" });

//     // Fallback: legacy accepted request
//     const accepted = await BuddyRequest.findOne({
//       status: "accepted",
//       $or: [
//         { requester: me, recipient: other },
//         { requester: other, recipient: me },
//       ],
//     }).select("_id");
//     if (accepted) return res.json({ status: "connected" });

//     res.json({ status: "none" });
//   } catch (err) {
//     console.error("getBuddyStatus error:", err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


// backend/src/controllers/buddyController.js
const mongoose     = require("mongoose");
const BuddyMessage = require("../models/BuddyMessage");
const User         = require("../models/User");

// ── helpers ───────────────────────────────────────────────────────────────────
const toKey = (a, b) => [String(a), String(b)].sort().join("_");

// ── CONNECT (instant 1-on-1 chat, no approval needed) ────────────────────────
exports.connect = async (req, res) => {
  try {
    const me = req.user.id;
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ msg: "Invalid user id" });
    if (String(me) === String(userId))
      return res.status(400).json({ msg: "Cannot connect with yourself" });

    const target = await User.findById(userId).select("_id fullName avatar role");
    if (!target || target.role !== "USER")
      return res.status(404).json({ msg: "User not found" });

    const conversationKey = toKey(me, userId);
    const existing = await BuddyMessage.findOne({ conversationKey }).select("conversationKey");

    if (!existing) {
      await BuddyMessage.create({
        conversationKey,
        participants: [me, userId],
        sender:   me,
        text:     "__connected__",
        isSystem: true,
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${String(userId)}`).emit("buddy:connected", {
        userId: String(me),
        conversationKey,
      });
    }

    res.json({
      msg: "Connected",
      conversationKey,
      user: { _id: target._id, fullName: target.fullName, avatar: target.avatar },
    });
  } catch (err) {
    console.error("connect error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── GET CONNECTIONS (users I have a conversation with) ────────────────────────
exports.getConnections = async (req, res) => {
  try {
    const me = req.user.id;

    const conversations = await BuddyMessage.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(me) } },
      { $sort:  { createdAt: -1 } },
      {
        $group: {
          _id:          "$conversationKey",
          lastMessage:  { $first: "$text" },
          lastAt:       { $first: "$createdAt" },
          participants: { $first: "$participants" },
        },
      },
      { $sort: { lastAt: -1 } },
    ]);

    const meId     = String(me);
    const otherIds = conversations
      .map(c => c.participants.find(p => String(p) !== meId))
      .filter(Boolean);

    if (otherIds.length === 0) return res.json({ connections: [] });

    const users   = await User.find({ _id: { $in: otherIds } }).select("fullName avatar travelStyle city");
    const userMap = {};
    users.forEach(u => { userMap[String(u._id)] = u; });

    res.json({ connections: otherIds.map(id => userMap[String(id)]).filter(Boolean) });
  } catch (err) {
    console.error("getConnections error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── GET CONVERSATION ──────────────────────────────────────────────────────────
exports.getConversation = async (req, res) => {
  try {
    const me    = req.user.id;
    const other = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(other))
      return res.status(400).json({ msg: "Invalid user id" });

    const conversationKey = toKey(me, other);
    const messages = await BuddyMessage.find({
      conversationKey,
      isSystem: { $ne: true },
    })
      .populate("sender", "fullName avatar")
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ messages, conversationKey });
  } catch (err) {
    console.error("getConversation error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const me = req.user.id;
    const { userId, text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ msg: "Invalid user id" });
    if (!String(text || "").trim())
      return res.status(400).json({ msg: "Message cannot be empty" });

    const conversationKey = toKey(me, userId);
    const message = await BuddyMessage.create({
      conversationKey,
      participants: [me, userId],
      sender: me,
      text:   String(text).trim(),
    });

    const fullMessage = await BuddyMessage.findById(message._id).populate("sender", "fullName avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${String(userId)}`).emit("buddy:message:new", { conversationKey, message: fullMessage });
      io.to(`user:${String(me)}`).emit("buddy:message:new",     { conversationKey, message: fullMessage });
    }

    res.json({ msg: "Message sent", message: fullMessage });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── CONNECTION STATUS ─────────────────────────────────────────────────────────
exports.getBuddyStatus = async (req, res) => {
  try {
    const me    = req.user.id;
    const other = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(other))
      return res.status(400).json({ msg: "Invalid user id" });

    const conversationKey = toKey(me, other);
    const hasChat = await BuddyMessage.exists({ conversationKey });
    res.json({ status: hasChat ? "connected" : "none" });
  } catch (err) {
    console.error("getBuddyStatus error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};