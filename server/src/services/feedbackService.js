import { getPool } from '../config/db.js';

export async function createFeedback({ sale_id = null, invoice_no = null, customer_name = 'Walk-in Customer', customer_phone = null, rating = 5, comment = '' }) {
  const pool = getPool();
  const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
  const safeName = (customer_name && customer_name.trim()) || 'Walk-in Customer';
  const safePhone = (customer_phone && customer_phone.trim()) || null;
  const safeComment = (comment && comment.trim()) || null;
  const safeInvoice = (invoice_no && invoice_no.trim()) || null;

  const [res] = await pool.execute(
    `INSERT INTO customer_feedbacks (sale_id, invoice_no, customer_name, customer_phone, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sale_id || null, safeInvoice, safeName, safePhone, numRating, safeComment]
  );

  return {
    id: res.insertId,
    sale_id,
    invoice_no: safeInvoice,
    customer_name: safeName,
    customer_phone: safePhone,
    rating: numRating,
    comment: safeComment,
    created_at: new Date()
  };
}

export async function getFeedbacks({ limit = 100, offset = 0, search = '', minRating = null } = {}) {
  const pool = getPool();
  let whereClauses = ['1=1'];
  const params = [];

  if (search && search.trim() !== '') {
    whereClauses.push('(customer_name LIKE ? OR customer_phone LIKE ? OR invoice_no LIKE ? OR comment LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (minRating !== null && minRating !== undefined && minRating !== '') {
    whereClauses.push('rating >= ?');
    params.push(Number(minRating));
  }

  const sql = `
    SELECT * FROM customer_feedbacks
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getFeedbackStats() {
  const pool = getPool();
  const [totalRows] = await pool.query(`
    SELECT 
      COUNT(*) AS total_count,
      COALESCE(AVG(rating), 0) AS avg_rating,
      SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS stars_5,
      SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS stars_4,
      SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS stars_3,
      SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS stars_2,
      SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS stars_1
    FROM customer_feedbacks
  `);

  const stat = totalRows[0] || {};
  return {
    totalCount: Number(stat.total_count || 0),
    avgRating: Number(Number(stat.avg_rating || 0).toFixed(1)),
    stars5: Number(stat.stars_5 || 0),
    stars4: Number(stat.stars_4 || 0),
    stars3: Number(stat.stars_3 || 0),
    stars2: Number(stat.stars_2 || 0),
    stars1: Number(stat.stars_1 || 0)
  };
}
