module.exports = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ msg: 'Admin access required' });
  }
  next();
};