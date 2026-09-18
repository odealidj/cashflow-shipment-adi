-- ==============================================================================
-- PT ADIJAYANTARA LOGISTICS INDONESIA
-- SEED DATA DEMO EKSEKUTIF LENGKAP 9 BULAN (JANUARI - SEPTEMBER 2026)
-- ==============================================================================
-- Dataset komprehensif 9 bulan historis operasional (Q1, Q2, Q3 2026):
-- 1. Q1 2026 (Jan - Mar): Modal awal, 15 shipment, invoice pembayaran & siklus DSO.
-- 2. Q2 2026 (Apr - Jun): Peningkatan volume peak season Ramadhan, ekspansi rute.
-- 3. Q3 2026 (Jul - Sep): Operasional berjalan menuju saldo akhir Rp 528.900.000.
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
-- 6. INVOICES TAGIHAN KLIEN (HISTORIS JANUARI - SEPTEMBER 2026)
-- -----------------------------------------------------------------------------
INSERT INTO invoices (id, invoice_no, client_name, shipment_date, top_terms, top_days, due_date, original_due_date, amount, status, paid_at, notes, payment_reference) VALUES
  -- Q1: JANUARI 2026
  (1,  'INV/2026/01/001', 'PT Surya Mandiri Abadi',       '2026-01-08', 'Net 30 Hari', 30, '2026-02-07', '2026-02-07', 25000000.00, 'PAID', '2026-01-28 10:00:00', 'Pelunasan invoice spareparts Januari', 'BCA-0128'),
  (2,  'INV/2026/01/002', 'CV Berkah Jaya Sentosa',        '2026-01-14', 'Net 30 Hari', 30, '2026-02-13', '2026-02-13', 30000000.00, 'PAID', '2026-02-18 11:30:00', 'Pelunasan consumer goods batch 1', 'MDR-0218'),
  -- Q1: FEBRUARI 2026
  (3,  'INV/2026/02/003', 'PT Nusantara Digital Kreatif',   '2026-02-02', 'Net 30 Hari', 30, '2026-03-04', '2026-03-04', 40000000.00, 'PAID', '2026-03-05 14:00:00', 'Pengiriman server & rak data center', 'BCA-0305'),
  (4,  'INV/2026/02/004', 'PT Global Niaga Sejahtera',      '2026-02-15', 'Net 30 Hari', 30, '2026-03-17', '2026-03-17', 35000000.00, 'PAID', '2026-03-24 09:45:00', 'Kargo impor Marunda Center', 'BNI-0324'),
  -- Q1: MARET 2026
  (5,  'INV/2026/03/005', 'PT Sumber Rejeki Makmur',       '2026-03-08', 'Net 45 Hari', 45, '2026-04-22', '2026-04-22', 45000000.00, 'PAID', '2026-04-20 15:30:00', 'Bahan baku industri makanan Jababeka', 'BCA-0420'),
  -- Q2: APRIL 2026
  (6,  'INV/2026/04/006', 'PT Integra Multi Solusi',        '2026-04-05', 'Net 30 Hari', 30, '2026-05-05', '2026-05-05', 50000000.00, 'PAID', '2026-05-06 13:15:00', 'Peralatan telekomunikasi proyek Q2', 'BCA-0506'),
  (7,  'INV/2026/04/007', 'CV Mitra Sarana Prima',          '2026-04-18', 'Net 30 Hari', 30, '2026-05-18', '2026-05-18', 25000000.00, 'PAID', '2026-05-25 10:00:00', 'Material konstruksi proyek Tangerang', 'CASH-0525'),
  -- Q2: MEI 2026
  (8,  'INV/2026/05/008', 'PT Cahaya Utama Perkasa',        '2026-05-04', 'Net 30 Hari', 30, '2026-06-03', '2026-06-03', 60000000.00, 'PAID', '2026-06-05 16:00:00', 'Komponen manufaktur otomotif KIIC', 'MDR-0605'),
  (9,  'INV/2026/05/009', 'PT Surya Mandiri Abadi',        '2026-05-20', 'Net 30 Hari', 30, '2026-06-19', '2026-06-19', 35000000.00, 'PAID', '2026-06-25 11:00:00', 'Batch spareparts ekspedisi Mei', 'BCA-0625'),
  -- Q2: JUNI 2026
  (10, 'INV/2026/06/010', 'CV Berkah Jaya Sentosa',        '2026-06-10', 'Net 30 Hari', 30, '2026-07-10', '2026-07-10', 40000000.00, 'PAID', '2026-07-18 14:20:00', 'Distribusi bahan pokok consumer goods', 'BNI-0718'),
  -- Q3: JULI 2026
  (11, 'INV/2026/07/011', 'PT Nusantara Digital Kreatif',   '2026-07-05', 'Net 30 Hari', 30, '2026-08-04', '2026-08-04', 45000000.00, 'PAID', '2026-08-05 10:30:00', 'Pengiriman server telematika', 'BCA-0805'),
  -- Q3: AGUSTUS 2026
  (12, 'INV/2026/08/001', 'PT Surya Mandiri Abadi',        '2026-08-01', 'Net 30 Hari', 30, '2026-08-31', '2026-08-31', 45000000.00, 'PAID', '2026-08-31 11:00:00', 'Pelunasan tagihan spareparts ekspedisi Agustus', 'BCA-889123'),
  (13, 'INV/2026/08/002', 'CV Berkah Jaya Sentosa',        '2026-08-05', 'Net 14 Hari', 14, '2026-08-19', '2026-08-19', 18500000.00, 'PAID', '2026-08-19 10:30:00', 'Pelunasan distribusi consumer goods', 'MDR-445120'),
  (14, 'INV/2026/08/003', 'PT Nusantara Digital Kreatif',   '2026-08-08', 'Net 45 Hari', 45, '2026-09-22', '2026-09-22', 72300000.00, 'UNPAID', NULL, 'Kargo server & IT equipment project', NULL),
  (15, 'INV/2026/08/004', 'PT Global Niaga Sejahtera',      '2026-08-10', 'Net 14 Hari', 14, '2026-09-25', '2026-08-24', 12800000.00, 'PAID', '2026-09-25 14:15:00', 'Pelunasan kargo Marunda Center setelah perpanjangan tempo', 'BCA-771239'),
  (16, 'INV/2026/08/005', 'PT Sumber Rejeki Makmur',       '2026-08-15', 'Net 30 Hari', 30, '2026-09-14', '2026-09-14', 33500000.00, 'UNPAID', NULL, 'Muatan bahan baku Jababeka', NULL),
  (17, 'INV/2026/08/006', 'CV Mitra Sarana Prima',          '2026-08-18', 'COD (Cash on Delivery)', 0, '2026-08-18', '2026-08-18', 8750000.00, 'PAID', '2026-08-18 15:00:00', 'Muatan material konstruksi COD', 'CASH-0818'),
  (18, 'INV/2026/08/007', 'PT Integra Multi Solusi',        '2026-08-22', 'Net 30 Hari', 30, '2026-09-21', '2026-09-21', 54200000.00, 'UNPAID', NULL, 'Perangkat telko TB Simatupang', NULL),
  (19, 'INV/2026/08/008', 'PT Cahaya Utama Perkasa',        '2026-08-25', 'Net 60 Hari', 60, '2026-10-24', '2026-10-24', 96000000.00, 'UNPAID', NULL, 'Komponen otomotif Karawang KIIC', NULL),
  -- Q3: SEPTEMBER 2026
  (20, 'INV/2026/09/009', 'PT Surya Mandiri Abadi',        '2026-09-03', 'Net 30 Hari', 30, '2026-10-03', '2026-10-03', 20000000.00, 'UNPAID', NULL, 'Pengiriman batch 1 September', NULL),
  (21, 'INV/2026/09/010', 'PT Surya Mandiri Abadi',        '2026-09-05', 'Net 30 Hari', 30, '2026-10-05', '2026-10-05', 20000000.00, 'PAID', '2026-09-06 09:30:00', 'Pelunasan cepat via transfer BCA', 'BCA-TRX-887192'),
  (22, 'INV/2026/09/011', 'CV Berkah Jaya Sentosa',        '2026-09-03', 'Net 30 Hari', 30, '2026-10-03', '2026-10-03', 45000000.00, 'PAID', '2026-09-04 16:00:00', 'Pelunasan ekspedisi Narogong', 'BNI-991204'),
  (23, 'INV/2026/09/012', 'PT Integra Multi Solusi',        '2026-09-07', 'Net 30 Hari', 30, '2026-10-07', '2026-10-07', 50000000.00, 'PAID', '2026-09-07 14:00:00', 'Pelunasan peralatan otomasi Simatupang', 'BCA-TRX-990142'),
  (24, 'INV/2026/09/013', 'PT Sumber Rejeki Makmur',       '2026-09-07', 'Net 30 Hari', 30, '2026-10-07', '2026-10-07', 30000000.00, 'UNPAID', NULL, 'Muatan bahan baku batch 2 Cikarang', NULL)
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
  (15, '2026-08-24', '2026-09-25', 32, 'Permohonan perpanjangan tempo pelunasan kargo impor Marunda Center', 'Budi Santoso (Admin)')
ON CONFLICT DO NOTHING;

INSERT INTO invoice_payment_history (invoice_id, action, amount, payment_date, reference_no, notes, created_by_name)
VALUES
  (1,  'SETTLED', 25000000.00, '2026-01-28 10:00:00', 'BCA-0128', 'Pelunasan invoice spareparts Januari', 'Siti Rahma (Finance)'),
  (2,  'SETTLED', 30000000.00, '2026-02-18 11:30:00', 'MDR-0218', 'Pelunasan consumer goods batch 1', 'Siti Rahma (Finance)'),
  (3,  'SETTLED', 40000000.00, '2026-03-05 14:00:00', 'BCA-0305', 'Pengiriman server & rak data center', 'Siti Rahma (Finance)'),
  (4,  'SETTLED', 35000000.00, '2026-03-24 09:45:00', 'BNI-0324', 'Kargo impor Marunda Center', 'Siti Rahma (Finance)'),
  (5,  'SETTLED', 45000000.00, '2026-04-20 15:30:00', 'BCA-0420', 'Bahan baku industri makanan Jababeka', 'Siti Rahma (Finance)'),
  (6,  'SETTLED', 50000000.00, '2026-05-06 13:15:00', 'BCA-0506', 'Peralatan telekomunikasi proyek Q2', 'Siti Rahma (Finance)'),
  (7,  'SETTLED', 25000000.00, '2026-05-25 10:00:00', 'CASH-0525', 'Material konstruksi proyek Tangerang', 'Siti Rahma (Finance)'),
  (8,  'SETTLED', 60000000.00, '2026-06-05 16:00:00', 'MDR-0605', 'Komponen manufaktur otomotif KIIC', 'Siti Rahma (Finance)'),
  (9,  'SETTLED', 35000000.00, '2026-06-25 11:00:00', 'BCA-0625', 'Batch spareparts ekspedisi Mei', 'Siti Rahma (Finance)'),
  (10, 'SETTLED', 40000000.00, '2026-07-18 14:20:00', 'BNI-0718', 'Distribusi bahan pokok consumer goods', 'Siti Rahma (Finance)'),
  (11, 'SETTLED', 45000000.00, '2026-08-05 10:30:00', 'BCA-0805', 'Pengiriman server telematika', 'Siti Rahma (Finance)'),
  (12, 'SETTLED', 45000000.00, '2026-08-31 11:00:00', 'BCA-889123', 'Pelunasan tagihan spareparts ekspedisi Agustus', 'Siti Rahma (Finance)'),
  (13, 'SETTLED', 18500000.00, '2026-08-19 10:30:00', 'MDR-445120', 'Pelunasan distribusi consumer goods', 'Siti Rahma (Finance)'),
  (15, 'SETTLED', 12800000.00, '2026-09-25 14:15:00', 'BCA-771239', 'Pelunasan kargo Marunda Center', 'Siti Rahma (Finance)'),
  (17, 'SETTLED',  8750000.00, '2026-08-18 15:00:00', 'CASH-0818', 'Muatan material konstruksi COD', 'Siti Rahma (Finance)'),
  (21, 'SETTLED', 20000000.00, '2026-09-06 09:30:00', 'BCA-TRX-887192', 'Pelunasan cepat via transfer BCA', 'Siti Rahma (Finance)'),
  (22, 'SETTLED', 45000000.00, '2026-09-04 16:00:00', 'BNI-991204', 'Pelunasan ekspedisi Narogong', 'Siti Rahma (Finance)'),
  (23, 'SETTLED', 50000000.00, '2026-09-07 14:00:00', 'BCA-TRX-990142', 'Pelunasan peralatan otomasi Simatupang', 'Siti Rahma (Finance)')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. TRANSAKSI BUKU KAS & SHIPMENT 9 BULAN (JANUARI - SEPTEMBER 2026)
-- -----------------------------------------------------------------------------
-- Saldo Berjalan Tepat Berakhir di Rp 528.900.000 (Konsisten dengan Seluruh KPI Eksekutif)
INSERT INTO cashflow_entries (
  id, sequence_no, entry_type, kredit, debit, saldo, date_of_entry,
  act_information, act_explaination, vendor_id, vendor_name_raw,
  top_days, due_date, grand_cost, grand_selling, profit, margin_pct, remarks, invoice_id
) VALUES
  -- Q1: JANUARI 2026
  (1,   1, 'TOP_UP',          100000000.00,        0.00, 100000000.00, '2026-01-05', 'TOP UP', 'Modal Awal Operasional 2026', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (2,   2, 'SHIPMENT',                 0.00,  7500000.00,  92500000.00, '2026-01-10', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 7, '2026-01-17', 7500000.00, 8500000.00, 1000000.00, 0.1176, 'PAID', NULL),
  (3,   3, 'SHIPMENT',                 0.00, 20000000.00,  72500000.00, '2026-01-15', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-01-29', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'PAID', NULL),
  (4,   4, 'SHIPMENT',                 0.00, 12000000.00,  60500000.00, '2026-01-22', 'Fuso Box', 'JKT - SMG, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-02-05', 12000000.00, 15000000.00, 3000000.00, 0.2000, 'PAID', NULL),
  (5,   5, 'INVOICE_PAYMENT',  25000000.00,        0.00,  85500000.00, '2026-01-28', 'Pelunasan Invoice: INV/2026/01/001 - PT Surya Mandiri Abadi', 'Ref: BCA-0128 | Pelunasan Invoice Spareparts', NULL, '', 0, NULL, 0.00, 25000000.00, 0.00, 0.0000, 'PAID', 1),
  -- Q1: FEBRUARI 2026
  (6,   6, 'SHIPMENT',                 0.00, 28150000.00,  57350000.00, '2026-02-04', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-02-18', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'PAID', NULL),
  (7,   7, 'SHIPMENT',                 0.00,  5000000.00,  52350000.00, '2026-02-12', 'CDD Box (Colt Diesel Double)', 'JKT - BDG, Delivery', 2, 'CV. ANEX', 7, '2026-02-19', 5000000.00, 6500000.00, 1500000.00, 0.2308, 'PAID', NULL),
  (8,   8, 'INVOICE_PAYMENT',  30000000.00,        0.00,  82350000.00, '2026-02-18', 'Pelunasan Invoice: INV/2026/01/002 - CV Berkah Jaya Sentosa', 'Ref: MDR-0218 | Pelunasan Consumer Goods', NULL, '', 0, NULL, 0.00, 30000000.00, 0.00, 0.0000, 'PAID', 2),
  (9,   9, 'SHIPMENT',                 0.00,  7500000.00,  74850000.00, '2026-02-22', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 7, '2026-03-01', 7500000.00, 8500000.00, 1000000.00, 0.1176, 'PAID', NULL),
  (10, 10, 'SHIPMENT',                 0.00, 18000000.00,  56850000.00, '2026-02-26', 'Trailer 20 Feet', 'CIBITUNG - SBY, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-03-12', 18000000.00, 22000000.00, 4000000.00, 0.1818, 'PAID', NULL),
  -- Q1: MARET 2026
  (11, 11, 'INVOICE_PAYMENT',  40000000.00,        0.00,  96850000.00, '2026-03-05', 'Pelunasan Invoice: INV/2026/02/003 - PT Nusantara Digital Kreatif', 'Ref: BCA-0305 | Server Data Center', NULL, '', 0, NULL, 0.00, 40000000.00, 0.00, 0.0000, 'PAID', 3),
  (12, 12, 'SHIPMENT',                 0.00, 25000000.00,  71850000.00, '2026-03-10', 'Tronton Wingbox', 'CIBINONG - SBY, Delivery', 1, 'CV. AIRA', 14, '2026-03-24', 25000000.00, 29000000.00, 4000000.00, 0.1379, 'PAID', NULL),
  (13, 13, 'SHIPMENT',                 0.00, 15000000.00,  56850000.00, '2026-03-16', 'Fuso Bak', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-03-30', 15000000.00, 18000000.00, 3000000.00, 0.1667, 'PAID', NULL),
  (14, 14, 'INVOICE_PAYMENT',  35000000.00,        0.00,  91850000.00, '2026-03-24', 'Pelunasan Invoice: INV/2026/02/004 - PT Global Niaga Sejahtera', 'Ref: BNI-0324 | Kargo Marunda Center', NULL, '', 0, NULL, 0.00, 35000000.00, 0.00, 0.0000, 'PAID', 4),
  (15, 15, 'SHIPMENT',                 0.00,  6500000.00,  85350000.00, '2026-03-29', 'CDD Bak (Colt Diesel Double)', 'BOGOR - SBY, Delivery', 2, 'CV. ANEX', 7, '2026-04-05', 6500000.00, 8000000.00, 1500000.00, 0.1875, 'PAID', NULL),
  -- Q2: APRIL 2026 (Peak Season Ramadhan & Idul Fitri)
  (16, 16, 'TOP_UP',           40000000.00,        0.00, 125350000.00, '2026-04-03', 'TOP UP', 'Injeksi Modal Kerja Q2 & Persiapan Peak Season', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (17, 17, 'SHIPMENT',                 0.00, 28150000.00,  97200000.00, '2026-04-08', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-04-22', 28150000.00, 32000000.00, 3850000.00, 0.1203, 'PAID', NULL),
  (18, 18, 'SHIPMENT',                 0.00, 20000000.00,  77200000.00, '2026-04-14', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-04-28', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'PAID', NULL),
  (19, 19, 'INVOICE_PAYMENT',  45000000.00,        0.00, 122200000.00, '2026-04-20', 'Pelunasan Invoice: INV/2026/03/005 - PT Sumber Rejeki Makmur', 'Ref: BCA-0420 | Bahan Baku Pangan', NULL, '', 0, NULL, 0.00, 45000000.00, 0.00, 0.0000, 'PAID', 5),
  (20, 20, 'SHIPMENT',                 0.00, 32000000.00,  90200000.00, '2026-04-26', 'Trailer 40 Feet', 'TGR - BALI, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-05-10', 32000000.00, 40000000.00, 8000000.00, 0.2000, 'PAID', NULL),
  -- Q2: MEI 2026
  (21, 21, 'INVOICE_PAYMENT',  50000000.00,        0.00, 140200000.00, '2026-05-06', 'Pelunasan Invoice: INV/2026/04/006 - PT Integra Multi Solusi', 'Ref: BCA-0506 | Peralatan Telekomunikasi', NULL, '', 0, NULL, 0.00, 50000000.00, 0.00, 0.0000, 'PAID', 6),
  (22, 22, 'SHIPMENT',                 0.00, 28000000.00, 112200000.00, '2026-05-12', 'Tronton Wingbox', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-05-26', 28000000.00, 33000000.00, 5000000.00, 0.1515, 'PAID', NULL),
  (23, 23, 'SHIPMENT',                 0.00, 14000000.00,  98200000.00, '2026-05-18', 'Fuso Box', 'JKT - SMG, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-06-01', 14000000.00, 17500000.00, 3500000.00, 0.2000, 'PAID', NULL),
  (24, 24, 'INVOICE_PAYMENT',  25000000.00,        0.00, 123200000.00, '2026-05-25', 'Pelunasan Invoice: INV/2026/04/007 - CV Mitra Sarana Prima', 'Ref: CASH-0525 | Material Konstruksi', NULL, '', 0, NULL, 0.00, 25000000.00, 0.00, 0.0000, 'PAID', 7),
  (25, 25, 'SHIPMENT',                 0.00, 22000000.00, 101200000.00, '2026-05-30', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-06-13', 22000000.00, 27000000.00, 5000000.00, 0.1852, 'PAID', NULL),
  -- Q2: JUNI 2026
  (26, 26, 'INVOICE_PAYMENT',  60000000.00,        0.00, 161200000.00, '2026-06-05', 'Pelunasan Invoice: INV/2026/05/008 - PT Cahaya Utama Perkasa', 'Ref: MDR-0605 | Komponen Otomotif KIIC', NULL, '', 0, NULL, 0.00, 60000000.00, 0.00, 0.0000, 'PAID', 8),
  (27, 27, 'SHIPMENT',                 0.00, 18000000.00, 143200000.00, '2026-06-12', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-06-26', 18000000.00, 22500000.00, 4500000.00, 0.2000, 'PAID', NULL),
  (28, 28, 'SHIPMENT',                 0.00,  6000000.00, 137200000.00, '2026-06-18', 'CDD Box (Colt Diesel Double)', 'JKT - BDG, Delivery', 2, 'CV. ANEX', 7, '2026-06-25', 6000000.00, 8000000.00, 2000000.00, 0.2500, 'PAID', NULL),
  (29, 29, 'INVOICE_PAYMENT',  35000000.00,        0.00, 172200000.00, '2026-06-25', 'Pelunasan Invoice: INV/2026/05/009 - PT Surya Mandiri Abadi', 'Ref: BCA-0625 | Ekspedisi Suku Cadang', NULL, '', 0, NULL, 0.00, 35000000.00, 0.00, 0.0000, 'PAID', 9),
  (30, 30, 'SHIPMENT',                 0.00, 20000000.00, 152200000.00, '2026-06-29', 'Trailer 20 Feet', 'CIBITUNG - SBY, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-07-13', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'PAID', NULL),
  -- Q3: JULI 2026
  (31, 31, 'SHIPMENT',                 0.00, 30000000.00, 122200000.00, '2026-07-04', 'Trailer 40 Feet', 'TGR - BALI, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-07-18', 30000000.00, 38000000.00, 8000000.00, 0.2105, 'PAID', NULL),
  (32, 32, 'SHIPMENT',                 0.00, 28150000.00,  94050000.00, '2026-07-10', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-07-24', 28150000.00, 32000000.00, 3850000.00, 0.1203, 'PAID', NULL),
  (33, 33, 'INVOICE_PAYMENT',  40000000.00,        0.00, 134050000.00, '2026-07-18', 'Pelunasan Invoice: INV/2026/06/010 - CV Berkah Jaya Sentosa', 'Ref: BNI-0718 | Consumer Goods Juli', NULL, '', 0, NULL, 0.00, 40000000.00, 0.00, 0.0000, 'PAID', 10),
  (34, 34, 'SHIPMENT',                 0.00, 25000000.00, 109050000.00, '2026-07-24', 'Fuso Box', 'JKT - SBY, Delivery', 3, 'PT Trans Logistik Mandiri', 14, '2026-08-07', 25000000.00, 30000000.00, 5000000.00, 0.1667, 'PAID', NULL),
  (35, 35, 'SHIPMENT',                 0.00, 20000000.00,  89050000.00, '2026-07-29', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-08-12', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'PAID', NULL),
  -- Q3: AGUSTUS 2026
  (36, 36, 'INVOICE_PAYMENT',  45000000.00,        0.00, 134050000.00, '2026-08-05', 'Pelunasan Invoice: INV/2026/07/011 - PT Nusantara Digital Kreatif', 'Ref: BCA-0805 | Server Telematika', NULL, '', 0, NULL, 0.00, 45000000.00, 0.00, 0.0000, 'PAID', 11),
  (37, 37, 'SHIPMENT',                 0.00, 25000000.00, 109050000.00, '2026-08-12', 'Tronton Wingbox', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-08-26', 25000000.00, 30000000.00, 5000000.00, 0.1667, 'PAID', NULL),
  (38, 38, 'SHIPMENT',                 0.00,  8750000.00, 100300000.00, '2026-08-18', 'CDD Box (Colt Diesel Double)', 'JKT - BDG, Delivery', 2, 'CV. ANEX', 7, '2026-08-25', 8750000.00, 11000000.00, 2250000.00, 0.2045, 'PAID', NULL),
  (39, 39, 'SHIPMENT',                 0.00, 28150000.00,  72150000.00, '2026-08-22', 'Tronton Tracking Cost', 'DPK-MDN, DELIVERY', 1, 'CV. AIRA', 14, '2026-09-05', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  (40, 40, 'SHIPMENT',                 0.00,  7500000.00,  64650000.00, '2026-08-25', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 3, '2026-08-28', 7500000.00, 8500000.00, 1000000.00, 0.1176, 'UNPAID', NULL),
  (41, 41, 'SHIPMENT',                 0.00, 20000000.00,  44650000.00, '2026-08-31', 'Fuso Box', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 7, '2026-09-07', 20000000.00, 30000000.00, 10000000.00, 0.3333, 'UNPAID', NULL),
  (42, 42, 'SHIPMENT',                 0.00, 28150000.00,  16500000.00, '2026-08-31', 'Tronton Wingbox', 'CIBINONG - SBY, Delivery', 1, 'CV. AIRA', 14, '2026-09-14', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  -- Q3: SEPTEMBER 2026
  (43, 43, 'TOP_UP',          100000000.00,        0.00, 116500000.00, '2026-09-03', 'TOP UP', 'Injeksi Modal Operasional', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (44, 44, 'SHIPMENT',                 0.00, 28150000.00,  88350000.00, '2026-09-03', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 1, 'CV. AIRA', 14, '2026-09-17', 28150000.00, 30000000.00, 1850000.00, 0.0617, 'UNPAID', NULL),
  (45, 45, 'SHIPMENT',                 0.00, 20150000.00,  68200000.00, '2026-09-03', 'Tronton Bak', 'CIBINONG - SBY, Delivery', 2, 'CV. ANEX', 14, '2026-09-17', 20150000.00, 30000000.00, 9850000.00, 0.3283, 'UNPAID', NULL),
  (46, 46, 'TOP_UP',          200000000.00,        0.00, 268200000.00, '2026-09-03', 'TOP UP', 'Penambahan Modal Kerja Ekspedisi', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (47, 47, 'SHIPMENT',                 0.00, 30000000.00, 238200000.00, '2026-09-03', 'Tronton Tracking Cost', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 21, '2026-09-24', 30000000.00, 32000000.00, 2000000.00, 0.0625, 'UNPAID', NULL),
  (48, 48, 'TOP_UP',           50000000.00,        0.00, 288200000.00, '2026-09-03', 'TOP UP', 'Injeksi Likuiditas Rutin', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (49, 49, 'SHIPMENT',                 0.00, 30000000.00, 258200000.00, '2026-09-03', 'Tronton Bak', 'JKT - SBY, Delivery', 2, 'CV. ANEX', 21, '2026-09-24', 30000000.00, 32000000.00, 2000000.00, 0.0625, 'UNPAID', NULL),
  (50, 50, 'TOP_UP',            1000000.00,        0.00, 259200000.00, '2026-09-04', 'TOP UP', 'Top Up Modal Operasional Berjalan', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (51, 51, 'SHIPMENT',                 0.00, 20000000.00, 239200000.00, '2026-09-05', 'Tronton Tracking Cost', 'DPK - MDN, Delivery', 1, 'CV. AIRA', 14, '2026-09-19', 20000000.00, 25000000.00, 5000000.00, 0.2000, 'UNPAID', NULL),
  (52, 52, 'TOP_UP',          119700000.00,        0.00, 358900000.00, '2026-09-05', 'TOP UP', 'Injeksi Modal Kuartal 3', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL),
  (53, 53, 'INVOICE_PAYMENT',  20000000.00,        0.00, 378900000.00, '2026-09-06', 'Pelunasan Invoice: INV/2026/09/010 - PT Surya Mandiri Abadi', 'Ref: BCA-TRX-887192 | Pelunasan via Transfer Rekening BCA', NULL, '', 0, NULL, 0.00, 20000000.00, 0.00, 0.0000, 'PAID', 21),
  (54, 54, 'INVOICE_PAYMENT',  50000000.00,        0.00, 428900000.00, '2026-09-07', 'Pelunasan Invoice: INV/2026/09/012 - PT Integra Multi Solusi', 'Ref: BCA-TRX-990142 | Pelunasan via Transfer Bank', NULL, '', 0, NULL, 0.00, 50000000.00, 0.00, 0.0000, 'PAID', 23),
  (55, 55, 'TOP_UP',          100000000.00,        0.00, 528900000.00, '2026-09-07', 'TOP UP', 'Top Up Modal Eksekutif Akhir Periode', NULL, '', 0, NULL, 0.00, 0.00, 0.00, 0.0000, 'PAID', NULL)
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
    'Historis 9 Bulan Berhasil Dimuat',
    'Dataset historis transaksi Januari s/d September 2026 aktif penuh pada kuartal Q1, Q2, dan Q3.',
    'SYSTEM',
    'INFO',
    '/dashboard',
    true
  )
ON CONFLICT DO NOTHING;

COMMIT;
