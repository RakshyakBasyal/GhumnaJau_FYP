// backend/src/controllers/userController.js
const User = require("../models/User");
const Booking = require("../models/Booking");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const BuddyRequest = require("../models/BuddyRequest");
const BuddyMessage = require("../models/BuddyMessage");
const Itinerary = require("../models/Itinerary");
const ItineraryItem = require("../models/ItineraryItem");
const ItineraryPlan = require("../models/ItineraryPlan");

const cleanupUserSocialData = async (userId, io = null) => {
  // 1) Hard delete user's posts
  const authoredPosts = await Post.find({ author: userId }).select("_id");
  const authoredPostIds = authoredPosts.map((p) => p._id);

  if (authoredPostIds.length) {
    // Delete all comments on these posts
    await Comment.deleteMany({ post: { $in: authoredPostIds } });
    // Delete the posts themselves
    await Post.deleteMany({ _id: { $in: authoredPostIds } });

    if (io) {
      authoredPostIds.forEach((postId) => {
        io.emit("postDeleted", { postId: postId.toString() });
      });
    }
  }

  // 2) Delete user's comments on other posts and fix comment counts
  const ownComments = await Comment.find({
    author: userId,
    post: { $nin: authoredPostIds },
  }).select("_id post");

  if (ownComments.length) {
    const decrementByPost = ownComments.reduce((acc, c) => {
      const key = c.post.toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    // Delete own comments
    await Comment.deleteMany({ _id: { $in: ownComments.map((c) => c._id) } });

    await Promise.all(
      Object.entries(decrementByPost).map(async ([postId, count]) => {
        const post = await Post.findById(postId).select("commentCount isDeleted");
        if (!post || post.isDeleted) return;
        post.commentCount = Math.max(0, (post.commentCount || 0) - count);
        await post.save();
        if (io) {
          io.emit("commentDeleted", {
            postId,
            commentCount: post.commentCount,
          });
        }
      })
    );
  }

  // 3) Remove likes by user from all posts
  await Post.updateMany({}, { $pull: { likes: userId } });

  // 4) Remove follow graph references
  await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });

  // 5) Remove buddy graph and chat messages
  await BuddyRequest.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] });
  await BuddyMessage.deleteMany({ participants: userId });

  // 6) Remove itineraries and their items/plans
  await ItineraryItem.deleteMany({ user: userId });
  await ItineraryPlan.deleteMany({ user: userId });
  await Itinerary.deleteMany({ user: userId });
};

exports.getMe = async (req, res) => {
  try {
    // Returns full user including new 'avatar' field (once model is updated)
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      travelStyle,
      preferredDestinations,
      travelInterests,
      travelPace,
      bio,
      languages,
      travelStats,
    } = req.body;

    const normalizeStringList = (value) => {
      if (value === undefined) return undefined;
      if (Array.isArray(value)) {
        return value.map((v) => String(v).trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((v) => String(v).trim()).filter(Boolean);
          }
        } catch (_) {
          // treat as comma separated fallback
        }
        return raw.split(",").map((v) => v.trim()).filter(Boolean);
      }
      return [];
    };

    const updates = {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(travelStyle !== undefined ? { travelStyle: String(travelStyle).trim() } : {}),
      ...(travelPace !== undefined ? { travelPace: String(travelPace).trim() } : {}),
      ...(bio !== undefined ? { bio: String(bio) } : {}),
    };

    const normalizedPreferredDestinations = normalizeStringList(preferredDestinations);
    if (normalizedPreferredDestinations !== undefined) {
      updates.preferredDestinations = normalizedPreferredDestinations;
    }

    const normalizedTravelInterests = normalizeStringList(travelInterests);
    if (normalizedTravelInterests !== undefined) {
      updates.travelInterests = normalizedTravelInterests;
    }

    const normalizedLanguages = normalizeStringList(languages);
    if (normalizedLanguages !== undefined) {
      updates.languages = normalizedLanguages;
    }

    if (travelStats !== undefined) {
      let parsedStats = null;
      if (typeof travelStats === "string") {
        try {
          parsedStats = JSON.parse(travelStats);
        } catch (_) {
          parsedStats = null;
        }
      } else if (typeof travelStats === "object" && travelStats !== null) {
        parsedStats = travelStats;
      }
      if (parsedStats) {
        updates.travelStats = {
          tripsCount: Number(parsedStats.tripsCount || 0),
          countriesVisited: Number(parsedStats.countriesVisited || 0),
          totalPosts: Number(parsedStats.totalPosts || 0),
        };
      }
    }

    // Handle media uploads
    const avatarFile = req.files?.avatar?.[0];
    const coverFile = req.files?.coverImage?.[0];
    if (avatarFile) {
      updates.avatar = `/uploads/avatars/${avatarFile.filename}`;
    }
    if (coverFile) {
      updates.coverImage = `/uploads/avatars/${coverFile.filename}`;
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ msg: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error("Update me error:", err);
    res.status(400).json({ msg: err.message || "Failed to update profile" });
  }
};

exports.getUserPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "fullName avatar travelStyle preferredDestinations travelInterests travelPace bio languages travelStats"
    );
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get public profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getDiscoverUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select(
      "travelStyle travelPace travelInterests preferredDestinations"
    );
    if (!me) return res.status(404).json({ msg: "User not found" });

    const { place = "", style = "", budget = "", pace = "", interest = "", limit } = req.query;
    const styleFilter = String(style || budget || "").trim().toLowerCase();
    const placeFilter = String(place || "").trim().toLowerCase();
    const paceFilter = String(pace || "").trim().toLowerCase();
    const interestFilter = String(interest || "").trim().toLowerCase();

    const users = await User.find({
      _id: { $ne: req.user.id },
      role: "USER",
    }).select(
      "fullName avatar travelStyle travelPace travelInterests preferredDestinations languages bio travelStats"
    );

    const myStyle = String(me.travelStyle || "").toLowerCase();
    const myPace = String(me.travelPace || "").toLowerCase();
    const myInterests = new Set((me.travelInterests || []).map((v) => String(v).toLowerCase()));
    const myPlaces = new Set((me.preferredDestinations || []).map((v) => String(v).toLowerCase()));

    const scored = users
      .map((u) => {
        const userStyle = String(u.travelStyle || "").toLowerCase();
        const userPace = String(u.travelPace || "").toLowerCase();
        const userInterests = (u.travelInterests || []).map((v) => String(v).toLowerCase());
        const userPlaces = (u.preferredDestinations || []).map((v) => String(v).toLowerCase());

        const overlapInterests = userInterests.filter((v) => myInterests.has(v)).length;
        const overlapPlaces = userPlaces.filter((v) => myPlaces.has(v)).length;

        let compatibility = 35;
        if (userInterests.length > 0) {
          compatibility += Math.min(35, Math.round((overlapInterests / userInterests.length) * 35));
        }
        if (userPlaces.length > 0) {
          compatibility += Math.min(20, Math.round((overlapPlaces / userPlaces.length) * 20));
        }
        if (myStyle && userStyle && myStyle === userStyle) compatibility += 5;
        if (myPace && userPace && myPace === userPace) compatibility += 5;

        compatibility = Math.max(0, Math.min(100, compatibility));

        return {
          ...u.toObject(),
          compatibilityScore: compatibility,
        };
      })
      .filter((u) => {
        if (styleFilter) {
          const userStyle = String(u.travelStyle || "").toLowerCase();
          if (styleFilter === "backpacker") {
            if (!(userStyle === "backpacker" || userStyle === "backpacking")) return false;
          } else if (userStyle !== styleFilter) return false;
        }
        if (paceFilter && String(u.travelPace || "").toLowerCase() !== paceFilter) return false;
        if (interestFilter) {
          const interests = (u.travelInterests || []).map((v) => String(v).toLowerCase());
          if (!interests.some((v) => v.includes(interestFilter))) return false;
        }
        if (placeFilter) {
          const places = (u.preferredDestinations || []).map((v) => String(v).toLowerCase());
          if (!places.some((v) => v.includes(placeFilter))) return false;
        }
        return true;
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const n = Math.max(1, Math.min(100, Number(limit) || scored.length));

    res.json({ users: scored.slice(0, n) });
  } catch (err) {
    console.error("Discover users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "ADMIN") {
      return res.status(403).json({ msg: "Admin account cannot be deleted here" });
    }

    // Invalidate all sessions (force logout everywhere)
    user.lastLogout = new Date();
    await user.save();

    // Hard delete all bookings for this user
    await Booking.deleteMany({ user: req.user.id });

    // Clean up social graph/content for this user
    await cleanupUserSocialData(req.user.id, req.app.get("io"));

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: "Your account has been deleted" });
  } catch (err) {
    console.error("Delete me error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting yourself (admin)
    if (req.user?.id === userId) {
      return res.status(400).json({ msg: "You can't delete your own admin account" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role === "ADMIN") {
      return res.status(403).json({ msg: "Cannot delete an admin user" });
    }

    // Invalidate all sessions
    user.lastLogout = new Date();
    await user.save();

    // Hard delete all bookings for this user
    await Booking.deleteMany({ user: userId });

    // Clean up social graph/content for this user
    await cleanupUserSocialData(userId, req.app.get("io"));

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ msg: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};