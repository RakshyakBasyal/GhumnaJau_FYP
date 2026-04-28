// backend/src/controllers/activityController.js
const Activity = require('../models/Activity');

exports.createActivity = async (req, res) => {
  try {
    const { name, destination, description, shortDescription, category, duration, price, difficulty, includes, address, phone } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/activities/${f.filename}`) : [];
    const activity = new Activity({
      name, destination, description, shortDescription, category, duration, price, difficulty,
      includes: includes ? includes.split(',').map(i => i.trim()).filter(Boolean) : [],
      address, phone, images,
    });
    const created = await activity.save();
    res.status(201).json(created);
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const act = await Activity.findById(req.params.id);
    if (!act) return res.status(404).json({ msg: 'Not found' });
    const { name, destination, description, shortDescription, category, duration, price, difficulty, includes, address, phone, deleteImages, isActive } = req.body;
    if (name)             act.name             = name;
    if (destination)      act.destination      = destination;
    if (description)      act.description      = description;
    if (shortDescription) act.shortDescription = shortDescription;
    if (category)         act.category         = category;
    if (duration)         act.duration         = duration;
    if (price)            act.price            = price;
    if (difficulty)       act.difficulty       = difficulty;
    if (includes)         act.includes         = includes.split(',').map(i => i.trim()).filter(Boolean);
    if (address)          act.address          = address;
    if (phone)            act.phone            = phone;
    if (isActive !== undefined) act.isActive   = isActive === 'true' || isActive === true;
    if (req.files && req.files.length > 0) act.images = [...act.images, ...req.files.map(f => `/uploads/activities/${f.filename}`)];
    if (deleteImages) { const del = JSON.parse(deleteImages); act.images = act.images.filter(i => !del.includes(i)); }
    const updated = await act.save();
    res.json(updated);
  } catch (err) {
    console.error('Update activity error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllActivities = async (req, res) => {
  try {
    const { destination } = req.query;
    const filter = destination ? { destination, isActive: true } : { isActive: true };
    const list = await Activity.find(filter).populate('destination', 'name').sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const a = await Activity.findById(req.params.id).populate('destination', 'name');
    if (!a) return res.status(404).json({ msg: 'Not found' });
    res.json(a);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};