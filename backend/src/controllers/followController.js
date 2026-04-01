// backend/src/controllers/followController.js
const Follow = require('../models/Follow');
const User   = require('../models/User');

// ── Follow a user ─────────────────────────────────────────────────────────────
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ msg: 'You cannot follow yourself' });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ msg: 'User not found' });

    const existing = await Follow.findOne({ follower: req.user.id, following: userId });
    if (existing) return res.status(400).json({ msg: 'Already following this user' });

    await Follow.create({ follower: req.user.id, following: userId });
    const follower = await User.findById(req.user.id).select('fullName avatar');
    req.app.get('io')?.to(`user:${String(userId)}`).emit('follow:new', {
      followerId: req.user.id,
      followerName: follower?.fullName || 'Traveler',
      followerAvatar: follower?.avatar || '',
    });

    res.json({ msg: 'Followed successfully', following: true });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Unfollow a user ───────────────────────────────────────────────────────────
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Follow.findOneAndDelete({ follower: req.user.id, following: userId });
    if (!result) return res.status(400).json({ msg: 'You are not following this user' });

    res.json({ msg: 'Unfollowed successfully', following: false });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Check if following ────────────────────────────────────────────────────────
exports.checkFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const exists = await Follow.findOne({ follower: req.user.id, following: userId });
    res.json({ following: !!exists });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get followers of a user ───────────────────────────────────────────────────
exports.getFollowers = async (req, res) => {
  try {
    const follows = await Follow.find({ following: req.params.userId })
      .populate('follower', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.json({ followers: follows.map(f => f.follower), count: follows.length });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get who a user is following ───────────────────────────────────────────────
exports.getFollowing = async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.params.userId })
      .populate('following', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.json({ following: follows.map(f => f.following), count: follows.length });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get follow stats for a user (counts only) ─────────────────────────────────
exports.getFollowStats = async (req, res) => {
  try {
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: req.params.userId }),
      Follow.countDocuments({ follower:  req.params.userId }),
    ]);

    // If request is authenticated, also return whether current user follows this profile
    let isFollowing = false;
    if (req.user) {
      const exists = await Follow.findOne({ follower: req.user.id, following: req.params.userId });
      isFollowing = !!exists;
    }

    res.json({ followersCount, followingCount, isFollowing });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};