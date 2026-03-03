// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  let token = req.header('Authorization');
  if (token && token.startsWith('Bearer ')) {
    token = token.replace('Bearer ', '');
  } else {
    token = req.header('x-auth-token');
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded, _id: decoded.id };  // ← FIXED

    const user = await User.findById(decoded.id).select('lastLogout role');
    
    if (!user) {
      return res.status(401).json({ msg: 'User no longer exists. Please log in again.' });
    }

    if (user.lastLogout && new Date(decoded.iat * 1000) < user.lastLogout) {
      return res.status(401).json({ msg: 'Session has been invalidated. Please log in again.' });
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};