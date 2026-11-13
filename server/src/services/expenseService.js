import { getPool } from '../config/db.js';

export async function getExpenseCategories() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ec.*, COUNT(e.id) AS expense_count, COALESCE(SUM(e.amount), 0) AS total_spent
     FROM expense_categories ec
     LEFT JOIN expenses e ON ec.id = e.category_id
     GROUP BY ec.id
     ORDER BY ec.name ASC`
  );
  return rows;
}

export async function createExpenseCategory({ name, tamil_name }) {
  if (!name || !name.trim()) throw new Error('Category name is required');
  const pool = getPool();
  const [res] = await pool.query(
    'INSERT INTO expense_categories (name, tamil_name) VALUES (?, ?)',
    [name.trim(), tamil_name?.trim() || null]
  );
  return { id: res.insertId, name: name.trim(), tamil_name: tamil_name?.trim() || null };
}

export async function getExpenses({ limit = 50, startDate = null, endDate = null } = {}) {
  const pool = getPool();
  let whereClauses = [];
  const params = [];

  if (startDate) {
    whereClauses.push('e.expense_date >= ?');
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push('e.expense_date <= ?');
    params.push(endDate);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT 
      e.*,
      ec.name AS category_name,
      ec.tamil_name AS category_tamil_name
    FROM expenses e
    JOIN expense_categories ec ON e.category_id = ec.id
    ${whereSql}
    ORDER BY e.expense_date DESC, e.id DESC
    LIMIT ?`,
    [...params, Number(limit)]
  );

  return rows;
}

export async function createExpense(data) {
  const {
    category_id,
    title,
    amount,
    payment_mode = 'CASH',
    expense_date = new Date().toISOString().slice(0, 10),
    notes
  } = data;

  const numAmount = Number(amount);
  if (!category_id || !title || numAmount <= 0) {
    throw new Error('Category, description title, and positive amount are required');
  }

  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO expenses (category_id, title, amount, payment_mode, expense_date, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [category_id, title.trim(), numAmount, payment_mode, expense_date, notes?.trim() || null]
  );

  return { id: result.insertId, ...data, amount: numAmount };
}

export async function deleteExpense(id) {
  const pool = getPool();
  await pool.query('DELETE FROM expenses WHERE id = ?', [id]);
  return { success: true };
}

