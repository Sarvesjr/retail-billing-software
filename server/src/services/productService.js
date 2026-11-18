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
      p.expiry_date,
      p.supplier_id,
      s.name AS supplier_name,
      s.tamil_name AS supplier_tamil_name,
      COALESCE(p.damaged_stock, 0) AS damaged_stock,
      p.is_damaged,
      p.damage_reason,
      p.min_stock_level,
      p.is_active,
      COALESCE(ps.current_stock, 0) AS current_stock,
      GROUP_CONCAT(DISTINCT pb.barcode ORDER BY pb.is_primary DESC SEPARATOR ', ') AS barcodes,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
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
      p.expiry_date,
      p.supplier_id,
      s.name AS supplier_name,
      s.tamil_name AS supplier_tamil_name,
      COALESCE(p.damaged_stock, 0) AS damaged_stock,
      p.is_damaged,
      p.damage_reason,
      p.min_stock_level,
      p.is_active,
      COALESCE(ps.current_stock, 0) AS current_stock,
      p.created_at,
      p.updated_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
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
      unit_id = null,
      hsn_code,
      gst_rate,
      tax_rate,
      purchase_price,
      cost_price,
      selling_price = 0,
      mrp = 0,
      expiry_date = null,
      supplier_id = null,
      is_damaged = false,
      damaged_quantity = 0,
      damage_reason = null,
      min_stock_level = 0,
      barcodes = [],
      opening_stock = 0
    } = productData;

    const finalGstRate = gst_rate !== undefined && gst_rate !== null ? Number(gst_rate) : (tax_rate !== undefined && tax_rate !== null ? Number(tax_rate) : 0);
    const finalPurchasePrice = purchase_price !== undefined && purchase_price !== null ? Number(purchase_price) : (cost_price !== undefined && cost_price !== null ? Number(cost_price) : 0);
    const finalSellingPrice = Number(selling_price) || 0;
    const finalMrp = mrp !== undefined && mrp !== null ? Number(mrp) : finalSellingPrice;
    const finalUnitId = unit_id ? Number(unit_id) : 1;
    const finalCategoryId = category_id ? Number(category_id) : null;
    const finalMinStock = Number(min_stock_level) || 0;

    const totalEnteredStock = Number(opening_stock) || 0;
    const damagedQty = Math.max(0, Number(damaged_quantity) || (is_damaged ? 1 : 0));
    const salableOpeningStock = Math.max(0, totalEnteredStock - damagedQty);
    const hasDamaged = damagedQty > 0 || Boolean(is_damaged);
    const validExpiry = expiry_date && String(expiry_date).trim() ? String(expiry_date).slice(0, 10) : null;
    const validSupplier = supplier_id ? Number(supplier_id) : null;
    const validReason = damage_reason ? String(damage_reason).trim() : null;

    // 1. Insert product with expiry, supplier, and damaged stock
    const insertProductSql = `
      INSERT INTO products (
        sku, name, tamil_name, category_id, unit_id,
        hsn_code, gst_rate, purchase_price, selling_price, mrp,
        expiry_date, supplier_id, damaged_stock, is_damaged, damage_reason,
        min_stock_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [prodResult] = await conn.execute(insertProductSql, [
      sku.trim(),
      name.trim(),
      tamil_name ? tamil_name.trim() : null,
      finalCategoryId,
      finalUnitId,
      hsn_code ? hsn_code.trim() : null,
      finalGstRate,
      finalPurchasePrice,
      finalSellingPrice,
      finalMrp,
      validExpiry,
      validSupplier,
      damagedQty,
      hasDamaged,
      validReason,
      finalMinStock
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

    // 3. Initialize Stock balance table (ONLY SALABLE STOCK CAN BE SOLD)
    await conn.execute(
      'INSERT INTO product_stock (product_id, current_stock) VALUES (?, ?)',
      [productId, salableOpeningStock]
    );

    // 4. Record stock movement if salable opening stock > 0
    if (salableOpeningStock > 0) {
      await conn.execute(
        `INSERT INTO stock_movements (
          product_id, movement_type, reference_no, quantity,
          stock_before, stock_after, cost_price, notes
        ) VALUES (?, 'OPENING', 'OPENING-STOCK', ?, 0.000, ?, ?, 'Initial opening stock entry')`,
        [productId, salableOpeningStock, salableOpeningStock, purchase_price]
      );
    }

    // 5. If damaged products were recorded during entry, log into damaged_stock_log
    if (damagedQty > 0) {
      await conn.execute(
        `INSERT INTO damaged_stock_log (
          product_id, product_name, supplier_id, source, damaged_quantity,
          damage_reason, expiry_date, status
        ) VALUES (?, ?, ?, 'PRODUCT_ENTRY', ?, ?, ?, 'PENDING_RETURN')`,
        [
          productId,
          name.trim(),
          validSupplier,
          damagedQty,
          validReason || 'Damaged upon initial product entry',
          validExpiry
        ]
      );
    }

    // 6. Audit log
    await conn.execute(
      `INSERT INTO audit_logs (action, entity_name, entity_id, details) VALUES ('CREATE', 'PRODUCT', ?, ?)`,
      [productId, JSON.stringify({ sku, name, opening_stock: totalEnteredStock, salable_stock: salableOpeningStock, damaged_stock: damagedQty, expiry_date: validExpiry, supplier_id: validSupplier })]
    );

    return {
      id: productId,
      sku,
      name,
      current_stock: salableOpeningStock,
      damaged_stock: damagedQty,
      expiry_date: validExpiry,
      supplier_id: validSupplier
    };
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
      expiry_date,
      supplier_id,
      damaged_stock,
      is_damaged,
      damage_reason,
      min_stock_level,
      barcodes,
      current_stock,
      is_active
    } = productData;

    // Check existing
    const [existing] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [id]);
    if (existing.length === 0) {
      throw new Error(`Product #${id} not found.`);
    }

    const currentProd = existing[0];
    const validExpiry = expiry_date !== undefined ? (expiry_date ? String(expiry_date).slice(0, 10) : null) : currentProd.expiry_date;
    const validSupplier = supplier_id !== undefined ? (supplier_id ? Number(supplier_id) : null) : currentProd.supplier_id;
    const newDamagedStock = damaged_stock !== undefined ? Number(damaged_stock) : Number(currentProd.damaged_stock || 0);
    const validIsDamaged = is_damaged !== undefined ? (is_damaged ? 1 : 0) : (newDamagedStock > 0 ? 1 : currentProd.is_damaged);
    const validReason = damage_reason !== undefined ? (damage_reason ? String(damage_reason).trim() : null) : currentProd.damage_reason;

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
        expiry_date = ?,
        supplier_id = ?,
        damaged_stock = ?,
        is_damaged = ?,
        damage_reason = ?,
        min_stock_level = COALESCE(?, min_stock_level),
        is_active = COALESCE(?, is_active)
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
        validExpiry,
        validSupplier,
        newDamagedStock,
        validIsDamaged,
        validReason,
        min_stock_level !== undefined ? Number(min_stock_level) : currentProd.min_stock_level,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    // If new damaged stock was added via product edit, record to damaged_stock_log
    if (damaged_stock !== undefined && newDamagedStock > Number(currentProd.damaged_stock || 0)) {
      const addedDamage = newDamagedStock - Number(currentProd.damaged_stock || 0);
      await conn.execute(
        `INSERT INTO damaged_stock_log (
          product_id, product_name, supplier_id, source, damaged_quantity,
          damage_reason, expiry_date, status
        ) VALUES (?, ?, ?, 'AUDIT_ADJUST', ?, ?, ?, 'PENDING_RETURN')`,
        [
          id,
          name || currentProd.name,
          validSupplier,
          addedDamage,
          validReason || 'Damaged stock updated during product edit',
          validExpiry
        ]
      );
    }

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

export async function deleteProduct(id) {
  const pool = getPool();
  const prodId = Number(id);
  if (!prodId) throw new Error('Invalid product ID');

  const [pRows] = await pool.query('SELECT id, name, sku, is_active FROM products WHERE id = ?', [prodId]);
  if (!pRows.length) throw new Error(`Product #${prodId} not found`);
  const prod = pRows[0];

  // Check if product has historical transactions (sales or inward purchases)
  const [saleCount] = await pool.query(
    'SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?',
    [prodId]
  );
  const [purchCount] = await pool.query(
    'SELECT COUNT(*) as count FROM purchase_items WHERE product_id = ?',
    [prodId]
  );

  const hasHistory = (Number(saleCount[0]?.count) > 0) || (Number(purchCount[0]?.count) > 0);

  if (hasHistory) {
    // Has transaction history: deactivate product so past bills & audit trails stay intact
    await pool.query('UPDATE products SET is_active = FALSE WHERE id = ?', [prodId]);
    await pool.execute(
      `INSERT INTO audit_logs (action, entity_name, entity_id, details) VALUES ('DEACTIVATE', 'PRODUCT', ?, ?)`,
      [prodId, JSON.stringify({ name: prod.name, sku: prod.sku, reason: 'Deleted by user with transaction history' })]
    );
    return {
      success: true,
      id: prodId,
      softDeleted: true,
      message: `Product "${prod.name}" (${prod.sku}) has past transactions and has been deactivated/removed from active catalog.`
    };
  } else {
    // No sales or purchase history: perform clean deletion
    await pool.query('DELETE FROM damaged_stock_log WHERE product_id = ?', [prodId]);
    await pool.query('DELETE FROM products WHERE id = ?', [prodId]);
    await pool.execute(
      `INSERT INTO audit_logs (action, entity_name, entity_id, details) VALUES ('DELETE', 'PRODUCT', ?, ?)`,
      [prodId, JSON.stringify({ name: prod.name, sku: prod.sku, reason: 'Permanently deleted by user' })]
    );
    return {
      success: true,
      id: prodId,
      softDeleted: false,
      message: `Product "${prod.name}" (${prod.sku}) permanently deleted.`
    };
  }
}


