// backend/src/mode/TripRoom.js
const mongoose = require('mongoose');

const tripRoomSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  budget: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: 500
  },
  maxMembers: {
    type: Number,
    default: 10
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  invitedBuddies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coOwners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expenses: [{
    description: String,
    amount: { type: Number, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    notes: String,
    splitWith: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      amount: { type: Number }
    }]
  }],
  settlements: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  itinerary: [{
    day: Number,
    activities: [String],
    location: String
  }],
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

tripRoomSchema.index({ destination: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('TripRoom', tripRoomSchema);
