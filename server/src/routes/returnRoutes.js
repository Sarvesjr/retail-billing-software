import { Router } from 'express';
import * as returnController from '../controllers/returnController.js';

const router = Router();

router.get('/sales', returnController.getSalesReturns);
router.post('/sales', returnController.createSalesReturn);

export default router;

