-- ============================================================================
-- Migration 001: Initial Core Schema for Retail Billing & Inventory
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

-- 1. Application Settings
CREATE TABLE IF NOT EXISTS app_settings (
    `key` VARCHAR(50) PRIMARY KEY,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Units of Measurement
CREATE TABLE IF NOT EXISTS units (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(50) NOT NULL,
    `tamil_name` VARCHAR(100) NULL,
    `allow_decimals` BOOLEAN DEFAULT FALSE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Categories
CREATE TABLE IF NOT EXISTS categories (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `tamil_name` VARCHAR(150) NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sku` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(200) NOT NULL,
    `tamil_name` VARCHAR(250) NULL,
    `category_id` INT NULL,
    `unit_id` INT NOT NULL,
    `hsn_code` VARCHAR(20) NULL,
    `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `mrp` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `min_stock_level` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_product_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_product_unit` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT,
    INDEX `idx_product_name` (`name`),
    INDEX `idx_product_sku` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Product Barcodes (Strictly VARCHAR, leading zeros preserved, 1:N support)
CREATE TABLE IF NOT EXISTS product_barcodes (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `barcode` VARCHAR(64) NOT NULL UNIQUE,
    `is_primary` BOOLEAN DEFAULT FALSE,
    `barcode_type` VARCHAR(30) DEFAULT 'STANDARD',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_barcode_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_barcode_lookup` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Product Stock Balance (Transactional mirror of stock movements)
CREATE TABLE IF NOT EXISTS product_stock (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL UNIQUE,
    `current_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Stock Movements (Permanent immutable ledger of inventory changes)
CREATE TABLE IF NOT EXISTS stock_movements (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT NOT NULL,
    `movement_type` ENUM(
        'OPENING',
        'PURCHASE',
        'SALE',
        'SALE_RETURN',
        'PURCHASE_RETURN',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_SUB'
    ) NOT NULL,
    `reference_id` INT NULL,
    `reference_no` VARCHAR(100) NULL,
    `quantity` DECIMAL(12,3) NOT NULL,
    `stock_before` DECIMAL(12,3) NOT NULL,
    `stock_after` DECIMAL(12,3) NOT NULL,
    `cost_price` DECIMAL(12,2) NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    INDEX `idx_movement_product_date` (`product_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Scanner Diagnostic & Audit Logs (Real-time hardware & phone scan verification)
CREATE TABLE IF NOT EXISTS scanner_logs (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `barcode` VARCHAR(64) NOT NULL,
    `input_source` VARCHAR(50) NOT NULL,
    `lookup_status` ENUM('FOUND', 'NOT_FOUND', 'ERROR') NOT NULL,
    `product_id` INT NULL,
    `product_name` VARCHAR(200) NULL,
    `response_time_ms` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_scanner_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. General Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `action` VARCHAR(50) NOT NULL,
    `entity_name` VARCHAR(50) NOT NULL,
    `entity_id` INT NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

