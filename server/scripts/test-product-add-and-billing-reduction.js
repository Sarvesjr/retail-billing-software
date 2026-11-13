import { getPool } from '../src/config/db.js';
import * as productService from '../src/services/productService.js';
import * as barcodeService from '../src/services/barcodeService.js';
import * as saleService from '../src/services/saleService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function run() {
  console.log('===============================================================');
  console.log(' TEST: ADD PRODUCT WITH BARCODE -> BILL IT -> VERIFY STOCK REDUCTION');
  console.log('===============================================================');

  const pool = getPool();
  const uniqueBarcode = '89099' + Math.floor(10000000 + Math.random() * 90000000);
  const uniqueSku = 'TEST-PRD-' + Math.floor(1000 + Math.random() * 9000);

  // 1. Add Product with Barcode and Opening Stock of 50
  console.log(`\n[1] Creating new product with barcode "${uniqueBarcode}" and 50.000 opening stock...`);
  const created = await productService.createProduct({
    sku: uniqueSku,
    name: 'Real Barcode Test Cookie 150g',
    tamil_name: 'பரிசோதனை குக்கீஸ் 150கி',
    unit_id: 1,
    selling_price: 45.00,
    purchase_price: 35.00,
    mrp: 50.00,
    barcodes: [uniqueBarcode],
    opening_stock: 50.000
  });

  assert(Boolean(created.id), `Product created with ID #${created.id}`);

  // 2. Verify in MySQL that stock is initially 50.000
  const [initialStockRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [created.id]);
  assert(Number(initialStockRows[0]?.current_stock) === 50, `Initial stock in MySQL is 50.000 (actual: ${initialStockRows[0]?.current_stock})`);

  // 3. Look up product using the barcode
  console.log(`\n[2] Looking up product using barcode "${uniqueBarcode}"...`);
  const lookup = await barcodeService.lookupBarcode(uniqueBarcode, 'PHONE_USB');
  assert(lookup.found === true, 'Barcode lookup returned FOUND');
  assert(lookup.product?.name === 'Real Barcode Test Cookie 150g', `Product name matches: "${lookup.product?.name}"`);
  assert(lookup.product?.currentStock === 50, `Lookup shows 50.000 available stock`);

  // 4. Perform a Sale of 5 units using this barcode/product
  console.log('\n[3] Billing / Selling 5 units of this product...');
  const saleResult = await saleService.createSale({
    customer_name: 'Walk-in Customer',
    payment_mode: 'CASH',
    items: [
      {
        id: created.id,
        qty: 5,
        sellingPrice: 45.00,
        barcode: uniqueBarcode
      }
    ]
  });

  assert(Boolean(saleResult.invoiceNo), `Sale successful with invoice: ${saleResult.invoiceNo}`);
  assert(saleResult.grandTotal === 225, `Grand total calculated correctly: ₹${saleResult.grandTotal}`);

  // 5. Verify that stock was reduced in MySQL product_stock table from 50 to 45
  console.log('\n[4] Directly querying MySQL product_stock table to verify stock reduction...');
  const [updatedStockRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [created.id]);
  const newStock = Number(updatedStockRows[0]?.current_stock);
  assert(newStock === 45, `Stock balance in MySQL product_stock successfully decreased from 50 to 45.000 (actual: ${newStock})`);

  // 6. Verify that an immutable stock movement of type 'SALE' was logged in stock_movements
  console.log('\n[5] Directly querying MySQL stock_movements ledger...');
  const [movementRows] = await pool.query(
    'SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = "SALE" ORDER BY id DESC LIMIT 1',
    [created.id]
  );
  assert(movementRows.length === 1, 'Sale movement record exists in `stock_movements` ledger');
  assert(Number(movementRows[0]?.quantity) === -5, `Movement quantity is -5.000 (actual: ${movementRows[0]?.quantity})`);
  assert(Number(movementRows[0]?.stock_before) === 50, `Stock before was 50.000`);
  assert(Number(movementRows[0]?.stock_after) === 45, `Stock after is 45.000`);

  // 7. Verify subsequent barcode lookup now returns currentStock = 45
  console.log('\n[6] Re-scanning barcode to verify updated stock in scanner response...');
  const lookupAfterSale = await barcodeService.lookupBarcode(uniqueBarcode, 'PHONE_USB');
  assert(lookupAfterSale.product?.currentStock === 45, `Scanner lookup now reflects remaining stock: ${lookupAfterSale.product?.currentStock}`);

  console.log('\n===============================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

