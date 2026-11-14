import { getPool, withTransaction } from '../config/db.js';

export async function getAllCustomers({ search = '' } = {}) {
  const pool = getPool();
  let whereSql = 'WHERE c.is_active = TRUE';
  const params = [];

  if (search && search.trim()) {
    whereSql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.tamil_name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const [rows] = await pool.query(
    `SELECT 
      c.*,
      COUNT(DISTINCT s.id) AS total_bills,
      COALESCE(SUM(s.grand_total), 0) AS total_spend
    FROM customers c
    LEFT JOIN sales s ON c.id = s.customer_id AND s.status = 'COMPLETED'
    ${whereSql}
    GROUP BY c.id
    ORDER BY c.current_balance DESC, c.name ASC`,
    params
  );
  return rows;
}

export async function createCustomer(data) {
  const pool = getPool();
  const { name, tamil_name, phone, email, gstin, address, credit_limit = 5000 } = data;

  if (!name || !name.trim()) throw new Error('Customer name is required');
  if (!phone || !phone.trim()) throw new Error('Customer phone number is required');

  const [result] = await pool.query(
    `INSERT INTO customers (name, tamil_name, phone, email, gstin, address, credit_limit, current_balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0.00)`,
    [
      name.trim(),
      tamil_name?.trim() || null,
      phone.trim(),
      email?.trim() || null,
      gstin?.trim() || null,
      address?.trim() || null,
      Number(credit_limit) || 5000
    ]
  );

  return { id: result.insertId, ...data, current_balance: 0 };
}

export async function recordCustomerPayment({ customer_id, amount, payment_mode = 'CASH', reference_no, notes }) {
  const numAmount = Number(amount);
  if (!customer_id || numAmount <= 0) {
    throw new Error('Valid customer ID and positive payment amount are required');
  }

  return await withTransaction(async (conn) => {
    // 1. Generate payment number CP-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM customer_payments WHERE payment_no LIKE ?`,
      [`CP-${todayStr}-%`]
    );
    const seq = String(countRows[0].count + 1).padStart(4, '0');
    const paymentNo = `CP-${todayStr}-${seq}`;

    // 2. Insert payment record
    await conn.query(
      `INSERT INTO customer_payments (payment_no, customer_id, amount, payment_mode, reference_no, notes, payment_date)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
      [paymentNo, customer_id, numAmount, payment_mode, reference_no || null, notes || 'Udhar Collection']
    );

    // 3. Deduct from customer's current balance (Udhar reduced)
    await conn.query(
      `UPDATE customers SET current_balance = GREATEST(0, current_balance - ?) WHERE id = ?`,
      [numAmount, customer_id]
    );

    const [updatedCust] = await conn.query(`SELECT current_balance FROM customers WHERE id = ?`, [customer_id]);

    return {
      success: true,
      paymentNo,
      amount: numAmount,
      remainingBalance: Number(updatedCust[0]?.current_balance || 0)
    };
  });
}

export async function getCustomerLedger(customerId) {
  const pool = getPool();
  const [sales] = await pool.query(
    `SELECT 'SALE' AS type, invoice_no AS ref_no, grand_total AS amount, payment_mode, created_at
     FROM sales WHERE customer_id = ?
     UNION ALL
     SELECT 'PAYMENT' AS type, payment_no AS ref_no, amount, payment_mode, created_at
     FROM customer_payments WHERE customer_id = ?
     ORDER BY created_at DESC`,
    [customerId, customerId]
  );
  return sales;
}

export async function updateCustomer(id, data) {
  const pool = getPool();
  const { name, tamil_name, phone, email, gstin, address, credit_limit } = data;

  if (!name || !name.trim()) throw new Error('Customer name is required');
  if (!phone || !phone.trim()) throw new Error('Customer phone number is required');

  // Check if phone is already used by another active customer
  const [existingPhone] = await pool.query(
    'SELECT id FROM customers WHERE phone = ? AND id != ? AND is_active = TRUE',
    [phone.trim(), id]
  );
  if (existingPhone.length > 0) {
    throw new Error(`Phone number "${phone}" is already used by another registered customer.`);
  }

  await pool.query(
    `UPDATE customers SET
      name = ?,
      tamil_name = ?,
      phone = ?,
      email = ?,
      gstin = ?,
      address = ?,
      credit_limit = ?
     WHERE id = ?`,
    [
      name.trim(),
      tamil_name?.trim() || null,
      phone.trim(),
      email?.trim() || null,
      gstin?.trim() || null,
      address?.trim() || null,
      credit_limit !== undefined ? Number(credit_limit) : 5000,
      id
    ]
  );

  return { id, ...data };
}

export async function deleteCustomer(id) {
  const pool = getPool();
  const [custRows] = await pool.query('SELECT current_balance, name FROM customers WHERE id = ?', [id]);
  if (!custRows.length) throw new Error('Customer not found');

  if (Number(custRows[0].current_balance) > 0) {
    throw new Error(
      `Cannot delete customer "${custRows[0].name}" because they have an outstanding Udhar balance of ₹${Number(custRows[0].current_balance).toFixed(2)}. Please collect the balance first.`
    );
  }

  await pool.query('UPDATE customers SET is_active = FALSE WHERE id = ?', [id]);
  return { success: true, message: `Customer "${custRows[0].name}" deleted successfully.` };
}

