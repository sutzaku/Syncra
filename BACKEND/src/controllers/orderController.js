const db = require('../config/db');
const { success, created, notFound, badRequest } = require('../utils/response');
const { generateOrderNumber } = require('../utils/orderNumber');

/**
 * GET /api/orders
 */
const getAll = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [orders] = await db.query(
            `SELECT o.id, o.order_number, o.table_number, o.subtotal, o.discount_amount,
                    o.tax_amount, o.total_amount, o.notes, o.created_at,
                    os.name AS status, u.full_name AS cashier, c.full_name AS customer
             FROM orders o
             JOIN order_statuses os ON os.id = o.status_id
             JOIN users u ON u.id = o.cashier_id
             LEFT JOIN customers c ON c.id = o.customer_id
             WHERE o.deleted_at IS NULL
             ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM orders WHERE deleted_at IS NULL`
        );

        return success(res, { orders, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
    } catch (err) { next(err); }
};

/**
 * GET /api/orders/:id
 */
const getById = async (req, res, next) => {
    try {
        const [orders] = await db.query(
            `SELECT o.*, os.name AS status, u.full_name AS cashier, c.full_name AS customer
             FROM orders o
             JOIN order_statuses os ON os.id = o.status_id
             JOIN users u ON u.id = o.cashier_id
             LEFT JOIN customers c ON c.id = o.customer_id
             WHERE o.id = ? AND o.deleted_at IS NULL LIMIT 1`,
            [req.params.id]
        );
        if (!orders.length) return notFound(res, 'Order not found');

        const order = orders[0];

        // Fetch items
        const [items] = await db.query(
            `SELECT * FROM order_items WHERE order_id = ?`, [order.id]
        );

        // Fetch addons per item
        for (const item of items) {
            const [addons] = await db.query(
                `SELECT * FROM order_item_addons WHERE order_item_id = ?`, [item.id]
            );
            item.addons = addons;
        }
        order.items = items;

        // Fetch payments
        const [payments] = await db.query(
            `SELECT p.*, pm.name AS method_name FROM payments p
             JOIN payment_methods pm ON pm.id = p.payment_method_id
             WHERE p.order_id = ?`, [order.id]
        );
        order.payments = payments;

        // Fetch status logs
        const [logs] = await db.query(
            `SELECT osl.*, os_from.name AS from_status, os_to.name AS to_status, u.full_name AS changed_by_name
             FROM order_status_logs osl
             LEFT JOIN order_statuses os_from ON os_from.id = osl.from_status_id
             JOIN order_statuses os_to ON os_to.id = osl.to_status_id
             LEFT JOIN users u ON u.id = osl.changed_by
             WHERE osl.order_id = ? ORDER BY osl.created_at ASC`, [order.id]
        );
        order.status_logs = logs;

        return success(res, order);
    } catch (err) { next(err); }
};

/**
 * POST /api/orders
 * Body: {
 *   customer_id?, table_number?, notes?,
 *   discount_amount?, tax_amount?,
 *   items: [{ product_variant_id, quantity, discount_amount?, notes?,
 *             addons?: [{ addon_id, quantity? }] }]
 * }
 */
const create = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { customer_id, table_number, notes, discount_amount, tax_amount, items } = req.body;

        if (!items || items.length === 0) {
            await conn.rollback();
            return badRequest(res, 'Order must have at least one item');
        }

        const order_number = await generateOrderNumber();
        const cashier_id = req.user.id;

        // Get pending status
        const [[pendingStatus]] = await conn.query(
            `SELECT id FROM order_statuses WHERE name = 'pending' LIMIT 1`
        );

        let subtotal = 0;

        // Validate items and calculate subtotal
        const itemsData = [];
        for (const item of items) {
            const [variants] = await conn.query(
                `SELECT pv.id, pv.name AS variant_name, pv.price, p.name AS product_name
                 FROM product_variants pv
                 JOIN products p ON p.id = pv.product_id
                 WHERE pv.id = ? AND pv.deleted_at IS NULL AND p.deleted_at IS NULL LIMIT 1`,
                [item.product_variant_id]
            );
            if (!variants.length) {
                await conn.rollback();
                return badRequest(res, `Product variant ${item.product_variant_id} not found`);
            }
            const variant = variants[0];
            const itemDiscount = item.discount_amount || 0;
            const line_total = (variant.price * item.quantity) - itemDiscount;

            // Process addons
            let addonItems = [];
            if (item.addons && item.addons.length > 0) {
                for (const a of item.addons) {
                    const [addons] = await conn.query(
                        `SELECT id, name, price FROM addons WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
                        [a.addon_id]
                    );
                    if (!addons.length) {
                        await conn.rollback();
                        return badRequest(res, `Addon ${a.addon_id} not found`);
                    }
                    const addon = addons[0];
                    const addonQty = a.quantity || 1;
                    addonItems.push({
                        addon_id: addon.id,
                        addon_name: addon.name,
                        unit_price: addon.price,
                        quantity: addonQty,
                        line_total: addon.price * addonQty
                    });
                }
            }

            const addonTotal = addonItems.reduce((sum, ai) => sum + ai.line_total, 0);
            const finalLineTotal = line_total + addonTotal;
            subtotal += finalLineTotal;

            itemsData.push({
                product_variant_id: variant.id,
                product_name: variant.product_name,
                variant_name: variant.variant_name,
                unit_price: variant.price,
                quantity: item.quantity,
                discount_amount: itemDiscount,
                line_total: finalLineTotal,
                notes: item.notes || null,
                addons: addonItems
            });
        }

        const finalDiscount = discount_amount || 0;
        const finalTax = tax_amount || 0;
        const total_amount = subtotal - finalDiscount + finalTax;

        // Insert order
        const [orderResult] = await conn.query(
            `INSERT INTO orders (customer_id, cashier_id, status_id, order_number, table_number, subtotal, discount_amount, tax_amount, total_amount, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id || null, cashier_id, pendingStatus.id, order_number, table_number || null, subtotal, finalDiscount, finalTax, total_amount, notes || null]
        );
        const orderId = orderResult.insertId;

        // Insert items + addons + stock movements
        for (const item of itemsData) {
            const [itemResult] = await conn.query(
                `INSERT INTO order_items (order_id, product_variant_id, product_name, variant_name, unit_price, quantity, discount_amount, line_total, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_variant_id, item.product_name, item.variant_name, item.unit_price, item.quantity, item.discount_amount, item.line_total, item.notes]
            );
            const orderItemId = itemResult.insertId;

            // Insert addons
            for (const addon of item.addons) {
                await conn.query(
                    `INSERT INTO order_item_addons (order_item_id, addon_id, addon_name, unit_price, quantity, line_total)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [orderItemId, addon.addon_id, addon.addon_name, addon.unit_price, addon.quantity, addon.line_total]
                );
            }

            // Stock movement (reduce stock)
            await conn.query(
                `INSERT INTO stock_movements (product_variant_id, order_item_id, performed_by, quantity_change, movement_type, reference)
                 VALUES (?, ?, ?, ?, 'sale', ?)`,
                [item.product_variant_id, orderItemId, cashier_id, -item.quantity, order_number]
            );
        }

        // Log initial status
        await conn.query(
            `INSERT INTO order_status_logs (order_id, from_status_id, to_status_id, changed_by, reason)
             VALUES (?, NULL, ?, ?, 'Order created')`,
            [orderId, pendingStatus.id, cashier_id]
        );

        await conn.commit();

        return created(res, { id: orderId, order_number, total_amount }, 'Order created successfully');
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getAll, getById, create };
