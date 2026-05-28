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