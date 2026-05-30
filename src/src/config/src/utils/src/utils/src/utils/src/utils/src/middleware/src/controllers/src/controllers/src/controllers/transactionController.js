const { run, get, all, lastInsertRowId } = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { validateTransaction } = require('../utils/validators');

// GET /api/transactions
function getTransactions(req, res) {
  try {
    const userId = req.user.id;

    // --- Filters ---
    const { type, category_id, start_date, end_date, sort_by, sort_order, page, limit } = req.query;

    const conditions = [`t.user_id = ?`];
    const params = [userId];

    if (type) {
      if (!['income', 'expense'].includes(type)) {
        return errorResponse(res, 'type must be "income" or "expense"', 400);
      }
      conditions.push(`t.type = ?`);
      params.push(type);
    }

    if (category_id) {
      conditions.push(`t.category_id = ?`);
      params.push(Number(category_id));
    }

    if (start_date) {
      if (isNaN(Date.parse(start_date))) {
        return errorResponse(res, 'start_date must be a valid date', 400);
      }
      conditions.push(`t.date >= ?`);
      params.push(start_date);
    }

    if (end_date) {
      if (isNaN(Date.parse(end_date))) {
        return errorResponse(res, 'end_date must be a valid date', 400);
      }
      conditions.push(`t.date <= ?`);
      params.push(end_date);
    }

    // --- Sorting ---
    const validSortFields = { date: 't.date', amount: 't.amount', created_at: 't.created_at' };
    const sortField = validSortFields[sort_by] || 't.date';
    const sortDir = sort_order && sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count total for pagination
    const countResult = all(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // --- Pagination ---
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * pageSize;

    const transactions = all(
      `SELECT t.*, c.name as category_name 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       ${whereClause}
       ORDER BY ${sortField} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    return paginatedResponse(
      res,
      { transactions },
      {
        total,
        page: pageNum,
        limit: pageSize,
        total_pages: Math.ceil(total / pageSize),
        has_next: pageNum * pageSize < total,
        has_prev: pageNum > 1,
      },
      'Transactions fetched successfully'
    );
  } catch (err) {
    console.error('GetTransactions error:', err.message);
    return errorResponse(res, 'Could not fetch transactions.', 500);
  }
}

// GET /api/transactions/:id
function getTransaction(req, res) {
  try {
    const { id } = req.params;

    const transaction = get(
      `SELECT t.*, c.name as category_name 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (!transaction) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    return successResponse(res, { transaction }, 'Transaction fetched successfully');
  } catch (err) {
    console.error('GetTransaction error:', err.message);
    return errorResponse(res, 'Could not fetch transaction.', 500);
  }
}

// POST /api/transactions
function createTransaction(req, res) {
  try {
    const errors = validateTransaction(req.body);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const { type, amount, category_id, date, note } = req.body;
    const userId = req.user.id;

    // Validate category exists and is accessible to this user
    if (category_id) {
      const cat = get(
        `SELECT id FROM categories WHERE id = ? AND (is_default = 1 OR user_id = ?)`,
        [category_id, userId]
      );
      if (!cat) {
        return errorResponse(res, 'Category not found or not accessible', 404);
      }
    }

    run(
      `INSERT INTO transactions (user_id, type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, Number(amount), category_id || null, date, note || null]
    );

    const newId = lastInsertRowId();
    const transaction = get(
      `SELECT t.*, c.name as category_name 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [newId]
    );

    return successResponse(res, { transaction }, 'Transaction created successfully', 201);
  } catch (err) {
    console.error('CreateTransaction error:', err.message);
    return errorResponse(res, 'Could not create transaction.', 500);
  }
}

// PUT /api/transactions/:id
function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = get(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!existing) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    const { type, amount, category_id, date, note } = req.body;

    // Validate only provided fields
    const partialBody = {
      type: type ?? existing.type,
      amount: amount ?? existing.amount,
      date: date ?? existing.date,
    };
    if (category_id !== undefined) partialBody.category_id = category_id;

    const errors = validateTransaction(partialBody);
    if (errors.length > 0) {
      return errorResponse(res, 'Validation failed', 400, errors);
    }

    const finalCategoryId = category_id !== undefined ? category_id : existing.category_id;

    if (finalCategoryId) {
      const cat = get(
        `SELECT id FROM categories WHERE id = ? AND (is_default = 1 OR user_id = ?)`,
        [finalCategoryId, userId]
      );
      if (!cat) {
        return errorResponse(res, 'Category not found or not accessible', 404);
      }
    }

    run(
      `UPDATE transactions 
       SET type = ?, amount = ?, category_id = ?, date = ?, note = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        type ?? existing.type,
        Number(amount ?? existing.amount),
        finalCategoryId || null,
        date ?? existing.date,
        note !== undefined ? note : existing.note,
        id,
        userId,
      ]
    );

    const updated = get(
      `SELECT t.*, c.name as category_name 
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    return successResponse(res, { transaction: updated }, 'Transaction updated successfully');
  } catch (err) {
    console.error('UpdateTransaction error:', err.message);
    return errorResponse(res, 'Could not update transaction.', 500);
  }
}

// DELETE /api/transactions/:id
function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = get(`SELECT id FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!existing) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [id, userId]);

    return successResponse(res, null, 'Transaction deleted successfully');
  } catch (err) {
    console.error('DeleteTransaction error:', err.message);
    return errorResponse(res, 'Could not delete transaction.', 500);
  }
}

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
