import { Router } from 'express';
import * as feedbackController from '../controllers/feedbackController.js';

const router = Router();

router.post('/', feedbackController.createFeedback);
router.get('/', feedbackController.getFeedbacks);
router.get('/stats', feedbackController.getFeedbackStats);

export default router;
