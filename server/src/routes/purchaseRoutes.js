import { Router } from 'express';
import * as purchaseController from '../controllers/purchaseController.js';

const router = Router();

router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', purchaseController.createPurchase);

export default router;

