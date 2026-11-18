import { Router } from 'express';
import * as returnController from '../controllers/returnController.js';

const router = Router();

// Sales Returns
router.get('/sales', returnController.getSalesReturns);
router.post('/sales', returnController.createSalesReturn);

// Purchase Returns (Supplier Returns for Damaged & Expired stock)
router.get('/purchases', returnController.getPurchaseReturns);
router.post('/purchases', returnController.createPurchaseReturn);

// Damaged & Expired Products ledger for returning
router.get('/damaged-expired', returnController.getDamagedAndExpiredStock);

// Quarantine Damaged stock directly from Billing POS or Inventory
router.post('/quarantine-damaged', returnController.quarantineDamagedStock);

export default router;
