import { z } from 'zod';
import * as saleService from '../services/saleService.js';

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
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const sales = await saleService.getRecentSales(limit);
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

