import { Router } from 'express';
import * as expenseController from '../controllers/expenseController.js';

const router = Router();

router.get('/categories', expenseController.getCategories);
router.post('/categories', expenseController.createCategory);
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;

