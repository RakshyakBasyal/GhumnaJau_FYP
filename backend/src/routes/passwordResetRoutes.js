// backend/src/routess/passwordResetRoutes.js
const express = require('express');
const router  = express.Router();
const {
  sendResetCode,
  verifyResetCode,
  resetPassword,
} = require('../controllers/passwordResetController');

router.post('/send-code',    sendResetCode);
router.post('/verify-code',  verifyResetCode);
router.post('/reset',        resetPassword);

module.exports = router;