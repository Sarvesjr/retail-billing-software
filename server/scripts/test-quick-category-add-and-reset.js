import { getPool } from '../src/config/db.js';
import * as productService from '../src/services/productService.js';
import assert from 'assert';

async function runTest() {
  console.log('===============================================================');
  console.log(' TESTING QUICK CATEGORY ADDITION FROM PRODUCT PAGE & CLEAN RESET');
  console.log('===============================================================');

  const pool = getPool();

  // 1. Create a test category simulating the quick add action
  const testCatName = 'Test Groceries ' + Date.now();
  const testCatTamil = 'சோதனை மளிகை';
  const [catResult] = await pool.query(
    'INSERT INTO categories (name, tamil_name) VALUES (?, ?)',
    [testCatName, testCatTamil]
  );
  const catId = catResult.insertId;
  assert(catId > 0, 'Category should be inserted with valid insertId');
  console.log(`  ✓ Quick Category "${testCatName}" created with ID #${catId}`);

  // 2. Fetch units to get a valid unit
  const [units] = await pool.query('SELECT id FROM units LIMIT 1');
  let unitId = units.length ? units[0].id : null;
  if (!unitId) {
    const [uRes] = await pool.query('INSERT INTO units (code, name) VALUES ("PCS", "Pieces")');
    unitId = uRes.insertId;
  }

  // 3. Create product linked to this new category
  const testBarcode = '8908000641028';
  const testSku = 'PRD-TEST-' + Math.floor(1000 + Math.random() * 9000);
  const createdProd = await productService.createProduct({
    sku: testSku,
    name: 'Suvai Roasted Vermicelli',
    tamil_name: 'சுவை சேமியா',
    category_id: catId,
    unit_id: unitId,
    selling_price: 35.00,
    mrp: 38.00,
    barcodes: [testBarcode],
    opening_stock: 50
  });

  assert(createdProd.id > 0, 'Product should be created successfully');
  console.log(`  ✓ Product "${createdProd.name}" successfully created with category ID #${catId}`);

  // 4. Verify product links to this category
  const [pRows] = await pool.query(
    'SELECT p.name, c.name AS category_name, pb.barcode FROM products p JOIN categories c ON p.category_id = c.id JOIN product_barcodes pb ON p.id = pb.product_id WHERE p.id = ?',
    [createdProd.id]
  );
  assert.strictEqual(pRows.length, 1);
  assert.strictEqual(pRows[0].category_name, testCatName);
  assert.strictEqual(pRows[0].barcode, testBarcode);
  console.log(`  ✓ Verified MySQL link: Product is categorized under "${pRows[0].category_name}"`);

  // 5. Clean / Reset test data as requested by user ("reset after done enough")
  console.log('\n[RESETTING TEST DATA]');
  await pool.query('DELETE FROM stock_movements WHERE product_id = ?', [createdProd.id]);
  await pool.query('DELETE FROM product_stock WHERE product_id = ?', [createdProd.id]);
  await pool.query('DELETE FROM product_barcodes WHERE product_id = ?', [createdProd.id]);
  await pool.query('DELETE FROM products WHERE id = ?', [createdProd.id]);
  await pool.query('DELETE FROM categories WHERE id = ?', [catId]);

  // Verify cleaned
  const [checkProd] = await pool.query('SELECT id FROM products WHERE id = ?', [createdProd.id]);
  const [checkCat] = await pool.query('SELECT id FROM categories WHERE id = ?', [catId]);
  assert.strictEqual(checkProd.length, 0, 'Test product should be deleted');
  assert.strictEqual(checkCat.length, 0, 'Test category should be deleted');

  console.log('  ✓ Test category and product cleanly reset from MySQL database!');
  console.log('\nAll quick category tests passed and database cleanly reset!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
