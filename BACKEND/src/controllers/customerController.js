const db = require('../config/db');
const { success, created, notFound } = require('../utils/response');

/** GET /api/customers */
const getAll = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const [customers] = await db.query(
            `SELECT id, full_name, email, phone, address, notes, created_at
             FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM customers WHERE deleted_at IS NULL`);
        return success(res, { customers, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

/** POST /api/customers */
const create = async (req, res, next) => {
    try {
        const { full_name, email, phone, address, notes } = req.body;
        const [result] = await db.query(
            `INSERT INTO customers (full_name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?)`,
            [full_name, email || null, phone || null, address || null, notes || null]
        );
        return created(res, { id: result.insertId, full_name }, 'Customer created');
    } catch (err) { next(err); }
};

/** PUT /api/customers/:id */
const update = async (req, res, next) => {
    try {
        const { full_name, email, phone, address, notes } = req.body;
        const [existing] = await db.query(`SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
        if (!existing.length) return notFound(res, 'Customer not found');
        await db.query(
            `UPDATE customers SET full_name=COALESCE(?,full_name), email=COALESCE(?,email), phone=COALESCE(?,phone), address=COALESCE(?,address), notes=COALESCE(?,notes) WHERE id=?`,
            [full_name, email, phone, address, notes, req.params.id]
        );
        return success(res, null, 'Customer updated');
    } catch (err) { next(err); }
};

/** DELETE /api/customers/:id */
const remove = async (req, res, next) => {
    try {
        const [existing] = await db.query(`SELECT id FROM customers WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
        if (!existing.length) return notFound(res, 'Customer not found');
        await db.query(`UPDATE customers SET deleted_at = NOW() WHERE id = ?`, [req.params.id]);
        return success(res, null, 'Customer deleted');
    } catch (err) { next(err); }
};

module.exports = { getAll, create, update, remove };
