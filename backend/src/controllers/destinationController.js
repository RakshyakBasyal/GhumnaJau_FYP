// backend/src/controllers/destinationController.js
const Destination = require("../models/Destination");

const toNumberOrUndefined = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

const toBoolean = (v) => {
  return v === true || v === "true";
};

// CREATE DESTINATION
exports.createDestination = async (req, res) => {
  try {
    const {
      name,
      country,
      description,
      shortDescription,
      rating,
      bestTimeToVisit,
      averageCost,
      averageCostMin,
      averageCostMax,
      isAirport,
      nearestAirport,
    } = req.body;

    // FIXED: Save with correct subfolder path
    const images = req.files
      ? req.files.map((file) => `/uploads/destinations/${file.filename}`)
      : [];

    const avg = toNumberOrUndefined(averageCost);
    const min = toNumberOrUndefined(averageCostMin);
    const max = toNumberOrUndefined(averageCostMax);

    const isAirportBool = toBoolean(isAirport);

    const destination = new Destination({
      name,
      country,
      description,
      shortDescription,
      rating: toNumberOrUndefined(rating) ?? 5,
      bestTimeToVisit,
      averageCost: avg,
      averageCostMin: avg !== undefined ? undefined : min,
      averageCostMax: avg !== undefined ? undefined : max,
      images,
      isAirport: isAirportBool,
      nearestAirport: isAirportBool ? null : nearestAirport || null,
    });

    const createdDest = await destination.save();
    await emitAdminStats(req.app.get('io'));
    res.status(201).json(createdDest);
  } catch (err) {
    console.error("Create destination error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// UPDATE DESTINATION
exports.updateDestination = async (req, res) => {
  try {
    const {
      name,
      country,
      description,
      shortDescription,
      rating,
      bestTimeToVisit,
      averageCost,
      averageCostMin,
      averageCostMax,
      isAirport,
      nearestAirport,
    } = req.body;

    const destination = await Destination.findById(req.params.id);
    if (!destination)
      return res.status(404).json({ msg: "Not found" });

    // Text fields
    if (name !== undefined) destination.name = name;
    if (country !== undefined) destination.country = country;
    if (description !== undefined) destination.description = description;
    if (shortDescription !== undefined)
      destination.shortDescription = shortDescription;
    if (bestTimeToVisit !== undefined)
      destination.bestTimeToVisit = bestTimeToVisit;

    const r = toNumberOrUndefined(rating);
    if (r !== undefined) destination.rating = r;

    // Cost handling
    const avg = toNumberOrUndefined(averageCost);
    const min = toNumberOrUndefined(averageCostMin);
    const max = toNumberOrUndefined(averageCostMax);

    if (averageCost !== undefined) {
      destination.averageCost = avg;
      if (avg !== undefined) {
        destination.averageCostMin = undefined;
        destination.averageCostMax = undefined;
      }
    }

    if (averageCostMin !== undefined) {
      destination.averageCostMin = min;
      if (min !== undefined) destination.averageCost = undefined;
    }

    if (averageCostMax !== undefined) {
      destination.averageCostMax = max;
      if (max !== undefined) destination.averageCost = undefined;
    }

    // Airport handling
    if (isAirport !== undefined) {
      const isAirportBool = toBoolean(isAirport);
      destination.isAirport = isAirportBool;
      destination.nearestAirport = isAirportBool
        ? null
        : nearestAirport || null;
    }

    // FIXED: New images saved with /uploads/destinations/
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(
        (file) => `/uploads/destinations/${file.filename}`
      );
      destination.images = [
        ...(destination.images || []),
        ...newImages,
      ];
    }

    // Delete images
    if (req.body.deleteImages) {
      let deleteImages = [];
      try {
        deleteImages = JSON.parse(req.body.deleteImages);
      } catch (e) {
        deleteImages = [];
      }

      destination.images = (destination.images || []).filter(
        (img) => !deleteImages.includes(img)
      );
    }

    const updated = await destination.save();
    await emitAdminStats(req.app.get('io'));
    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const { emitAdminStats } = require("./adminController");

// @desc    Get all destinations
// @route   GET /api/destinations
exports.getAllDestinations = async (req, res) => {
  try {
    const destinations = await Destination.find({})
      .populate("nearestAirport", "name country")
      .sort({ createdAt: -1 });

    res.json(destinations);
  } catch (err) {
    console.error("Get all error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getDestination = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id)
      .populate("nearestAirport", "name country");

    if (!destination)
      return res.status(404).json({ msg: "Destination not found" });

    res.json(destination);
  } catch (err) {
    console.error("Get one error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    const destination = await Destination.findByIdAndDelete(req.params.id);
    if (!destination)
      return res.status(404).json({ msg: "Destination not found" });

    await emitAdminStats(req.app.get('io'));
    res.json({ msg: "Destination deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};