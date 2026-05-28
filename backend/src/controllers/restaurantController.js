// backend/src/controllers/restaurantController.js
const Restaurant = require('../models/Restaurant');

exports.createRestaurant = async (req, res) => {
  try {
    const { name, destination, description, shortDescription, cuisine, priceRange, avgCostPerPerson, openingHours, address, phone } = req.body;
    const images = req.files ? req.files.map(file => file.path)
 : [];
    const restaurant = new Restaurant({
      name, destination, description, shortDescription,
      cuisine: cuisine ? cuisine.split(',').map(c => c.trim()).filter(Boolean) : [],
      priceRange, avgCostPerPerson, openingHours, address, phone, images,
    });
    const created = await restaurant.save();
    res.status(201).json(created);
  } catch (err) {
    console.error('Create restaurant error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const rest = await Restaurant.findById(req.params.id);
    if (!rest) return res.status(404).json({ msg: 'Not found' });
    const { name, destination, description, shortDescription, cuisine, priceRange, avgCostPerPerson, openingHours, address, phone, deleteImages, isActive } = req.body;
    if (name)             rest.name             = name;
    if (destination)      rest.destination      = destination;
    if (description)      rest.description      = description;
    if (shortDescription) rest.shortDescription = shortDescription;
    if (cuisine)          rest.cuisine          = cuisine.split(',').map(c => c.trim()).filter(Boolean);
    if (priceRange)       rest.priceRange       = priceRange;
    if (avgCostPerPerson) rest.avgCostPerPerson = avgCostPerPerson;
    if (openingHours)     rest.openingHours     = openingHours;
    if (address)          rest.address          = address;
    if (phone)            rest.phone            = phone;
    if (isActive !== undefined) rest.isActive   = isActive === 'true' || isActive === true;
    if (req.files && req.files.length > 0) rest.images = [...rest.images, ...req.files.map(f => f.path)];
    if (deleteImages) { const del = JSON.parse(deleteImages); rest.images = rest.images.filter(i => !del.includes(i)); }
    const updated = await rest.save();
    res.json(updated);
  } catch (err) {
    console.error('Update restaurant error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllRestaurants = async (req, res) => {
  try {
    const { destination } = req.query;
    const filter = destination ? { destination, isActive: true } : { isActive: true };
    const list = await Restaurant.find(filter).populate('destination', 'name').sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getRestaurant = async (req, res) => {
  try {
    const r = await Restaurant.findById(req.params.id).populate('destination', 'name');
    if (!r) return res.status(404).json({ msg: 'Not found' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};