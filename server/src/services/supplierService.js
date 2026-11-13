import { getPool } from '../config/db.js';

export async function getAllSuppliers() {
  const pool = getPool();
  const [rows] = await pool.query(`
    SELECT 
      s.*,
      COUNT(p.id) AS total_purchases,
      COALESCE(SUM(p.grand_total), 0) AS total_purchase_amount
    FROM suppliers s
    LEFT JOIN purchases p ON s.id = p.supplier_id AND p.status = 'RECEIVED'
    WHERE s.is_active = TRUE
    GROUP BY s.id
    ORDER BY s.name ASC
  `);
  return rows;
}

export async function createSupplier(data) {
  const pool = getPool();
  const { name, tamil_name, phone, email, gstin, address, city, opening_balance = 0 } = data;
  
  if (!name || !name.trim()) {
    throw new Error('Supplier name is required');
  }

  const [result] = await pool.query(
    `INSERT INTO suppliers (name, tamil_name, phone, email, gstin, address, city, opening_balance, current_balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name.trim(),
      tamil_name?.trim() || null,
      phone?.trim() || null,
      email?.trim() || null,
      gstin?.trim() || null,
      address?.trim() || null,
      city?.trim() || null,
      Number(opening_balance) || 0,
      Number(opening_balance) || 0
    ]
  );

  return { id: result.insertId, ...data };
}

export async function updateSupplier(id, data) {
  const pool = getPool();
  const { name, tamil_name, phone, email, gstin, address, city, is_active } = data;

  await pool.query(
    `UPDATE suppliers
     SET name = COALESCE(?, name),
         tamil_name = COALESCE(?, tamil_name),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         gstin = COALESCE(?, gstin),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [name?.trim() || null, tamil_name?.trim() || null, phone?.trim() || null, email?.trim() || null, gstin?.trim() || null, address?.trim() || null, city?.trim() || null, is_active ?? null, id]
  );

  return { id, ...data };
}
