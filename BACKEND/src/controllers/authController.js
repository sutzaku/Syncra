const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { success, badRequest, unauthorized } = require('../utils/response');

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user with role
        const [users] = await db.query(
            `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active,
                    u.role_id, r.name AS role_name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = ? AND u.deleted_at IS NULL
             LIMIT 1`,
            [email]
        );

        if (users.length === 0) {
            return unauthorized(res, 'Invalid email or password');
        }

        const user = users[0];

        if (!user.is_active) {
            return unauthorized(res, 'Account is deactivated');
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return unauthorized(res, 'Invalid email or password');
        }

        // Generate JWT
        const payload = {
            id: user.id,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });

        return success(res, {
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role_name
            }
        }, 'Login successful');

    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
const me = async (req, res, next) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
                    r.name AS role_name, u.created_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = ? AND u.deleted_at IS NULL
             LIMIT 1`,
            [req.user.id]
        );

        if (users.length === 0) {
            return unauthorized(res, 'User not found');
        }

        return success(res, users[0]);
    } catch (err) {
        next(err);
    }
};

module.exports = { login, me };
