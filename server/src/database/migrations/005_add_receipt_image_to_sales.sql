-- ============================================================================
-- Migration 005: Add Receipt Image Storage to Sales
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

ALTER TABLE sales ADD COLUMN receipt_image_url VARCHAR(255) NULL AFTER status;
