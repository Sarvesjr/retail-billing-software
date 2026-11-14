import { Router } from 'express';
import * as customerController from '../controllers/customerController.js';

const router = Router();

router.get('/', customerController.getCustomers);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.post('/payments', customerController.recordPayment);
router.get('/:id/ledger', customerController.getLedger);

export default router;

