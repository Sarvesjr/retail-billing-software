import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';

const router = Router();

router.get('/summary', reportController.getSummary);

export default router;

