-- Migrasi 000008: Dynamic Fine-Grained Role & Permission Based Access Control (PBAC)

-- 1. Buat Tabel Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Buat Tabel Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(50) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Buat Tabel Relasi Role Permissions (Many-to-Many)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Tambahkan relasi role_id pada users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 5. Seed Roles Bawaan Sistem
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

-- 6. Seed Kamus Permissions
INSERT INTO permissions (module, code, name, description) VALUES
-- Module CASHFLOW
('CASHFLOW', 'cashflow.view', 'Menu & Halaman Kas Operasional', 'Menampilkan menu Kas di sidebar dan mengizinkan membuka tabel kas & pengiriman'),
('CASHFLOW', 'cashflow.create', 'Tambah Kas & Shipment', 'Menambah transaksi shipment atau top-up kas operasional baru'),
('CASHFLOW', 'cashflow.edit', 'Edit Transaksi Kas', 'Mengubah data transaksi kas dan pengiriman'),
('CASHFLOW', 'cashflow.delete', 'Hapus Transaksi Kas', 'Menghapus catatan transaksi kas operasional'),
('CASHFLOW', 'cashflow.export', 'Export Excel Kas', 'Mengunduh laporan buku kas berjalan dalam format Excel'),
('CASHFLOW', 'cashflow.import', 'Import Excel Kas', 'Mengunggah dan mengimpor file Excel transaksi kas'),

-- Module INVOICES
('INVOICES', 'invoices.view', 'Menu & Halaman Invoice Piutang', 'Menampilkan menu Invoice di sidebar dan mengizinkan membuka monitoring tagihan'),
('INVOICES', 'invoices.create', 'Buat Invoice Baru', 'Membuat tagihan invoice baru ke customer'),
('INVOICES', 'invoices.edit', 'Edit Data Invoice', 'Mengubah detail invoice tagihan'),
('INVOICES', 'invoices.delete', 'Hapus Invoice', 'Menghapus tagihan invoice'),
('INVOICES', 'invoices.mark_paid', 'Ubah Status Pelunasan', 'Menandai invoice telah lunas atau pending'),
('INVOICES', 'invoices.print', 'Cetak Rekapitulasi Invoice', 'Mencetak laporan tagihan dan piutang customer'),

-- Module CUSTOMERS
('CUSTOMERS', 'customers.view', 'Menu & Master Klien (Customer)', 'Menampilkan menu Klien di sidebar dan membaca daftar perusahaan customer'),
('CUSTOMERS', 'customers.manage', 'Kelola Customer', 'Menambah, mengedit, atau menghapus master customer'),

-- Module VENDORS
('VENDORS', 'vendors.view', 'Menu & Master Mitra Vendor', 'Menampilkan menu Mitra Armada di sidebar dan membaca daftar transporter/vendor'),
('VENDORS', 'vendors.manage', 'Kelola Vendor', 'Menambah, mengedit, atau menghapus master vendor armada'),

-- Module PRESETS
('PRESETS', 'presets.view', 'Menu & Master Preset Aktivitas', 'Menampilkan menu Preset di sidebar dan membaca master rute & keterangan armada'),
('PRESETS', 'presets.manage', 'Kelola Preset Aktivitas', 'Menambah, mengedit, atau menghapus master preset aktivitas'),

-- Module USERS
('USERS', 'users.view', 'Menu & Manajemen Pengguna', 'Menampilkan menu Manajemen Pengguna di sidebar dan melihat daftar akun staf'),
('USERS', 'users.create', 'Tambah Pengguna Baru', 'Menambahkan staf pengguna baru'),
('USERS', 'users.edit', 'Edit Pengguna & Peran', 'Mengubah data akun, peran jabatan, atau status pengguna'),
('USERS', 'users.delete', 'Nonaktifkan / Hapus Pengguna', 'Menonaktifkan akses login atau menghapus pengguna'),
('USERS', 'users.reset_password', 'Reset Password Pengguna', 'Mereset kata sandi akun pengguna'),

-- Module ROLES
('ROLES', 'roles.view', 'Menu & Peran Hak Akses (PBAC)', 'Menampilkan menu Peran & Hak Akses di sidebar dan melihat matriks perizinan'),
('ROLES', 'roles.manage', 'Kelola Peran & Hak Akses', 'Membuat peran baru dan mengatur matriks hak akses tombol')
ON CONFLICT (code) DO NOTHING;

-- 7. Mapping Izin Default untuk Role Admin (Semua Izin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- Mapping Izin Default untuk Role Finance
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'finance' AND p.code IN (
    'cashflow.view', 'cashflow.create', 'cashflow.edit', 'cashflow.export', 'cashflow.import',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.mark_paid', 'invoices.print',
    'customers.view', 'vendors.view', 'presets.view'
)
ON CONFLICT DO NOTHING;

-- Mapping Izin Default untuk Role Direktur (Monitoring, Export, Supervisi User, Kelola Admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'direktur' AND p.code IN (
    'cashflow.view', 'cashflow.export',
    'invoices.view', 'invoices.print',
    'customers.view', 'vendors.view', 'presets.view',
    'users.view', 'users.edit', 'users.delete', 'users.reset_password',
    'roles.view'
)
ON CONFLICT DO NOTHING;

-- Mapping Izin Default untuk Role Owner (Monitoring Finansial & Supervisi Pimpinan)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'owner' AND p.code IN (
    'cashflow.view', 'cashflow.export',
    'invoices.view', 'invoices.print',
    'customers.view', 'vendors.view', 'presets.view',
    'users.view', 'users.edit', 'users.delete', 'users.reset_password',
    'roles.view'
)
ON CONFLICT DO NOTHING;

-- 8. Migrasikan data user eksisting agar terhubung ke role_id
UPDATE users u 
SET role_id = r.id 
FROM roles r 
WHERE u.role::text = r.code AND u.role_id IS NULL;
