-- 000009_partial_unique_indices.up.sql
-- Mengubah unique constraint global menjadi Partial Unique Index (WHERE deleted_at IS NULL)
-- Memungkinkan nomor invoice, nama customer, dan nama vendor yang sudah di-soft-delete dapat digunakan kembali.

-- 1. Invoices Table: Partial Unique Index
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_no_key;
DROP INDEX IF EXISTS idx_invoices_invoice_no_active;
CREATE UNIQUE INDEX idx_invoices_invoice_no_active ON invoices (invoice_no) WHERE deleted_at IS NULL;

-- 2. Customers Table: Partial Unique Index
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_name_key;
DROP INDEX IF EXISTS idx_customers_name_active;
CREATE UNIQUE INDEX idx_customers_name_active ON customers (name) WHERE deleted_at IS NULL;

-- 3. Vendors Table: Partial Unique Index
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_name_key;
DROP INDEX IF EXISTS idx_vendors_name_active;
CREATE UNIQUE INDEX idx_vendors_name_active ON vendors (name) WHERE deleted_at IS NULL;
