const mongoose = require("mongoose");

const buddyMessageSchema = new mongoose.Schema(
  {
    conversationKey: {
      type: String,
      required: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    ],
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

buddyMessageSchema.index({ conversationKey: 1, createdAt: 1 });

module.exports = mongoose.model("BuddyMessage", buddyMessageSchema);
