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
      // If marked defective/damaged, don't restock into salable inventory
      const isDamagedOrExpired = item.is_damaged || item.is_expired || /damage|defect|expired|broken|leak/i.test(reason || '');
      const restock = item.restocked !== false && !isDamagedOrExpired;

      await conn.query(
        `INSERT INTO sales_return_items (sales_return_id, product_id, quantity, refund_price, line_total, restocked)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [returnId, item.product_id, qty, price, lineTotal, restock]
      );

      if (restock) {
        // Safe to resell: Add back to salable inventory
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
      } else {
        // Damaged or expired: Quarantine into damaged_stock so it CANNOT be sold, and log for supplier return
        const [pRows] = await conn.query(
          `SELECT name, supplier_id, expiry_date FROM products WHERE id = ?`,
          [item.product_id]
        );
        const prod = pRows[0] || {};

        await conn.query(
          `UPDATE products SET damaged_stock = damaged_stock + ? WHERE id = ?`,
          [qty, item.product_id]
        );

        await conn.query(
          `INSERT INTO damaged_stock_log (
            product_id, product_name, supplier_id, source, damaged_quantity,
            damage_reason, expiry_date, status
          ) VALUES (?, ?, ?, 'SALES_RETURN', ?, ?, ?, 'PENDING_RETURN')`,
          [
            item.product_id,
            prod.name || 'Returned Product',
            prod.supplier_id || null,
            qty,
            reason || 'Customer sales return - Defective/Damaged/Expired',
            prod.expiry_date || null
          ]
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

/**
 * Creates a Supplier Return (Purchase Return / Debit Note)
 * Returns damaged or expired goods to the supplier and adjusts supplier ledger
 */
export async function createPurchaseReturn({ supplier_id, purchase_id = null, debit_note_no = '', items = [], refund_mode = 'SUPPLIER_BALANCE', reason = '' }) {
  if (!supplier_id) throw new Error('Supplier is required for return');
  if (!items || items.length === 0) throw new Error('Return items are required');

  return await withTransaction(async (conn) => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM purchase_returns WHERE return_no LIKE ?`,
      [`PR-${todayStr}-%`]
    );
    const seq = String(countRows[0].count + 1).padStart(4, '0');
    const returnNo = `PR-${todayStr}-${seq}`;

    let totalAmount = 0;
    for (const it of items) {
      const q = Number(it.quantity) || 0;
      const p = Number(it.return_price || it.purchase_price) || 0;
      totalAmount += q * p;
    }

    const [prResult] = await conn.query(
      `INSERT INTO purchase_returns (return_no, purchase_id, supplier_id, total_amount, debit_note_no, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [returnNo, purchase_id || null, supplier_id, totalAmount, debit_note_no || null, reason || null]
    );
    const returnId = prResult.insertId;

    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      const price = Number(it.return_price || it.purchase_price) || 0;
      const lineTotal = qty * price;
      const isDamaged = Boolean(it.is_damaged);

      await conn.query(
        `INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, return_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [returnId, it.product_id, qty, price, lineTotal]
      );

      if (isDamaged) {
        // Deduct from damaged_stock
        await conn.query(
          `UPDATE products SET damaged_stock = GREATEST(0, damaged_stock - ?) WHERE id = ?`,
          [qty, it.product_id]
        );

        // If matched to a specific log entry, mark as returned
        if (it.damaged_log_id) {
          await conn.query(
            `UPDATE damaged_stock_log SET status = 'RETURNED_TO_SUPPLIER' WHERE id = ?`,
            [it.damaged_log_id]
          );
        } else {
          await conn.query(
            `UPDATE damaged_stock_log SET status = 'RETURNED_TO_SUPPLIER' WHERE product_id = ? AND supplier_id = ? AND status = 'PENDING_RETURN' LIMIT 1`,
            [it.product_id, supplier_id]
          );
        }
      } else {
        // Returning expired stock from regular salable inventory
        const [sRows] = await conn.query(
          `SELECT current_stock FROM product_stock WHERE product_id = ? FOR UPDATE`,
          [it.product_id]
        );
        const before = sRows.length > 0 ? Number(sRows[0].current_stock) : 0;
        const after = Math.max(0, before - qty);

        await conn.query(`UPDATE product_stock SET current_stock = ? WHERE product_id = ?`, [after, it.product_id]);
        await conn.query(
          `INSERT INTO stock_movements (product_id, movement_type, reference_id, reference_no, quantity, stock_before, stock_after, notes)
           VALUES (?, 'PURCHASE_RETURN', ?, ?, ?, ?, ?, ?)`,
          [it.product_id, returnId, returnNo, -qty, before, after, `Purchase Return to Supplier ${returnNo}`]
        );
      }
    }

    // Adjust supplier balance if returning on credit/debit note
    if (refund_mode === 'SUPPLIER_BALANCE') {
      await conn.query(
        `UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?`,
        [totalAmount, supplier_id]
      );
    }

    return { returnId, returnNo, totalAmount };
  });
}

export async function getPurchaseReturns() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pr.*, s.name AS supplier_name, s.tamil_name AS supplier_tamil_name, s.phone AS supplier_phone,
            COUNT(pri.id) AS item_count
     FROM purchase_returns pr
     JOIN suppliers s ON pr.supplier_id = s.id
     LEFT JOIN purchase_return_items pri ON pr.id = pri.purchase_return_id
     GROUP BY pr.id
     ORDER BY pr.id DESC`
  );
  return rows;
}

/**
 * Retrieves all damaged stock log records and expired items for easy supplier returning
 */
export async function getDamagedAndExpiredStock({ supplier_id = null } = {}) {
  const pool = getPool();
  let whereClauses = ["dsl.status = 'PENDING_RETURN'"];
  const params = [];

  if (supplier_id) {
    whereClauses.push('dsl.supplier_id = ?');
    params.push(supplier_id);
  }

  const [damagedLogs] = await pool.query(
    `SELECT dsl.*, p.sku, p.purchase_price, s.name AS supplier_name, s.tamil_name AS supplier_tamil_name
     FROM damaged_stock_log dsl
     JOIN products p ON dsl.product_id = p.id
     LEFT JOIN suppliers s ON dsl.supplier_id = s.id
     WHERE ${whereClauses.join(' AND ')}
     ORDER BY dsl.id DESC`,
    params
  );

  // Also query products that are expired or expiring soon (within 30 days)
  let expiredQuery = `
    SELECT p.id AS product_id, p.name AS product_name, p.sku, p.purchase_price, p.expiry_date,
           p.supplier_id, s.name AS supplier_name, s.tamil_name AS supplier_tamil_name,
           COALESCE(ps.current_stock, 0) AS current_stock,
           COALESCE(p.damaged_stock, 0) AS damaged_stock,
           DATEDIFF(p.expiry_date, CURRENT_DATE()) AS days_to_expiry
    FROM products p
    JOIN product_stock ps ON p.id = ps.product_id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.expiry_date IS NOT NULL AND p.expiry_date <= CURRENT_DATE() AND ps.current_stock > 0
  `;
  const expParams = [];
  if (supplier_id) {
    expiredQuery += ' AND p.supplier_id = ?';
    expParams.push(supplier_id);
  }
  expiredQuery += ' ORDER BY p.expiry_date ASC';

  const [expiredProducts] = await pool.query(expiredQuery, expParams);

  return {
    damagedItems: damagedLogs,
    expiredProducts
  };
}

/**
 * Quarantines damaged stock directly from the POS billing counter or inventory
 * Deducts from salable product_stock, increments products.damaged_stock, and logs to damaged_stock_log
 */
export async function quarantineDamagedStock({
  product_id,
  damaged_quantity = 1,
  damage_reason = 'Damaged at billing counter',
  source = 'BILLING_COUNTER'
}) {
  const prodId = Number(product_id);
  const qty = Math.max(1, Number(damaged_quantity) || 1);
  if (!prodId) throw new Error('Valid product ID is required');

  return await withTransaction(async (conn) => {
    // 1. Lock product & stock
    const [pRows] = await conn.query(
      `SELECT p.id, p.name, p.sku, p.supplier_id, p.expiry_date, p.damaged_stock, ps.current_stock
       FROM products p
       JOIN product_stock ps ON p.id = ps.product_id
       WHERE p.id = ? FOR UPDATE`,
      [prodId]
    );

    if (pRows.length === 0) throw new Error(`Product #${prodId} not found`);

    const prod = pRows[0];
    const beforeStock = Number(prod.current_stock || 0);
    const beforeDamaged = Number(prod.damaged_stock || 0);

    const actualDeduct = Math.min(beforeStock, qty);
    const afterStock = Math.max(0, beforeStock - actualDeduct);
    const afterDamaged = beforeDamaged + qty;

    // 2. Update stock & damaged stock
    await conn.query(
      `UPDATE product_stock SET current_stock = ? WHERE product_id = ?`,
      [afterStock, prodId]
    );

    await conn.query(
      `UPDATE products SET damaged_stock = ?, is_damaged = 1, damage_reason = ? WHERE id = ?`,
      [afterDamaged, damage_reason || 'Damaged at billing counter', prodId]
    );

    // 3. Insert into damaged_stock_log
    const [dslRes] = await conn.query(
      `INSERT INTO damaged_stock_log (
        product_id, product_name, supplier_id, source, damaged_quantity,
        damage_reason, expiry_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_RETURN')`,
      [
        prodId,
        prod.name,
        prod.supplier_id || null,
        source || 'BILLING_COUNTER',
        qty,
        damage_reason || 'Damaged at billing counter',
        prod.expiry_date || null
      ]
    );

    // 4. Log in stock movements
    await conn.query(
      `INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_no,
        quantity, stock_before, stock_after, notes
      ) VALUES (?, 'ADJUSTMENT_SUB', ?, ?, ?, ?, ?, ?)`,
      [
        prodId,
        dslRes.insertId,
        `DMG-LOG-${dslRes.insertId}`,
        -actualDeduct,
        beforeStock,
        afterStock,
        `POS Quarantine: ${damage_reason || 'Damaged at billing counter'}`
      ]
    );

    return {
      productId: prodId,
      productName: prod.name,
      quarantinedQty: qty,
      currentStock: afterStock,
      damagedStock: afterDamaged,
      logId: dslRes.insertId
    };
  });
}

