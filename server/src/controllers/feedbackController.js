import * as feedbackService from '../services/feedbackService.js';

export async function createFeedback(req, res, next) {
  try {
    const feedback = await feedbackService.createFeedback(req.body);
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      data: feedback
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeedbacks(req, res, next) {
  try {
    const { limit, offset, search, minRating } = req.query;
    const feedbacks = await feedbackService.getFeedbacks({ limit, offset, search, minRating });
    res.json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeedbackStats(req, res, next) {
  try {
    const stats = await feedbackService.getFeedbackStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}
