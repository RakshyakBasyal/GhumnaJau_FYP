// backend/src/routes/postRoutes.js
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const auth     = require('../middleware/auth');
const Post     = require('../models/Post');
const Comment  = require('../models/Comment');
const User     = require('../models/User');
const Follow   = require('../models/Follow');
const Destination = require('../models/Destination');
const Hotel    = require('../models/Hotel');

// ── Multer ────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/posts/'),
  filename:    (req, file, cb) => cb(null, `post_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// ── Populate helper ────────────────────────────────────────────────────────────
const populatePost = (q) =>
  q.populate('author', 'fullName avatar city travelStyle')
   .populate('taggedUsers', 'fullName avatar')
   .populate('destinationId', 'name images country')
   .populate('answers.author', 'fullName avatar');

// ── Feed routes ───────────────────────────────────────────────────────────────
// IMPORTANT: specific named routes BEFORE /:id

// GET /api/posts/explore
router.get('/explore', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const query = { isDeleted: false };
    if (category) query.category = category;

    const [posts, total] = await Promise.all([
      populatePost(Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
      Post.countDocuments(query),
    ]);

    res.json({
      posts,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      empty: posts.length === 0,
    });
  } catch (err) {
    console.error('Explore feed error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/posts/following
router.get('/following', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const following = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = following.map(f => f.following);
    const authorIds = [req.user.id, ...followingIds];

    const query = { isDeleted: false, author: { $in: authorIds } };
    if (category) query.category = category;

    const [posts, total] = await Promise.all([
      populatePost(Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
      Post.countDocuments(query),
    ]);

    res.json({
      posts,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      empty: posts.length === 0 && followingIds.length === 0,
    });
  } catch (err) {
    console.error('Following feed error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/posts/saved — saved/bookmarked posts
router.get('/saved', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = { isDeleted: false, saves: req.user.id };

    const [posts, total] = await Promise.all([
      populatePost(Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
      Post.countDocuments(query),
    ]);

    res.json({ posts, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/posts/reviews?reviewType=destination&reviewRefId=xxx
router.get('/reviews', auth, async (req, res) => {
  try {
    const { reviewType, reviewRefId } = req.query;
    if (!reviewType || !reviewRefId) {
      return res.status(400).json({ msg: 'reviewType and reviewRefId are required' });
    }

    const posts = await populatePost(
      Post.find({ isDeleted: false, category: 'review', reviewType, reviewRefId })
          .sort({ createdAt: -1 })
    );

    // Compute average rating
    const rated = posts.filter(p => p.rating != null);
    const avgRating = rated.length > 0
      ? (rated.reduce((s, p) => s + p.rating, 0) / rated.length).toFixed(1)
      : null;

    res.json({ posts, avgRating, count: posts.length });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/posts/destination/:destinationId — all posts tagged to a destination
router.get('/destination/:destinationId', auth, async (req, res) => {
  try {
    const posts = await populatePost(
      Post.find({ isDeleted: false, destinationId: req.params.destinationId })
          .sort({ createdAt: -1 })
          .limit(20)
    );
    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/posts/user/:userId — posts by a specific user (for profile page)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, category } = req.query;
    const skip  = (Number(page) - 1) * Number(limit);
    const query = { isDeleted: false, author: req.params.userId };
    if (category) query.category = category;

    const [posts, total] = await Promise.all([
      populatePost(Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
      Post.countDocuments(query),
    ]);

    res.json({ posts, totalPages: Math.ceil(total / Number(limit)), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Single post ────────────────────────────────────────────────────────────────
// GET /api/posts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await populatePost(Post.findById(req.params.id));
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Post not found' });
    res.json(post);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Create post ────────────────────────────────────────────────────────────────
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const {
      content, category,
      destinationId, destinationName,
      budget, taggedUsers,
      reviewType, reviewRefId, rating,
    } = req.body;

    const images = (req.files || []).map(f => `/uploads/posts/${f.filename}`);

    const postData = {
      author:  req.user.id,
      content: content || '',
      images,
      category: category || 'photo',
      destinationId:   destinationId   || null,
      destinationName: destinationName || null,
      budget: budget || '',
      taggedUsers: taggedUsers ? JSON.parse(taggedUsers) : [],
      reviewType:  reviewType  || '',
      reviewRefId: reviewRefId || null,
      rating:      rating      ? Number(rating) : null,
    };

    const post = await Post.create(postData);
    const populated = await populatePost(Post.findById(post._id));

    // Update destination/hotel average rating if this is a review
    if (category === 'review' && reviewRefId && rating) {
      await updateAverageRating(reviewType, reviewRefId);
    }

    // Emit socket event
    req.app.get('io')?.emit('postCreated', populated);

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

// ── Update post ────────────────────────────────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });
    if (String(post.author) !== String(req.user.id)) return res.status(403).json({ msg: 'Not authorized' });

    const updatable = ['content', 'budget', 'destinationName', 'destinationId', 'taggedUsers'];
    updatable.forEach(k => { if (req.body[k] !== undefined) post[k] = req.body[k]; });

    await post.save();
    const populated = await populatePost(Post.findById(post._id));
    req.app.get('io')?.emit('postUpdated', populated);
    res.json(populated);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Delete post ────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: 'Not found' });

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && String(post.author) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    post.isDeleted = true;
    await post.save();

    await Comment.deleteMany({ post: post._id });
    req.app.get('io')?.emit('postDeleted', { postId: String(post._id) });
    res.json({ msg: 'Post deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Like / Unlike ──────────────────────────────────────────────────────────────
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });

    if (!post.likes.includes(req.user.id)) {
      post.likes.push(req.user.id);
      post.likeCount = post.likes.length;
      await post.save();

      // Notify post author
      if (String(post.author) !== String(req.user.id)) {
        req.app.get('io')?.to(`user:${String(post.author)}`).emit('post:liked:owner', {
          postId:    String(post._id),
          actorId:   String(req.user.id),
          actorName: req.user.fullName || 'Someone',
        });
      }
      req.app.get('io')?.emit('postLiked', { postId: String(post._id), likes: post.likes, likeCount: post.likeCount });
    }

    res.json({ likes: post.likes, likeCount: post.likeCount });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/:id/unlike', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });

    post.likes    = post.likes.filter(id => String(id) !== String(req.user.id));
    post.likeCount = post.likes.length;
    await post.save();

    req.app.get('io')?.emit('postLiked', { postId: String(post._id), likes: post.likes, likeCount: post.likeCount });
    res.json({ likes: post.likes, likeCount: post.likeCount });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Save / Unsave (bookmark) ───────────────────────────────────────────────────
router.post('/:id/save', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });

    if (!post.saves.includes(req.user.id)) {
      post.saves.push(req.user.id);
      post.saveCount = post.saves.length;
      await post.save();
    }

    res.json({ saves: post.saves, saveCount: post.saveCount, saved: true });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/:id/unsave', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });

    post.saves     = post.saves.filter(id => String(id) !== String(req.user.id));
    post.saveCount = post.saves.length;
    await post.save();

    res.json({ saves: post.saves, saveCount: post.saveCount, saved: false });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Comments ───────────────────────────────────────────────────────────────────
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'fullName avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(comments);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Not found' });

    const { text } = req.body;
    if (!String(text || '').trim()) return res.status(400).json({ msg: 'Comment cannot be empty' });

    const comment = await Comment.create({ post: post._id, author: req.user.id, text: String(text).trim() });
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    const populated = await comment.populate('author', 'fullName avatar');

    // Notify post author
    if (String(post.author) !== String(req.user.id)) {
      req.app.get('io')?.to(`user:${String(post.author)}`).emit('post:commented:owner', {
        postId:    String(post._id),
        actorId:   String(req.user.id),
        actorName: req.user.fullName || 'Someone',
      });
    }
    req.app.get('io')?.emit('commentAdded', { postId: String(post._id), commentCount: post.commentCount });

    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isAuthorComment = String(comment.author) === String(req.user.id);
    const isPostAuthor    = String(post.author)    === String(req.user.id);

    if (!isAdmin && !isAuthorComment && !isPostAuthor) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    post.commentCount = Math.max(0, (post.commentCount || 0) - 1);
    await post.save();

    req.app.get('io')?.emit('commentDeleted', { postId: String(post._id), commentCount: post.commentCount });
    res.json({ msg: 'Comment deleted', commentCount: post.commentCount });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Answers (question posts) ───────────────────────────────────────────────────
router.post('/:id/answers', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Post not found' });
    if (post.category !== 'question') return res.status(400).json({ msg: 'Only question posts have answers' });

    const { text } = req.body;
    if (!String(text || '').trim()) return res.status(400).json({ msg: 'Answer cannot be empty' });

    post.answers.push({ author: req.user.id, text: String(text).trim() });
    await post.save();

    const populated = await populatePost(Post.findById(post._id));
    req.app.get('io')?.emit('postUpdated', populated);
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.post('/:id/answers/:answerId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Post not found' });

    const answer = post.answers.id(req.params.answerId);
    if (!answer) return res.status(404).json({ msg: 'Answer not found' });

    const userId = String(req.user.id);
    const likedIdx = answer.likes.findIndex(l => String(l) === userId);
    if (likedIdx >= 0) {
      answer.likes.splice(likedIdx, 1);
    } else {
      answer.likes.push(req.user.id);
    }
    answer.likeCount = answer.likes.length;
    await post.save();

    res.json({ answerLikes: answer.likes, answerLikeCount: answer.likeCount });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.delete('/:id/answers/:answerId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ msg: 'Post not found' });

    const answer = post.answers.id(req.params.answerId);
    if (!answer) return res.status(404).json({ msg: 'Answer not found' });

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && String(answer.author) !== String(req.user.id) && String(post.author) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    answer.deleteOne();
    await post.save();
    res.json({ msg: 'Answer deleted' });
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

// ── Helper: recompute average rating on destination/hotel after a review ───────
async function updateAverageRating(reviewType, reviewRefId) {
  try {
    const reviews = await Post.find({
      isDeleted:   false,
      category:    'review',
      reviewType,
      reviewRefId,
      rating:      { $ne: null },
    }).select('rating');

    if (reviews.length === 0) return;

    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const rounded = Math.round(avg * 10) / 10; // 1 decimal place

    if (reviewType === 'destination') {
      await Destination.findByIdAndUpdate(reviewRefId, { rating: rounded });
    } else if (reviewType === 'hotel') {
      await Hotel.findByIdAndUpdate(reviewRefId, { rating: rounded });
    }
  } catch (err) {
    console.error('Rating update error:', err);
  }
}

module.exports = router;