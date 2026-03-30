// backend/src/controllers/postController.js
const Post = require('../models/Post');
const Follow = require('../models/Follow');

// ── Create Post ───────────────────────────────────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    const { content, category, destination, hotel, flight } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ msg: 'Post content is required' });
    }

    if (!category || !['story', 'photo', 'review', 'tip'].includes(category)) {
      return res.status(400).json({ msg: 'Valid category is required (story, photo, review, tip)' });
    }

    const images = req.files
      ? req.files.map(file => `/uploads/posts/${file.filename}`)
      : [];

    const post = await Post.create({
      author:      req.user.id,
      content:     content.trim(),
      category,
      images,
      destination: destination || null,
      hotel:       hotel       || null,
      flight:      flight      || null,
    });

    const populated = await Post.findById(post._id)
      .populate('author',      'fullName avatar')
      .populate('destination', 'name country')
      .populate('hotel',       'name')
      .populate('flight',      'airline flightNumber from to');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Explore Feed (all posts, latest first) ────────────────────────────────────
exports.getExploreFeed = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const { category, destination } = req.query;
    const filter = { isDeleted: false };
    if (category)    filter.category    = category;
    if (destination) filter.destination = destination;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author',      'fullName avatar')
        .populate('destination', 'name country')
        .populate('hotel',       'name')
        .populate('flight',      'airline flightNumber from to')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts,
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('Explore feed error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Following Feed (posts from people you follow) ─────────────────────────────
exports.getFollowingFeed = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    // Get IDs of everyone I follow
    const follows = await Follow.find({ follower: req.user.id }).select('following');
    const followingIds = follows.map(f => f.following);

    if (followingIds.length === 0) {
      return res.json({ posts: [], currentPage: 1, totalPages: 0, total: 0, empty: true });
    }

    const filter = { author: { $in: followingIds }, isDeleted: false };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author',      'fullName avatar')
        .populate('destination', 'name country')
        .populate('hotel',       'name')
        .populate('flight',      'airline flightNumber from to')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts,
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('Following feed error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get single post ───────────────────────────────────────────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false })
      .populate('author',      'fullName avatar')
      .populate('destination', 'name country')
      .populate('hotel',       'name')
      .populate('flight',      'airline flightNumber from to');

    if (!post) return res.status(404).json({ msg: 'Post not found' });
    res.json(post);
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get posts by a specific user ──────────────────────────────────────────────
exports.getUserPosts = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip  = (page - 1) * limit;

    const filter = { author: req.params.userId, isDeleted: false };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author',      'fullName avatar')
        .populate('destination', 'name country')
        .populate('hotel',       'name')
        .populate('flight',      'airline flightNumber from to')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({ posts, currentPage: page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error('User posts error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Edit Post ─────────────────────────────────────────────────────────────────
exports.editPost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not your post' });
    }

    const { content, category, destination, hotel, flight, deleteImages } = req.body;

    if (content   !== undefined) post.content     = content.trim();
    if (category  !== undefined) post.category    = category;
    if (destination !== undefined) post.destination = destination || null;
    if (hotel     !== undefined) post.hotel       = hotel   || null;
    if (flight    !== undefined) post.flight      = flight  || null;

    // New images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/posts/${f.filename}`);
      post.images = [...post.images, ...newImages];
    }

    // Delete selected images
    if (deleteImages) {
      let toDelete = [];
      try { toDelete = JSON.parse(deleteImages); } catch (_) {}
      post.images = post.images.filter(img => !toDelete.includes(img));
    }

    await post.save();

    const populated = await Post.findById(post._id)
      .populate('author',      'fullName avatar')
      .populate('destination', 'name country')
      .populate('hotel',       'name')
      .populate('flight',      'airline flightNumber from to');

    res.json(populated);
  } catch (err) {
    console.error('Edit post error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Delete Post ───────────────────────────────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const isOwner = post.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized to delete this post' });
    }

    post.isDeleted = true;
    await post.save();

    res.json({ msg: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Like / Unlike ─────────────────────────────────────────────────────────────
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const userId    = req.user.id;
    const alreadyLiked = post.likes.some(id => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (err) {
    console.error('Toggle like error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};