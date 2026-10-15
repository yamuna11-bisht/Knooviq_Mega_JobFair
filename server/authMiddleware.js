const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'college_registration_jwt_secret_key_2026_super_secure';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@College2026!';

/**
 * Validates admin credentials and generates a signed JWT token.
 */
function authenticateAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      { role: 'admin', user: 'Administrator' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return { success: true, token };
  }
  return { success: false, message: 'Invalid administrator password.' };
}

/**
 * Express middleware to verify admin JWT token via Bearer header or ?token= query parameter.
 */
function requireAdminAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Administrator authentication token is required.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Insufficient administrative privileges.'
      });
    }
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired administrative session token.'
    });
  }
}

module.exports = {
  ADMIN_PASSWORD,
  authenticateAdmin,
  requireAdminAuth
};
