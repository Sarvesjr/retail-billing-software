import * as supplierService from '../services/supplierService.js';

export async function getSuppliers(req, res, next) {
  try {
    const suppliers = await supplierService.getAllSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
}

export async function createSupplier(req, res, next) {
  try {
    const newSupplier = await supplierService.createSupplier(req.body);
    res.json({ success: true, data: newSupplier });
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req, res, next) {
  try {
    const updated = await supplierService.updateSupplier(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}
