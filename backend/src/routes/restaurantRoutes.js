// backend/src/routes/restaurantRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');
const { uploadRestaurant } = require('../middleware/upload');
const {
  createRestaurant,
  getAllRestaurants,
  getRestaurant,
  updateRestaurant,
  deleteRestaurant,
} = require('../controllers/restaurantController');

router.get('/',       getAllRestaurants);
router.get('/:id',    getRestaurant);
router.post('/',      auth, admin, uploadRestaurant.array('images', 10), createRestaurant);
router.put('/:id',    auth, admin, uploadRestaurant.array('images', 10), updateRestaurant);
router.delete('/:id', auth, admin, deleteRestaurant);

module.exports = router;