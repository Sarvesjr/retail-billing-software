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

export async function createPurchaseReturn(req, res, next) {
  try {
    const result = await returnService.createPurchaseReturn(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseReturns(req, res, next) {
  try {
    const returns = await returnService.getPurchaseReturns();
    res.json({ success: true, data: returns });
  } catch (error) {
    next(error);
  }
}

export async function getDamagedAndExpiredStock(req, res, next) {
  try {
    const { supplier_id } = req.query;
    const data = await returnService.getDamagedAndExpiredStock({ supplier_id });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
