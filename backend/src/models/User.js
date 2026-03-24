// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },  // ← CHANGED: removed required: true
  phone: { type: String },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  // Password reset
  resetCode: { type: String, default: null },
  resetCodeExpiry: { type: Date, default: null },

  // NEW FIELD: profile picture (stored as relative path)
  avatar: {
    type: String,
    default: '', // empty = no picture → frontend shows default icon
  },

  // already present — good for token invalidation
  lastLogout: { type: Date, default: null },

  // Optional: add googleId if you want to store it separately (recommended)
  googleId: { type: String },  // ← optional but very useful for linking/merging

}, { timestamps: true });

// Only hash password if it exists and is modified
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  // Google users have no password → cannot login with password
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};



module.exports = mongoose.model('User', userSchema);