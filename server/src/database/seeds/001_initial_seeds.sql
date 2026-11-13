-- ============================================================================
-- Initial Seed Data: Realistic Indian Retail Grocery & Department Store Data
-- Includes Tamil names, GST rates, HSN codes, real EAN barcodes & stock
-- ============================================================================

-- Units
INSERT IGNORE INTO units (id, code, name, tamil_name, allow_decimals) VALUES
(1, 'PCS', 'Pieces', 'எண்ணிக்கை', FALSE),
(2, 'PKT', 'Packets', 'பாக்கெட்', FALSE),
(3, 'KG', 'Kilogram', 'கிலோகிராம்', TRUE),
(4, 'GM', 'Grams', 'கிராம்', TRUE),
(5, 'LTR', 'Litre', 'லிட்டர்', TRUE),
(6, 'ML', 'Millilitre', 'மில்லிலிட்டர்', TRUE),
(7, 'BOX', 'Box', 'பெட்டி', FALSE);

-- Categories
INSERT IGNORE INTO categories (id, name, tamil_name, description) VALUES
(1, 'Biscuits & Snacks', 'பிஸ்கட் & தின்பண்டங்கள்', 'Packaged biscuits, cookies, chips and snacks'),
(2, 'Groceries & Staples', 'மளிகை பொருட்கள்', 'Rice, dhal, flour, sugar, salt'),
(3, 'Spices & Masala', 'மசாலா பொருட்கள்', 'Chilli powder, turmeric, coriander, masala mixes'),
(4, 'Beverages & Dairy', 'பானங்கள் & பால்', 'Tea, coffee, milk, ghee, soft drinks'),
(5, 'Personal Care', 'தனிநபர் பராமரிப்பு', 'Soaps, shampoos, toothpaste, detergent');

-- Products
INSERT IGNORE INTO products (id, sku, name, tamil_name, category_id, unit_id, hsn_code, gst_rate, purchase_price, selling_price, mrp, min_stock_level, is_active) VALUES
(1, 'BIS-PAR-001', 'Parle-G 250g', 'பார்லே-ஜி 250கி', 1, 2, '19053100', 18.00, 24.50, 28.00, 30.00, 20.000, TRUE),
(2, 'STA-TAT-001', 'Tata Salt 1kg', 'டாடா உப்பு 1கிலோ', 2, 2, '25010010', 0.00, 21.00, 26.00, 28.00, 25.000, TRUE),
(3, 'MAS-AAC-001', 'Aachi Chilli Powder 100g', 'ஆச்சி மிளகாய் தூள் 100கி', 3, 2, '09042211', 5.00, 31.00, 38.00, 42.00, 15.000, TRUE),
(4, 'BEV-BRU-001', 'Bru Instant Coffee 50g', 'ப்ரூ காபித்தூள் 50கி', 4, 2, '21011110', 18.00, 85.00, 98.00, 105.00, 10.000, TRUE),
(5, 'PC-CIN-001', 'Cinthol Original Soap 100g', 'சின்தால் சோப் 100கி', 5, 1, '34011110', 18.00, 38.00, 46.00, 50.00, 20.000, TRUE),
(6, 'STA-ASH-001', 'Aashirvaad Shudh Chakki Atta 5kg', 'ஆசீர்வாத் ஆட்டா 5கிலோ', 2, 2, '11010000', 0.00, 230.00, 265.00, 280.00, 10.000, TRUE),
(7, 'BIS-BRI-001', 'Britannia Good Day Butter 100g', 'குட் டே பட்டர் பிஸ்கட் 100கி', 1, 2, '19053100', 18.00, 19.50, 23.00, 25.00, 20.000, TRUE);

-- Barcodes (Supporting exact user example: 8901234567890 for Parle-G 250g)
INSERT IGNORE INTO product_barcodes (product_id, barcode, is_primary, barcode_type) VALUES
(1, '8901234567890', TRUE, 'EAN-13'),
(2, '8901030383786', TRUE, 'EAN-13'),
(3, '8901725181222', TRUE, 'EAN-13'),
(4, '8901030825316', TRUE, 'EAN-13'),
(5, '8901023000553', TRUE, 'EAN-13'),
(6, '8901030012211', TRUE, 'EAN-13'),
(7, '8901063011120', TRUE, 'EAN-13');

-- Product Stock Balances
INSERT IGNORE INTO product_stock (product_id, current_stock) VALUES
(1, 100.000),
(2, 80.000),
(3, 50.000),
(4, 30.000),
(5, 60.000),
(6, 25.000),
(7, 75.000);

-- Initial Opening Stock Movements
INSERT IGNORE INTO stock_movements (product_id, movement_type, reference_no, quantity, stock_before, stock_after, cost_price, notes) VALUES
(1, 'OPENING', 'INIT-2026', 100.000, 0.000, 100.000, 24.50, 'Initial opening stock'),
(2, 'OPENING', 'INIT-2026', 80.000, 0.000, 80.000, 21.00, 'Initial opening stock'),
(3, 'OPENING', 'INIT-2026', 50.000, 0.000, 50.000, 31.00, 'Initial opening stock'),
(4, 'OPENING', 'INIT-2026', 30.000, 0.000, 30.000, 85.00, 'Initial opening stock'),
(5, 'OPENING', 'INIT-2026', 60.000, 0.000, 60.000, 38.00, 'Initial opening stock'),
(6, 'OPENING', 'INIT-2026', 25.000, 0.000, 25.000, 230.00, 'Initial opening stock'),
(7, 'OPENING', 'INIT-2026', 75.000, 0.000, 75.000, 19.50, 'Initial opening stock');

-- Settings
INSERT IGNORE INTO app_settings (`key`, `value`, `description`) VALUES
('store_name', 'ஸ்ரீ முருகன் டிபார்ட்மென்டல் ஸ்டோர்ஸ் (Sri Murugan Departmental Stores)', 'Business / Store Display Name'),
('store_phone', '+91 98765 43210', 'Primary store contact number'),
('store_address', '12, காந்தி ரோடு, மதுரை, தமிழ்நாடு - 625001', 'Store address printed on receipts'),
('gstin', '33AAAAA0000A1Z5', 'Goods and Services Tax Identification Number'),
('default_language', 'ta', 'Default UI language (ta = Tamil, en = English)'),
('barcode_suffix', 'ENTER', 'Hardware scanner suffix character (ENTER or TAB)');

