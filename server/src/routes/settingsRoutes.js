import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';

const router = Router();

router.get('/', settingsController.getSettings);
router.post('/', settingsController.updateSettings);
router.post('/reset', settingsController.resetData);
router.get('/backup', settingsController.downloadBackup);

export default router;

