const { verifyToken } = require('../utils/jwt');
const { get } = require('../config/database');
const { errorResponse } = require('../utils/response');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been invalidated (logged out)
    const invalidated = get(
      `SELECT id FROM invalidated_tokens WHERE token = ?`,
      [token]
    );

    if (invalidated) {
      return errorResponse(res, 'Token has been invalidated. Please log in again.', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Check user still exists
    const user = get(`SELECT id, name, email FROM users WHERE id = ?`, [decoded.userId]);
    if (!user) {
      return errorResponse(res, 'User no longer exists.', 401);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token has expired. Please log in again.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token.', 401);
    }
    return errorResponse(res, 'Authentication failed.', 401);
  }
}

module.exports = authMiddleware;
