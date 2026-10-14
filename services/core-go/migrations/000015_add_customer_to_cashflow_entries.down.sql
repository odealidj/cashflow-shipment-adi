DROP INDEX IF EXISTS idx_cashflow_entries_customer_id;
ALTER TABLE cashflow_entries DROP COLUMN IF EXISTS customer_name_raw;
ALTER TABLE cashflow_entries DROP COLUMN IF EXISTS customer_id;

ALTER TABLE cashflow_entries_history DROP COLUMN IF EXISTS customer_name_raw;
ALTER TABLE cashflow_entries_history DROP COLUMN IF EXISTS customer_id;
