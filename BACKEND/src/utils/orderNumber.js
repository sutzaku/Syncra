/**
 * Generates a unique order number: ORD-YYYYMMDD-XXXX
 * Uses the current date + a random 4-digit suffix for uniqueness.
 * In high-volume production, replace with a DB sequence.
 */

const db = require('../config/db');

const generateOrderNumber = async () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Count today's orders to get next sequence
    const [rows] = await db.query(
        `SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE()`
    );
    const seq = (rows[0].count + 1).toString().padStart(4, '0');

    return `ORD-${dateStr}-${seq}`;
};

module.exports = { generateOrderNumber };
