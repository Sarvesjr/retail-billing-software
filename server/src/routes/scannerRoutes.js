import { Router } from 'express';
import * as scannerController from '../controllers/scannerController.js';
import * as scannerService from '../services/scannerService.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/scan', validate(scannerController.scanBodySchema), scannerController.handleScan);
router.get('/events', (req, res) => scannerService.handleSseConnection(req, res));
router.get('/latest', (req, res) => res.json({ success: true, data: scannerService.getLastScan() }));

export default router;
