-- Migration 000014: Consolidated Executive Audit Logs & Staff SLA Monitoring
-- Khusus untuk Pemilik Perusahaan (Owner) & Direksi: Anti-Fraud, Margin Anomaly, & Input Lag Tracking

-- 1. Create Enums for Audit Severity & Actions
DO $$ BEGIN
    CREATE TYPE audit_severity AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'CREATE', 'UPDATE', 'DELETE', 'VOID', 
        'RESCHEDULE_DUE_DATE', 'SETTLE_INVOICE', 'EXPORT_EXCEL', 'LOGIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,       -- 'cashflow', 'invoice', 'customer', 'vendor'
    entity_id VARCHAR(50) NOT NULL,         -- ID entitas terkait
    entity_reference VARCHAR(100),          -- 'Seq#145' atau 'INV/2026/08/001'
    event_date DATE,                        -- Tanggal fisik kejadian lapangan
    system_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Waktu riil server
    lag_days INT NOT NULL DEFAULT 0,        -- Selisih hari (keterlambatan input)
    severity audit_severity NOT NULL DEFAULT 'NORMAL',
    flag_reason VARCHAR(255),               -- Contoh: 'Input terlambat > 3 hari', 'Margin di bawah 8%'
    old_values JSONB,                       -- Snapshot data sebelum diubah
    new_values JSONB,                       -- Snapshot data sesudah diubah
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Performance Indices
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lag_days ON audit_logs(lag_days DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_date ON audit_logs(event_date DESC);

-- 4. Seed Kamus Permissions untuk Modul Audit
INSERT INTO permissions (module, code, name, description) VALUES
('AUDIT', 'audit.view', 'Menu & Pengawasan Audit Eksekutif', 'Membuka menu Audit di sidebar, memantau radar anomali kas, dan keterlambatan input SLA'),
('AUDIT', 'audit.manage', 'Kelola & Ekspor Laporan Forensik', 'Mengunduh laporan forensik audit dan mengatur parameter deteksi anomali')
ON CONFLICT (code) DO NOTHING;

-- 5. Berikan Hak Akses ke Role Owner, Direktur, dan Super Admin
-- Owner: Full Access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'owner' AND p.code IN ('audit.view', 'audit.manage')
ON CONFLICT DO NOTHING;

-- Direktur: Full Access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'direktur' AND p.code IN ('audit.view', 'audit.manage')
ON CONFLICT DO NOTHING;

-- Super Admin: Full Access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'super_admin' AND p.code IN ('audit.view', 'audit.manage')
ON CONFLICT DO NOTHING;

-- 6. Backfill Initial Audit Logs dari Data Eksisting agar Dashboard Langsung Berisi Data Riil
-- A. Backfill dari Cashflow Entries
INSERT INTO audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_reference,
    event_date, system_timestamp, lag_days, severity, flag_reason, new_values, created_at
)
SELECT 
    c.created_by,
    COALESCE(u.full_name, 'Staf Operasional'),
    COALESCE(u.role::text, 'finance'),
    'CREATE',
    'cashflow',
    c.id::text,
    'Seq#' || c.sequence_no || ' (' || COALESCE(c.act_information, 'Transaksi Kas') || ')',
    c.date_of_entry,
    c.created_at,
    GREATEST(0, (c.created_at::date - c.date_of_entry)),
    CASE 
        WHEN c.margin_pct < 0.08 AND c.entry_type = 'SHIPMENT' THEN 'CRITICAL'::audit_severity
        WHEN (c.created_at::date - c.date_of_entry) > 3 THEN 'CRITICAL'::audit_severity
        WHEN (c.created_at::date - c.date_of_entry) >= 2 THEN 'WARNING'::audit_severity
        ELSE 'NORMAL'::audit_severity
    END,
    CASE 
        WHEN c.margin_pct < 0.08 AND c.entry_type = 'SHIPMENT' THEN 'Margin pengiriman di bawah standar (' || ROUND(c.margin_pct * 100, 1) || '%)'
        WHEN (c.created_at::date - c.date_of_entry) > 3 THEN 'Input terlambat ' || (c.created_at::date - c.date_of_entry) || ' hari setelah truk berangkat'
        WHEN (c.created_at::date - c.date_of_entry) >= 2 THEN 'Input terlambat ' || (c.created_at::date - c.date_of_entry) || ' hari (Wajar)'
        ELSE 'Input tepat waktu'
    END,
    jsonb_build_object(
        'sequence_no', c.sequence_no,
        'entry_type', c.entry_type,
        'grand_cost', c.grand_cost,
        'grand_selling', c.grand_selling,
        'profit', c.profit,
        'margin_pct', c.margin_pct,
        'kredit', c.kredit,
        'debit', c.debit,
        'saldo', c.saldo
    ),
    c.created_at
FROM cashflow_entries c
LEFT JOIN users u ON c.created_by = u.id
ON CONFLICT DO NOTHING;

-- B. Backfill dari Invoices (Billing Lag)
INSERT INTO audit_logs (
    actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_reference,
    event_date, system_timestamp, lag_days, severity, flag_reason, new_values, created_at
)
SELECT 
    i.created_by,
    COALESCE(u.full_name, 'Staf Billing & Invoice'),
    COALESCE(u.role::text, 'finance'),
    'CREATE',
    'invoice',
    i.id::text,
    i.invoice_no || ' (' || i.client_name || ')',
    i.shipment_date,
    i.created_at,
    GREATEST(0, (i.created_at::date - i.shipment_date)),
    CASE 
        WHEN (i.created_at::date - i.shipment_date) > 3 THEN 'CRITICAL'::audit_severity
        WHEN (i.created_at::date - i.shipment_date) >= 2 THEN 'WARNING'::audit_severity
        ELSE 'NORMAL'::audit_severity
    END,
    CASE 
        WHEN (i.created_at::date - i.shipment_date) > 3 THEN 'Billing Lag: Invoice terbit terlambat ' || (i.created_at::date - i.shipment_date) || ' hari setelah pengiriman'
        WHEN (i.created_at::date - i.shipment_date) >= 2 THEN 'Billing Lag: Invoice terbit ' || (i.created_at::date - i.shipment_date) || ' hari'
        ELSE 'Invoice diterbitkan tepat waktu'
    END,
    jsonb_build_object(
        'invoice_no', i.invoice_no,
        'client_name', i.client_name,
        'amount', i.amount,
        'status', i.status,
        'top_days', i.top_days,
        'due_date', i.due_date
    ),
    i.created_at
FROM invoices i
LEFT JOIN users u ON i.created_by = u.id
ON CONFLICT DO NOTHING;
