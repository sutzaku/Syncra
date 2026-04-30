const db = require('../config/db');
const { success, created, notFound } = require('../utils/response');

/**
 * GET /api/addons
 */
const getAll = async (req, res, next) => {
    try {
        const { category_id } = req.query;
        let query = `SELECT a.id, a.name, a.price, a.is_active, c.name AS category_name, a.category_id
                     FROM addons a LEFT JOIN categories c ON c.id = a.category_id
                     WHERE a.deleted_at IS NULL`;
        const params = [];
        if (category_id) { query += ' AND (a.category_id = ? OR a.category_id IS NULL)'; params.push(category_id); }
        query += ' ORDER BY a.name ASC';
        const [addons] = await db.query(query, params);
        return success(res, addons);
    } catch (err) { next(err); }
};

/** POST /api/addons */
const create = async (req, res, next) => {
    try {
        const { name, price, category_id } = req.body;
        const [result] = await db.query(
            `INSERT INTO addons (name, price, category_id) VALUES (?, ?, ?)`,
            [name, price || 0, category_id || null]
        );
        return created(res, { id: result.insertId, name, price }, 'Addon created');
    } catch (err) { next(err); }
};

/** PUT /api/addons/:id */
const update = async (req, res, next) => {
    try {
        const { name, price, category_id, is_active } = req.body;
        const [existing] = await db.query(`SELECT id FROM addons WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
        if (!existing.length) return notFound(res, 'Addon not found');
        await db.query(`UPDATE addons SET name=COALESCE(?,name), price=COALESCE(?,price), category_id=COALESCE(?,category_id), is_active=COALESCE(?,is_active) WHERE id=?`,
            [name, price, category_id, is_active, req.params.id]);
        return success(res, null, 'Addon updated');
    } catch (err) { next(err); }
};

/** DELETE /api/addons/:id */
const remove = async (req, res, next) => {
    try {
        const [existing] = await db.query(`SELECT id FROM addons WHERE id = ? AND deleted_at IS NULL`, [req.params.id]);
        if (!existing.length) return notFound(res, 'Addon not found');
        await db.query(`UPDATE addons SET deleted_at = NOW() WHERE id = ?`, [req.params.id]);
        return success(res, null, 'Addon deleted');
    } catch (err) { next(err); }
};

module.exports = { getAll, create, update, remove };
