
// backend/controllers/destinationController.js
const Destination = require('../models/Destination');

exports.createDestination = async (req, res) => {
  try {
    const {
      name,
      country,
      description,
      shortDescription,
      rating,
      bestTimeToVisit,
    } = req.body;

    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const destination = new Destination({
      name,
      country,
      description,
      shortDescription,
      rating: rating || 5,
      bestTimeToVisit,
      images,
    });

    await destination.save();
    res.status(201).json(destination);
  } catch (err) {
    console.error('Create destination error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllDestinations = async (req, res) => {
  try {
    const destinations = await Destination.find({});
    res.json(destinations);
  } catch (err) {
    console.error('Get all error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getDestination = async (req, res) => {
  try {
    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ msg: 'Destination not found' });
    res.json(destination);
  } catch (err) {
    console.error('Get one error:', err);
    res.status(500).json({ msg: 'Server error' });
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
    } = req.body;

    const destination = await Destination.findById(req.params.id);
    if (!destination) return res.status(404).json({ msg: 'Not found' });

    // Update text fields
    if (name) destination.name = name;
    if (country) destination.country = country;
    if (description) destination.description = description;
    if (shortDescription) destination.shortDescription = shortDescription;
    if (bestTimeToVisit) destination.bestTimeToVisit = bestTimeToVisit;
    if (rating) destination.rating = rating;

    // Add new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      destination.images = [...destination.images, ...newImages];
    }

    // Handle image deletion (if you add delete logic later)
    if (req.body.deleteImages) {
      const deleteImages = JSON.parse(req.body.deleteImages);
      destination.images = destination.images.filter(img => !deleteImages.includes(img));
    }

    const updated = await destination.save();
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteDestination = async (req, res) => {
  try {
    await Destination.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Destination deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};