import { getPool, withTransaction } from '../config/db.js';
import { generateLosslessReceiptSvg, saveLosslessReceiptImage } from './receiptImageService.js';

export async function createSale(saleData) {
  return await withTransaction(async (conn) => {
    const {
      customer_id = null,
      customer_name = 'Walk-in Customer',
      customer_phone = null,
      items = [],
      payment_mode = 'CASH',
      paid_amount = null,
      discount_type = 'NONE',
      discount_value = 0,
      notes = null
    } = saleData;

    if (!items || items.length === 0) {
      throw new Error('Cannot process an empty sale. Add at least one item.');
    }

    // 1. Generate unique sequential invoice number (e.g. INV-20261113-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [lastInvRows] = await conn.query(
      `SELECT invoice_no FROM sales WHERE invoice_no LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [`INV-${todayStr}-%`]
    );

    let nextSeq = 1;
    if (lastInvRows.length > 0) {
      const parts = lastInvRows[0].invoice_no.split('-');
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) nextSeq = lastNum + 1;
    }
    const invoiceNo = `INV-${todayStr}-${String(nextSeq).padStart(4, '0')}`;

    // 2. Process items, calculate backend totals & verify stocks
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = [];
    const runningStockMap = new Map();
    const productCacheMap = new Map();

    for (const item of items) {
      const productId = Number(item.id || item.product_id);
      const qty = Number(item.qty || item.quantity);

      if (!productId || qty <= 0) {
        throw new Error('Invalid product or quantity in cart.');
      }

      let prod;
      let stockBefore;

      if (runningStockMap.has(productId)) {
        prod = productCacheMap.get(productId);
        stockBefore = runningStockMap.get(productId);
      } else {
        // Lock product & stock row for transaction safety
        const [stockRows] = await conn.query(
          `SELECT ps.current_stock, p.name, p.tamil_name, p.selling_price, p.gst_rate, p.is_active
           FROM products p
           JOIN product_stock ps ON p.id = ps.product_id
           WHERE p.id = ? FOR UPDATE`,
          [productId]
        );

        if (stockRows.length === 0) {
          throw new Error(`Product ID #${productId} not found.`);
        }

        prod = stockRows[0];
        stockBefore = Number(prod.current_stock);
        productCacheMap.set(productId, prod);
      }

      const isActive = Boolean(prod.is_active);

      if (!isActive) {
        throw new Error(`Cannot sell "${prod.name}": Product is marked INACTIVE in store inventory.`);
      }

      if (stockBefore <= 0) {
        throw new Error(`Cannot sell "${prod.name}": Product is OUT OF STOCK (Available stock: 0).`);
      }

      if (qty > stockBefore) {
        throw new Error(`Insufficient stock for "${prod.name}": Requested ${qty}, but only ${stockBefore} available in stock.`);
      }

      const stockAfter = stockBefore - qty;
      runningStockMap.set(productId, stockAfter);
      const isFreeSample = Boolean(item.is_free_sample || item.isFreeSample);
      const itemDiscount = isFreeSample ? 0 : Math.max(0, Number(item.discount_amount || item.discount || 0));
      const originalPrice = Number(item.sellingPrice || prod.selling_price);
      // For Free Sample: unit price = ₹0.00, GST = 0%, tax = 0.00, line total = 0.00
      const unitPrice = isFreeSample ? 0 : originalPrice;
      const gstRate = isFreeSample ? 0 : Number(prod.gst_rate || 0);

      const baseLinePrice = isFreeSample ? 0 : Math.max(0, Number(((unitPrice * qty) - itemDiscount).toFixed(2)));
      const taxAmount = isFreeSample ? 0 : Number(((baseLinePrice * gstRate) / 100).toFixed(2));
      const lineTotal = Number((baseLinePrice + taxAmount).toFixed(2));

      subtotal += baseLinePrice;
      taxTotal += taxAmount;
      if (!isFreeSample && itemDiscount > 0) {
        // Track item-level discount
      }

      processedItems.push({
        productId,
        product_id: productId,
        productName: prod.name,
        product_name: prod.name,
        name: prod.name,
        tamilName: prod.tamil_name,
        tamil_name: prod.tamil_name,
        barcode: item.barcode || null,
        qty,
        quantity: qty,
        unitPrice,
        unit_price: unitPrice,
        sellingPrice: unitPrice,
        selling_price: unitPrice,
        originalPrice,
        isFreeSample,
        is_free_sample: isFreeSample,
        discountAmount: itemDiscount,
        discount_amount: itemDiscount,
        gstRate,
        gst_rate: gstRate,
        taxAmount,
        tax_amount: taxAmount,
        lineTotal,
        line_total: lineTotal,
        stockBefore,
        stockAfter
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));

    // Calculate Bill-Level Discount
    let normalizedDiscountType = 'NONE';
    if (String(discount_type).toUpperCase() === 'PERCENT') {
      normalizedDiscountType = 'PERCENT';
    } else if (['FIXED', 'FLAT', 'RUPEES'].includes(String(discount_type).toUpperCase())) {
      normalizedDiscountType = 'FIXED';
    }

    let billDiscount = 0;
    const numDiscValue = Number(discount_value) || 0;
    if (normalizedDiscountType === 'FIXED' && numDiscValue > 0) {
      billDiscount = Math.min(subtotal, numDiscValue);
    } else if (normalizedDiscountType === 'PERCENT' && numDiscValue > 0) {
      billDiscount = Number(((subtotal * Math.min(100, numDiscValue)) / 100).toFixed(2));
    }

    const netSubtotal = Math.max(0, Number((subtotal - billDiscount).toFixed(2)));
    const itemDiscountsSum = processedItems.reduce((acc, pi) => acc + (pi.discountAmount || 0), 0);
    const totalDiscount = Number((itemDiscountsSum + billDiscount).toFixed(2));
    const grandTotal = Number((netSubtotal + taxTotal).toFixed(2));

    // Validate Cash received amount (Must be >= grandTotal)
    if (payment_mode === 'CASH') {
      const paid = paid_amount !== null && paid_amount !== undefined ? Number(paid_amount) : grandTotal;
      if (paid < grandTotal) {
        throw new Error(
          `Insufficient money: Received cash (₹${paid.toFixed(2)}) is less than bill total (₹${grandTotal.toFixed(2)}). Short by ₹${(grandTotal - paid).toFixed(2)}.`
        );
      }
    }

    // 3. Insert sale record
    const receiptImageUrl = `/api/sales/bills/${invoiceNo}/image`;
    const [saleResult] = await conn.execute(
      `INSERT INTO sales (
        invoice_no, customer_id, customer_name, customer_phone, subtotal, tax_total,
        discount_total, discount_type, discount_value, grand_total, payment_mode, payment_status, notes, status, receipt_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, 'COMPLETED', ?)`,
      [
        invoiceNo,
        customer_id || null,
        customer_name,
        customer_phone,
        subtotal,
        taxTotal,
        totalDiscount,
        normalizedDiscountType,
        numDiscValue,
        grandTotal,
        payment_mode,
        notes,
        receiptImageUrl
      ]
    );

    const saleId = saleResult.insertId;

    // 4. Insert items, deduct stock, and record stock movements
    for (const pi of processedItems) {
      // Save item snapshot
      await conn.execute(
        `INSERT INTO sale_items (
          sale_id, product_id, product_name, tamil_name, barcode,
          quantity, unit_price, gst_rate, tax_amount, discount_amount, is_free_sample, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          pi.productId,
          pi.productName,
          pi.tamilName,
          pi.barcode,
          pi.qty,
          pi.unitPrice,
          pi.gstRate,
          pi.taxAmount,
          pi.discountAmount,
          pi.isFreeSample ? 1 : 0,
          pi.lineTotal
        ]
      );

      // Deduct stock balance in product_stock
      await conn.execute(
        `UPDATE product_stock SET current_stock = ? WHERE product_id = ?`,
        [pi.stockAfter, pi.productId]
      );

      // Record immutable stock movement ledger
      const movementNote = pi.isFreeSample
        ? `Sale Invoice ${invoiceNo} (FREE SAMPLE / PROMO)`
        : `Sale Invoice ${invoiceNo}`;

      await conn.execute(
        `INSERT INTO stock_movements (
          product_id, movement_type, reference_id, reference_no,
          quantity, stock_before, stock_after, notes
        ) VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?)`,
        [
          pi.productId,
          saleId,
          invoiceNo,
          -pi.qty,
          pi.stockBefore,
          pi.stockAfter,
          movementNote
        ]
      );
    }

    // 5. Insert payment record
    const paymentAmount = Number(paid_amount) || grandTotal;
    await conn.execute(
      `INSERT INTO sale_payments (sale_id, payment_mode, amount, reference_no)
       VALUES (?, ?, ?, ?)`,
      [saleId, payment_mode, paymentAmount, invoiceNo]
    );

    // 6. If Credit Sale (Udhar) and Customer linked, increase Customer's Udhar Balance
    if (payment_mode === 'CREDIT' && customer_id) {
      await conn.execute(
        `UPDATE customers SET current_balance = current_balance + ? WHERE id = ?`,
        [grandTotal, customer_id]
      );
    }

    // 7. Auto-generate & persist 100% lossless vector receipt image
    try {
      const [settingsRows] = await conn.query('SELECT `key`, `value` FROM app_settings');
      const settingsMap = {};
      settingsRows.forEach(r => { settingsMap[r.key] = r.value; });

      const svgContent = generateLosslessReceiptSvg({
        invoice_no: invoiceNo,
        customer_name,
        subtotal,
        discount_total: totalDiscount,
        tax_total: taxTotal,
        grand_total: grandTotal,
        payment_mode,
        created_at: new Date(),
        items: processedItems
      }, settingsMap);

      await saveLosslessReceiptImage(saleId, invoiceNo, svgContent, null, conn);
    } catch (imgErr) {
      console.warn('[Receipt Warning] Could not auto-generate initial receipt image:', imgErr.message);
    }

    return {
      id: saleId,
      saleId,
      invoice_no: invoiceNo,
      invoiceNo,
      subtotal,
      discountTotal: totalDiscount,
      taxTotal,
      grandTotal,
      total_amount: grandTotal,
      itemCount: processedItems.length,
      receiptImageUrl: `/api/sales/bills/${invoiceNo}/image`,
      items: processedItems.map(p => ({
        productId: p.productId,
        name: p.productName,
        qty: p.qty,
        isFreeSample: p.isFreeSample,
        remainingStock: p.stockAfter
      }))
    };
  });
}

export async function getRecentSales(options = {}) {
  const pool = getPool();
  const limit = options.limit ? parseInt(options.limit, 10) : 100;
  const search = options.search ? `%${options.search.trim()}%` : null;
  const paymentMode = options.payment_mode || null;
  const startDate = options.startDate || null;
  const endDate = options.endDate || null;

  let query = `
    SELECT 
      s.*, 
      COUNT(si.id) AS total_items,
      COALESCE(s.receipt_image_url, CONCAT('/api/sales/bills/', s.invoice_no, '/image')) AS receipt_image_url
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (s.invoice_no LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)`;
    params.push(search, search, search);
  }
  if (paymentMode && paymentMode !== 'ALL') {
    query += ` AND s.payment_mode = ?`;
    params.push(paymentMode);
  }
  if (startDate) {
    query += ` AND DATE(s.created_at) >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND DATE(s.created_at) <= ?`;
    params.push(endDate);
  }

  query += ` GROUP BY s.id ORDER BY s.id DESC LIMIT ?`;
  params.push(limit);

  const [rows] = await pool.query(query, params);
  return rows;
}

export async function getSaleById(id) {
  const pool = getPool();
  const [sales] = await pool.query('SELECT * FROM sales WHERE id = ? OR invoice_no = ?', [id, id]);
  if (sales.length === 0) return null;

  const [items] = await pool.query(
    `SELECT si.*, u.code AS unit_code
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE si.sale_id = ?`,
    [sales[0].id]
  );

  return {
    ...sales[0],
    receipt_image_url: sales[0].receipt_image_url || `/api/sales/bills/${sales[0].invoice_no}/image`,
    items
  };
}

