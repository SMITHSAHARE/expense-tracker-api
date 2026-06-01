const { all, get } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

// GET /api/analytics/summary?start_date=&end_date=
function getSummary(req, res) {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return errorResponse(res, 'start_date and end_date are required', 400);
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
      return errorResponse(res, 'start_date and end_date must be valid dates', 400);
    }

    const totals = all(
      `SELECT type, SUM(amount) as total
       FROM transactions
       WHERE user_id = ? AND date >= ? AND date <= ?
       GROUP BY type`,
      [userId, start_date, end_date]
    );

    let total_income = 0;
    let total_expenses = 0;

    totals.forEach(row => {
      if (row.type === 'income') total_income = row.total;
      if (row.type === 'expense') total_expenses = row.total;
    });

    const net_balance = total_income - total_expenses;

    return successResponse(
      res,
      {
        period: { start_date, end_date },
        total_income: Number(total_income.toFixed(2)),
        total_expenses: Number(total_expenses.toFixed(2)),
        net_balance: Number(net_balance.toFixed(2)),
      },
      'Summary fetched successfully'
    );
  } catch (err) {
    console.error('GetSummary error:', err.message);
    return errorResponse(res, 'Could not fetch summary.', 500);
  }
}

// GET /api/analytics/breakdown?start_date=&end_date=
function getCategoryBreakdown(req, res) {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return errorResponse(res, 'start_date and end_date are required', 400);
    }
    if (isNaN(Date.parse(start_date)) || isNaN(Date.parse(end_date))) {
      return errorResponse(res, 'start_date and end_date must be valid dates', 400);
    }

    // Total expenses for percentage calculation
    const totalResult = get(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
      [userId, start_date, end_date]
    );
    const totalExpenses = totalResult?.total || 0;

    const breakdown = all(
      `SELECT 
         c.name as category, 
         COUNT(t.id) as transaction_count,
         SUM(t.amount) as total_amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id, c.name
       ORDER BY total_amount DESC`,
      [userId, start_date, end_date]
    );

    const result = breakdown.map(row => ({
      category: row.category || 'Uncategorized',
      transaction_count: row.transaction_count,
      total_amount: Number(Number(row.total_amount).toFixed(2)),
      percentage:
        totalExpenses > 0
          ? Number(((row.total_amount / totalExpenses) * 100).toFixed(2))
          : 0,
    }));

    return successResponse(
      res,
      {
        period: { start_date, end_date },
        total_expenses: Number(Number(totalExpenses).toFixed(2)),
        breakdown: result,
      },
      'Category breakdown fetched successfully'
    );
  } catch (err) {
    console.error('GetCategoryBreakdown error:', err.message);
    return errorResponse(res, 'Could not fetch category breakdown.', 500);
  }
}

// GET /api/analytics/monthly?months=6
function getMonthlyTrend(req, res) {
  try {
    const userId = req.user.id;
    const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 6));

    // Generate last N months
    const monthlyData = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;

      // Last day of month
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      const rows = all(
        `SELECT type, COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE user_id = ? AND date >= ? AND date <= ?
         GROUP BY type`,
        [userId, startDate, endDate]
      );

      let income = 0;
      let expenses = 0;
      rows.forEach(r => {
        if (r.type === 'income') income = r.total;
        if (r.type === 'expense') expenses = r.total;
      });

      monthlyData.push({
        month: `${year}-${month}`,
        income: Number(Number(income).toFixed(2)),
        expenses: Number(Number(expenses).toFixed(2)),
        net: Number((income - expenses).toFixed(2)),
      });
    }

    return successResponse(
      res,
      { months_requested: months, monthly_summary: monthlyData },
      'Monthly trend fetched successfully'
    );
  } catch (err) {
    console.error('GetMonthlyTrend error:', err.message);
    return errorResponse(res, 'Could not fetch monthly trend.', 500);
  }
}

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrend };
        
