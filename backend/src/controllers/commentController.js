// backend/src/controllers/commentController.js
const Comment = require('../models/Comment');
const Post    = require('../models/Post');

// ── Add Comment ───────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ msg: 'Comment content is required' });
    }

    const post = await Post.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const comment = await Comment.create({
      post:    req.params.postId,
      author:  req.user.id,
      content: content.trim(),
    });

    // Increment comment count on post
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'fullName avatar');

    req.app.get('io')?.emit('commentAdded', {
      postId: post._id.toString(),
      comment: populated,
      commentCount: post.commentCount,
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Get Comments for a Post ───────────────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const filter = { post: req.params.postId, isDeleted: false };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate('author', 'fullName avatar')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    res.json({ comments, currentPage: page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Edit Comment ──────────────────────────────────────────────────────────────
exports.editComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.commentId, isDeleted: false });
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not your comment' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ msg: 'Content is required' });
    }

    comment.content = content.trim();
    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'fullName avatar');

    req.app.get('io')?.emit('commentUpdated', {
      postId: comment.post.toString(),
      comment: populated,
    });

    res.json(populated);
  } catch (err) {
    console.error('Edit comment error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ── Delete Comment ────────────────────────────────────────────────────────────
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ _id: req.params.commentId, isDeleted: false });
    if (!comment) return res.status(404).json({ msg: 'Comment not found' });

    const isOwner = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    comment.isDeleted = true;
    await comment.save();

    // Decrement post comment count
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentCount: -1 },
    });

    const updatedPost = await Post.findById(comment.post).select('commentCount');
    req.app.get('io')?.emit('commentDeleted', {
      postId: comment.post.toString(),
      commentId: comment._id.toString(),
      commentCount: updatedPost?.commentCount ?? 0,
    });

    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};