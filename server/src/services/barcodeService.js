import { getPool } from '../config/db.js';

export async function lookupBarcode(rawBarcode, inputSource = 'MANUAL') {
  const startTime = Date.now();
  const pool = getPool();

  // Strict string coercion, trimming, preserving leading zeros
  const barcodeStr = String(rawBarcode || '').trim();

  if (!barcodeStr) {
    return {
      success: false,
      error: 'Empty barcode provided',
      barcode: '',
      timestamp: new Date().toISOString()
    };
  }

  const sql = `
    SELECT 
      pb.id AS barcode_record_id,
      pb.barcode,
      pb.is_primary,
      pb.barcode_type,
      p.id AS product_id,
      p.sku,
      p.name AS product_name,
      p.tamil_name AS product_tamil_name,
      p.category_id,
      p.unit_id,
      p.hsn_code,
      p.gst_rate,
      p.purchase_price,
      p.selling_price,
      p.mrp,
      p.min_stock_level,
      c.name AS category_name,
      c.tamil_name AS category_tamil_name,
      u.code AS unit_code,
      u.name AS unit_name,
      u.tamil_name AS unit_tamil_name,
      p.is_active,
      COALESCE(ps.current_stock, 0) AS current_stock
    FROM product_barcodes pb
    JOIN products p ON pb.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN product_stock ps ON p.id = ps.product_id
    WHERE pb.barcode = ?
    LIMIT 1
  `;

  try {
    const [rows] = await pool.query(sql, [barcodeStr]);
    const responseTimeMs = Date.now() - startTime;
    const isFound = rows.length > 0;
    const product = isFound ? rows[0] : null;

    // Log the scan event to MySQL scanner_logs for developer audit & diagnostic screen
    await pool.query(
      `INSERT INTO scanner_logs (barcode, input_source, lookup_status, product_id, product_name, response_time_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        barcodeStr,
        inputSource,
        isFound ? 'FOUND' : 'NOT_FOUND',
        product ? product.product_id : null,
        product ? product.product_name : null,
        responseTimeMs
      ]
    );

    return {
      success: true,
      found: isFound,
      barcode: barcodeStr,
      inputSource,
      scanTimestamp: new Date().toISOString(),
      responseTimeMs,
      product: product ? {
        id: product.product_id,
        productId: product.product_id,
        product_id: product.product_id,
        sku: product.sku,
        name: product.product_name,
        productName: product.product_name,
        tamil_name: product.product_tamil_name,
        tamilName: product.product_tamil_name,
        barcode: product.barcode,
        barcodeType: product.barcode_type,
        category_id: product.category_id,
        categoryId: product.category_id,
        category: product.category_name,
        category_name: product.category_name,
        categoryTamil: product.category_tamil_name,
        category_tamil_name: product.category_tamil_name,
        unit_id: product.unit_id,
        unitId: product.unit_id,
        unit: product.unit_code,
        unit_code: product.unit_code,
        unitName: product.unit_name,
        unit_name: product.unit_name,
        unitTamil: product.unit_tamil_name,
        unit_tamil_name: product.unit_tamil_name,
        hsn_code: product.hsn_code,
        hsnCode: product.hsn_code,
        gst_rate: Number(product.gst_rate ?? 0),
        gstRate: Number(product.gst_rate ?? 0),
        purchase_price: Number(product.purchase_price ?? 0),
        purchasePrice: Number(product.purchase_price ?? 0),
        selling_price: Number(product.selling_price ?? 0),
        sellingPrice: Number(product.selling_price ?? 0),
        mrp: Number(product.mrp ?? 0),
        min_stock_level: Number(product.min_stock_level ?? 5),
        minStockLevel: Number(product.min_stock_level ?? 5),
        current_stock: Number(product.current_stock ?? 0),
        currentStock: Number(product.current_stock ?? 0),
        is_active: product.is_active !== undefined ? Boolean(Number(product.is_active)) : true,
        isActive: product.is_active !== undefined ? Boolean(Number(product.is_active)) : true
      } : null,
      message: isFound
        ? `Product "${product.product_name}" (${product.sku}) retrieved from MySQL in ${responseTimeMs}ms.`
        : `Barcode "${barcodeStr}" was not found in MySQL database.`
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error(`[Barcode Service] MySQL Lookup error for ${barcodeStr}:`, error);

    try {
      await pool.query(
        `INSERT INTO scanner_logs (barcode, input_source, lookup_status, product_id, product_name, response_time_ms)
         VALUES (?, ?, 'ERROR', NULL, NULL, ?)`,
        [barcodeStr, inputSource, responseTimeMs]
      );
    } catch (logErr) {
      console.warn('[Barcode Service] Failed to record error log to MySQL:', logErr.message);
    }

    return {
      success: false,
      found: false,
      barcode: barcodeStr,
      inputSource,
      scanTimestamp: new Date().toISOString(),
      responseTimeMs,
      error: error.message,
      product: null
    };
  }
}

export async function getScannerLogs(limit = 25) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM scanner_logs ORDER BY id DESC LIMIT ?',
    [Number(limit)]
  );
  return rows;
}

