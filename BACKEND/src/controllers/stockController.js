const db = require('../config/db');
const { success, created, badRequest } = require('../utils/response');

/**
 * GET /api/stock?product_variant_id=
 * Returns current stock level for a variant or all variants
 */
const getStock = async (req, res, next) => {
    try {
        const { product_variant_id } = req.query;
        let query = `SELECT pv.id AS product_variant_id, p.name AS product_name, pv.name AS variant_name, pv.sku,
                            COALESCE(SUM(sm.quantity_change), 0) AS current_stock
                     FROM product_variants pv
                     JOIN products p ON p.id = pv.product_id
                     LEFT JOIN stock_movements sm ON sm.product_variant_id = pv.id
                     WHERE pv.deleted_at IS NULL AND p.deleted_at IS NULL`;
        const params = [];
        if (product_variant_id) { query += ' AND pv.id = ?'; params.push(product_variant_id); }
        query += ' GROUP BY pv.id, p.name, pv.name, pv.sku ORDER BY p.name ASC';
        const [stock] = await db.query(query, params);
        return success(res, stock);
    } catch (err) { next(err); }
};

/**
 * GET /api/stock/movements?product_variant_id=&limit=50
 */
const getMovements = async (req, res, next) => {
    try {
        const { product_variant_id } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        let query = `SELECT sm.*, pv.name AS variant_name, p.name AS product_name, u.full_name AS performed_by_name
                     FROM stock_movements sm
                     JOIN product_variants pv ON pv.id = sm.product_variant_id
                     JOIN products p ON p.id = pv.product_id
                     LEFT JOIN users u ON u.id = sm.performed_by
                     WHERE 1=1`;
        const params = [];
        if (product_variant_id) { query += ' AND sm.product_variant_id = ?'; params.push(product_variant_id); }
        query += ' ORDER BY sm.created_at DESC LIMIT ?';
        params.push(limit);
        const [movements] = await db.query(query, params);
        return success(res, movements);
    } catch (err) { next(err); }
};

/**
 * POST /api/stock/adjust
 * Body: { product_variant_id, quantity_change, movement_type, reference?, notes? }
 * For manual adjustments: restock, wastage, adjustment
 */
const adjust = async (req, res, next) => {
    try {
        const { product_variant_id, quantity_change, movement_type, reference, notes } = req.body;
        const allowed = ['purchase', 'adjustment', 'return', 'wastage'];
        if (!allowed.includes(movement_type)) {
            return badRequest(res, `movement_type must be one of: ${allowed.join(', ')}`);
        }
        // Verify variant exists
        const [variants] = await db.query(
            `SELECT id FROM product_variants WHERE id = ? AND deleted_at IS NULL`, [product_variant_id]
        );
        if (!variants.length) return badRequest(res, 'Product variant not found');

        const [result] = await db.query(
            `INSERT INTO stock_movements (product_variant_id, performed_by, quantity_change, movement_type, reference, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [product_variant_id, req.user.id, quantity_change, movement_type, reference || null, notes || null]
        );
        return created(res, { id: result.insertId }, 'Stock movement recorded');
    } catch (err) { next(err); }
};

module.exports = { getStock, getMovements, adjust };
