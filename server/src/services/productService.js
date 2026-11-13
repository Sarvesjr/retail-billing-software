import { getPool, withTransaction } from '../config/db.js';

export async function getAllProducts({ search = '', categoryId = null, limit = 100, offset = 0 } = {}) {
  const pool = getPool();
  let whereClauses = ['p.is_active = TRUE'];
  const params = [];

  if (search && search.trim() !== '') {
    whereClauses.push('(p.name LIKE ? OR p.tamil_name LIKE ? OR p.sku LIKE ? OR pb.barcode LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (categoryId) {
    whereClauses.push('p.category_id = ?');
    params.push(categoryId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.tamil_name,
      p.category_id,
      c.name AS category_name,
      c.tamil_name AS category_tamil_name,
      p.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.tamil_name AS unit_tamil_name,
      p.hsn_code,
      p.gst_rate,
      p.purchase_price,
      p.selling_price,
      p.mrp,
      p.min_stock_level,
      p.is_active,
      COALESCE(ps.current_stock, 0) AS current_stock,
      GROUP_CONCAT(DISTINCT pb.barcode ORDER BY pb.is_primary DESC SEPARATOR ', ') AS barcodes,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN product_stock ps ON p.id = ps.product_id
    LEFT JOIN product_barcodes pb ON p.id = pb.product_id
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(Number(limit), Number(offset));
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getProductById(id) {
  const pool = getPool();
  const sql = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.tamil_name,
      p.category_id,
      c.name AS category_name,
      c.tamil_name AS category_tamil_name,
      p.unit_id,
      u.code AS unit_code,
      u.name AS unit_name,
      u.tamil_name AS unit_tamil_name,
      p.hsn_code,
      p.gst_rate,
      p.purchase_price,
      p.selling_price,
      p.mrp,
      p.min_stock_level,
      p.is_active,
      COALESCE(ps.current_stock, 0) AS current_stock,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN product_stock ps ON p.id = ps.product_id
    WHERE p.id = ?
  `;
  const [products] = await pool.query(sql, [id]);
  if (!products.length) return null;

  const product = products[0];

  // Fetch all associated barcodes
  const [barcodes] = await pool.query(
    'SELECT id, barcode, is_primary, barcode_type FROM product_barcodes WHERE product_id = ? ORDER BY is_primary DESC',
    [id]
  );
  product.barcodes = barcodes;

  return product;
}

export async function createProduct(productData) {
  return await withTransaction(async (conn) => {
    const {
      sku,
      name,
      tamil_name,
      category_id,
      unit_id,
      hsn_code,
      gst_rate = 0,
      purchase_price = 0,
      selling_price = 0,
      mrp = 0,
      min_stock_level = 0,
      barcodes = [],
      opening_stock = 0
    } = productData;

    // 1. Insert product
    const insertProductSql = `
      INSERT INTO products (
        sku, name, tamil_name, category_id, unit_id,
        hsn_code, gst_rate, purchase_price, selling_price, mrp, min_stock_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [prodResult] = await conn.execute(insertProductSql, [
      sku.trim(),
      name.trim(),
      tamil_name ? tamil_name.trim() : null,
      category_id || null,
      unit_id,
      hsn_code ? hsn_code.trim() : null,
      gst_rate,
      purchase_price,
      selling_price,
      mrp,
      min_stock_level
    ]);

    const productId = prodResult.insertId;

    // 2. Insert barcodes (treating barcodes STRICTLY as strings)
    const validBarcodes = (Array.isArray(barcodes) ? barcodes : [barcodes])
      .map(b => (typeof b === 'object' ? b.barcode : b))
      .filter(b => b && String(b).trim() !== '');

    for (let i = 0; i < validBarcodes.length; i++) {
      const barcodeStr = String(validBarcodes[i]).trim();
      const isPrimary = i === 0;
      await conn.execute(
        'INSERT INTO product_barcodes (product_id, barcode, is_primary) VALUES (?, ?, ?)',
        [productId, barcodeStr, isPrimary]
      );
    }

    // 3. Initialize Stock balance table
    const openingStockQty = Number(opening_stock) || 0;
    await conn.execute(
      'INSERT INTO product_stock (product_id, current_stock) VALUES (?, ?)',
      [productId, openingStockQty]
    );

    // 4. Record stock movement if opening stock > 0
    if (openingStockQty > 0) {
      await conn.execute(
        `INSERT INTO stock_movements (
          product_id, movement_type, reference_no, quantity,
          stock_before, stock_after, cost_price, notes
        ) VALUES (?, 'OPENING', 'OPENING-STOCK', ?, 0.000, ?, ?, 'Initial opening stock entry')`,
        [productId, openingStockQty, openingStockQty, purchase_price]
      );
    }

    // 5. Audit log
    await conn.execute(
      `INSERT INTO audit_logs (action, entity_name, entity_id, details) VALUES ('CREATE', 'PRODUCT', ?, ?)`,
      [productId, JSON.stringify({ sku, name, opening_stock: openingStockQty })]
    );

    return { id: productId, sku, name, current_stock: openingStockQty };
  });
}

