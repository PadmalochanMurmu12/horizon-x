const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'horizon_x_secret_key';

/**
 * authMiddleware
 * Validates the passenger's JWT session token.
 * Attaches decoded payload to req.user on success.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Your boarding pass is missing. Please sign in to continue.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired or is invalid. Please sign in again.' });
  }
};

/**
 * adminAuthMiddleware
 * Validates the JWT session token AND enforces admin role.
 * Attaches decoded payload to req.user on success.
 */
const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Restricted airspace. Admin clearance required.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You do not have ground control privileges.' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Restricted airspace. Admin clearance required.' });
  }
};

module.exports = { authMiddleware, adminAuthMiddleware };
