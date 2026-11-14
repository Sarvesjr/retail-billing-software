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

export async function updateProduct(id, productData) {
  return await withTransaction(async (conn) => {
    const {
      name,
      tamil_name,
      category_id,
      unit_id,
      hsn_code,
      gst_rate,
      purchase_price,
      selling_price,
      mrp,
      min_stock_level,
      barcodes,
      current_stock
    } = productData;

    // Check existing
    const [existing] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [id]);
    if (existing.length === 0) {
      throw new Error(`Product #${id} not found.`);
    }

    const currentProd = existing[0];

    // 1. Update product table
    await conn.execute(
      `UPDATE products SET
        name = COALESCE(?, name),
        tamil_name = ?,
        category_id = ?,
        unit_id = COALESCE(?, unit_id),
        hsn_code = ?,
        gst_rate = COALESCE(?, gst_rate),
        purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price),
        mrp = COALESCE(?, mrp),
        min_stock_level = COALESCE(?, min_stock_level)
       WHERE id = ?`,
      [
        name ? name.trim() : currentProd.name,
        tamil_name !== undefined ? (tamil_name ? tamil_name.trim() : null) : currentProd.tamil_name,
        category_id !== undefined ? (category_id ? Number(category_id) : null) : currentProd.category_id,
        unit_id !== undefined ? Number(unit_id) : currentProd.unit_id,
        hsn_code !== undefined ? (hsn_code ? hsn_code.trim() : null) : currentProd.hsn_code,
        gst_rate !== undefined ? Number(gst_rate) : currentProd.gst_rate,
        purchase_price !== undefined ? Number(purchase_price) : currentProd.purchase_price,
        selling_price !== undefined ? Number(selling_price) : currentProd.selling_price,
        mrp !== undefined ? Number(mrp) : currentProd.mrp,
        min_stock_level !== undefined ? Number(min_stock_level) : currentProd.min_stock_level,
        id
      ]
    );

    // 2. If barcode provided, ensure it is assigned to this product
    if (barcodes !== undefined) {
      const validBarcodes = (Array.isArray(barcodes) ? barcodes : [barcodes])
        .map(b => (typeof b === 'object' ? b.barcode : b))
        .filter(b => b && String(b).trim() !== '');

      for (let i = 0; i < validBarcodes.length; i++) {
        const barcodeStr = String(validBarcodes[i]).trim();
        const [existingBc] = await conn.query('SELECT product_id FROM product_barcodes WHERE barcode = ?', [barcodeStr]);
        if (existingBc.length > 0) {
          if (existingBc[0].product_id !== id) {
            throw new Error(`Barcode "${barcodeStr}" is already assigned to another product.`);
          }
        } else {
          await conn.execute(
            'INSERT INTO product_barcodes (product_id, barcode, is_primary) VALUES (?, ?, ?)',
            [id, barcodeStr, i === 0]
          );
        }
      }
    }

    // 3. Update stock if current_stock provided
    if (current_stock !== undefined && current_stock !== null && current_stock !== '') {
      const newStock = Number(current_stock);
      const [stockRow] = await conn.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [id]);
      const oldStock = stockRow.length ? Number(stockRow[0].current_stock) : 0;
      if (newStock !== oldStock) {
        if (stockRow.length) {
          await conn.execute('UPDATE product_stock SET current_stock = ? WHERE product_id = ?', [newStock, id]);
        } else {
          await conn.execute('INSERT INTO product_stock (product_id, current_stock) VALUES (?, ?)', [id, newStock]);
        }
        await conn.execute(
          `INSERT INTO stock_movements (
            product_id, movement_type, reference_no, quantity,
            stock_before, stock_after, notes
          ) VALUES (?, 'ADJUSTMENT_ADD', 'STOCK-UPDATE', ?, ?, ?, 'Stock updated via Product Edit')`,
          [id, newStock - oldStock, oldStock, newStock]
        );
      }
    }

    // 4. Audit log
    await conn.execute(
      `INSERT INTO audit_logs (action, entity_name, entity_id, details) VALUES ('UPDATE', 'PRODUCT', ?, ?)`,
      [id, JSON.stringify({ name: name || currentProd.name, selling_price, current_stock })]
    );

    return { id, name: name || currentProd.name, updated: true };
  });
}

