// backend/src/controllers/hotelController.js
const Hotel = require('../models/Hotel');
const { emitAdminStats } = require('./adminController');

exports.createHotel = async (req, res) => {
  try {
    const {
      name, destination, country, description,
      shortDescription, amenities, roomTypes, lat, lng,
    } = req.body;

    const images = req.files
      ? req.files.map(file => `/uploads/hotels/${file.filename}`)
      : [];

    const hotel = new Hotel({
      name,
      destination,
      country,
      description,
      shortDescription,
      amenities: amenities ? amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
      images,
      roomTypes: roomTypes ? JSON.parse(roomTypes) : [],
      location: {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
    });

    const created = await hotel.save();
    await emitAdminStats(req.app.get('io'));
    res.status(201).json(created);
  } catch (err) {
    console.error('Create hotel error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return res.status(404).json({ msg: 'Not found' });

    const {
      name, destination, country, description,
      shortDescription, amenities, roomTypes,
      deleteImages, lat, lng,
    } = req.body;

    if (name)             hotel.name             = name;
    if (destination)      hotel.destination      = destination;
    if (country)          hotel.country          = country;
    if (description)      hotel.description      = description;
    if (shortDescription) hotel.shortDescription = shortDescription;
    if (amenities)        hotel.amenities        = amenities.split(',').map(a => a.trim()).filter(Boolean);
    if (roomTypes)        hotel.roomTypes        = JSON.parse(roomTypes);

    // Location — save if provided, clear if explicitly sent as empty string
    if (lat !== undefined) hotel.location.lat = lat === '' ? null : parseFloat(lat);
    if (lng !== undefined) hotel.location.lng = lng === '' ? null : parseFloat(lng);

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/hotels/${f.filename}`);
      hotel.images = [...hotel.images, ...newImages];
    }

    if (deleteImages) {
      const toDelete = JSON.parse(deleteImages);
      hotel.images = hotel.images.filter(img => !toDelete.includes(img));
    }

    const updated = await hotel.save();
    await emitAdminStats(req.app.get('io'));
    res.json(updated);
  } catch (err) {
    console.error('Update hotel error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllHotels = async (req, res) => {
  try {
    const { destination } = req.query;
    const filter = destination ? { destination } : {};
    const hotels = await Hotel.find(filter)
      .populate('destination', 'name country')
      .sort({ rating: -1, name: 1 });
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('destination', 'name');
    if (!hotel) return res.status(404).json({ msg: 'Hotel not found' });
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteHotel = async (req, res) => {
  try {
    await Hotel.findByIdAndDelete(req.params.id);
    await emitAdminStats(req.app.get('io'));
    res.json({ msg: 'Hotel deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};