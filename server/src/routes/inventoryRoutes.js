import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController.js';

const router = Router();

router.get('/', inventoryController.getInventory);
router.post('/adjust', inventoryController.adjustStock);
router.get('/movements', inventoryController.getMovements);

export default router;

