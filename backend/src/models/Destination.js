// //backend/src/models/Destination.js
// const mongoose = require("mongoose");

// const destinationSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     country: { type: String, required: true },
//     description: { type: String },
//     shortDescription: { type: String },
//     rating: { type: Number, default: 5 },
//     bestTimeToVisit: { type: String },

//     averageCost: { type: Number },
//     averageCostMin: { type: Number },
//     averageCostMax: { type: Number },

//     images: [{ type: String }],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Destination", destinationSchema);

// backend/src/models/Destination.js
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

    nearestAirport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      default: null,
    },

    isAirport: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Destination", destinationSchema);