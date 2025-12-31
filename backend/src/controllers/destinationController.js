const Destination = require("../models/Destination");

const toNumberOrUndefined = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

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
    } = req.body;

    const images = req.files ? req.files.map((file) => `/uploads/${file.filename}`) : [];

    // If avgCost is provided, we treat it as single cost and clear range
    const avg = toNumberOrUndefined(averageCost);
    const min = toNumberOrUndefined(averageCostMin);
    const max = toNumberOrUndefined(averageCostMax);

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
    });

    await destination.save();
    res.status(201).json(destination);
  } catch (err) {
    console.error("Create destination error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getAllDestinations = async (req, res) => {
  try {
    const destinations = await Destination.find({}).sort({ createdAt: -1 });
    res.json(destinations);
  } catch (err) {
    console.error("Get all error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.getDestination = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ msg: "Destination not found" });
    res.json(destination);
  } catch (err) {
    console.error("Get one error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

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
    } = req.body;

    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ msg: "Not found" });

    // Text fields
    if (name !== undefined) destination.name = name;
    if (country !== undefined) destination.country = country;
    if (description !== undefined) destination.description = description;
    if (shortDescription !== undefined) destination.shortDescription = shortDescription;
    if (bestTimeToVisit !== undefined) destination.bestTimeToVisit = bestTimeToVisit;

    const r = toNumberOrUndefined(rating);
    if (r !== undefined) destination.rating = r;

    // Costs logic:
    // - if averageCost is set => use single cost, clear range
    // - if min/max are set => use range, clear single cost
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

    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => `/uploads/${file.filename}`);
      destination.images = [...(destination.images || []), ...newImages];
    }

    // Delete images (sent as JSON string)
    if (req.body.deleteImages) {
      let deleteImages = [];
      try {
        deleteImages = JSON.parse(req.body.deleteImages);
      } catch (e) {
        deleteImages = [];
      }
      destination.images = (destination.images || []).filter((img) => !deleteImages.includes(img));
    }

    const updated = await destination.save();
    res.json(updated);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    await Destination.findByIdAndDelete(req.params.id);
    res.json({ msg: "Destination deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
