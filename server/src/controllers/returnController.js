import * as returnService from '../services/returnService.js';

export async function createSalesReturn(req, res, next) {
  try {
    const result = await returnService.createSalesReturn(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getSalesReturns(req, res, next) {
  try {
    const returns = await returnService.getSalesReturns();
    res.json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
}

