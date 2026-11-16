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

    for (const item of items) {
      const productId = Number(item.id || item.product_id);
      const qty = Number(item.qty || item.quantity);

      if (!productId || qty <= 0) {
        throw new Error('Invalid product or quantity in cart.');
      }

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

      const prod = stockRows[0];
      const stockBefore = Number(prod.current_stock);
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
      const unitPrice = Number(item.sellingPrice || prod.selling_price);
      const gstRate = Number(prod.gst_rate || 0);
      const baseLinePrice = Number((unitPrice * qty).toFixed(2));
      const taxAmount = Number(((baseLinePrice * gstRate) / 100).toFixed(2));
      const lineTotal = Number((baseLinePrice + taxAmount).toFixed(2));

      subtotal += baseLinePrice;
      taxTotal += taxAmount;

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
    const grandTotal = Number((subtotal + taxTotal).toFixed(2));

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
        discount_total, grand_total, payment_mode, payment_status, notes, status, receipt_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, 'PAID', ?, 'COMPLETED', ?)`,
      [
        invoiceNo,
        customer_id || null,
        customer_name,
        customer_phone,
        subtotal,
        taxTotal,
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
          quantity, unit_price, gst_rate, tax_amount, discount_amount, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?)`,
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
          pi.lineTotal
        ]
      );

      // Deduct stock balance in product_stock
      await conn.execute(
        `UPDATE product_stock SET current_stock = ? WHERE product_id = ?`,
        [pi.stockAfter, pi.productId]
      );

      // Record immutable stock movement ledger
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
          `Sale Invoice ${invoiceNo}`
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
      saleId,
      invoiceNo,
      grandTotal,
      taxTotal,
      itemCount: processedItems.length,
      receiptImageUrl: `/api/sales/bills/${invoiceNo}/image`,
      items: processedItems.map(p => ({
        productId: p.productId,
        name: p.productName,
        qty: p.qty,
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

