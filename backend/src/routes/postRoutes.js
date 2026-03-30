// backend/src/routes/postRoutes.js
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');

const {
  createPost,
  getExploreFeed,
  getFollowingFeed,
  getPost,
  getUserPosts,
  editPost,
  deletePost,
  toggleLike,
} = require('../controllers/postController');

// Multer config for post images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/posts/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const uploadPost = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// Feed routes
router.get('/explore',   auth, getExploreFeed);
router.get('/following', auth, getFollowingFeed);

// User posts
router.get('/user/:userId', auth, getUserPosts);

// Single post
router.get('/:id', auth, getPost);

// Create
router.post('/', auth, uploadPost.array('images', 5), createPost);

// Edit
router.put('/:id', auth, uploadPost.array('images', 5), editPost);

// Delete (owner or admin)
router.delete('/:id', auth, deletePost);

// Like / Unlike
router.post('/:id/like', auth, toggleLike);

module.exports = router;