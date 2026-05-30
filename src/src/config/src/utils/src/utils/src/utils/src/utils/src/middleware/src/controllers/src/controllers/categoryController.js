const { run, get, all, lastInsertRowId } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { validateCategory } = require('../utils/validators');

// GET /api/categories
function getCategories(req, res) {
  try {
    // Return default categories + user's own custom categories
    const categories = all(
      `SELECT id, name, is_default, user_id, created_at FROM categories 
       WHERE is_default = 1 OR user_id = ? 
       ORDER BY is_default DESC, name ASC`,
      [req.user.id]
    );
    return successResponse(res, { categories }, 'Categories fetched successfully');
  } catch (err) {
    console.error('GetCategories error:', err.message);
    return errorResponse(res, 'Could not fetch categories.', 500);
  }
}

// POST /api/categories
function createCategory(req, res) {
  try {
    const errors = validateCategory(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { name } = req.body;

    // Check if user already has a category with this name
    const existing = get(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND (user_id = ? OR is_default = 1)`,
      [name.trim(), req.user.id]
    );
    if (existing) {
      return errorResponse(res, 'A category with this name already exists', 409);
    }

    run(
      `INSERT INTO categories (name, is_default, user_id) VALUES (?, 0, ?)`,
      [name.trim(), req.user.id]
    );

    const id = lastInsertRowId();
    const category = get(`SELECT * FROM categories WHERE id = ?`, [id]);

    return successResponse(res, { category }, 'Category created successfully', 201);
  } catch (err) {
    console.error('CreateCategory error:', err.message);
    return errorResponse(res, 'Could not create category.', 500);
  }
}

// PUT /api/categories/:id
function updateCategory(req, res) {
  try {
    const { id } = req.params;

    const category = get(`SELECT * FROM categories WHERE id = ?`, [id]);

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    // Cannot update default categories
    if (category.is_default) {
      return errorResponse(res, 'Default categories cannot be modified', 403);
    }

    // Must be owner
    if (category.user_id !== req.user.id) {
      return errorResponse(res, 'You do not have permission to update this category', 403);
    }

    const errors = validateCategory(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { name } = req.body;

    // Check for name conflict
    const existing = get(
      `SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ? AND (user_id = ? OR is_default = 1)`,
      [name.trim(), id, req.user.id]
    );
    if (existing) {
      return errorResponse(res, 'A category with this name already exists', 409);
    }

    run(`UPDATE categories SET name = ? WHERE id = ?`, [name.trim(), id]);

    const updated = get(`SELECT * FROM categories WHERE id = ?`, [id]);
    return successResponse(res, { category: updated }, 'Category updated successfully');
  } catch (err) {
    console.error('UpdateCategory error:', err.message);
    return errorResponse(res, 'Could not update category.', 500);
  }
}

// DELETE /api/categories/:id
function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const category = get(`SELECT * FROM categories WHERE id = ?`, [id]);

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    if (category.is_default) {
      return errorResponse(res, 'Default categories cannot be deleted', 403);
    }

    if (category.user_id !== req.user.id) {
      return errorResponse(res, 'You do not have permission to delete this category', 403);
    }

    run(`DELETE FROM categories WHERE id = ?`, [id]);

    return successResponse(res, null, 'Category deleted successfully');
  } catch (err) {
    console.error('DeleteCategory error:', err.message);
    return errorResponse(res, 'Could not delete category.', 500);
  }
}

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
