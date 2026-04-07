// backend/src/models/Post.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true, maxlength: 2000 },
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // Core content
  content: { type: String, trim: true, maxlength: 5000, default: '' },
  images:  [{ type: String }],

  // Category: photo | story | review | tip | question
  category: {
    type:    String,
    enum:    ['photo', 'story', 'review', 'tip', 'question'],
    default: 'photo',
  },

  // ── Travel photo extras ───────────────────────────────────────────────────
  // Destination tag (linked to Destination model or free text)
  destinationId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', default: null },
  destinationName: { type: String, default: null },

  // Budget level shown on post
  budget:     { type: String, enum: ['Budget', 'Mid-range', 'Luxury', 'Flexible', ''], default: '' },

  // Tagged users
  taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Review extras ─────────────────────────────────────────────────────────
  // What is being reviewed
  reviewType:  { type: String, enum: ['destination', 'hotel', ''], default: '' },
  reviewRefId: { type: mongoose.Schema.Types.ObjectId, default: null }, // Destination or Hotel _id
  rating:      { type: Number, min: 1, max: 5, default: null },          // 1-5 star rating

  // ── Question extras ───────────────────────────────────────────────────────
  // Answers to questions (embedded for simplicity, or can be separate collection)
  answers: [answerSchema],

  // ── Social ────────────────────────────────────────────────────────────────
  likes:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount:    { type: Number, default: 0 },
  saves:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // bookmark
  saveCount:    { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ destinationId: 1, category: 1 });
postSchema.index({ reviewRefId: 1, reviewType: 1 });

module.exports = mongoose.model('Post', postSchema);