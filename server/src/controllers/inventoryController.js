import * as inventoryService from '../services/inventoryService.js';

export async function getInventory(req, res, next) {
  try {
    const search = req.query.search || '';
    const lowStockOnly = req.query.lowStock === 'true';
    const data = await inventoryService.getInventorySummary({ search, lowStockOnly });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const result = await inventoryService.adjustStock(req.body);
    res.json({ success: true, message: 'Stock successfully adjusted in MySQL', data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMovements(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const productId = req.query.productId ? parseInt(req.query.productId, 10) : null;
    const data = await inventoryService.getStockMovements({ limit, product_id: productId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

