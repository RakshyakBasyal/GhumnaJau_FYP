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

    // Calculate buddy count (accepted requests where user is requester or recipient)
    const buddyCount = await BuddyRequest.countDocuments({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
      status: 'accepted'
    });

    res.json({
      ...user.toObject(),
      travelStats: {
        ...(user.travelStats || {}),
        buddyCount
      }
    });
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
      travelBudget,
      preferredDestinations,
      travelInterests,
      travelPace,
      city,
      bio,
      gender,
      age,
      travelDateStart,
      travelDateEnd,
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
      ...(travelBudget !== undefined ? { travelBudget: String(travelBudget).trim() } : {}),
      ...(travelPace !== undefined ? { travelPace: String(travelPace).trim() } : {}),
      ...(city !== undefined ? { city: String(city).trim() } : {}),
      ...(bio !== undefined ? { bio: String(bio) } : {}),
      ...(gender !== undefined ? { gender: String(gender).trim() } : {}),
      ...(age !== undefined ? { age: Number(age) || null } : {}),
      ...(travelDateStart !== undefined ? { travelDateStart: travelDateStart ? new Date(travelDateStart) : null } : {}),
      ...(travelDateEnd !== undefined ? { travelDateEnd: travelDateEnd ? new Date(travelDateEnd) : null } : {}),
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
      { new: true }
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
      "fullName avatar travelStyle travelBudget preferredDestinations travelInterests travelPace city bio languages travelStats gender age travelDateStart travelDateEnd"
    );
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Calculate buddy count (accepted requests where user is requester or recipient)
    const buddyCount = await BuddyRequest.countDocuments({
      $or: [{ requester: req.params.id }, { recipient: req.params.id }],
      status: 'accepted'
    });

    res.json({
      ...user.toObject(),
      travelStats: {
        ...(user.travelStats || {}),
        buddyCount
      }
    });
  } catch (err) {
    console.error("Get public profile error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getDiscoverUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select(
      "travelStyle travelPace travelBudget travelInterests preferredDestinations languages"
    );
    if (!me) return res.status(404).json({ msg: "User not found" });

    const { place = "", style = "", budget = "", pace = "", interest = "", startDate = "", endDate = "", limit } = req.query;
    const styleFilter  = String(style  || "").trim().toLowerCase();
    const budgetFilter = String(budget || "").trim().toLowerCase();
    const placeFilter  = String(place  || "").trim().toLowerCase();
    const paceFilter   = String(pace   || "").trim().toLowerCase();
    const interestFilter = String(interest || "").trim().toLowerCase();
    const startFilter = startDate ? new Date(startDate) : null;
    const endFilter = endDate ? new Date(endDate) : null;

    const users = await User.find({
      _id: { $ne: req.user.id },
      role: "USER",
    }).select(
      "fullName avatar travelStyle travelPace travelBudget travelInterests preferredDestinations city languages bio travelStats gender age travelDateStart travelDateEnd"
    );

    // --- My profile data (normalised to lowercase sets) ---
    const myStyle     = String(me.travelStyle  || "").toLowerCase().trim();
    const myPace      = String(me.travelPace   || "").toLowerCase().trim();
    const myBudget    = String(me.travelBudget || "").toLowerCase().trim();
    const myInterests = new Set((me.travelInterests      || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean));
    const myPlaces    = new Set((me.preferredDestinations || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean));
    const myLanguages = new Set((me.languages             || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean));

    // Jaccard similarity: |intersection| / |union|  (returns 0 if both sets empty)
    const jaccard = (mySet, otherArr) => {
      if (mySet.size === 0 && otherArr.length === 0) return 0;
      const otherSet = new Set(otherArr);
      const intersect = [...mySet].filter((v) => otherSet.has(v)).length;
      const union = new Set([...mySet, ...otherSet]).size;
      return union === 0 ? 0 : intersect / union;
    };

    /*
     * Scoring weights (total = 100)
     *  Travel Interests       → 35 pts  (most important — Jaccard)
     *  Preferred Destinations → 20 pts  (Jaccard)
     *  Travel Style           → 15 pts  (exact match)
     *  Travel Pace            → 10 pts  (exact match)
     *  Languages              → 10 pts  (any overlap)
     *  Travel Budget          → 10 pts  (exact match)
     */
    const scored = users
      .map((u) => {
        const userStyle     = String(u.travelStyle  || "").toLowerCase().trim();
        const userPace      = String(u.travelPace   || "").toLowerCase().trim();
        const userBudget    = String(u.travelBudget || "").toLowerCase().trim();
        const userInterests = (u.travelInterests      || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean);
        const userPlaces    = (u.preferredDestinations || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean);
        const userLanguages = (u.languages             || []).map((v) => String(v).toLowerCase().trim()).filter(Boolean);

        // Per-factor scores (each expressed as 0–100% of that dimension)
        const interestsMatch     = Math.round(jaccard(myInterests, userInterests) * 100);
        const destinationsMatch  = Math.round(jaccard(myPlaces, userPlaces) * 100);
        const styleMatch         = (myStyle && userStyle && myStyle === userStyle) ? 100 : 0;
        const paceMatch          = (myPace && userPace && myPace === userPace) ? 100 : 0;
        const languagesMatch     = (myLanguages.size > 0 && userLanguages.some((l) => myLanguages.has(l))) ? 100 : 0;
        const budgetMatch        = (myBudget && userBudget && myBudget === userBudget) ? 100 : 0;

        // Weighted total (max 100)
        const score =
          Math.round(interestsMatch    * 0.35) +
          Math.round(destinationsMatch * 0.20) +
          Math.round(styleMatch        * 0.15) +
          Math.round(paceMatch         * 0.10) +
          Math.round(languagesMatch    * 0.10) +
          Math.round(budgetMatch       * 0.10);

        const compatibilityScore = Math.max(0, Math.min(100, score));

        const scoreBreakdown = {
          interests:    interestsMatch,
          destinations: destinationsMatch,
          style:        styleMatch,
          pace:         paceMatch,
          languages:    languagesMatch,
          budget:       budgetMatch,
        };

        return { ...u.toObject(), compatibilityScore, scoreBreakdown };
      })
      .filter((u) => {
        if (styleFilter) {
          const userStyle = String(u.travelStyle || "").toLowerCase();
          if (styleFilter === "backpacker") {
            if (!(userStyle === "backpacker" || userStyle === "backpacking")) return false;
          } else if (userStyle !== styleFilter) return false;
        }
        if (paceFilter && String(u.travelPace || "").toLowerCase() !== paceFilter) return false;
        if (budgetFilter && String(u.travelBudget || "").toLowerCase() !== budgetFilter) return false;
        if (interestFilter) {
          const interests = (u.travelInterests || []).map((v) => String(v).toLowerCase());
          if (!interests.some((v) => v.includes(interestFilter))) return false;
        }
        if (placeFilter) {
          const places = (u.preferredDestinations || []).map((v) => String(v).toLowerCase());
          if (!places.some((v) => v.includes(placeFilter))) return false;
        }

        // Date overlap filtering
        if (startFilter || endFilter) {
          const buddyStart = u.travelDateStart ? new Date(u.travelDateStart) : null;
          const buddyEnd = u.travelDateEnd ? new Date(u.travelDateEnd) : null;

          if (!buddyStart || !buddyEnd) return false;

          // If searching with a date range: (BuddyStart <= SearchEnd) && (BuddyEnd >= SearchStart)
          // If only start date is provided, buddy must be active on or after that date
          // If only end date is provided, buddy must be active on or before that date
          if (startFilter && endFilter) {
            if (!(buddyStart <= endFilter && buddyEnd >= startFilter)) return false;
          } else if (startFilter) {
            if (buddyEnd < startFilter) return false;
          } else if (endFilter) {
            if (buddyStart > endFilter) return false;
          }
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