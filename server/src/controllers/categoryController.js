import { getPool } from '../config/db.js';

export async function getCategories(req, res, next) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.tamil_name,
        c.description,
        c.is_active,
        c.created_at,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryProducts(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 
        p.id,
        p.sku,
        p.name,
        p.tamil_name,
        p.purchase_price,
        p.selling_price,
        p.mrp,
        u.code AS unit_code,
        COALESCE(ps.current_stock, 0) AS current_stock,
        GROUP_CONCAT(DISTINCT pb.barcode SEPARATOR ', ') AS barcodes
       FROM products p
       LEFT JOIN units u ON p.unit_id = u.id
       LEFT JOIN product_stock ps ON p.id = ps.product_id
       LEFT JOIN product_barcodes pb ON p.id = pb.product_id
       WHERE p.category_id = ? AND p.is_active = TRUE
       GROUP BY p.id
       ORDER BY p.name ASC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, tamil_name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO categories (name, tamil_name, description) VALUES (?, ?, ?)',
      [name.trim(), tamil_name?.trim() || null, description?.trim() || null]
    );
    res.json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        tamil_name: tamil_name?.trim() || null,
        description: description?.trim() || null
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Category name already exists' });
    }
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { name, tamil_name, description, is_active } = req.body;
    const pool = getPool();
    await pool.query(
      `UPDATE categories 
       SET name = COALESCE(?, name),
           tamil_name = COALESCE(?, tamil_name),
           description = COALESCE(?, description),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name?.trim() || null, tamil_name?.trim() || null, description?.trim() || null, is_active ?? null, id]
    );
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [prods] = await pool.query('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [id]);
    if (prods[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category because it contains ${prods[0].count} product(s). Move or delete the products first.`
      });
    }
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getUnits(req, res, next) {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM units ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createUnit(req, res, next) {
  try {
    const { code, name, tamil_name, allow_decimals } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, error: 'Unit code and name are required' });
    }
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO units (code, name, tamil_name, allow_decimals) VALUES (?, ?, ?, ?)',
      [code.trim().toUpperCase(), name.trim(), tamil_name?.trim() || null, Boolean(allow_decimals)]
    );
    res.json({
      success: true,
      data: {
        id: result.insertId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        tamil_name: tamil_name?.trim() || null,
        allow_decimals: Boolean(allow_decimals)
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Unit code already exists' });
    }
    next(error);
  }
}

export async function updateUnit(req, res, next) {
  try {
    const { id } = req.params;
    const { code, name, tamil_name, allow_decimals, is_active } = req.body;
    const pool = getPool();
    await pool.query(
      `UPDATE units 
       SET code = COALESCE(?, code),
           name = COALESCE(?, name),
           tamil_name = COALESCE(?, tamil_name),
           allow_decimals = COALESCE(?, allow_decimals),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [code?.trim()?.toUpperCase() || null, name?.trim() || null, tamil_name?.trim() || null, allow_decimals ?? null, is_active ?? null, id]
    );
    res.json({ success: true, message: 'Unit updated successfully' });
  } catch (error) {
    next(error);
  }
}
