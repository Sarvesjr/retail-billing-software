-- ============================================================================
-- Migration 004: Add customer_id reference to sales table
-- Engine: InnoDB
-- ============================================================================

ALTER TABLE sales ADD COLUMN customer_id INT NULL AFTER invoice_no;
ALTER TABLE sales ADD CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

