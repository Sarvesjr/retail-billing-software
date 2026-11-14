import { getPool } from '../src/config/db.js';
import * as productService from '../src/services/productService.js';
import * as barcodeService from '../src/services/barcodeService.js';
import assert from 'assert';

async function runTest() {
  console.log('===============================================================');
  console.log(' TESTING PRE-EXISTING PRODUCT DETECTION & UPDATE IN MYSQL');
  console.log('===============================================================');

  const pool = getPool();

  // 1. Check existing Parle-G
  const lookup = await barcodeService.lookupBarcode('8901234567890');
  assert.strictEqual(lookup.found, true, 'Seeded product 8901234567890 should be found');
  assert.strictEqual(lookup.product.name, 'Parle-G 250g');
  console.log('  ✓ Pre-existing barcode scan instantly identifies existing product:', lookup.product.name);

  const productId = lookup.product.id;
  const originalPrice = Number(lookup.product.selling_price);

  // 2. Update product details (e.g. price change, stock update)
  const updatedPrice = originalPrice === 28 ? 29.50 : 28.00;
  await productService.updateProduct(productId, {
    selling_price: updatedPrice,
    mrp: 30.00,
    current_stock: 120
  });

  // 3. Verify in database
  const [rows] = await pool.query('SELECT selling_price, mrp, ps.current_stock FROM products p JOIN product_stock ps ON p.id = ps.product_id WHERE p.id = ?', [productId]);
  assert.strictEqual(Number(rows[0].selling_price), updatedPrice, `Selling price should be updated to ${updatedPrice}`);
  assert.strictEqual(Number(rows[0].current_stock), 120, 'Stock should be updated to 120');
  console.log('  ✓ Product updated successfully in MySQL via updateProduct service');

  // 4. Restore original price
  await productService.updateProduct(productId, {
    selling_price: originalPrice,
    current_stock: 100
  });
  console.log('  ✓ Product restored to original benchmark values');

  console.log('\nAll product detection and update tests passed successfully!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
