// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // console.log('Auth middleware called for:', req.method, req.originalUrl);
  // console.log('Headers:', req.headers);

  let token = req.header('Authorization');
  if (token && token.startsWith('Bearer ')) {
    token = token.replace('Bearer ', '');
  } else {
    token = req.header('x-auth-token'); 
  }

  if (!token) {
    // console.log('No token found');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    // console.log('Token verification failed:', err.message);
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};