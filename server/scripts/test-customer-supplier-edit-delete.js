import { getPool } from '../src/config/db.js';
import * as customerService from '../src/services/customerService.js';
import * as supplierService from '../src/services/supplierService.js';
import assert from 'assert';

async function runTests() {
  console.log('===============================================================');
  console.log(' TESTING CUSTOMER & SUPPLIER EDIT / DELETE LIFECYCLE');
  console.log('===============================================================');

  const pool = getPool();

  // --- TEST CUSTOMERS ---
  console.log('\n[TEST 1: Customer Create -> Edit -> Delete]');
  const testPhone = '999' + Math.floor(1000000 + Math.random() * 9000000);
  const createdCust = await customerService.createCustomer({
    name: 'Test Customer',
    tamil_name: 'சோதனை வாடிக்கையாளர்',
    phone: testPhone,
    address: '123 Market St',
    credit_limit: 3000
  });
  assert(createdCust.id > 0, 'Customer created');
  console.log('  ✓ Customer created with ID #', createdCust.id);

  // Update Customer
  const updatedCust = await customerService.updateCustomer(createdCust.id, {
    name: 'Test Customer Updated',
    tamil_name: 'சோதனை வாடிக்கையாளர் புதுப்பிக்கப்பட்டது',
    phone: testPhone,
    address: '456 New Market St',
    credit_limit: 7500
  });
  assert.strictEqual(updatedCust.name, 'Test Customer Updated');

  const [cRows] = await pool.query('SELECT name, address, credit_limit FROM customers WHERE id = ?', [createdCust.id]);
  assert.strictEqual(cRows[0].name, 'Test Customer Updated');
  assert.strictEqual(cRows[0].address, '456 New Market St');
  assert.strictEqual(Number(cRows[0].credit_limit), 7500);
  console.log('  ✓ Customer updated successfully in MySQL');

  // Delete Customer
  const delCustRes = await customerService.deleteCustomer(createdCust.id);
  assert.strictEqual(delCustRes.success, true);
  const [cActive] = await pool.query('SELECT is_active FROM customers WHERE id = ?', [createdCust.id]);
  assert.strictEqual(cActive[0].is_active, 0, 'Customer should be marked is_active=false');
  console.log('  ✓ Customer deleted (is_active=false) successfully');

  // Hard clean test customer
  await pool.query('DELETE FROM customers WHERE id = ?', [createdCust.id]);

  // --- TEST SUPPLIERS ---
  console.log('\n[TEST 2: Supplier Create -> Edit -> Delete]');
  const testSuppPhone = '888' + Math.floor(1000000 + Math.random() * 9000000);
  const createdSupp = await supplierService.createSupplier({
    name: 'Test Supplier Distributor',
    tamil_name: 'சோதனை வழங்குநர்',
    phone: testSuppPhone,
    city: 'Madurai',
    opening_balance: 0
  });
  assert(createdSupp.id > 0, 'Supplier created');
  console.log('  ✓ Supplier created with ID #', createdSupp.id);

  // Update Supplier
  await supplierService.updateSupplier(createdSupp.id, {
    name: 'Test Supplier Distributor Updated',
    city: 'Chennai',
    phone: testSuppPhone
  });
  const [sRows] = await pool.query('SELECT name, city FROM suppliers WHERE id = ?', [createdSupp.id]);
  assert.strictEqual(sRows[0].name, 'Test Supplier Distributor Updated');
  assert.strictEqual(sRows[0].city, 'Chennai');
  console.log('  ✓ Supplier updated successfully in MySQL');

  // Delete Supplier
  const delSuppRes = await supplierService.deleteSupplier(createdSupp.id);
  assert.strictEqual(delSuppRes.success, true);
  const [sActive] = await pool.query('SELECT is_active FROM suppliers WHERE id = ?', [createdSupp.id]);
  assert.strictEqual(sActive[0].is_active, 0, 'Supplier should be marked is_active=false');
  console.log('  ✓ Supplier deleted (is_active=false) successfully');

  // Hard clean test supplier
  await pool.query('DELETE FROM suppliers WHERE id = ?', [createdSupp.id]);

  console.log('\nAll customer & supplier edit and delete operations passed with clean reset!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

