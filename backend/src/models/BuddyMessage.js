
// backend/src/models/BuddyMessage.js
const mongoose = require("mongoose");

const buddyMessageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type:     String,
      required: true,
      index:    true,
    },
    participants: [
      {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
      },
    ],
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    text: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 1000,
    },
    // System messages are used to seed a conversation when two users connect
    // without sending a real message. Never shown in the UI.
    isSystem: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

buddyMessageSchema.index({ conversationKey: 1, createdAt: 1 });
buddyMessageSchema.index({ participants: 1 });

module.exports = mongoose.model("BuddyMessage", buddyMessageSchema);