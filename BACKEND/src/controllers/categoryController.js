const db = require('../config/db');
const { success, created, notFound, badRequest } = require('../utils/response');

/**
 * GET /api/categories
 */
const getAll = async (req, res, next) => {
    try {
        const [categories] = await db.query(
            `SELECT c.id, c.name, c.slug, c.description, c.sort_order, c.is_active,
                    p.name AS parent_name, c.parent_id, c.created_at
             FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             WHERE c.deleted_at IS NULL
             ORDER BY c.sort_order ASC, c.name ASC`
        );

        return success(res, categories);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/categories/:id
 */
const getById = async (req, res, next) => {
    try {
        const [categories] = await db.query(
            `SELECT c.id, c.name, c.slug, c.description, c.sort_order, c.is_active,
                    p.name AS parent_name, c.parent_id, c.created_at
             FROM categories c
             LEFT JOIN categories p ON p.id = c.parent_id
             WHERE c.id = ? AND c.deleted_at IS NULL
             LIMIT 1`,
            [req.params.id]
        );

        if (categories.length === 0) {
            return notFound(res, 'Category not found');
        }

        return success(res, categories[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/categories
 * Body: { name, slug?, description?, parent_id?, sort_order? }
 */
const create = async (req, res, next) => {
    try {
        const { name, slug, description, parent_id, sort_order } = req.body;

        // Auto-generate slug if not provided
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Check duplicate slug
        const [existing] = await db.query(
            `SELECT id FROM categories WHERE slug = ? AND deleted_at IS NULL`, [finalSlug]
        );
        if (existing.length > 0) {
            return badRequest(res, 'Category slug already exists');
        }

        const [result] = await db.query(
            `INSERT INTO categories (name, slug, description, parent_id, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [name, finalSlug, description || null, parent_id || null, sort_order || 0]
        );

        return created(res, { id: result.insertId, name, slug: finalSlug }, 'Category created successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/categories/:id
 */
const update = async (req, res, next) => {
    try {
        const { name, slug, description, parent_id, sort_order, is_active } = req.body;

        const [existing] = await db.query(
            `SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'Category not found');
        }

        await db.query(
            `UPDATE categories SET
                name = COALESCE(?, name),
                slug = COALESCE(?, slug),
                description = COALESCE(?, description),
                parent_id = COALESCE(?, parent_id),
                sort_order = COALESCE(?, sort_order),
                is_active = COALESCE(?, is_active)
             WHERE id = ?`,
            [name, slug, description, parent_id, sort_order, is_active, req.params.id]
        );

        return success(res, null, 'Category updated successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/categories/:id  (soft delete)
 */
const remove = async (req, res, next) => {
    try {
        const [existing] = await db.query(
            `SELECT id FROM categories WHERE id = ? AND deleted_at IS NULL`, [req.params.id]
        );
        if (existing.length === 0) {
            return notFound(res, 'Category not found');
        }

        await db.query(
            `UPDATE categories SET deleted_at = NOW() WHERE id = ?`, [req.params.id]
        );

        return success(res, null, 'Category deleted successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
