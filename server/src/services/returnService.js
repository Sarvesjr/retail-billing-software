import { getPool, withTransaction } from '../config/db.js';

export async function createSalesReturn({ sale_id, customer_id, items, refund_mode = 'CASH', reason }) {
  if (!items || items.length === 0) throw new Error('Return items are required');

  return await withTransaction(async (conn) => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM sales_returns WHERE return_no LIKE ?`,
      [`SR-${todayStr}-%`]
    );
    const seq = String(countRows[0].count + 1).padStart(4, '0');
    const returnNo = `SR-${todayStr}-${seq}`;

    let totalAmount = 0;
    for (const i of items) {
      totalAmount += Number(i.quantity) * Number(i.refund_price);
    }

    const [rRes] = await conn.query(
      `INSERT INTO sales_returns (return_no, sale_id, customer_id, total_amount, refund_mode, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [returnNo, sale_id || null, customer_id || null, totalAmount, refund_mode, reason || null]
    );
    const returnId = rRes.insertId;

    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.refund_price);
      const lineTotal = qty * price;
      const restock = item.restocked !== false;

      await conn.query(
        `INSERT INTO sales_return_items (sales_return_id, product_id, quantity, refund_price, line_total, restocked)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [returnId, item.product_id, qty, price, lineTotal, restock]
      );

      // If restocked, add back to inventory and log in stock_movements
      if (restock) {
        const [sRows] = await conn.query(
          `SELECT current_stock FROM product_stock WHERE product_id = ? FOR UPDATE`,
          [item.product_id]
        );
        const before = sRows.length > 0 ? Number(sRows[0].current_stock) : 0;
        const after = before + qty;

        await conn.query(`UPDATE product_stock SET current_stock = ? WHERE product_id = ?`, [after, item.product_id]);
        await conn.query(
          `INSERT INTO stock_movements (product_id, movement_type, reference_id, reference_no, quantity, stock_before, stock_after, notes)
           VALUES (?, 'SALE_RETURN', ?, ?, ?, ?, ?, ?)`,
          [item.product_id, returnId, returnNo, qty, before, after, `Sales Return ${returnNo}`]
        );
      }
    }

    // If customer credit adjust
    if (refund_mode === 'CREDIT_ADJUST' && customer_id) {
      await conn.query(
        `UPDATE customers SET current_balance = GREATEST(0, current_balance - ?) WHERE id = ?`,
        [totalAmount, customer_id]
      );
    }

    return { returnId, returnNo, totalAmount };
  });
}

export async function getSalesReturns() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT sr.*, s.invoice_no, c.name AS customer_name, COUNT(sri.id) AS item_count
     FROM sales_returns sr
     LEFT JOIN sales s ON sr.sale_id = s.id
     LEFT JOIN customers c ON sr.customer_id = c.id
     LEFT JOIN sales_return_items sri ON sr.id = sri.sales_return_id
     GROUP BY sr.id
     ORDER BY sr.id DESC`
  );
  return rows;
}

