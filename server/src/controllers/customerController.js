import * as customerService from '../services/customerService.js';

export async function getCustomers(req, res, next) {
  try {
    const search = req.query.search || '';
    const customers = await customerService.getAllCustomers({ search });
    res.json({ success: true, data: customers });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(req, res, next) {
  try {
    const result = await customerService.recordCustomerPayment(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getLedger(req, res, next) {
  try {
    const ledger = await customerService.getCustomerLedger(req.params.id);
    res.json({ success: true, data: ledger });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const updated = await customerService.updateCustomer(req.params.id, req.body);
    res.json({ success: true, data: updated, message: 'Customer updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const result = await customerService.deleteCustomer(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

