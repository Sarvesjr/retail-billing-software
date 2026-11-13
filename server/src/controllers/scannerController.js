import { z } from 'zod';
import * as scannerService from '../services/scannerService.js';

export const scanBodySchema = z.object({
  barcode: z.string().min(1, 'Barcode is required'),
  input_source: z.string().optional().default('PHONE_USB')
});

export async function handleScan(req, res, next) {
  try {
    const { barcode, input_source } = req.body;
    const result = await scannerService.processIncomingScan(barcode, input_source);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

