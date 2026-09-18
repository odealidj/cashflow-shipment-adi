-- ==============================================================================
-- PT ADIJAYANTARA LOGISTICS INDONESIA
-- SEED DATA DEMO EKSEKUTIF (MASTER DATA, INVOICES, TRANSAKSI KAS & SHIPMENT)
-- ==============================================================================
-- Skrip ini memuat data operasional realistis yang sinkron dengan seluruh modul:
-- 1. Tab 1: Operasional & Buku Kas (Saldo Akhir: Rp 528.900.000)
-- 2. Tab 2: Tren Makro Eksekutif (Kuartal Q1 - Q4, Omset, Beban, Margin)
-- 3. Tab 3: Intelijen Strategis (6 Matriks: Runway, BCG, Vendor, DSO, Pareto, Gap)
-- 4. Modul Invoice, Customer, Vendor, Preset, dan Notifikasi
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SISTEM ROLES & PERMISSIONS (PBAC)
-- -----------------------------------------------------------------------------
INSERT INTO roles (code, name, description, is_system) VALUES
  ('super_admin', 'IT Super Admin', 'Akses root teknis sistem (Fail-safe all-access bypass)', true),
  ('admin', 'Administrator Bisnis', 'Pengelolaan operasional, transaksi, data rekanan, dan manajemen staf kantor', true),
  ('finance', 'Finance & Akuntansi', 'Input kas, pencatatan shipment, invoice, dan pembayaran', false),
  ('direktur', 'Direktur Perusahaan', 'Monitoring operasional, margin laba, dan supervisi pimpinan', false),
  ('owner', 'Pemilik Perusahaan (Owner)', 'Monitoring keuangan tingkat tinggi, saldo kas, dan kepemilikan modal', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system;

INSERT INTO permissions (module, code, name, description) VALUES
  -- CASHFLOW
  ('CASHFLOW', 'cashflow.view', 'Menu & Halaman Kas Operasional', 'Menampilkan menu Kas di sidebar dan membaca tabel kas & pengiriman'),
  ('CASHFLOW', 'cashflow.create', 'Tambah Kas & Shipment', 'Menambah transaksi shipment atau top-up kas operasional baru'),
  ('CASHFLOW', 'cashflow.edit', 'Edit Transaksi Kas', 'Mengubah data transaksi kas dan pengiriman'),
  ('CASHFLOW', 'cashflow.delete', 'Hapus Transaksi Kas', 'Menghapus catatan transaksi kas operasional'),
  ('CASHFLOW', 'cashflow.export', 'Export Excel Kas', 'Mengunduh laporan buku kas berjalan dalam format Excel'),
  ('CASHFLOW', 'cashflow.import', 'Import Excel Kas', 'Mengunggah dan mengimpor file Excel transaksi kas'),
  -- INVOICES
  ('INVOICES', 'invoices.view', 'Menu & Halaman Invoice Piutang', 'Menampilkan menu Invoice di sidebar dan membuka monitoring tagihan'),
  ('INVOICES', 'invoices.create', 'Buat Invoice Baru', 'Membuat tagihan invoice baru ke customer'),
  ('INVOICES', 'invoices.edit', 'Edit Data Invoice', 'Mengubah detail invoice tagihan'),
  ('INVOICES', 'invoices.delete', 'Hapus Invoice', 'Menghapus tagihan invoice'),
  ('INVOICES', 'invoices.mark_paid', 'Ubah Status Pelunasan', 'Menandai invoice telah lunas atau pending'),
  ('INVOICES', 'invoices.print', 'Cetak Rekapitulasi Invoice', 'Mencetak laporan tagihan dan piutang customer'),
  -- CUSTOMERS
  ('CUSTOMERS', 'customers.view', 'Menu & Master Klien (Customer)', 'Menampilkan menu Klien di sidebar dan membaca daftar perusahaan customer'),
  ('CUSTOMERS', 'customers.manage', 'Kelola Customer', 'Menambah, mengedit, atau menghapus master customer'),
  -- VENDORS
  ('VENDORS', 'vendors.view', 'Menu & Master Mitra Vendor', 'Menampilkan menu Mitra Armada di sidebar dan membaca daftar transporter'),
  ('VENDORS', 'vendors.manage', 'Kelola Vendor', 'Menambah, mengedit, atau menghapus master vendor armada'),
  -- PRESETS
  ('PRESETS', 'presets.view', 'Menu & Master Preset Aktivitas', 'Menampilkan menu Preset di sidebar dan membaca master rute & armada'),
  ('PRESETS', 'presets.manage', 'Kelola Preset Aktivitas', 'Menambah, mengedit, atau menghapus master preset aktivitas'),
  -- USERS
  ('USERS', 'users.view', 'Menu & Daftar Pengguna', 'Melihat daftar pengguna aplikasi dan informasi akun'),
  ('USERS', 'users.create', 'Tambah Pengguna Baru', 'Menambahkan akun pengguna baru ke dalam sistem'),
  ('USERS', 'users.edit', 'Edit Profil Pengguna', 'Mengubah data akun, peran, nomor kontak, dan password'),
  ('USERS', 'users.delete', 'Hapus / Nonaktifkan Pengguna', 'Menonaktifkan akun pengguna dari akses sistem'),
  -- ROLES
  ('ROLES', 'roles.view', 'Menu & Peran / Hak Akses', 'Membuka menu manajemen peran dan matriks izin hak akses'),
  ('ROLES', 'roles.manage', 'Kelola Peran & Izin', 'Membuat peran baru, mengedit izin per modul, dan menghapus peran kustom'),
  -- NOTIFICATIONS
  ('NOTIFICATIONS', 'notifications.view', 'Pusat Notifikasi', 'Melihat lonceng notifikasi dan membaca pengingat invoice jatuh tempo'),
  -- SYSTEM
  ('SYSTEM', 'metrics.view', 'Dashboard Metrik & Telemetri', 'Membuka halaman pemantauan performa server, memori, dan latency')
ON CONFLICT (code) DO NOTHING;

-- Sambungkan permissions ke role (All access for super_admin & admin, operational for finance, read-only/oversight for direktur & owner)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.code IN ('super_admin', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'finance' AND p.module IN ('CASHFLOW', 'INVOICES', 'CUSTOMERS', 'VENDORS', 'PRESETS', 'NOTIFICATIONS')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code IN ('direktur', 'owner') AND p.code IN ('cashflow.view', 'cashflow.export', 'invoices.view', 'invoices.print', 'customers.view', 'vendors.view', 'presets.view', 'notifications.view', 'metrics.view')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. AKUN PENGGUNA DEMO
-- -----------------------------------------------------------------------------
-- Password default untuk seluruh user demo: password123 ($2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.)
INSERT INTO users (id, email, password_hash, full_name, role, phone, status, role_id)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'odealidj.go@gmail.com',
    '$2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.',
    'IT Super Admin',
    'super_admin',
    '082111391380',
    'ACTIVE',
    (SELECT id FROM roles WHERE code = 'super_admin' LIMIT 1)
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'admin.budi@adijayantara.co.id',
    '$2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.',
    'Budi Santoso',
    'admin',
    '0812-3456-7890',
    'ACTIVE',
    (SELECT id FROM roles WHERE code = 'admin' LIMIT 1)
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'finance.siti@adijayantara.co.id',
    '$2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.',
    'Siti Rahma',
    'finance',
    '0813-9876-5432',
    'ACTIVE',
    (SELECT id FROM roles WHERE code = 'finance' LIMIT 1)
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'direktur.hendra@adijayantara.co.id',
    '$2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.',
    'Hendra Wijaya',
    'direktur',
    '0818-8899-0011',
    'ACTIVE',
    (SELECT id FROM roles WHERE code = 'direktur' LIMIT 1)
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'owner.adi@adijayantara.co.id',
    '$2a$10$kAHgxfaIKq2smgKPa0fxquPjdoZRT68.XjdhPf9DRuUWm/DNUeL7.',
    'Adi Jayantara',
    'owner',
    '0811-2233-4455',
    'ACTIVE',
    (SELECT id FROM roles WHERE code = 'owner' LIMIT 1)
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  role_id = EXCLUDED.role_id;

-- -----------------------------------------------------------------------------
-- 3. MASTER VENDORS (MITRA TRANSPORTER & REKANAN ARMADA)
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, name, email, phone, notes) VALUES
  (1, 'CV. AIRA', 'fleet@cv-aira.com', '0812-1122-3344', 'Spesialis Armada Tronton Koridor Sumatera & Jawa Barat'),
  (2, 'CV. ANEX', 'dispatch@cvanex.com', '0813-5566-7788', 'Mitra Utama Armada Tronton Bak & Wingbox Koridor Jawa-Bali'),
  (3, 'PT Trans Logistik Mandiri', 'operasional@translogistik.co.id', '0815-9988-1122', 'Spesialis Fuso Box & Trailer Kontainer')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  notes = EXCLUDED.notes;

SELECT setval('vendors_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vendors));

-- -----------------------------------------------------------------------------
-- 4. MASTER CUSTOMERS (PERUSAHAAN KLIEN RESMI)
-- -----------------------------------------------------------------------------
INSERT INTO customers (id, name, pic_name, email, phone, address, notes) VALUES
  (1, 'PT Surya Mandiri Abadi', 'Bpk. Hendra Wijaya', 'finance@suryamandiri.co.id', '0812-3456-7890', 'Kawasan Industri MM2100, Cikarang Barat, Bekasi', 'Klien pengiriman rutin spareparts manufaktur'),
  (2, 'CV Berkah Jaya Sentosa', 'Ibu Ratna Sari', 'billing@berkahjayalog.com', '0813-9876-5432', 'Jl. Raya Narogong Km. 14, Bantar Gebang, Bekasi', 'Distribusi consumer goods'),
  (3, 'PT Nusantara Digital Kreatif', 'Bpk. Dimas Pratama', 'contact@nusantaradigital.id', '0857-1122-3344', 'Gedung Menara Cyber Lt. 8, Jl. Kuningan Barat, Jakarta Selatan', 'Pengiriman perangkat IT & server'),
  (4, 'PT Global Niaga Sejahtera', 'Bpk. Anton Subagyo', 'logistics@globalniaga.co.id', '0811-2233-4455', 'Kawasan Pergudangan Marunda Center, Bekasi', 'Kargo impor & distribusi logistik'),
  (5, 'PT Sumber Rejeki Makmur', 'Ibu Maya Anggraini', 'finance@sumberrejeki.com', '0821-4455-6677', 'Kawasan Industri Jababeka 1, Cikarang', 'Bahan baku industri makanan'),
  (6, 'CV Mitra Sarana Prima', 'Bpk. Budi Santoso', 'mitrasarana.adm@gmail.com', '0818-7788-9900', 'Jl. Daan Mogot Km. 19, Tangerang', 'Proyek pengiriman material konstruksi'),
  (7, 'PT Integra Multi Solusi', 'Ibu Diana Kusuma', 'accounting@integramulti.co.id', '0878-5566-7788', 'TB Simatupang Office Park Tower B, Jakarta Selatan', 'Peralatan telekomunikasi & otomasi'),
  (8, 'PT Cahaya Utama Perkasa', 'Bpk. Faisal Rahman', 'purchasing@cahayautama.com', '0812-9988-7766', 'Kawasan Industri KIIC, Karawang Barat', 'Ekspor impor komponen otomotif')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  pic_name = EXCLUDED.pic_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  notes = EXCLUDED.notes;

SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));

-- -----------------------------------------------------------------------------
-- 5. ACTIVITY PRESETS (PRESET ARMADA & RUTE OPERASIONAL)
-- -----------------------------------------------------------------------------
INSERT INTO activity_presets (category, name, description) VALUES
  ('ACT_INFO', 'Tronton Bak', 'Armada Tronton Bak Terbuka kapasitas 30 Ton'),
  ('ACT_INFO', 'Tronton Tracking Cost', 'Biaya tracking & pengawalan armada Tronton'),
  ('ACT_INFO', 'Tronton Wingbox', 'Armada Tronton Box Sayap hidrolik'),
  ('ACT_INFO', 'Fuso Box', 'Armada Fuso Box Tertutup kapasitas 10-15 Ton'),
  ('ACT_INFO', 'Fuso Bak', 'Armada Fuso Bak Terbuka'),
  ('ACT_INFO', 'Trailer 20 Feet', 'Truk Trailer kontainer 20 Feet'),
  ('ACT_INFO', 'Trailer 40 Feet', 'Truk Trailer kontainer 40 Feet'),
  ('ACT_INFO', 'CDD Box (Colt Diesel Double)', 'Armada 6 roda Box'),
  ('ACT_INFO', 'CDD Bak (Colt Diesel Double)', 'Armada 6 roda Bak'),
  ('ACT_INFO', 'CDE (Colt Diesel Engkel)', 'Armada 4 roda kecil'),
  ('ACT_INFO', 'Biaya Bongkar Muat / Buruh', 'Biaya tenaga kerja bongkar muat kargo'),
  ('ACT_INFO', 'Biaya Operasional Lapangan', 'Biaya koordinasi / operasional jalan'),
  ('ACT_EXPLAIN', 'CIBINONG - SBY, Delivery', 'Rute Cibinong ke Surabaya'),
  ('ACT_EXPLAIN', 'DPK - MDN, Delivery', 'Rute Depok ke Medan'),
  ('ACT_EXPLAIN', 'JKT - SBY, Delivery', 'Rute Jakarta ke Surabaya'),
  ('ACT_EXPLAIN', 'JKT - SMG, Delivery', 'Rute Jakarta ke Semarang'),
  ('ACT_EXPLAIN', 'JKT - BDG, Delivery', 'Rute Jakarta ke Bandung'),
  ('ACT_EXPLAIN', 'TGR - BALI, Delivery', 'Rute Tangerang ke Denpasar Bali'),
  ('ACT_EXPLAIN', 'BOGOR - SBY, Delivery', 'Rute Bogor ke Surabaya'),
  ('ACT_EXPLAIN', 'CIBITUNG - SBY, Delivery', 'Rute Kawasan Industri Cibitung ke Surabaya'),
  ('ACT_EXPLAIN', 'Pengiriman Muatan Rutin (Pabrik)', 'Pengiriman bahan baku / produk jadi pabrik klien'),
  ('ACT_EXPLAIN', 'Pengiriman Muatan Urgent / On-Time', 'Pengiriman prioritas tinggi dengan jadwal ketat')
ON CONFLICT ON CONSTRAINT uq_activity_presets_cat_name DO NOTHING;

SELECT setval('activity_presets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM activity_presets));

-- -----------------------------------------------------------------------------
-- 6. INVOICES TAGIHAN KLIEN (REKAPITULASI PIUTANG RESMI)
-- -----------------------------------------------------------------------------
INSERT INTO invoices (id, invoice_no, client_name, shipment_date, top_terms, top_days, due_date, original_due_date, amount, status, paid_at, notes, payment_reference) VALUES
  (1, 'INV/2026/08/001', 'PT Surya Mandiri Abadi', '2026-08-01', 'Net 30 Hari', 30, '2026-08-31', '2026-08-31', 45000000.00, 'PAID', '2026-08-31 11:00:00', 'Pelunasan tagihan spareparts ekspedisi Agustus', 'BCA-889123'),
  (2, 'INV/2026/08/002', 'CV Berkah Jaya Sentosa', '2026-08-05', 'Net 14 Hari', 14, '2026-08-19', '2026-08-19', 18500000.00, 'PAID', '2026-08-19 10:30:00', 'Pelunasan distribusi consumer goods', 'MDR-445120'),
  (3, 'INV/2026/08/003', 'PT Nusantara Digital Kreatif', '2026-08-08', 'Net 45 Hari', 45, '2026-09-22', '2026-09-22', 72300000.00, 'UNPAID', NULL, 'Kargo server & IT equipment project', NULL),
  (4, 'INV/2026/08/004', 'PT Global Niaga Sejahtera', '2026-08-10', 'Net 14 Hari', 14, '2026-09-25', '2026-08-24', 12800000.00, 'PAID', '2026-09-25 14:15:00', 'Pelunasan kargo Marunda Center setelah perpanjangan tempo', 'BCA-771239'),
  (5, 'INV/2026/08/005', 'PT Sumber Rejeki Makmur', '2026-08-15', 'Net 30 Hari', 30, '2026-09-14', '2026-09-14', 33500000.00, 'UNPAID', NULL, 'Muatan bahan baku Jababeka', NULL),
  (6, 'INV/2026/08/006', 'CV Mitra Sarana Prima', '2026-08-18', 'COD (Cash on Delivery)', 0, '2026-08-18', '2026-08-18', 8750000.00, 'PAID', '2026-08-18 15:00:00', 'Muatan material konstruksi COD', 'CASH-0818'),
  (7, 'INV/2026/08/007', 'PT Integra Multi Solusi', '2026-08-22', 'Net 30 Hari', 30, '2026-09-21', '2026-09-21', 54200000.00, 'UNPAID', NULL, 'Perangkat telko TB Simatupang', NULL),
  (8, 'INV/2026/08/008', 'PT Cahaya Utama Perkasa', '2026-08-25', 'Net 60 Hari', 60, '2026-10-24', '2026-10-24', 96000000.00, 'UNPAID', NULL, 'Komponen otomotif Karawang KIIC', NULL),
  (9, 'INV/2026/09/009', 'PT Surya Mandiri Abadi', '2026-09-03', 'Net 30 Hari', 30, '2026-10-03', '2026-10-03', 20000000.00, 'UNPAID', NULL, 'Pengiriman batch 1 September', NULL),
  (10, 'INV/2026/09/010', 'PT Surya Mandiri Abadi', '2026-09-05', 'Net 30 Hari', 30, '2026-10-05', '2026-10-05', 20000000.00, 'PAID', '2026-09-06 09:30:00', 'Pelunasan cepat via transfer BCA', 'BCA-TRX-887192'),
  (11, 'INV/2026/09/011', 'CV Berkah Jaya Sentosa', '2026-09-03', 'Net 30 Hari', 30, '2026-10-03', '2026-10-03', 45000000.00, 'PAID', '2026-09-04 16:00:00', 'Pelunasan ekspedisi Narogong', 'BNI-991204'),
  (12, 'INV/2026/09/012', 'PT Integra Multi Solusi', '2026-09-07', 'Net 30 Hari', 30, '2026-10-07', '2026-10-07', 50000000.00, 'PAID', '2026-09-07 14:00:00', 'Pelunasan peralatan otomasi Simatupang', 'BCA-TRX-990142'),
  (13, 'INV/2026/09/013', 'PT Sumber Rejeki Makmur', '2026-09-07', 'Net 30 Hari', 30, '2026-10-07', '2026-10-07', 30000000.00, 'UNPAID', NULL, 'Muatan bahan baku batch 2 Cikarang', NULL)
ON CONFLICT (id) DO UPDATE SET
  invoice_no = EXCLUDED.invoice_no,
  client_name = EXCLUDED.client_name,
  shipment_date = EXCLUDED.shipment_date,
  top_terms = EXCLUDED.top_terms,
  top_days = EXCLUDED.top_days,
  due_date = EXCLUDED.due_date,
  original_due_date = EXCLUDED.original_due_date,
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  paid_at = EXCLUDED.paid_at,
  notes = EXCLUDED.notes,
  payment_reference = EXCLUDED.payment_reference;

SELECT setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 1) FROM invoices));

-- -----------------------------------------------------------------------------
-- 7. RIWAYAT PERUBAHAN JATUH TEMPO & PEMBAYARAN INVOICE
-- -----------------------------------------------------------------------------
INSERT INTO invoice_due_date_history (invoice_id, previous_due_date, new_due_date, days_added, reason, changed_by_name)
VALUES
  (4, '2026-08-24', '2026-09-25', 32, 'Permohonan perpanjangan tempo pelunasan kargo impor Marunda Center', 'Budi Santoso (Admin)')
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_history (invoice_id, action, amount, payment_date, reference_no, notes, created_by_name)
VALUES
  (1, 'SETTLED', 45000000.00, '2026-08-31 11:00:00', 'BCA-889123', 'Pelunasan tagihan spareparts ekspedisi Agustus', 'Siti Rahma (Finance)'),
  (2, 'SETTLED', 18500000.00, '2026-08-19 10:30:00', 'MDR-445120', 'Pelunasan distribusi consumer goods', 'Siti Rahma (Finance)'),
  (4, 'SETTLED', 12800000.00, '2026-09-25 14:15:00', 'BCA-771239', 'Pelunasan kargo Marunda Center', 'Siti Rahma (Finance)'),
  (6, 'SETTLED',  8750000.00, '2026-08-18 15:00:00', 'CASH-0818', 'Muatan material konstruksi COD', 'Siti Rahma (Finance)'),
  (10, 'SETTLED', 20000000.00, '2026-09-06 09:30:00', 'BCA-TRX-887192', 'Pelunasan cepat via transfer BCA', 'Siti Rahma (Finance)'),
  (11, 'SETTLED', 45000000.00, '2026-09-04 16:00:00', 'BNI-991204', 'Pelunasan ekspedisi Narogong', 'Siti Rahma (Finance)'),
  (12, 'SETTLED', 50000000.00, '2026-09-07 14:00:00', 'BCA-TRX-990142', 'Pelunasan peralatan otomasi Simatupang', 'Siti Rahma (Finance)')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. TRANSAKSI BUKU KAS & SHIPMENT (CASHFLOW ENTRIES)
-- -----------------------------------------------------------------------------
-- Saldo Berjalan Tepat Berakhir di Rp 528.900.000 (Konsisten dengan Seluruh KPI Eksekutif)
INSERT INTO cashflow_entries (
  id, sequence_no, entry_type, kredit, debit, saldo, date_of_entry,
  act_information, act_explaination, vendor_id, vendor_name_raw,
  top_days, due_date, grand_cost, grand_selling, profit, margin_pct, remarks, invoice_id
) VALUES
  (1,  1,  'TOP_UP',          100000000.00,        0.00, 100000000.00, '2026-08-22', 'TOP UP', 'Modal Awal (Opening Balance)', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (2,  2,  'SHIPMENT',                 0.00, 28150000.00,  71850000.00, '2026-08-22', 'Tronton Tracking Cost', 'DPK-MDN, DELIVERY', 1, 'CV. AIRA', 14, '2026-09-05', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  (3,  3,  'SHIPMENT',                 0.00,  7500000.00,  64350000.00, '2026-08-25', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 3, '2026-08-28', 7500000.00, 8500000.00, 1000000.00, 0.1176, 'UNPAID', NULL),
  (4,  4,  'SHIPMENT',                 0.00, 20000000.00,  44350000.00, '2026-08-31', 'Fuso Box', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 7, '2026-09-07', 20000000.00, 30000000.00, 10000000.00, 0.3333, 'UNPAID', NULL),
  (5,  5,  'SHIPMENT',                 0.00, 28150000.00,  16200000.00, '2026-08-31', 'Tronton Wingbox', 'CIBINONG - SBY, Delivery', 1, 'CV. AIRA', 14, '2026-09-14', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  (6,  6,  'TOP_UP',          100000000.00,        0.00, 116200000.00, '2026-09-03', 'TOP UP', 'Injeksi Modal Operasional', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (7,  7,  'SHIPMENT',                 0.00, 28150000.00,  88050000.00, '2026-09-03', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 1, 'CV. AIRA', 14, '2026-09-17', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  (8,  8,  'SHIPMENT',                 0.00, 20150000.00,  67900000.00, '2026-09-03', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-09-17', 20150000.00, 30000000.00, 9850000.00, 0.3283, 'UNPAID', NULL),
  (9,  9,  'TOP_UP',          200000000.00,        0.00, 267900000.00, '2026-09-03', 'TOP UP', 'Penambahan Modal Kerja Ekspedisi', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (10, 10, 'SHIPMENT',                 0.00, 30000000.00, 237900000.00, '2026-09-03', 'Tronton Tracking Cost', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 21, '2026-09-24', 30000000.00, 32000000.00, 2000000.00, 0.0625, 'UNPAID', NULL),
  (11, 11, 'TOP_UP',           50000000.00,        0.00, 287900000.00, '2026-09-03', 'TOP UP', 'Injeksi Likuiditas Rutin', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (12, 12, 'SHIPMENT',                 0.00, 30000000.00, 257900000.00, '2026-09-03', 'Tronton Bak', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 21, '2026-09-24', 30000000.00, 32000000.00, 2000000.00, 0.0625, 'UNPAID', NULL),
  (13, 13, 'TOP_UP',            1000000.00,        0.00, 258900000.00, '2026-09-04', 'TOP UP', 'Top Up Modal Operasional Berjalan', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (14, 14, 'SHIPMENT',                 0.00, 20000000.00, 238900000.00, '2026-09-05', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-09-19', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'UNPAID', NULL),
  (15, 15, 'TOP_UP',          100000000.00,        0.00, 338900000.00, '2026-09-05', 'TOP UP', 'Injeksi Modal Kuartal 3', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (16, 16, 'TOP_UP',           20000000.00,        0.00, 358900000.00, '2026-09-05', 'TOP UP', 'Dana Cadangan Operasional', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (17, 17, 'INVOICE_PAYMENT',  20000000.00,        0.00, 378900000.00, '2026-09-06', 'Pelunasan Invoice: INV/2026/09/010 - PT Surya Mandiri Abadi', 'Ref: BCA-TRX-887192 | Pelunasan via Transfer Rekening BCA', NULL, '', 0, NULL, 0.00, 20000000.00, 0.00, 0.0000, 'PAID', 10),
  (18, 18, 'INVOICE_PAYMENT',  50000000.00,        0.00, 428900000.00, '2026-09-07', 'Pelunasan Invoice: INV/2026/09/012 - PT Integra Multi Solusi', 'Ref: BCA-TRX-990142 | Pelunasan via Transfer Bank', NULL, '', 0, NULL, 0.00, 50000000.00, 0.00, 0.0000, 'PAID', 12),
  (19, 19, 'TOP_UP',          100000000.00,        0.00, 528900000.00, '2026-09-07', 'TOP UP', 'Top Up Modal Eksekutif Akhir Periode', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL)
ON CONFLICT (id) DO UPDATE SET
  sequence_no = EXCLUDED.sequence_no,
  entry_type = EXCLUDED.entry_type,
  kredit = EXCLUDED.kredit,
  debit = EXCLUDED.debit,
  saldo = EXCLUDED.saldo,
  date_of_entry = EXCLUDED.date_of_entry,
  act_information = EXCLUDED.act_information,
  act_explaination = EXCLUDED.act_explaination,
  vendor_id = EXCLUDED.vendor_id,
  vendor_name_raw = EXCLUDED.vendor_name_raw,
  top_days = EXCLUDED.top_days,
  due_date = EXCLUDED.due_date,
  grand_cost = EXCLUDED.grand_cost,
  grand_selling = EXCLUDED.grand_selling,
  profit = EXCLUDED.profit,
  margin_pct = EXCLUDED.margin_pct,
  remarks = EXCLUDED.remarks,
  invoice_id = EXCLUDED.invoice_id;

SELECT setval('cashflow_entries_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cashflow_entries));
SELECT setval('cashflow_entries_sequence_no_seq', (SELECT COALESCE(MAX(sequence_no), 1) FROM cashflow_entries));

-- -----------------------------------------------------------------------------
-- 9. NOTIFIKASI SISTEM (PUSAT NOTIFIKASI EKSEKUTIF)
-- -----------------------------------------------------------------------------
INSERT INTO notifications (title, message, category, severity, action_url, is_read) VALUES
  (
    'Pengingat Jatuh Tempo Invoice',
    'Invoice INV/2026/09/009 milik PT Surya Mandiri Abadi (Rp 20.000.000) akan jatuh tempo dalam 3 hari.',
    'INVOICE',
    'WARNING',
    '/dashboard/invoices',
    false
  ),
  (
    'Pelunasan Invoice Diterima',
    'Invoice INV/2026/09/012 PT Integra Multi Solusi sebesar Rp 50.000.000 telah lunas via Transfer BCA.',
    'INVOICE',
    'INFO',
    '/dashboard/invoices',
    false
  ),
  (
    'Ketahanan Saldo Kas Prima',
    'Saldo kas operasional saat ini tercatat Rp 528.900.000 dengan estimasi runway aman di atas batas buffer Rp 25.000.000.',
    'CASHFLOW',
    'INFO',
    '/dashboard',
    false
  ),
  (
    'Peringatan Kepatuhan Tempo Customer',
    'Pelanggan PT Global Niaga Sejahtera tercatat memiliki riwayat reschedule jatuh tempo. Harap tinjau syarat CBD/DP.',
    'INVOICE',
    'WARNING',
    '/dashboard',
    false
  ),
  (
    'Sistem Siap Operasional',
    'Seluruh parameter RBAC, sinkronisasi buku kas, dan telemetri metrik aktif normal.',
    'SYSTEM',
    'INFO',
    '/dashboard/system-metrics',
    true
  )
ON CONFLICT DO NOTHING;

COMMIT;
