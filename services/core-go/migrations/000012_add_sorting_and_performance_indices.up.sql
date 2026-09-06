-- 000012_add_sorting_and_performance_indices.up.sql
-- Optimasi performa query & sorting untuk PT. Adijayantara Logistics Indonesia

-- 1. Invoices (Rekapitulasi Tagihan & Piutang)
CREATE INDEX IF NOT EXISTS idx_invoices_active_created_at ON invoices (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_active_client_name ON invoices (client_name ASC) WHERE deleted_at IS NULL;

-- 2. Customers (Master Customer)
CREATE INDEX IF NOT EXISTS idx_customers_active_created_at ON customers (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active_name_asc ON customers (name ASC) WHERE deleted_at IS NULL;

-- 3. Vendors (Master Vendor)
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors (deleted_at);
CREATE INDEX IF NOT EXISTS idx_vendors_active_created_at ON vendors (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_active_name_asc ON vendors (name ASC) WHERE deleted_at IS NULL;

-- 4. Activity Presets (Keterangan Aktivitas, Armada, Catatan & Rute Pengiriman)
CREATE INDEX IF NOT EXISTS idx_activity_presets_cat_created_at ON activity_presets (category, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activity_presets_cat_name_asc ON activity_presets (category, name ASC) WHERE deleted_at IS NULL;

-- 5. Users (Daftar Pengguna & Hak Akses)
CREATE INDEX IF NOT EXISTS idx_users_active_created_at ON users (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active_full_name_asc ON users (full_name ASC) WHERE deleted_at IS NULL;

-- 6. Cashflow Entries (Transaksi Cashflow & Shipment)
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_sequence_desc ON cashflow_entries (sequence_no DESC);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_date_entry ON cashflow_entries (date_of_entry DESC);
