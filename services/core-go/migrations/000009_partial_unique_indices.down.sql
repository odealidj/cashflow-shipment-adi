-- 000009_partial_unique_indices.down.sql
-- Rollback Partial Unique Indices kembali ke constraint unik standar

DROP INDEX IF EXISTS idx_invoices_invoice_no_active;
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_no_key UNIQUE (invoice_no);

DROP INDEX IF EXISTS idx_customers_name_active;
ALTER TABLE customers ADD CONSTRAINT customers_name_key UNIQUE (name);

DROP INDEX IF EXISTS idx_vendors_name_active;
ALTER TABLE vendors ADD CONSTRAINT vendors_name_key UNIQUE (name);
