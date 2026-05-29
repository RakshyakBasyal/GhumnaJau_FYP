// backend/src/middleware/upload.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only images allowed"), false);
};

// 1. User avatars
const uploadAvatar = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/avatars", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// 2. Hotel images
const uploadHotel = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/hotels", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// 3. Destination images
const uploadDestination = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/destinations", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// 4. Restaurant images
const uploadRestaurant = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/restaurants", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// 5. Activity images
const uploadActivity = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/activities", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// 6. Community post images
const uploadPost = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/posts", allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"] },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// 7. Itinerary cover images
const uploadItinerary = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "ghumna-jau/itineraries", allowed_formats: ["jpg", "jpeg", "png", "webp"] },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = {
  uploadAvatar,
  uploadHotel,
  uploadDestination,
  uploadRestaurant,
  uploadActivity,
  uploadPost,
  uploadItinerary,
};