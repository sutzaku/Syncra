const db = require('../config/db');
const { success, created, notFound, badRequest } = require('../utils/response');

/**
 * GET /api/products
 * Query: ?page=1&limit=10&category_id=&search=
 */
const getAll = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { category_id, search } = req.query;

        let whereClause = 'WHERE p.deleted_at IS NULL';
        const params = [];

        if (category_id) {
            whereClause += ' AND p.category_id = ?';
            params.push(category_id);
        }

        if (search) {
            whereClause += ' AND p.name LIKE ?';
            params.push(`%${search}%`);
        }

        const [products] = await db.query(
            `SELECT p.id, p.name, p.slug, p.description, p.image_url, p.is_active,
                    c.name AS category_name, p.category_id, p.created_at
             FROM products p
             JOIN categories c ON c.id = p.category_id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Fetch variants for each product
        if (products.length > 0) {
            const productIds = products.map(p => p.id);
            const [variants] = await db.query(
                `SELECT id, product_id, name, sku, price, is_default, is_active
                 FROM product_variants
                 WHERE product_id IN (?) AND deleted_at IS NULL
                 ORDER BY is_default DESC, name ASC`,
                [productIds]
            );

            // Group variants by product_id
            for (const product of products) {
                product.variants = variants.filter(v => v.product_id === product.id);
            }
        }

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
            params
        );

        return success(res, {
            products,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/products/:id
 */
const getById = async (req, res, next) => {
    try {
        const [products] = await db.query(
            `SELECT p.id, p.name, p.slug, p.description, p.image_url, p.is_active,
                    c.name AS category_name, p.category_id, p.created_at
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.id = ? AND p.deleted_at IS NULL
             LIMIT 1`,
            [req.params.id]
        );

        if (products.length === 0) {
            return notFound(res, 'Product not found');
        }

        // Fetch variants
        const [variants] = await db.query(
            `SELECT id, name, sku, price, is_default, is_active
             FROM product_variants
             WHERE product_id = ? AND deleted_at IS NULL`,
            [req.params.id]
        );

        const product = products[0];
        product.variants = variants;

        return success(res, product);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/products
 * Body: { name, category_id, slug?, description?, image_url?, variants: [{ name, sku?, price, is_default? }] }
 */
const create = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { name, category_id, slug, description, image_url, variants } = req.body;
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check duplicate slug
        const [existing] = await conn.query(
            `SELECT id FROM products WHERE slug = ? AND deleted_at IS NULL`, [finalSlug]
        );
        if (existing.length > 0) {
            await conn.rollback();
            return badRequest(res, 'Product slug already exists');
        }

        // Insert product
        const [productResult] = await conn.query(
            `INSERT INTO products (category_id, name, slug, description, image_url)
             VALUES (?, ?, ?, ?, ?)`,
            [category_id, name, finalSlug, description || null, image_url || null]
        );

        const productId = productResult.insertId;

        // Insert variants (at least one required)
        if (!variants || variants.length === 0) {
            // Create default variant
            await conn.query(
                `INSERT INTO product_variants (product_id, name, price, is_default)
                 VALUES (?, 'Regular', 0, 1)`,
                [productId]
            );
        } else {
            for (const v of variants) {
                await conn.query(
                    `INSERT INTO product_variants (product_id, name, sku, price, is_default)
                     VALUES (?, ?, ?, ?, ?)`,
                    [productId, v.name, v.sku || null, v.price, v.is_default ? 1 : 0]
                );
            }
        }

        await conn.commit();

        return created(res, { id: productId, name, slug: finalSlug }, 'Product created successfully');
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

/**
 * PUT /api/products/:id
 */
const update = async (req, res, next) => {
    try {
        const { name, category_id, slug, description, image_url, is_active } = req.body;

        const [existing] = await db.query(
            `SELECT id FROM products WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'Product not found');
        }

        await db.query(
            `UPDATE products SET
                name = COALESCE(?, name),
                category_id = COALESCE(?, category_id),
                slug = COALESCE(?, slug),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, category_id, slug, description, image_url, is_active, req.params.id]
        );

        return success(res, null, 'Product updated successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/products/:id  (soft delete)
 */
const remove = async (req, res, next) => {
    try {
        const [existing] = await db.query(
            `SELECT id FROM products WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'Product not found');
        }

        await db.query(
            `UPDATE products SET deleted_at = NOW(), is_active = 0 WHERE id = ?`, [req.params.id]
        );

        return success(res, null, 'Product deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
