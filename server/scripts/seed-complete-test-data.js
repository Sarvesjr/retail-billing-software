import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

async function seedCompleteTestData() {
  console.log('--- SEEDING COMPREHENSIVE RETAIL TEST DATA ---');
  const conn = await mysql.createConnection({
    host: env.DB.host,
    port: env.DB.port,
    user: env.DB.user,
    password: env.DB.password,
    database: env.DB.database
  });

  try {
    // 1. Seed Categories if not exist
    console.log('[1/8] Ensuring Categories...');
    await conn.query(`
      INSERT IGNORE INTO categories (name, tamil_name, description) VALUES
      ('Groceries & Staples', 'மளிகை & தானியங்கள்', 'Daily retail groceries, dhal, rice, sugar'),
      ('Spices & Masalas', 'மசாலா பொடிகள்', 'Chilli powder, sambar powder, turmeric'),
      ('Biscuits & Snacks', 'பிஸ்கட் & தின்பண்டங்கள்', 'Packaged biscuits, snacks, rusks'),
      ('Personal Care & Soaps', 'குளியல் சோப்புகள் & பராமரிப்பு', 'Soaps, shampoos, body washes'),
      ('Beverages & Tea', 'டீ, காபி & பானங்கள்', 'Tea dust, filter coffee, health drinks'),
      ('Pharmacy & OTC', 'மருந்துகள் & தைலம்', 'Cough syrups, balms, OTC medicines')
    `);

    // 2. Seed Units
    console.log('[2/8] Ensuring Units...');
    await conn.query(`
      INSERT IGNORE INTO units (code, name, tamil_name, allow_decimals) VALUES
      ('PCS', 'Pieces', 'துண்டுகள்', FALSE),
      ('KG', 'Kilogram', 'கிலோகிராம்', TRUE),
      ('GMS', 'Grams', 'கிராம்', TRUE),
      ('LTR', 'Liter', 'லிட்டர்', TRUE),
      ('ML', 'Milliliter', 'மில்லிலிட்டர்', TRUE),
      ('BOTTLE', 'Bottle', 'பாட்டில்', FALSE),
      ('PACKET', 'Packet', 'பாக்கெட்', FALSE)
    `);

    // 3. Seed Suppliers
    console.log('[3/8] Seeding Suppliers...');
    await conn.query(`
      INSERT IGNORE INTO suppliers (id, name, tamil_name, phone, gstin, city, opening_balance, current_balance) VALUES
      (1, 'Parle Agro Distributors', 'பார்லே அக்ரோ விநியோகம்', '9840112233', '33AAACP1234A1Z1', 'Chennai', 0.00, 4500.00),
      (2, 'Tata Consumer Products Agencies', 'டாட்டா நுகர்வோர் ஏஜென்சி', '9840223344', '33AABCT9876B1Z2', 'Madurai', 0.00, 2800.00),
      (3, 'Aachi Masala Foods Stockist', 'ஆச்சி மசாலா மொத்த விற்பனை', '9840334455', '33AABCA5432C1Z3', 'Tirunelveli', 0.00, 0.00),
      (4, 'Johnson Healthcare Supply', 'ஜான்சன் ஹெல்த்கேர் சப்ளை', '9840445566', '33AAACJ1122D1Z4', 'Coimbatore', 0.00, 1500.00)
    `);

    // 4. Seed Customers (with Udhar / Khata balances)
    console.log('[4/8] Seeding Customers with Udhar Khata...');
    await conn.query(`
      INSERT IGNORE INTO customers (id, name, tamil_name, phone, address, credit_limit, current_balance) VALUES
      (1, 'Ramesh Kumar', 'ரமேஷ் குமார்', '9876543210', 'No. 14, Gandhi Nagar, 2nd Street', 5000.00, 1450.00),
      (2, 'Priya Selvan', 'பிரியா செல்வன்', '9840123456', 'Plot 8, Anna Salai', 3000.00, 620.00),
      (3, 'K. Vignesh', 'கே. விக்னேஷ்', '9790112233', '45, Kamarajar Street', 4000.00, 0.00),
      (4, 'Anitha Raj', 'அனிதா ராஜ்', '9944001122', '12/B, Bazaar Road', 10000.00, 2100.00)
    `);

    // 5. Ensure core products exist with barcodes & stock
    console.log('[5/8] Ensuring Core Products & Barcodes...');
    const productsToEnsure = [
      { sku: 'PRD-7890', name: 'Parle-G 250g', tamil: 'பார்லே-ஜி பிஸ்கட் 250கி', barcode: '8901234567890', cost: 22.00, sell: 25.00, stock: 45, unitId: 1, catId: 3 },
      { sku: 'PRD-3786', name: 'Tata Salt 1kg', tamil: 'டாட்டா உப்பு 1கிலோ', barcode: '8901030383786', cost: 24.00, sell: 28.00, stock: 60, unitId: 2, catId: 1 },
      { sku: 'PRD-1222', name: 'Aachi Chilli Powder 100g', tamil: 'ஆச்சி மிளகாய் தூள் 100கி', barcode: '8901725181222', cost: 38.00, sell: 45.00, stock: 30, unitId: 1, catId: 2 },
      { sku: 'PRD-2024', name: 'Benadryl Cough Syrup 100ml', tamil: 'பெனட்ரில் இருமல் மருந்து 100மி.லி', barcode: '8901012320242', cost: 110.00, sell: 135.00, stock: 20, unitId: 6, catId: 6 },
      { sku: 'PRD-1205', name: 'Vicks Vaporub 25ml', tamil: 'விக்ஸ் வேப்போரப் 25மி.லி', barcode: '4987176191205', cost: 72.00, sell: 85.00, stock: 25, unitId: 6, catId: 6 },
      { sku: 'PRD-0553', name: 'Cinthol Soap 100g', tamil: 'சின்தால் சோப் 100கி', barcode: '8901023000553', cost: 42.00, sell: 50.00, stock: 35, unitId: 1, catId: 4 }
    ];

    for (const p of productsToEnsure) {
      // Insert product if not exist
      await conn.query(
        `INSERT IGNORE INTO products (sku, name, tamil_name, category_id, unit_id, purchase_price, selling_price, mrp, min_stock_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5.000)`,
        [p.sku, p.name, p.tamil, p.catId, p.unitId, p.cost, p.sell, p.sell]
      );

      const [pRows] = await conn.query('SELECT id FROM products WHERE sku = ?', [p.sku]);
      const pId = pRows[0].id;

      // Insert Barcode
      await conn.query(
        `INSERT IGNORE INTO product_barcodes (product_id, barcode, is_primary, barcode_type)
         VALUES (?, ?, TRUE, 'EAN13')`,
        [pId, p.barcode]
      );

      // Ensure stock
      await conn.query(
        `INSERT INTO product_stock (product_id, current_stock) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE current_stock = GREATEST(current_stock, VALUES(current_stock))`,
        [pId, p.stock]
      );
    }

    // 6. Seed Inward Purchases (Purchase History)
    console.log('[6/8] Seeding Purchase Bills...');
    await conn.query(`
      INSERT IGNORE INTO purchases (id, purchase_no, supplier_invoice_no, supplier_id, purchase_date, subtotal, tax_total, grand_total, paid_amount, payment_mode, payment_status, status) VALUES
      (1, 'PO-20261110-0001', 'PARLE-INV-891', 1, '2026-11-10', 4400.00, 220.00, 4620.00, 4620.00, 'BANK_TRANSFER', 'PAID', 'RECEIVED'),
      (2, 'PO-20261112-0002', 'TATA-INV-4421', 2, '2026-11-12', 2400.00, 120.00, 2520.00, 0.00, 'CREDIT', 'UNPAID', 'RECEIVED')
    `);

    // 7. Seed Daily Expenses
    console.log('[7/8] Seeding Daily Store Expenses...');
    await conn.query(`
      INSERT IGNORE INTO expenses (id, category_id, title, amount, payment_mode, expense_date, notes) VALUES
      (1, 1, 'Monthly Shop Rent Advance', 8000.00, 'BANK_TRANSFER', CURDATE(), 'Shop landlord receipt #44'),
      (2, 2, 'TNEB Commercial Power Bill', 1250.00, 'UPI', CURDATE(), 'EB Consumer #04-12-88'),
      (3, 4, 'Evening Tea & Samosa for counter staff', 80.00, 'CASH', CURDATE(), 'Daily refreshment'),
      (4, 7, 'Biodegradable Carry Bags (250 count)', 450.00, 'CASH', CURDATE(), 'Wholesale plastics store')
    `);

    // 8. Seed Customer Payments History (Udhar collections)
    console.log('[8/8] Seeding Customer Payments History...');
    await conn.query(`
      INSERT IGNORE INTO customer_payments (id, payment_no, customer_id, amount, payment_mode, payment_date, notes) VALUES
      (1, 'CP-20261111-0001', 1, 500.00, 'CASH', '2026-11-11', 'Partial Udhar clearing'),
      (2, 'CP-20261112-0002', 2, 400.00, 'UPI', '2026-11-12', 'GPay transfer for past bill')
    `);

    console.log('✅ COMPLETE TEST DATA SEEDED CLEANLY INTO MYSQL!');
  } finally {
    await conn.end();
  }
}

seedCompleteTestData().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});

