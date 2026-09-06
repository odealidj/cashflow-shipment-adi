-- 000012_add_sorting_and_performance_indices.down.sql
DROP INDEX IF EXISTS idx_cashflow_entries_date_entry;
DROP INDEX IF EXISTS idx_cashflow_entries_sequence_desc;
DROP INDEX IF EXISTS idx_users_active_full_name_asc;
DROP INDEX IF EXISTS idx_users_active_created_at;
DROP INDEX IF EXISTS idx_activity_presets_cat_name_asc;
DROP INDEX IF EXISTS idx_activity_presets_cat_created_at;
DROP INDEX IF EXISTS idx_vendors_active_name_asc;
DROP INDEX IF EXISTS idx_vendors_active_created_at;
DROP INDEX IF EXISTS idx_vendors_deleted_at;
DROP INDEX IF EXISTS idx_customers_active_name_asc;
DROP INDEX IF EXISTS idx_customers_active_created_at;
DROP INDEX IF EXISTS idx_invoices_active_client_name;
DROP INDEX IF EXISTS idx_invoices_active_created_at;
