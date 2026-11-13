import { Router } from 'express';
import * as supplierController from '../controllers/supplierController.js';

const router = Router();

router.get('/', supplierController.getSuppliers);
router.post('/', supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);

export default router;

