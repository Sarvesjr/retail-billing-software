import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';

const router = Router();

// Categories
router.get('/categories', categoryController.getCategories);
router.get('/categories/:id/products', categoryController.getCategoryProducts);
router.post('/categories', categoryController.createCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Units
router.get('/units', categoryController.getUnits);
router.post('/units', categoryController.createUnit);
router.put('/units/:id', categoryController.updateUnit);

export default router;
