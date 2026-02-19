// backend/src/controllers/hotelController.js
const Hotel = require('../models/Hotel');

exports.createHotel = async (req, res) => {
  try {
    const {
      name,
      destination,
      country,
      description,
      shortDescription,
      rating,
      amenities,
      roomTypes,   
    } = req.body;

    // FIXED: Save images with /uploads/hotels/ prefix
    const images = req.files 
      ? req.files.map(file => `/uploads/hotels/${file.filename}`) 
      : [];

    const hotel = new Hotel({
      name,
      destination,
      country,
      description,
      shortDescription,
      rating: rating || 5,
      amenities: amenities ? amenities.split(',') : [],
      images,
      roomTypes: roomTypes ? JSON.parse(roomTypes) : [],  
    });

    await hotel.save();
    res.status(201).json(hotel);
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
      name,
      destination,
      country,
      description,
      shortDescription,
      rating,
      amenities,
      roomTypes,   
    } = req.body;

    if (name) hotel.name = name;
    if (destination) hotel.destination = destination;
    if (country) hotel.country = country;
    if (description) hotel.description = description;
    if (shortDescription) hotel.shortDescription = shortDescription;
    if (rating) hotel.rating = rating;
    if (amenities) hotel.amenities = amenities.split(',');

    if (roomTypes) {
      hotel.roomTypes = JSON.parse(roomTypes);
    }

    // FIXED: New images now saved in /uploads/hotels/
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/hotels/${file.filename}`);
      hotel.images = [...hotel.images, ...newImages];
    }

    if (req.body.deleteImages) {
      const deleteImages = JSON.parse(req.body.deleteImages);
      hotel.images = hotel.images.filter(img => !deleteImages.includes(img));
    }

    const updated = await hotel.save();
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
    res.json({ msg: 'Hotel deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};