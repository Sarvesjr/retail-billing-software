import { z } from 'zod';
import * as productService from '../services/productService.js';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  tamil_name: z.string().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  unit_id: z.number().int().positive('Unit is required'),
  hsn_code: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(0),
  purchase_price: z.number().min(0).default(0),
  selling_price: z.number().min(0).default(0),
  mrp: z.number().min(0).default(0),
  expiry_date: z.string().optional().nullable(),
  supplier_id: z.number().int().positive().optional().nullable(),
  is_damaged: z.boolean().or(z.number()).optional().default(false),
  damaged_quantity: z.number().min(0).optional().default(0),
  damage_reason: z.string().optional().nullable(),
  min_stock_level: z.number().min(0).default(0),
  barcodes: z.array(z.string()).or(z.string()).optional().default([]),
  opening_stock: z.number().min(0).default(0)
});

export async function getProducts(req, res, next) {
  try {
    const { search, categoryId, limit, offset } = req.query;
    const products = await productService.getAllProducts({
      search,
      categoryId: categoryId ? parseInt(categoryId, 10) : null,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });
    res.json({ success: true, data: products, count: products.length });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

export const updateProductSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, 'Product name is required').optional(),
  tamil_name: z.string().optional().nullable(),
  category_id: z.number().int().positive().optional().nullable(),
  unit_id: z.number().int().positive().optional(),
  hsn_code: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).optional(),
  purchase_price: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  mrp: z.number().min(0).optional(),
  expiry_date: z.string().optional().nullable(),
  supplier_id: z.number().int().positive().optional().nullable(),
  damaged_stock: z.number().min(0).optional(),
  is_damaged: z.boolean().or(z.number()).optional(),
  damage_reason: z.string().optional().nullable(),
  min_stock_level: z.number().min(0).optional(),
  barcodes: z.array(z.string()).or(z.string()).optional(),
  current_stock: z.number().optional(),
  is_active: z.boolean().or(z.number()).optional()
});

export async function createProduct(req, res, next) {
  try {
    const result = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await productService.updateProduct(id, req.body);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await productService.deleteProduct(id);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
}


