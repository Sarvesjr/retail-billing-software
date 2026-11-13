import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/', validate(productController.createProductSchema), productController.createProduct);

export default router;

