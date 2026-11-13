import * as purchaseService from '../services/purchaseService.js';

export async function getPurchases(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const purchases = await purchaseService.getAllPurchases({ limit, offset });
    res.json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
}

export async function getPurchase(req, res, next) {
  try {
    const purchase = await purchaseService.getPurchaseById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, error: 'Purchase record not found' });
    }
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(req, res, next) {
  try {
    const result = await purchaseService.createPurchase(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
