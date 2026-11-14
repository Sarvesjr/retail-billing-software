import { testConnection, getPool } from '../src/config/db.js';
import * as productService from '../src/services/productService.js';
import * as barcodeService from '../src/services/barcodeService.js';
import * as scannerService from '../src/services/scannerService.js';

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

async function runTests() {
  console.log('===============================================================');
  console.log(' RUNNING AUTOMATED VERIFICATION: ALL CORE POS & DATABASE MODULES');
  console.log('===============================================================');

  // Test 1: MySQL Connection Verification
  console.log('\n[1] Verifying MySQL Database Connection...');
  const connTest = await testConnection();
  assert(connTest.success === true, `MySQL connection active on port 3306 (result: ${connTest.result})`);

  const pool = getPool();

  // Test 2: Seed Verification for Parle-G (8901234567890)
  console.log('\n[2] Verifying Seeded Product & Barcode in MySQL...');
  const [parleRows] = await pool.query(
    `SELECT p.id, p.sku, p.name, p.tamil_name, pb.barcode, ps.current_stock, p.selling_price
     FROM products p
     JOIN product_barcodes pb ON p.id = pb.product_id
     JOIN product_stock ps ON p.id = ps.product_id
     WHERE pb.barcode = '8901234567890'`
  );
  assert(parleRows.length === 1, 'Product with barcode 8901234567890 exists in MySQL');
  assert(parleRows[0]?.name === 'Parle-G 250g', `Product name is "${parleRows[0]?.name}"`);
  assert(Number(parleRows[0]?.current_stock) === 100, `Stock balance is ${parleRows[0]?.current_stock}`);
  assert(Number(parleRows[0]?.selling_price) === 28, `Selling price is ₹${parleRows[0]?.selling_price}`);

  // Test 3: Product Creation with Barcode, Stock Balance & Movement
  console.log('\n[3] Testing Real Product Creation inside MySQL Transaction...');
  const testSku = 'TEST-CAD-' + Math.floor(1000 + Math.random() * 9000);
  const testBarcode = '008901234' + Math.floor(1000 + Math.random() * 9000); // Test leading zeros preservation!

  const created = await productService.createProduct({
    sku: testSku,
    name: 'Cadbury Dairy Milk Silk 60g',
    tamil_name: 'கேட்பரி சில்க் சாக்லேட் 60கி',
    category_id: 1,
    unit_id: 1,
    hsn_code: '18063100',
    gst_rate: 18.00,
    purchase_price: 65.00,
    selling_price: 80.00,
    mrp: 85.00,
    min_stock_level: 5.000,
    barcodes: [testBarcode],
    opening_stock: 25.000
  });

  assert(Boolean(created.id), `Product successfully inserted with ID #${created.id}`);

  // Test 4: Direct Verification of MySQL Tables for Created Product
  console.log('\n[4] Direct Verification of Raw MySQL Tables for Inserted Product...');
  const [dbProd] = await pool.query('SELECT * FROM products WHERE id = ?', [created.id]);
  assert(dbProd.length === 1 && dbProd[0].sku === testSku, 'Record confirmed in `products` table');

  const [dbBarcode] = await pool.query('SELECT * FROM product_barcodes WHERE product_id = ?', [created.id]);
  assert(dbBarcode.length === 1, 'Record confirmed in `product_barcodes` table');
  assert(dbBarcode[0].barcode === testBarcode, `Barcode strictly preserved as string with leading zero: "${dbBarcode[0].barcode}"`);
  assert(typeof dbBarcode[0].barcode === 'string', 'Barcode data type is string (never float or number)');

  const [dbStock] = await pool.query('SELECT * FROM product_stock WHERE product_id = ?', [created.id]);
  assert(dbStock.length === 1 && Number(dbStock[0].current_stock) === 25, 'Record confirmed in `product_stock` table (stock = 25.000)');

  const [dbMovement] = await pool.query(
    'SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = "OPENING"',
    [created.id]
  );
  assert(dbMovement.length === 1 && Number(dbMovement[0].quantity) === 25, 'Record confirmed in `stock_movements` ledger');

  // Test 5: End-to-End Barcode Lookup from Hardware Scanner
  console.log('\n[5] Testing Barcode Lookup for Seeded Barcode (8901234567890)...');
  const lookupSeed = await barcodeService.lookupBarcode('8901234567890', 'HARDWARE_USB');
  assert(lookupSeed.success === true, 'Lookup API returned success');
  assert(lookupSeed.found === true, 'Product found in MySQL');
  assert(lookupSeed.product?.name === 'Parle-G 250g', `Retrieved product "${lookupSeed.product?.name}"`);
  assert(lookupSeed.product?.sellingPrice === 28, `Selling price is ₹${lookupSeed.product?.sellingPrice}`);
  assert(lookupSeed.responseTimeMs < 50, `Query execution completed in ${lookupSeed.responseTimeMs}ms`);

  // Test 6: End-to-End Barcode Lookup for Newly Created Product
  console.log('\n[6] Testing Barcode Lookup for Newly Created Product...');
  const lookupNew = await barcodeService.lookupBarcode(testBarcode, 'PHONE_USB');
  assert(lookupNew.found === true, `Newly created barcode "${testBarcode}" successfully matched in MySQL`);
  assert(lookupNew.product?.name === 'Cadbury Dairy Milk Silk 60g', `Product name matches: "${lookupNew.product?.name}"`);
  assert(lookupNew.product?.currentStock === 25, `Stock balance confirmed: ${lookupNew.product?.currentStock}`);

  // Test 7: Non-existent Barcode Lookup
  console.log('\n[7] Testing Non-existent Barcode Lookup...');
  const lookupNotFound = await barcodeService.lookupBarcode('9999999999999', 'MANUAL');
  assert(lookupNotFound.found === false, 'Non-existent barcode correctly returns found=false');
  assert(lookupNotFound.product === null, 'No product object returned for unknown barcode');

  // Test 8: Phone USB Companion Scan Processing & MySQL Scanner Logs
  console.log('\n[8] Testing Phone USB Scanner Companion Processing & MySQL Audit Trail...');
  const phoneScanResult = await scannerService.processIncomingScan('8901030383786', 'PHONE_USB'); // Tata Salt
  assert(phoneScanResult.found === true, 'Phone USB scan processed and resolved Tata Salt');

  const [auditLogs] = await pool.query(
    'SELECT * FROM scanner_logs WHERE barcode = ? AND input_source = "PHONE_USB" ORDER BY id DESC LIMIT 1',
    ['8901030383786']
  );
  assert(auditLogs.length === 1, 'Audit record recorded in MySQL `scanner_logs` table');
  assert(auditLogs[0].lookup_status === 'FOUND', `Status in MySQL is "${auditLogs[0].lookup_status}"`);
  assert(auditLogs[0].product_name === 'Tata Salt 1kg', `Product name in MySQL log is "${auditLogs[0].product_name}"`);

  // Test 9: Uniqueness Constraint on Barcodes
  console.log('\n[9] Testing MySQL Barcode Duplicate Prevention Constraint...');
  try {
    await productService.createProduct({
      sku: 'DUP-SKU-001',
      name: 'Duplicate Test',
      unit_id: 1,
      selling_price: 10,
      barcodes: [testBarcode] // Same barcode as test 3!
    });
    assert(false, 'Duplicate barcode should have thrown MySQL duplicate key error');
  } catch (dupErr) {
    assert(dupErr.code === 'ER_DUP_ENTRY' || dupErr.message.includes('Duplicate entry'), 'MySQL duplicate constraint successfully blocked duplicate barcode');
  }

  console.log('\n===============================================================');
  console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

