const jwt = require('jsonwebtoken');
require('dotenv').config();

// General authentication middleware
exports.auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'Access denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info (including role) to the request object
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
exports.roleAuthorization = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
  }
  next();
};
