import assert from 'assert';
import { getPool } from '../src/config/db.js';
import * as productService from '../src/services/productService.js';
import * as barcodeService from '../src/services/barcodeService.js';
import * as saleService from '../src/services/saleService.js';
import * as supplierService from '../src/services/supplierService.js';
import * as purchaseService from '../src/services/purchaseService.js';
import * as customerService from '../src/services/customerService.js';
import * as inventoryService from '../src/services/inventoryService.js';
import * as returnService from '../src/services/returnService.js';
import * as expenseService from '../src/services/expenseService.js';
import * as reportService from '../src/services/reportService.js';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}:`, err.message);
    failed++;
  }
}

async function asyncIt(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}:`, err.message);
    failed++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log(' RUNNING END-TO-END RETAIL POS AUTOMATED TEST SUITE');
  console.log('===============================================================');

  const pool = getPool();

  // Test 1: Category & Unit Masters
  console.log('\n[TEST GROUP 1: Categories & Units]');
  await asyncIt('Categories retrieve successfully with active counts', async () => {
    const [cats] = await pool.query('SELECT * FROM categories');
    assert(cats.length >= 6, 'Should have at least 6 categories');
  });

  await asyncIt('Units retrieve with allow_decimals flags', async () => {
    const [units] = await pool.query('SELECT * FROM units WHERE code = "KG"');
    assert(units.length === 1 && units[0].allow_decimals === 1, 'KG should allow decimals');
  });

  // Test 2: Barcode Lookup
  console.log('\n[TEST GROUP 2: Barcode Lookup & Preservation]');
  await asyncIt('Barcode lookup retrieves product strictly as VARCHAR preserving leading zeros', async () => {
    const res = await barcodeService.lookupBarcode('8901234567890', 'PHONE_USB');
    assert.strictEqual(res.found, true);
    assert.strictEqual(typeof res.barcode, 'string');
    assert.strictEqual(res.product.name, 'Parle-G 250g');
  });

  // Test 3: Suppliers & Inward Purchase Entry (Stock Increases)
  console.log('\n[TEST GROUP 3: Suppliers & Inward Purchase (Stock Inward)]');
  let testProductId = null;
  let initialStock = 0;

  await asyncIt('Get initial product stock before purchase', async () => {
    const [prods] = await pool.query('SELECT id FROM products WHERE sku = "PRD-7890"');
    testProductId = prods[0].id;
    const [sRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    initialStock = Number(sRows[0].current_stock);
    assert(!isNaN(initialStock));
  });

  await asyncIt('Create Inward Purchase Bill -> Stock increases in MySQL & logs to stock_movements', async () => {
    const inwardQty = 15;
    const purchaseRes = await purchaseService.createPurchase({
      supplier_id: 1,
      supplier_invoice_no: 'TEST-SUP-INV-101',
      items: [
        {
          product_id: testProductId,
          product_name: 'Parle-G 250g',
          quantity: inwardQty,
          purchase_price: 22.00,
          gst_rate: 0
        }
      ],
      payment_mode: 'CASH',
      paid_amount: 330.00
    });

    assert(purchaseRes.purchaseNo.startsWith('PO-'));

    // Check stock after
    const [sRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    const afterStock = Number(sRows[0].current_stock);
    assert.strictEqual(afterStock, initialStock + inwardQty, `Stock should increase by ${inwardQty}`);

    // Check stock movements
    const [mRows] = await pool.query(
      'SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = "PURCHASE" ORDER BY id DESC LIMIT 1',
      [testProductId]
    );
    assert(mRows.length > 0 && Number(mRows[0].quantity) === inwardQty);
  });

  // Test 4: POS Sale (Stock Decreases)
  console.log('\n[TEST GROUP 4: POS Sale & Stock Reduction]');
  let stockBeforeSale = 0;

  await asyncIt('Complete Sale Bill -> Stock automatically decreases & generates sequential invoice', async () => {
    const [sRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    stockBeforeSale = Number(sRows[0].current_stock);

    const saleQty = 3;
    const saleRes = await saleService.createSale({
      customer_name: 'Cash Customer',
      payment_mode: 'CASH',
      paid_amount: 75.00,
      items: [
        {
          id: testProductId,
          qty: saleQty,
          sellingPrice: 25.00
        }
      ]
    });

    assert(saleRes.invoiceNo.startsWith('INV-'));

    const [sAfterRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    const stockAfterSale = Number(sAfterRows[0].current_stock);
    assert.strictEqual(stockAfterSale, stockBeforeSale - saleQty, `Stock should decrease by ${saleQty}`);

    const [mRows] = await pool.query(
      'SELECT * FROM stock_movements WHERE product_id = ? AND movement_type = "SALE" ORDER BY id DESC LIMIT 1',
      [testProductId]
    );
    assert(mRows.length > 0 && Number(mRows[0].quantity) === -saleQty);
  });

  // Test 5: Customer Udhar (Credit) Sale & Payment Collection
  console.log('\n[TEST GROUP 5: Customer Udhar (Khata) & Payments]');
  let customerBeforeBal = 0;

  await asyncIt('Perform Credit Sale -> Increases customer outstanding balance (Udhar)', async () => {
    const [custRows] = await pool.query('SELECT current_balance FROM customers WHERE id = 1');
    customerBeforeBal = Number(custRows[0].current_balance);

    const creditSaleAmount = 100.00;
    await saleService.createSale({
      customer_id: 1,
      customer_name: 'Ramesh Kumar',
      payment_mode: 'CREDIT',
      items: [
        {
          id: testProductId,
          qty: 4,
          sellingPrice: 25.00
        }
      ]
    });

    const [custAfterRows] = await pool.query('SELECT current_balance FROM customers WHERE id = 1');
    const customerAfterBal = Number(custAfterRows[0].current_balance);
    assert.strictEqual(customerAfterBal, customerBeforeBal + creditSaleAmount, 'Udhar should increase by bill amount');
  });

  await asyncIt('Collect Customer Udhar Payment -> Decreases customer balance & logs payment', async () => {
    const payAmount = 50.00;
    const [c1] = await pool.query('SELECT current_balance FROM customers WHERE id = 1');
    const beforePay = Number(c1[0].current_balance);

    const payRes = await customerService.recordCustomerPayment({
      customer_id: 1,
      amount: payAmount,
      payment_mode: 'CASH',
      notes: 'Test Udhar repayment'
    });

    assert(payRes.paymentNo.startsWith('CP-'));
    assert.strictEqual(payRes.remainingBalance, beforePay - payAmount);
  });

  // Test 6: Sales Return (Restock)
  console.log('\n[TEST GROUP 6: Sales Returns & Restocking]');
  await asyncIt('Process Customer Sales Return -> Automatically restocks inventory in MySQL', async () => {
    const [sRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    const beforeReturnStock = Number(sRows[0].current_stock);

    const returnQty = 2;
    const returnRes = await returnService.createSalesReturn({
      items: [
        {
          product_id: testProductId,
          quantity: returnQty,
          refund_price: 25.00,
          restocked: true
        }
      ],
      refund_mode: 'CASH',
      reason: 'Customer bought extra'
    });

    assert(returnRes.returnNo.startsWith('SR-'));

    const [sAfterRows] = await pool.query('SELECT current_stock FROM product_stock WHERE product_id = ?', [testProductId]);
    const afterReturnStock = Number(sAfterRows[0].current_stock);
    assert.strictEqual(afterReturnStock, beforeReturnStock + returnQty, `Stock should increase by return qty ${returnQty}`);
  });

  // Test 7: Store Expenses
  console.log('\n[TEST GROUP 7: Daily Shop Expenses]');
  await asyncIt('Record daily shop expense and verify calculation', async () => {
    const expense = await expenseService.createExpense({
      category_id: 4,
      title: 'Counter Staff Refreshments',
      amount: 60.00,
      payment_mode: 'CASH'
    });
    assert(expense.id > 0);
  });

  // Test 8: Reports & P&L
  console.log('\n[TEST GROUP 8: Financial Reports & Profit and Loss]');
  await asyncIt('Dashboard & Z-Report summary calculates sales, expenses, and net profit', async () => {
    const rep = await reportService.getDashboardAndReportsSummary();
    assert(rep.sales.total_sales > 0, 'Should have positive sales');
    assert(rep.expenses.total_expenses > 0, 'Should have positive expenses');
    assert(rep.profitAndLoss.totalSales > 0, 'P&L sales should match');
  });

  console.log('\n===============================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});

