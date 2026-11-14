import { z } from 'zod';
import * as saleService from '../services/saleService.js';
import { getReceiptImageFile, generateLosslessReceiptSvg, saveLosslessReceiptImage } from '../services/receiptImageService.js';
import { getPool } from '../config/db.js';

export const createSaleSchema = z.object({
  customer_id: z.number().int().positive().optional().nullable(),
  customer_name: z.string().optional().default('Walk-in Customer'),
  customer_phone: z.string().optional().nullable(),
  items: z.array(z.object({
    id: z.number().int().positive(),
    qty: z.number().positive(),
    sellingPrice: z.number().min(0).optional(),
    barcode: z.string().optional().nullable()
  })).min(1, 'At least one item is required'),
  payment_mode: z.enum(['CASH', 'UPI', 'CARD', 'CREDIT']).default('CASH'),
  paid_amount: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function createSale(req, res, next) {
  try {
    const result = await saleService.createSale(req.body);
    res.status(201).json({
      success: true,
      message: `Sale invoice ${result.invoiceNo} successfully created and stock deducted.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getSales(req, res, next) {
  try {
    const sales = await saleService.getRecentSales({
      limit: req.query.limit,
      search: req.query.search,
      payment_mode: req.query.payment_mode,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
}

export async function getSale(req, res, next) {
  try {
    const sale = await saleService.getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, error: 'Sale record not found' });
    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
}

export async function getReceiptImage(req, res, next) {
  try {
    const { invoiceNo } = req.params;
    const format = req.query.format || 'auto';
    const download = req.query.download === '1' || req.query.download === 'true';

    let fileInfo = await getReceiptImageFile(invoiceNo, format);

    // If file doesn't exist on disk yet, generate it dynamically from MySQL record!
    if (!fileInfo) {
      const sale = await saleService.getSaleById(invoiceNo);
      if (!sale) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      const pool = getPool();
      const [settingsRows] = await pool.query('SELECT `key`, `value` FROM app_settings');
      const settingsMap = {};
      settingsRows.forEach(r => { settingsMap[r.key] = r.value; });

      const svgContent = generateLosslessReceiptSvg(sale, settingsMap);
      await saveLosslessReceiptImage(sale.id, sale.invoice_no, svgContent);
      fileInfo = await getReceiptImageFile(invoiceNo, format);
    }

    if (!fileInfo) {
      return res.status(404).json({ success: false, error: 'Receipt image could not be loaded' });
    }

    if (download) {
      const ext = fileInfo.contentType === 'image/png' ? 'png' : 'svg';
      res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.${ext}"`);
    }

    res.setHeader('Content-Type', fileInfo.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.sendFile(fileInfo.path);
  } catch (error) {
    next(error);
  }
}

export async function saveReceiptImage(req, res, next) {
  try {
    const { id } = req.params;
    const { pngDataUrl } = req.body;
    const sale = await saleService.getSaleById(id);
    if (!sale) return res.status(404).json({ success: false, error: 'Sale record not found' });

    const result = await saveLosslessReceiptImage(sale.id, sale.invoice_no, null, pngDataUrl);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
