const db = require('../config/db');
const { success, created, notFound, badRequest } = require('../utils/response');

/**
 * POST /api/payments
 * Body: { order_id, payment_method_id, amount, reference_number?, notes? }
 */
const create = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { order_id, payment_method_id, amount, reference_number, notes } = req.body;

        // Get order
        const [orders] = await conn.query(
            `SELECT id, total_amount, status_id FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
            [order_id]
        );
        if (!orders.length) { await conn.rollback(); return notFound(res, 'Order not found'); }
        const order = orders[0];

        // Sum existing payments
        const [[{ paid }]] = await conn.query(
            `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE order_id = ?`, [order_id]
        );

        const remaining = order.total_amount - paid;
        if (remaining <= 0) { await conn.rollback(); return badRequest(res, 'Order is already fully paid'); }

        const change_amount = amount > remaining ? (amount - remaining) : 0;

        const [result] = await conn.query(
            `INSERT INTO payments (order_id, payment_method_id, processed_by, amount, change_amount, reference_number, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [order_id, payment_method_id, req.user.id, amount, change_amount, reference_number || null, notes || null]
        );

        // If fully paid, update status to processing
        const totalPaid = paid + amount;
        if (totalPaid >= order.total_amount) {
            const [[processingStatus]] = await conn.query(
                `SELECT id FROM order_statuses WHERE name = 'processing' LIMIT 1`
            );
            if (processingStatus) {
                await conn.query(`UPDATE orders SET status_id = ? WHERE id = ?`, [processingStatus.id, order_id]);
                await conn.query(
                    `INSERT INTO order_status_logs (order_id, from_status_id, to_status_id, changed_by, reason)
                     VALUES (?, ?, ?, ?, 'Payment completed')`,
                    [order_id, order.status_id, processingStatus.id, req.user.id]
                );
            }
        }

        await conn.commit();
        return created(res, { id: result.insertId, amount, change_amount }, 'Payment recorded');
    } catch (err) { await conn.rollback(); next(err); }
    finally { conn.release(); }
};

/**
 * GET /api/payments?order_id=
 */
const getByOrder = async (req, res, next) => {
    try {
        const { order_id } = req.query;
        if (!order_id) return badRequest(res, 'order_id is required');

        const [payments] = await db.query(
            `SELECT p.*, pm.name AS method_name FROM payments p
             JOIN payment_methods pm ON pm.id = p.payment_method_id
             WHERE p.order_id = ? ORDER BY p.paid_at ASC`, [order_id]
        );
        return success(res, payments);
    } catch (err) { next(err); }
};

/**
 * GET /api/payment-methods
 */
const getMethods = async (req, res, next) => {
    try {
        const [methods] = await db.query(`SELECT * FROM payment_methods WHERE is_active = 1`);
        return success(res, methods);
    } catch (err) { next(err); }
};

module.exports = { create, getByOrder, getMethods };
