-- ============================================================================
-- Migration 002: Sales, Sale Items, Payments & Sequences
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
    `customer_name` VARCHAR(150) NULL DEFAULT 'Walk-in Customer',
    `customer_phone` VARCHAR(20) NULL,
    `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'CREDIT') NOT NULL DEFAULT 'CASH',
    `payment_status` ENUM('PAID', 'PARTIAL', 'UNPAID') NOT NULL DEFAULT 'PAID',
    `notes` VARCHAR(255) NULL,
    `status` ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_sale_invoice` (`invoice_no`),
    INDEX `idx_sale_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `product_name` VARCHAR(200) NOT NULL,
    `tamil_name` VARCHAR(250) NULL,
    `barcode` VARCHAR(64) NULL,
    `quantity` DECIMAL(12,3) NOT NULL,
    `unit_price` DECIMAL(12,2) NOT NULL,
    `gst_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(12,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sale_item_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sale_item_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
    INDEX `idx_sale_item_sale` (`sale_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_payments (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sale_id` INT NOT NULL,
    `payment_mode` ENUM('CASH', 'UPI', 'CARD', 'CREDIT') NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `reference_no` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payment_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

