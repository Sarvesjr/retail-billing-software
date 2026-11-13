import { Router } from 'express';
import * as saleController from '../controllers/saleController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/', validate(saleController.createSaleSchema), saleController.createSale);
router.get('/', saleController.getSales);
router.get('/:id', saleController.getSale);

export default router;

