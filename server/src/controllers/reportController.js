import * as reportService from '../services/reportService.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await reportService.getDashboardAndReportsSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

