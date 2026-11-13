import { getPool, withTransaction } from '../config/db.js';

export async function getInventorySummary({ search = '', lowStockOnly = false } = {}) {
  const pool = getPool();
  let whereClauses = ['p.is_active = TRUE'];
  const params = [];

  if (search && search.trim()) {
    whereClauses.push('(p.name LIKE ? OR p.tamil_name LIKE ? OR p.sku LIKE ? OR pb.barcode LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  if (lowStockOnly) {
    whereClauses.push('COALESCE(ps.current_stock, 0) <= p.min_stock_level');
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT 
      p.id,
      p.sku,
      p.name,
      p.tamil_name,
      c.name AS category_name,
      u.code AS unit_code,
      p.purchase_price,
      p.selling_price,
      p.mrp,
      p.min_stock_level,
      COALESCE(ps.current_stock, 0) AS current_stock,
      (COALESCE(ps.current_stock, 0) * p.purchase_price) AS total_cost_value,
      (COALESCE(ps.current_stock, 0) * p.selling_price) AS total_selling_value,
      CASE 
        WHEN COALESCE(ps.current_stock, 0) <= 0 THEN 'OUT_OF_STOCK'
        WHEN COALESCE(ps.current_stock, 0) <= p.min_stock_level THEN 'LOW_STOCK'
        ELSE 'NORMAL'
      END AS stock_status,
      GROUP_CONCAT(DISTINCT pb.barcode SEPARATOR ', ') AS barcodes
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN product_stock ps ON p.id = ps.product_id
    LEFT JOIN product_barcodes pb ON p.id = pb.product_id
    ${whereSql}
    GROUP BY p.id
    ORDER BY 
      CASE WHEN COALESCE(ps.current_stock, 0) <= p.min_stock_level THEN 0 ELSE 1 END,
      p.name ASC`,
    params
  );

  return rows;
}

export async function adjustStock({ product_id, adjustment_type, quantity, notes }) {
  const numQty = Number(quantity);
  if (!product_id || numQty <= 0) {
    throw new Error('Valid product and positive quantity required');
  }

  const movementType = adjustment_type === 'SUB' ? 'ADJUSTMENT_SUB' : 'ADJUSTMENT_ADD';

  return await withTransaction(async (conn) => {
    const [stockRows] = await conn.query(
      `SELECT ps.current_stock, p.name, p.purchase_price
       FROM products p
       JOIN product_stock ps ON p.id = ps.product_id
       WHERE p.id = ? FOR UPDATE`,
      [product_id]
    );

    if (stockRows.length === 0) throw new Error('Product stock record not found');

    const beforeStock = Number(stockRows[0].current_stock);
    let afterStock = beforeStock;

    if (adjustment_type === 'SUB') {
      afterStock = beforeStock - numQty;
    } else {
      afterStock = beforeStock + numQty;
    }

    await conn.query(
      `UPDATE product_stock SET current_stock = ? WHERE product_id = ?`,
      [afterStock, product_id]
    );

    await conn.query(
      `INSERT INTO stock_movements (
        product_id, movement_type, reference_no, quantity, stock_before, stock_after, cost_price, notes
      ) VALUES (?, ?, 'MANUAL_ADJ', ?, ?, ?, ?, ?)`,
      [
        product_id,
        movementType,
        adjustment_type === 'SUB' ? -numQty : numQty,
        beforeStock,
        afterStock,
        stockRows[0].purchase_price,
        notes || (adjustment_type === 'SUB' ? 'Stock Reduction (Damage/Expiry)' : 'Stock Addition (Audit Adjustment)')
      ]
    );

    return {
      product_id,
      product_name: stockRows[0].name,
      stockBefore: beforeStock,
      stockAfter: afterStock,
      adjustedQty: numQty,
      adjustmentType: adjustment_type
    };
  });
}

export async function getStockMovements({ limit = 50, product_id = null } = {}) {
  const pool = getPool();
  let sql = `
    SELECT 
      sm.*,
      p.name AS product_name,
      p.tamil_name AS product_tamil_name,
      p.sku,
      u.code AS unit_code
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    LEFT JOIN units u ON p.unit_id = u.id
  `;
  const params = [];

  if (product_id) {
    sql += ' WHERE sm.product_id = ? ';
    params.push(product_id);
  }

  sql += ' ORDER BY sm.id DESC LIMIT ? ';
  params.push(Number(limit));

  const [rows] = await pool.query(sql, params);
  return rows;
}

