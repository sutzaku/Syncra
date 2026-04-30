const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Verify JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email, role_id, role_name }
        next();
    } catch (err) {
        return unauthorized(res, 'Invalid or expired token');
    }
};

/**
 * Authorize by role name(s)
 * Usage: authorize('admin') or authorize('admin', 'manager')
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role_name)) {
            return forbidden(res, 'You do not have permission to access this resource');
        }
        next();
    };
};

module.exports = { authenticate, authorize };
