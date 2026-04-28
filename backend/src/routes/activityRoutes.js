// backend/src/routes/activityRoutes.js
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const admin   = require('../middleware/admin');
const { uploadActivity } = require('../middleware/upload');
const {
  createActivity,
  getAllActivities,
  getActivity,
  updateActivity,
  deleteActivity,
} = require('../controllers/activityController');

router.get('/',       getAllActivities);
router.get('/:id',    getActivity);
router.post('/',      auth, admin, uploadActivity.array('images', 10), createActivity);
router.put('/:id',    auth, admin, uploadActivity.array('images', 10), updateActivity);
router.delete('/:id', auth, admin, deleteActivity);

module.exports = router;