const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies the Bearer token and loads req.user.
// Impersonation tokens (issued by POST /api/admin/users/:id/impersonate) carry
// `imp: <adminId>`; they are exposed as req.impersonatedBy and every request
// made with one is logged, so support sessions leave an audit trail.
const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  try {
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    if (decoded.imp) {
      req.impersonatedBy = decoded.imp;
      console.log(`[IMPERSONATION] admin=${decoded.imp} user=${user._id} ${req.method} ${req.originalUrl}`);
    } else if (user.isActive === false) {
      // Admins may still open a suspended account for support; the owner may not.
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Blocks actions an admin should never take on a user's behalf.
const notWhileImpersonating = (req, res, next) => {
  if (req.impersonatedBy) {
    return res.status(403).json({ message: 'This action is disabled during an admin support session.' });
  }
  next();
};

module.exports = { protect, notWhileImpersonating };
