// backend/src/routes/commentRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');

const {
  addComment,
  getComments,
  editComment,
  deleteComment,
} = require('../controllers/commentController');

// Get comments for a post
router.get('/:postId',             auth, getComments);

// Add comment to a post
router.post('/:postId',            auth, addComment);

// Edit a comment
router.put('/comment/:commentId',  auth, editComment);

// Delete a comment (owner or admin)
router.delete('/comment/:commentId', auth, deleteComment);

module.exports = router;