-- Rollback Migration: 000013_add_invoice_payment_entry_type

DROP INDEX IF EXISTS idx_cashflow_entries_entry_type;
DROP INDEX IF EXISTS idx_cashflow_entries_invoice_id;
ALTER TABLE cashflow_entries DROP COLUMN IF EXISTS invoice_id;
