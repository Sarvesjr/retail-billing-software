-- Migration 006: Expired & Damaged Tracking, Discounts & Free Samples, Customer Feedback
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci

-- 1. Add expiry, supplier and damaged stock tracking to products
ALTER TABLE products ADD COLUMN `expiry_date` DATE NULL AFTER `mrp`;
ALTER TABLE products ADD COLUMN `supplier_id` INT NULL AFTER `expiry_date`;
ALTER TABLE products ADD COLUMN `damaged_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `supplier_id`;
ALTER TABLE products ADD COLUMN `is_damaged` BOOLEAN NOT NULL DEFAULT FALSE AFTER `damaged_stock`;
ALTER TABLE products ADD COLUMN `damage_reason` VARCHAR(255) NULL AFTER `is_damaged`;

-- 2. Add expiry and damaged tracking to purchase line items
ALTER TABLE purchase_items ADD COLUMN `expiry_date` DATE NULL AFTER `line_total`;
ALTER TABLE purchase_items ADD COLUMN `is_damaged` BOOLEAN NOT NULL DEFAULT FALSE AFTER `expiry_date`;
ALTER TABLE purchase_items ADD COLUMN `damaged_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000 AFTER `is_damaged`;
ALTER TABLE purchase_items ADD COLUMN `damage_reason` VARCHAR(255) NULL AFTER `damaged_quantity`;

-- 3. Add discount details to sales
ALTER TABLE sales ADD COLUMN `discount_type` ENUM('NONE', 'FIXED', 'PERCENT') NOT NULL DEFAULT 'NONE' AFTER `discount_total`;
ALTER TABLE sales ADD COLUMN `discount_value` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `discount_type`;

-- 4. Add free sample flag to sale items
ALTER TABLE sale_items ADD COLUMN `is_free_sample` BOOLEAN NOT NULL DEFAULT FALSE AFTER `discount_amount`;

-- 5. Damaged Stock Ledger for precision tracking and supplier returns
CREATE TABLE IF NOT EXISTS damaged_stock_log (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `supplier_id` INT NULL,
  `purchase_id` INT NULL,
  `source` ENUM('PRODUCT_ENTRY', 'PURCHASE_ENTRY', 'SALES_RETURN', 'AUDIT_ADJUST') NOT NULL DEFAULT 'PRODUCT_ENTRY',
  `damaged_quantity` DECIMAL(12,3) NOT NULL,
  `damage_reason` VARCHAR(255) NULL,
  `expiry_date` DATE NULL,
  `status` ENUM('PENDING_RETURN', 'RETURNED_TO_SUPPLIER', 'WRITTEN_OFF') DEFAULT 'PENDING_RETURN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_damaged_product` (`product_id`),
  INDEX `idx_damaged_supplier` (`supplier_id`),
  INDEX `idx_damaged_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Customer Feedbacks Table
CREATE TABLE IF NOT EXISTS customer_feedbacks (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NULL,
  `invoice_no` VARCHAR(50) NULL,
  `customer_name` VARCHAR(150) NULL,
  `customer_phone` VARCHAR(20) NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_feedback_sale` (`sale_id`),
  INDEX `idx_feedback_rating` (`rating`),
  INDEX `idx_feedback_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
