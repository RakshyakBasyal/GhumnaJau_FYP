// backend/src/controllers/userController.js
const mongoose     = require("mongoose");
const User         = require("../models/User");
const Booking      = require("../models/Booking");
const Post         = require("../models/Post");
const Comment      = require("../models/Comment");
const Follow       = require("../models/Follow");
const BuddyMessage = require("../models/BuddyMessage");
const Itinerary    = require("../models/Itinerary");
const ItineraryItem = require("../models/ItineraryItem");
const ItineraryPlan = require("../models/ItineraryPlan");
const Trip         = require("../models/Trip");
const TripRoom     = require("../models/TripRoom");

// Count unique conversations (= "connected" users) for a given userId
const countConnections = async (userId) => {
  const result = await BuddyMessage.aggregate([
    { $match: { participants: new mongoose.Types.ObjectId(userId), isSystem: { $ne: true } } },
    { $group: { _id: "$conversationKey" } },
    { $count: "total" },
  ]);
  return result[0]?.total || 0;
};

// ── Cascade cleanup when a user is deleted ─────────────────────────────────────
const cleanupUserSocialData = async (userId, io = null) => {
  // 1) Hard delete user's posts and their comments
  const authoredPosts    = await Post.find({ author: userId }).select("_id");
  const authoredPostIds  = authoredPosts.map(p => p._id);

  if (authoredPostIds.length) {
    await Comment.deleteMany({ post: { $in: authoredPostIds } });
    await Post.deleteMany({ _id: { $in: authoredPostIds } });
    if (io) authoredPostIds.forEach(postId => io.emit("postDeleted", { postId: postId.toString() }));
  }

  // 2) Delete user's comments on other posts and fix counts
  const ownComments = await Comment.find({ author: userId, post: { $nin: authoredPostIds } }).select("_id post");
  if (ownComments.length) {
    const decrementByPost = ownComments.reduce((acc, c) => {
      const key = c.post.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    await Comment.deleteMany({ _id: { $in: ownComments.map(c => c._id) } });
    await Promise.all(Object.entries(decrementByPost).map(async ([postId, count]) => {
      const post = await Post.findById(postId).select("commentCount isDeleted");
      if (!post || post.isDeleted) return;
      post.commentCount = Math.max(0, (post.commentCount || 0) - count);
      await post.save();
      if (io) io.emit("commentDeleted", { postId, commentCount: post.commentCount });
    }));
  }

  // 3) Remove likes
  await Post.updateMany({}, { $pull: { likes: userId } });

  // 4) Remove follow graph
  await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });

  // 5) Remove buddy messages
  await BuddyMessage.deleteMany({ participants: userId });

  // 6) Remove itineraries
  await ItineraryItem.deleteMany({ user: userId });
  await ItineraryPlan.deleteMany({ user: userId });
  await Itinerary.deleteMany({ user: userId });

  // 7) Delete trips
  await Trip.deleteMany({ user: userId });

  // 8) Trip rooms
  await TripRoom.deleteMany({ createdBy: userId });
  await TripRoom.updateMany({}, { $pull: { members: userId, pendingRequests: userId, invitedBuddies: userId } });
  await TripRoom.updateMany({ "messages.sender": userId }, { $pull: { messages: { sender: userId } } });
};

// ── GET ME ─────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const buddyCount = await countConnections(req.user.id);

    res.json({
      ...user.toObject(),
      travelStats: { ...(user.travelStats || {}), buddyCount },
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── UPDATE ME ──────────────────────────────────────────────────────────────────
exports.updateMe = async (req, res) => {
  try {
    const {
      fullName, phone, travelStyle, travelBudget, preferredDestinations,
      travelInterests, travelPace, city, bio, gender, age, intentStatus,
      travelDateStart, travelDateEnd, languages, travelStats,
    } = req.body;

    const normalizeStringList = (value) => {
      if (value === undefined) return undefined;
      if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
      if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
        } catch (_) {}
        return raw.split(",").map(v => v.trim()).filter(Boolean);
      }
      return [];
    };

    const updates = {
      ...(fullName     !== undefined ? { fullName }                                    : {}),
      ...(phone        !== undefined ? { phone }                                       : {}),
      ...(travelStyle  !== undefined ? { travelStyle:  String(travelStyle).trim() }   : {}),
      ...(travelBudget !== undefined ? { travelBudget: String(travelBudget).trim() }  : {}),
      ...(travelPace   !== undefined ? { travelPace:   String(travelPace).trim() }    : {}),
      ...(city         !== undefined ? { city:         String(city).trim() }          : {}),
      ...(bio          !== undefined ? { bio:          String(bio) }                   : {}),
      ...(gender       !== undefined ? { gender:       String(gender).trim() }        : {}),
      ...(age          !== undefined ? { age:          Number(age) || null }           : {}),
      ...(intentStatus !== undefined ? { intentStatus: String(intentStatus).trim() }  : {}),
      ...(travelDateStart !== undefined ? { travelDateStart: travelDateStart ? new Date(travelDateStart) : null } : {}),
      ...(travelDateEnd   !== undefined ? { travelDateEnd:   travelDateEnd   ? new Date(travelDateEnd)   : null } : {}),
    };

    const norm = normalizeStringList;
    const nDests = norm(preferredDestinations); if (nDests !== undefined) updates.preferredDestinations = nDests;
    const nInts  = norm(travelInterests);       if (nInts  !== undefined) updates.travelInterests       = nInts;
    const nLangs = norm(languages);             if (nLangs !== undefined) updates.languages             = nLangs;

    if (travelStats !== undefined) {
      let ps = null;
      if (typeof travelStats === "string") { try { ps = JSON.parse(travelStats); } catch (_) {} }
      else if (typeof travelStats === "object" && travelStats !== null) ps = travelStats;
      if (ps) updates.travelStats = {
        tripsCount:       Number(ps.tripsCount       || 0),
        countriesVisited: Number(ps.countriesVisited || 0),
        totalPosts:       Number(ps.totalPosts       || 0),
      };
    }

    const avatarFile = req.files?.avatar?.[0];
    const coverFile  = req.files?.coverImage?.[0];
    if (avatarFile) updates.avatar     = avatarFile.path;
if (coverFile)  updates.coverImage = coverFile.path;

    const updated = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");
    if (!updated) return res.status(404).json({ msg: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update me error:", err);
    res.status(400).json({ msg: err.message || "Failed to update profile" });
  }
};

// ── GET USER PUBLIC PROFILE ─────────────────────────────────────────────────────
exports.getUserPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "fullName avatar coverImage travelStyle travelBudget preferredDestinations " +
      "travelInterests travelPace city bio languages travelStats gender age " +
      "travelDateStart travelDateEnd intentStatus"
    );
    if (!user) return res.status(404).json({ msg: "User not found" });

    const buddyCount = await countConnections(req.params.id);

    res.json({
      ...user.toObject(),
      travelStats: { ...(user.travelStats || {}), buddyCount },
    });
  } catch (err) {
    console.error("Get public profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── DISCOVER USERS ─────────────────────────────────────────────────────────────
exports.getDiscoverUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select(
      "travelStyle travelPace travelBudget travelInterests preferredDestinations languages"
    );
    if (!me) return res.status(404).json({ msg: "User not found" });

    const { place = "", style = "", budget = "", pace = "", interest = "", startDate = "", endDate = "", limit } = req.query;

    const styleFilter    = String(style    || "").trim().toLowerCase();
    const budgetFilter   = String(budget   || "").trim().toLowerCase();
    const placeFilter    = String(place    || "").trim().toLowerCase();
    const paceFilter     = String(pace     || "").trim().toLowerCase();
    const interestFilter = String(interest || "").trim().toLowerCase();
    const startFilter    = startDate ? new Date(startDate) : null;
    const endFilter      = endDate   ? new Date(endDate)   : null;

    const users = await User.find({ _id: { $ne: req.user.id }, role: "USER" }).select(
      "fullName avatar travelStyle travelPace travelBudget travelInterests " +
      "preferredDestinations city languages bio travelStats gender age travelDateStart travelDateEnd intentStatus"
    );

    const myStyle     = String(me.travelStyle  || "").toLowerCase().trim();
    const myPace      = String(me.travelPace   || "").toLowerCase().trim();
    const myBudget    = String(me.travelBudget || "").toLowerCase().trim();
    const myInterests = new Set((me.travelInterests      || []).map(v => String(v).toLowerCase().trim()).filter(Boolean));
    const myPlaces    = new Set((me.preferredDestinations || []).map(v => String(v).toLowerCase().trim()).filter(Boolean));
    const myLanguages = new Set((me.languages             || []).map(v => String(v).toLowerCase().trim()).filter(Boolean));

    const jaccard = (mySet, otherArr) => {
      if (mySet.size === 0 && otherArr.length === 0) return 0;
      const otherSet  = new Set(otherArr);
      const intersect = [...mySet].filter(v => otherSet.has(v)).length;
      const union     = new Set([...mySet, ...otherSet]).size;
      return union === 0 ? 0 : intersect / union;
    };

    const scored = users.map(u => {
      const userStyle     = String(u.travelStyle  || "").toLowerCase().trim();
      const userPace      = String(u.travelPace   || "").toLowerCase().trim();
      const userBudget    = String(u.travelBudget || "").toLowerCase().trim();
      const userInterests = (u.travelInterests      || []).map(v => String(v).toLowerCase().trim()).filter(Boolean);
      const userPlaces    = (u.preferredDestinations || []).map(v => String(v).toLowerCase().trim()).filter(Boolean);
      const userLanguages = (u.languages             || []).map(v => String(v).toLowerCase().trim()).filter(Boolean);

      const interestsMatch    = Math.round(jaccard(myInterests, userInterests) * 100);
      const destinationsMatch = Math.round(jaccard(myPlaces, userPlaces)       * 100);
      const styleMatch        = (myStyle && userStyle && myStyle === userStyle) ? 100 : 0;
      const paceMatch         = (myPace  && userPace  && myPace  === userPace)  ? 100 : 0;
      const languagesMatch    = (myLanguages.size > 0 && userLanguages.some(l => myLanguages.has(l))) ? 100 : 0;
      const budgetMatch       = (myBudget && userBudget && myBudget === userBudget) ? 100 : 0;

      const score = Math.round(interestsMatch * 0.35) + Math.round(destinationsMatch * 0.20) +
                    Math.round(styleMatch * 0.15) + Math.round(paceMatch * 0.10) +
                    Math.round(languagesMatch * 0.10) + Math.round(budgetMatch * 0.10);
      const compatibilityScore = Math.max(0, Math.min(100, score));

      const matchReasons = [];
      if (interestsMatch    >= 40)  matchReasons.push("Similar interests");
      if (destinationsMatch >= 40)  matchReasons.push("Same destinations");
      if (styleMatch        === 100) matchReasons.push("Same travel style");
      if (paceMatch         === 100) matchReasons.push("Same travel pace");
      if (languagesMatch    === 100) matchReasons.push("Shared language");
      if (budgetMatch       === 100) matchReasons.push("Similar budget");

      return { ...u.toObject(), compatibilityScore, matchReasons,
        scoreBreakdown: { interests: interestsMatch, destinations: destinationsMatch, style: styleMatch, pace: paceMatch, languages: languagesMatch, budget: budgetMatch } };
    }).filter(u => {
      if (styleFilter) {
        const userStyle = String(u.travelStyle || "").toLowerCase();
        if (styleFilter === "backpacker") { if (!(userStyle === "backpacker" || userStyle === "backpacking")) return false; }
        else if (userStyle !== styleFilter) return false;
      }
      if (paceFilter   && String(u.travelPace   || "").toLowerCase() !== paceFilter)   return false;
      if (budgetFilter && String(u.travelBudget || "").toLowerCase() !== budgetFilter) return false;
      if (interestFilter) { const ints = (u.travelInterests || []).map(v => String(v).toLowerCase()); if (!ints.some(v => v.includes(interestFilter))) return false; }
      if (placeFilter)    { const pls  = (u.preferredDestinations || []).map(v => String(v).toLowerCase()); if (!pls.some(v => v.includes(placeFilter))) return false; }
      if (startFilter || endFilter) {
        const bs = u.travelDateStart ? new Date(u.travelDateStart) : null;
        const be = u.travelDateEnd   ? new Date(u.travelDateEnd)   : null;
        if (!bs || !be) return false;
        if (startFilter && endFilter) { if (!(bs <= endFilter && be >= startFilter)) return false; }
        else if (startFilter) { if (be < startFilter) return false; }
        else if (endFilter)   { if (bs > endFilter)   return false; }
      }
      return true;
    }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const n = Math.max(1, Math.min(100, Number(limit) || scored.length));
    res.json({ users: scored.slice(0, n) });
  } catch (err) {
    console.error("Discover users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── DELETE ME ──────────────────────────────────────────────────────────────────
exports.deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.role === "ADMIN") return res.status(403).json({ msg: "Admin account cannot be deleted here" });

    user.lastLogout = new Date();
    await user.save();
    await Booking.deleteMany({ user: req.user.id });
    await cleanupUserSocialData(req.user.id, req.app.get("io"));
    await User.findByIdAndDelete(req.user.id);

    req.app.get("io")?.emit("userDeleted", { userId: req.user.id });
    res.json({ msg: "Your account has been deleted" });
  } catch (err) {
    console.error("Delete me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ── GET ALL USERS (admin) ──────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// DELETE USER (admin)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user?.id === userId) return res.status(400).json({ msg: "You can't delete your own admin account" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.role === "ADMIN") return res.status(403).json({ msg: "Cannot delete an admin user" });

    user.lastLogout = new Date();
    await user.save();
    await Booking.deleteMany({ user: userId });
    await Post.deleteMany({ author: userId });
    await cleanupUserSocialData(userId, req.app.get("io"));
    await User.findByIdAndDelete(userId);

    req.app.get("io")?.emit("userDeleted", { userId });
    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};