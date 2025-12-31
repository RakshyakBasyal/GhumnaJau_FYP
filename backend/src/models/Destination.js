const mongoose = require("mongoose");

const destinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    country: { type: String, required: true },
    description: { type: String },
    shortDescription: { type: String },
    rating: { type: Number, default: 5 },
    bestTimeToVisit: { type: String },

    averageCost: { type: Number },
    averageCostMin: { type: Number },
    averageCostMax: { type: Number },

    images: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Destination", destinationSchema);

