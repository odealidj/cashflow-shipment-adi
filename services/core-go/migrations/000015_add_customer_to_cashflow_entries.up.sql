-- Migration: Add customer tracking to cashflow entries and history
ALTER TABLE cashflow_entries ADD COLUMN IF NOT EXISTS customer_id INT REFERENCES customers(id);
ALTER TABLE cashflow_entries ADD COLUMN IF NOT EXISTS customer_name_raw VARCHAR;
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_customer_id ON cashflow_entries(customer_id);

ALTER TABLE cashflow_entries_history ADD COLUMN IF NOT EXISTS customer_id INT;
ALTER TABLE cashflow_entries_history ADD COLUMN IF NOT EXISTS customer_name_raw VARCHAR;
