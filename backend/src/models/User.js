// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  
  // NEW FIELD: profile picture (stored as relative path)
  avatar: {
    type: String,
    default: '', // empty = no picture → frontend shows default icon
  },

  // already present — good for token invalidation
  lastLogout: { type: Date, default: null },
  
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);