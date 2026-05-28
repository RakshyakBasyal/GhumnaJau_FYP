// backend/src/middleware/upload.js
const multer = require('multer');
const path = require('path');

const generateFilename = (file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  return uniqueSuffix + path.extname(file.originalname);
};

// 1. User avatars
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/avatars/'),
    filename:    (req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// 2. Hotel images
const uploadHotel = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/hotels/'),
    filename:    (req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// 3. Destination images
const uploadDestination = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/destinations/'),
    filename:    (req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// 4. Restaurant images
const uploadRestaurant = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/restaurants/'),
    filename:    (req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

// 5. Activity images
const uploadActivity = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/activities/'),
    filename:    (req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  },
});

module.exports = {
  uploadAvatar,
  uploadHotel,
  uploadDestination,
  uploadRestaurant,
  uploadActivity,
};