// backend/src/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  images: [{ type: String }],

  category: {
    type: String,
    enum: ['story', 'photo', 'review', 'tip'],
    required: true,
  },

  // Tags
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    default: null,
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    default: null,
  },
  flight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    default: null,
  },

  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  commentCount: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);