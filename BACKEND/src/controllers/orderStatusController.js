const db = require('../config/db');
const { success, notFound, badRequest } = require('../utils/response');

/**
 * PUT /api/orders/:id/status
 * Body: { status_name, reason? }
 */
const updateStatus = async (req, res, next) => {
    try {
        const { status_name, reason } = req.body;
        if (!status_name) return badRequest(res, 'status_name is required');

        const [orders] = await db.query(
            `SELECT id, status_id FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [req.params.id]
        );
        if (!orders.length) return notFound(res, 'Order not found');
        const order = orders[0];

        const [statuses] = await db.query(
            `SELECT id FROM order_statuses WHERE name = ? LIMIT 1`, [status_name]
        );
        if (!statuses.length) return badRequest(res, 'Invalid status name');
        const newStatusId = statuses[0].id;

        if (order.status_id === newStatusId) return badRequest(res, 'Order is already in this status');

        await db.query(`UPDATE orders SET status_id = ? WHERE id = ?`, [newStatusId, req.params.id]);
        await db.query(
            `INSERT INTO order_status_logs (order_id, from_status_id, to_status_id, changed_by, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.params.id, order.status_id, newStatusId, req.user.id, reason || null]
        );
        return success(res, null, `Order status updated to ${status_name}`);
    } catch (err) { next(err); }
};

/**
 * GET /api/orders/:id/status-logs
 */
const getStatusLogs = async (req, res, next) => {
    try {
        const [logs] = await db.query(
            `SELECT osl.id, os_from.name AS from_status, os_to.name AS to_status,
                    u.full_name AS changed_by_name, osl.reason, osl.created_at
             FROM order_status_logs osl
             LEFT JOIN order_statuses os_from ON os_from.id = osl.from_status_id
             JOIN order_statuses os_to ON os_to.id = osl.to_status_id
             LEFT JOIN users u ON u.id = osl.changed_by
             WHERE osl.order_id = ? ORDER BY osl.created_at ASC`, [req.params.id]
        );
        return success(res, logs);
    } catch (err) { next(err); }
};

/**
 * GET /api/order-statuses
 */
const getAllStatuses = async (req, res, next) => {
    try {
        const [statuses] = await db.query(`SELECT * FROM order_statuses ORDER BY sort_order ASC`);
        return success(res, statuses);
    } catch (err) { next(err); }
};

module.exports = { updateStatus, getStatusLogs, getAllStatuses };
