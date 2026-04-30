const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { success, created, notFound, badRequest } = require('../utils/response');

/**
 * GET /api/users
 * Query: ?page=1&limit=10
 */
const getAll = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [users] = await db.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
                    r.name AS role_name, u.created_at, u.updated_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`
        );

        return success(res, {
            users,
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users/:id
 */
const getById = async (req, res, next) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.is_active,
                    r.name AS role_name, u.created_at, u.updated_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = ? AND u.deleted_at IS NULL
             LIMIT 1`,
            [req.params.id]
        );

        if (users.length === 0) {
            return notFound(res, 'User not found');
        }

        return success(res, users[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/users
 * Body: { full_name, email, password, role_id, phone? }
 */
const create = async (req, res, next) => {
    try {
        const { full_name, email, password, role_id, phone } = req.body;

        // Check duplicate email
        const [existing] = await db.query(
            `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`, [email]
        );
        if (existing.length > 0) {
            return badRequest(res, 'Email already in use');
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (role_id, full_name, email, phone, password_hash)
             VALUES (?, ?, ?, ?, ?)`,
            [role_id, full_name, email, phone || null, password_hash]
        );

        return created(res, { id: result.insertId, full_name, email }, 'User created successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/users/:id
 * Body: { full_name?, email?, role_id?, phone?, is_active? }
 */
const update = async (req, res, next) => {
    try {
        const { full_name, email, role_id, phone, is_active } = req.body;

        const [existing] = await db.query(
            `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'User not found');
        }

        await db.query(
            `UPDATE users SET
                full_name = COALESCE(?, full_name),
                email = COALESCE(?, email),
                role_id = COALESCE(?, role_id),
                phone = COALESCE(?, phone),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [full_name, email, role_id, phone, is_active, req.params.id]
        );

        return success(res, null, 'User updated successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/users/:id  (soft delete)
 */
const remove = async (req, res, next) => {
    try {
        const [existing] = await db.query(
            `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'User not found');
        }

        await db.query(
            `UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?`,
            [req.params.id]
        );

        return success(res, null, 'User deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
