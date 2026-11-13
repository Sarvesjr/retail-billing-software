import { Router } from 'express';
import * as barcodeController from '../controllers/barcodeController.js';
import { validateQuery } from '../middleware/validate.js';

const router = Router();

router.get('/lookup', validateQuery(barcodeController.lookupQuerySchema), barcodeController.lookup);
router.get('/logs', barcodeController.getLogs);
router.post('/assign', barcodeController.assignBarcode);
router.delete('/:barcode', barcodeController.deleteBarcode);

export default router;
