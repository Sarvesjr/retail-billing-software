-- ============================================================================
-- Migration 003: Complete Small-Scale Indian Retail POS Schema
-- Suppliers, Purchases, Customers, Khata/Udhar, Returns, Expenses, Users
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Suppliers (Vendors from whom we purchase stock)
CREATE TABLE IF NOT EXISTS suppliers (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `tamil_name` VARCHAR(200) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `gstin` VARCHAR(25) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- Positive = We owe supplier
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_supplier_name` (`name`),
    INDEX `idx_supplier_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Customers (Regular Store Customers & Credit / Udhar Ledger)
CREATE TABLE IF NOT EXISTS customers (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `tamil_name` VARCHAR(200) NULL,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `email` VARCHAR(100) NULL,
    `gstin` VARCHAR(25) NULL,
    `address` TEXT NULL,
    `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00, -- Positive = Customer owes us (Udhar)
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_customer_name` (`name`),
    INDEX `idx_customer_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Purchases (Inward stock bills from suppliers)
CREATE TABLE IF NOT EXISTS purchases (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_no` VARCHAR(50) NOT NULL UNIQUE,
    `supplier_invoice_no` VARCHAR(100) NULL,
    `supplier_id` INT NOT NULL,
    `purchase_date` DATE NOT NULL,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_mode` ENUM('CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT') NOT NULL DEFAULT 'CASH',
    `payment_status` ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'PAID',
    `notes` VARCHAR(255) NULL,
    `status` ENUM('RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'RECEIVED',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_purchase_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_purchase_no` (`purchase_no`),
    INDEX `idx_purchase_date` (`purchase_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Purchase Line Items
CREATE TABLE IF NOT EXISTS purchase_items (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `quantity` DECIMAL(12,3) NOT NULL,
    `purchase_price` DECIMAL(12,2) NOT NULL,
    `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(12,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_purchase_item_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_purchase_item_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    INDEX `idx_purchase_item_purchase` (`purchase_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Customer Payments (Udhar Collections)
CREATE TABLE IF NOT EXISTS customer_payments (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` INT NOT NULL,
    `sale_id` INT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
    `reference_no` VARCHAR(100) NULL,
    `notes` VARCHAR(255) NULL,
    `payment_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cust_pay_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_cust_pay_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Supplier Payments (Vendor Disbursements)
CREATE TABLE IF NOT EXISTS supplier_payments (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_no` VARCHAR(50) NOT NULL UNIQUE,
    `supplier_id` INT NOT NULL,
    `purchase_id` INT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_mode` ENUM('CASH', 'UPI', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
    `reference_no` VARCHAR(100) NULL,
    `notes` VARCHAR(255) NULL,
    `payment_date` DATE NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_supp_pay_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT,
    INDEX `idx_supp_pay_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Sales Returns (Customer returning goods)
CREATE TABLE IF NOT EXISTS sales_returns (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_no` VARCHAR(50) NOT NULL UNIQUE,
    `sale_id` INT NULL,
    `customer_id` INT NULL,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `refund_mode` ENUM('CASH', 'UPI', 'CREDIT_NOTE', 'CREDIT_ADJUST') NOT NULL DEFAULT 'CASH',
    `reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sreturn_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sales Return Items
CREATE TABLE IF NOT EXISTS sales_return_items (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sales_return_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` DECIMAL(12,3) NOT NULL,
    `refund_price` DECIMAL(12,2) NOT NULL,
    `line_total` DECIMAL(12,2) NOT NULL,
    `restocked` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sreturn_item_return` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sreturn_item_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Purchase Returns (Returning goods to supplier)
CREATE TABLE IF NOT EXISTS purchase_returns (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_no` VARCHAR(50) NOT NULL UNIQUE,
    `purchase_id` INT NULL,
    `supplier_id` INT NOT NULL,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `debit_note_no` VARCHAR(100) NULL,
    `reason` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_preturn_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Purchase Return Items
CREATE TABLE IF NOT EXISTS purchase_return_items (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `purchase_return_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` DECIMAL(12,3) NOT NULL,
    `return_price` DECIMAL(12,2) NOT NULL,
    `line_total` DECIMAL(12,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_preturn_item_return` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_preturn_item_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Expense Categories (Shop Operating Overhead)
CREATE TABLE IF NOT EXISTS expense_categories (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `tamil_name` VARCHAR(150) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Expenses Ledger
CREATE TABLE IF NOT EXISTS expenses (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `category_id` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_mode` ENUM('CASH', 'UPI', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
    `expense_date` DATE NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_expense_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE RESTRICT,
    INDEX `idx_expense_date` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. System Users & Permissions
CREATE TABLE IF NOT EXISTS users (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'CASHIER') NOT NULL DEFAULT 'CASHIER',
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Seed default expense categories & default admin user
INSERT IGNORE INTO expense_categories (name, tamil_name) VALUES
('Shop Rent', 'கடை வாடகை'),
('Electricity Bill', 'மின்சார கட்டணம்'),
('Staff Salaries', 'ஊழியர் சம்பளம்'),
('Tea & Refreshments', 'டீ & சிற்றுண்டி'),
('Transportation & Auto', 'சரக்கு போக்குவரத்து'),
('Shop Maintenance & Cleaning', 'கடை பராமரிப்பு & சுத்தம்'),
('Packaging & Bags', 'பேக்கிங் கவர்கள்');

INSERT IGNORE INTO users (username, password_hash, display_name, role) VALUES
('admin', 'admin123', 'Store Owner / Admin', 'ADMIN'),
('cashier', 'cashier123', 'Counter Cashier', 'CASHIER');
