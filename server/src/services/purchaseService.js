import { getPool, withTransaction } from '../config/db.js';

export async function getAllPurchases({ limit = 50, offset = 0 } = {}) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT 
      p.*,
      s.name AS supplier_name,
      s.tamil_name AS supplier_tamil_name,
      s.phone AS supplier_phone,
      COUNT(pi.id) AS item_count
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
  return rows;
}

export async function getPurchaseById(id) {
  const pool = getPool();
  const [purchases] = await pool.query(
    `SELECT p.*, s.name AS supplier_name, s.tamil_name AS supplier_tamil_name, s.gstin AS supplier_gstin
     FROM purchases p
     JOIN suppliers s ON p.supplier_id = s.id
     WHERE p.id = ?`,
    [id]
  );
  if (purchases.length === 0) return null;

  const [items] = await pool.query(
    `SELECT pi.*, p.sku, u.code AS unit_code,
            COALESCE(pi.damaged_quantity, 0) AS damaged_quantity,
            COALESCE(pi.is_damaged, FALSE) AS is_damaged,
            pi.damage_reason,
            pi.expiry_date
     FROM purchase_items pi
     JOIN products p ON pi.product_id = p.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE pi.purchase_id = ?`,
    [id]
  );

  return { ...purchases[0], items };
}

export async function createPurchase(purchaseData) {
  const {
    supplier_id,
    supplier_invoice_no,
    purchase_date = new Date().toISOString().slice(0, 10),
    items = [],
    payment_mode = 'CASH',
    paid_amount = 0,
    notes = ''
  } = purchaseData;

  if (!supplier_id) throw new Error('Supplier is required');
  if (!items || items.length === 0) throw new Error('At least one item is required for purchase entry');

  return await withTransaction(async (conn) => {
    // 1. Generate sequential Purchase Order Number (PO-YYYYMMDD-XXXX)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS count FROM purchases WHERE purchase_no LIKE ?`,
      [`PO-${todayStr}-%`]
    );
    const seq = String(countRows[0].count + 1).padStart(4, '0');
    const purchaseNo = `PO-${todayStr}-${seq}`;

    // 2. Calculate totals on backend
    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity || item.qty);
      const rate = Number(item.purchase_price || item.purchasePrice || item.rate || 0);
      const gstRate = Number(item.gst_rate || item.gstRate || 0);

      if (qty <= 0) throw new Error(`Invalid quantity for item: ${item.product_name || item.id}`);
      if (rate < 0) throw new Error(`Invalid purchase price for item: ${item.product_name || item.id}`);

      const lineSubtotal = qty * rate;
      const taxAmount = (lineSubtotal * gstRate) / 100;
      const lineTotal = lineSubtotal + taxAmount;
      const damagedQty = Math.max(0, Number(item.damaged_quantity) || (item.is_damaged ? 1 : 0));
      const isDamaged = damagedQty > 0 || Boolean(item.is_damaged);
      const expiryDate = item.expiry_date ? String(item.expiry_date).slice(0, 10) : null;
      const damageReason = item.damage_reason ? String(item.damage_reason).trim() : null;

      subtotal += lineSubtotal;
      taxTotal += taxAmount;

      processedItems.push({
        product_id: item.product_id || item.id,
        product_name: item.product_name || item.name,
        quantity: qty,
        purchase_price: rate,
        gst_rate: gstRate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        damaged_quantity: damagedQty,
        is_damaged: isDamaged,
        expiry_date: expiryDate,
        damage_reason: damageReason
      });
    }

    const grandTotal = subtotal + taxTotal;
    const finalPaid = Math.min(Number(paid_amount) || 0, grandTotal);
    const paymentStatus = finalPaid >= grandTotal ? 'PAID' : finalPaid > 0 ? 'PARTIAL' : 'UNPAID';

    // 3. Insert Purchase Record
    const [pResult] = await conn.query(
      `INSERT INTO purchases (
        purchase_no, supplier_invoice_no, supplier_id, purchase_date,
        subtotal, tax_total, grand_total, paid_amount,
        payment_mode, payment_status, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED')`,
      [
        purchaseNo,
        supplier_invoice_no || null,
        supplier_id,
        purchase_date,
        subtotal,
        taxTotal,
        grandTotal,
        finalPaid,
        payment_mode,
        paymentStatus,
        notes || null
      ]
    );

    const purchaseId = pResult.insertId;

    // 4. Insert Items, Increase Stock & Write to Stock Movements Ledger
    for (const pItem of processedItems) {
      const damagedQty = Number(pItem.damaged_quantity) || 0;
      const salableQty = Math.max(0, pItem.quantity - damagedQty);

      await conn.query(
        `INSERT INTO purchase_items (
          purchase_id, product_id, product_name, quantity, purchase_price, gst_rate, tax_amount, line_total,
          expiry_date, is_damaged, damaged_quantity, damage_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          pItem.product_id,
          pItem.product_name,
          pItem.quantity,
          pItem.purchase_price,
          pItem.gst_rate,
          pItem.tax_amount,
          pItem.line_total,
          pItem.expiry_date,
          pItem.is_damaged ? 1 : 0,
          damagedQty,
          pItem.damage_reason
        ]
      );

      // Lock current stock row
      const [stockRows] = await conn.query(
        `SELECT current_stock FROM product_stock WHERE product_id = ? FOR UPDATE`,
        [pItem.product_id]
      );

      const beforeStock = stockRows.length > 0 ? Number(stockRows[0].current_stock) : 0;
      // Precision: Only salable items enter salable stock
      const afterStock = beforeStock + salableQty;

      if (stockRows.length > 0) {
        await conn.query(
          `UPDATE product_stock SET current_stock = ? WHERE product_id = ?`,
          [afterStock, pItem.product_id]
        );
      } else {
        await conn.query(
          `INSERT INTO product_stock (product_id, current_stock) VALUES (?, ?)`,
          [pItem.product_id, afterStock]
        );
      }

      // Record permanent stock movement for salable inward
      if (salableQty > 0) {
        await conn.query(
          `INSERT INTO stock_movements (
            product_id, movement_type, reference_id, reference_no,
            quantity, stock_before, stock_after, cost_price, notes
          ) VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, ?, ?)`,
          [
            pItem.product_id,
            purchaseId,
            purchaseNo,
            salableQty,
            beforeStock,
            afterStock,
            pItem.purchase_price,
            `Purchase Inward (${purchaseNo}) - Salable: ${salableQty}${damagedQty > 0 ? `, Damaged: ${damagedQty}` : ''}`
          ]
        );
      }

      // If damaged goods arrived, track in damaged_stock and damaged_stock_log
      if (damagedQty > 0) {
        await conn.query(
          `UPDATE products SET damaged_stock = damaged_stock + ? WHERE id = ?`,
          [damagedQty, pItem.product_id]
        );

        await conn.query(
          `INSERT INTO damaged_stock_log (
            product_id, product_name, supplier_id, purchase_id, source,
            damaged_quantity, damage_reason, expiry_date, status
          ) VALUES (?, ?, ?, ?, 'PURCHASE_ENTRY', ?, ?, ?, 'PENDING_RETURN')`,
          [
            pItem.product_id,
            pItem.product_name,
            supplier_id,
            purchaseId,
            damagedQty,
            pItem.damage_reason || 'Damaged upon delivery from supplier',
            pItem.expiry_date
          ]
        );
      }

      // Update product supplier, expiry date, and latest purchase price
      await conn.query(
        `UPDATE products SET
           purchase_price = ?,
           supplier_id = ?,
           expiry_date = COALESCE(?, expiry_date)
         WHERE id = ?`,
        [pItem.purchase_price, supplier_id, pItem.expiry_date, pItem.product_id]
      );
    }

    // 5. Update Supplier Outstanding Balance if not fully paid (Credit Purchase)
    const unpaidBalance = grandTotal - finalPaid;
    if (unpaidBalance > 0) {
      await conn.query(
        `UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?`,
        [unpaidBalance, supplier_id]
      );
    }

    // 6. Record Supplier Payment if any paid
    if (finalPaid > 0) {
      const todayPayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [payCountRows] = await conn.query(
        `SELECT COUNT(*) AS count FROM supplier_payments WHERE payment_no LIKE ?`,
        [`SP-${todayPayStr}-%`]
      );
      const paySeq = String(payCountRows[0].count + 1).padStart(4, '0');
      const payNo = `SP-${todayPayStr}-${paySeq}`;

      await conn.query(
        `INSERT INTO supplier_payments (payment_no, supplier_id, purchase_id, amount, payment_mode, payment_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [payNo, supplier_id, purchaseId, finalPaid, payment_mode, purchase_date, `Payment for Purchase ${purchaseNo}`]
      );
    }

    return {
      id: purchaseId,
      purchaseNo,
      grandTotal,
      paidAmount: finalPaid,
      paymentStatus,
      itemCount: processedItems.length
    };
  });
}
