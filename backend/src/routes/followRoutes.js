// backend/src/routes/followRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');

const {
  followUser,
  unfollowUser,
  checkFollowing,
  getFollowers,
  getFollowing,
  getFollowStats,
} = require('../controllers/followController');

// Follow / unfollow
router.post('/:userId/follow',   auth, followUser);
router.delete('/:userId/follow', auth, unfollowUser);

// Check if following
router.get('/:userId/is-following', auth, checkFollowing);

// Get followers / following lists
router.get('/:userId/followers', auth, getFollowers);
router.get('/:userId/following', auth, getFollowing);

// Get counts + isFollowing in one call
router.get('/:userId/stats', auth, getFollowStats);

module.exports = router;