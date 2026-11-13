import * as expenseService from '../services/expenseService.js';

export async function getCategories(req, res, next) {
  try {
    const cats = await expenseService.getExpenseCategories();
    res.json({ success: true, data: cats });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const cat = await expenseService.createExpenseCategory(req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const { startDate, endDate } = req.query;
    const expenses = await expenseService.getExpenses({ limit, startDate, endDate });
    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
}

export async function createExpense(req, res, next) {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    next(error);
  }
}

