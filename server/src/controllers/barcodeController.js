import { z } from 'zod';
import { getPool } from '../config/db.js';
import * as barcodeService from '../services/barcodeService.js';
import * as scannerService from '../services/scannerService.js';

export const lookupQuerySchema = z.object({
  barcode: z.string().min(1, 'Barcode query parameter is required'),
  source: z.string().optional().default('MANUAL')
});

export async function lookup(req, res, next) {
  try {
    const { barcode, source } = req.query;
    const result = await barcodeService.lookupBarcode(barcode, source);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getLogs(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 25;
    const logs = await barcodeService.getScannerLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}

export async function assignBarcode(req, res, next) {
  try {
    const { productId, barcode, isPrimary = true, replaceExisting = false } = req.body;
    const cleanBarcode = String(barcode || '').trim();
    if (!productId || !cleanBarcode) {
      return res.status(400).json({ success: false, error: 'Product ID and Barcode are required' });
    }

    const pool = getPool();
    // Check if barcode already exists on any product
    const [existing] = await pool.query('SELECT product_id FROM product_barcodes WHERE barcode = ?', [cleanBarcode]);
    if (existing.length > 0) {
      if (Number(existing[0].product_id) === Number(productId)) {
        // Already assigned to this exact product
        if (isPrimary) {
          await pool.query('UPDATE product_barcodes SET is_primary = FALSE WHERE product_id = ?', [productId]);
          await pool.query('UPDATE product_barcodes SET is_primary = TRUE WHERE product_id = ? AND barcode = ?', [productId, cleanBarcode]);
        }
        return res.json({
          success: true,
          message: `Barcode "${cleanBarcode}" is already assigned to this product (marked as primary).`
        });
      } else {
        // Assigned to a different product
        if (replaceExisting) {
          await pool.query('DELETE FROM product_barcodes WHERE barcode = ?', [cleanBarcode]);
        } else {
          const [otherProd] = await pool.query('SELECT name FROM products WHERE id = ?', [existing[0].product_id]);
          const otherName = otherProd[0]?.name || `Product #${existing[0].product_id}`;
          return res.status(400).json({
            success: false,
            error: `Barcode "${cleanBarcode}" is already assigned to "${otherName}". Check "Overwrite / Reassign" to transfer it.`
          });
        }
      }
    }

    if (replaceExisting) {
      await pool.query('DELETE FROM product_barcodes WHERE product_id = ?', [productId]);
    } else if (isPrimary) {
      await pool.query('UPDATE product_barcodes SET is_primary = FALSE WHERE product_id = ?', [productId]);
    }

    await pool.query(
      `INSERT INTO product_barcodes (product_id, barcode, is_primary, barcode_type) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
      [productId, cleanBarcode, Boolean(isPrimary), cleanBarcode.length === 13 ? 'EAN13' : 'CODE128']
    );

    res.json({ success: true, message: `Barcode "${cleanBarcode}" assigned successfully!` });
  } catch (error) {
    next(error);
  }
}

export async function deleteBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    const pool = getPool();
    await pool.query('DELETE FROM product_barcodes WHERE barcode = ?', [barcode]);
    res.json({ success: true, message: 'Barcode removed successfully' });
  } catch (error) {
    next(error);
  }
}
