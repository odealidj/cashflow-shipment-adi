# Spesifikasi Proses Bisnis & Arsitektur Teknis: Manajemen User & Role (RBAC) dengan Two-Tier Session

**Sistem**: Cashflow & Shipment Management System  
**Organisasi**: PT. Adijayantara Logistics Indonesia  
**Versi Dokumen**: 1.0.0 (Production Architecture)  
**Status**: Approved Specification  

---

## BAGIAN 1: ANALISIS PROSES BISNIS (BUSINESS PROCESS & DOMAIN)

### 1.1 Latar Belakang & Kebutuhan Organisasi
Sebagai perusahaan yang bergerak di bidang logistik dan ekspedisi armada, PT. Adijayantara Logistics Indonesia mengelola perputaran arus kas harian (*cashflow*), pengiriman armada (*shipment*), biaya jalan (*grand cost*), penagihan piutang (*invoicing*), dan pelunasan klien.

Untuk menjaga integritas keuangan, mencegah kekeliruan mutasi data, dan memberikan visibilitas yang tepat kepada setiap pemangku kepentingan, sistem menerapkan **Role-Based Access Control (RBAC)** dengan pembagian peran yang mencerminkan struktur organisasi nyata.

---

### 1.2 Struktur Peran & Persona Pengguna (Role Hierarchy)

Sistem membagi pengguna ke dalam **2 Lapisan Utama**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🔒 LAPISAN 1: ROLE RAHASIA IT (System Maintenance & Developer Level)    │
│    👑 super_admin : Akun IT khusus (Tersembunyi dari tabel user bisnis)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴─────────────────────────────────────┐
│ 🏢 LAPISAN 2: ROLE BISNIS OPERASIONAL (Application Business Level)     │
│    ├── 🛡️ admin      : Administrator Bisnis / Head of Finance (Tertinggi)│
│    ├── 💼 finance    : Staf Keuangan & Akuntansi (Input Transaksi & Inv)│
│    ├── 👔 direktur   : Direktur / Manajemen (Monitoring & Review)      │
│    └── 📊 owner      : Pemilik Modal / Investor (Executive Dashboard)  │
└────────────────────────────────────────────────────────────────────────┘
```

#### 1. 🛡️ `admin` — Administrator Bisnis / Head of Finance (Level Tertinggi Aplikasi Bisnis)
- **Persona**: Kepala Keuangan / Manajer Operasional Cabang.
- **Tanggung Jawab**:
  - Mengelola penuh seluruh operasional harian: Transaksi Kas Keluar, Kas Masuk (Top Up), Rekapitulasi Invoice, dan Pelunasan Piutang.
  - Memiliki wewenang menghapus (*soft delete*) data transaksi yang keliru setelah verifikasi.
  - Mengelola akun pengguna level bisnis: mendaftarkan staf Finance baru, membuat akun Direktur/Owner, menonaktifkan akun staf yang mutasi/resign, serta mereset password staf.
  - Melakukan Export Excel pembukuan dan audit log.

#### 2. 💼 `finance` — Staf Keuangan & Akuntansi (Operator Data Harian)
- **Persona**: Staf Administrasi Kasir & Akuntansi Operasional.
- **Tanggung Jawab**:
  - Melakukan pencatatan harian: *Catat Pengiriman (Shipment)*, *Top Up Kas*, *Buat Invoice Tagihan Baru*, dan memperbarui status pelunasan.
  - Mendaftarkan data master Vendor & Customer baru melalui modal maupun *Quick Add popover*.
  - **Batasan Keamanan**: *Tidak dapat menghapus transaksi atau invoice secara permanen/soft delete*. Jika ada transaksi yang dibatalkan, staf harus berkoordinasi dengan Admin.
  - Tidak memiliki akses ke menu Manajemen User.

#### 3. 👔 `direktur` — Direktur / Pimpinan Operasional
- **Persona**: Direktur Utama / General Manager Operasional.
- **Tanggung Jawab**:
  - Memantau kesehatan arus kas (*Rolling Saldo*), volume pengiriman harian, margin laba (*Profit Margin %*), dan performa vendor.
  - Memantau rekapitulasi piutang invoice jatuh tempo (*Overdue monitoring*).
  - Melakukan audit data dan mencetak kwitansi/laporan resmi.
  - **Batasan Keamanan**: Mode *Review/Read-Only* terlindungi, tombol mutasi kas dinonaktifkan agar tidak terjadi salah klik pada data operasional.

#### 4. 📊 `owner` — Pemilik Modal / Investor / Komisaris
- **Persona**: Pemilik Usaha / Investor Finansial.
- **Tanggung Jawab**:
  - Memantau performa finansial tingkat tinggi (*Executive Financial Dashboard*): Total Saldo Kas Tersedia, Total Laba Bersih Kumulatif, dan Total Piutang Berjalan.
  - Mengunduh laporan rekapitulasi keuangan periodik (Bulanan/Tahunan).
  - **Batasan Keamanan**: *100% Read-Only*. Tampilan bersih, fokus pada transparansi angka dan grafik performa.

#### 5. 🔒 `super_admin` — Role Rahasia IT (System Root & Developer)
- **Persona**: Tim IT / System Developer / DevOps.
- **Tanggung Jawab**:
  - Akses darurat (*Break-Glass System*), pemeliharaan database, integrasi sistem, dan penanganan insiden teknis.
  - **Strategi Rahasia**: Role ini **disembunyikan** dari antarmuka dropdown pendaftaran user dan tabel user bisnis. Akun `super_admin` memiliki proteksi mutlak agar tidak dapat dihapus atau dinonaktifkan oleh Admin Bisnis.

---

### 1.3 Matriks Hak Akses & Kewenangan (Permission Matrix)

| Modul & Fitur Aplikasi | 🛡️ Admin | 💼 Finance | 👔 Direktur | 📊 Owner | 🔒 Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard & Ringkasan KPI Finansial** | ✅ Full | ✅ Full | ✅ Full | ✅ Executive | ✅ Full |
| **Pencatatan Shipment & Kas Keluar** | ✅ Full | ✅ Input/Edit | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Pencatatan Top Up Kas Masuk** | ✅ Full | ✅ Input | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Hapus Transaksi Cashflow (Delete)** | ✅ **Ya** | ❌ **Tidak** | ❌ **Tidak** | ❌ **Tidak** | ✅ **Ya** |
| **Buat & Edit Rekapitulasi Invoice** | ✅ Full | ✅ Input/Edit | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Tandai Status Pelunasan Invoice** | ✅ Full | ✅ Ya | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Hapus Invoice Piutang (Delete)** | ✅ **Ya** | ❌ **Tidak** | ❌ **Tidak** | ❌ **Tidak** | ✅ **Ya** |
| **Kelola Master Vendor & Customer** | ✅ Full | ✅ Input/Edit | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Kelola Master Aktivitas & Rute** | ✅ Full | ✅ Input/Edit | 👁️ Lihat Saja | 👁️ Lihat Saja | ✅ Full |
| **Export Excel & Cetak Kwitansi Resmi**| ✅ Ya | ✅ Ya | ✅ Ya | ✅ Ya | ✅ Ya |
| **Menu Manajemen User & Role** | ✅ **Kelola Bisnis**| ❌ Tidak | ❌ Tidak | ❌ Tidak | ✅ **Full Root** |
| **Reset Password Pengguna Bisnis** | ✅ **Ya** | ❌ Tidak | ❌ Tidak | ❌ Tidak | ✅ **Ya** |

---

### 1.4 Siklus Hidup Pengguna (User Lifecycle Protocol)

```
[1. Pendaftaran Akun] ──> Admin Bisnis mendaftarkan staf via /dashboard/users
        │
[2. Aktivasi & Login] ──> User login di halaman utama via Email/Phone + Password
        │
[3. Operasional Harian] ─> User menjalankan tugas sesuai batasan Role (Admin/Finance/Direktur/Owner)
        │
[4. Perubahan Kredensial]─> Reset password oleh Admin langsung membatalkan sesi lama di Redis
        │
[5. Penonaktifan / Resign]─> Status diubah menjadi INACTIVE -> Instant Force Logout seketika!
```

---

### 1.5 Inisialisasi Akun Super Admin IT via Environment Variables (`.env`)

Untuk menjaga keamanan kredensial dan menghindari *hardcoded secrets* di repositori Git:
- Akun root `super_admin` **tidak di-hardcode** dalam file migrasi database SQL.
- Saat backend Go pertama kali dijalankan, sistem secara otomatis memeriksa keberadaan akun `super_admin` dan melakukan *auto-bootstrap* menggunakan variabel lingkungan (*Environment Variables*):
  ```env
  SUPERADMIN_EMAIL=admin@example.com
  SUPERADMIN_PASSWORD=password123
  SUPERADMIN_NAME=IT Super Admin
  SUPERADMIN_PHONE=08123456789
  ```
- Backend Go melakukan *hashing bcrypt* secara dinamis dan menyimpannya ke database dengan status `ACTIVE`.
- Di server production, kredensial ini dapat diatur melalui *Environment Secret Manager* tanpa ada jejak password di kode sumber.

---

## BAGIAN 2: SPESIFIKASI ARSITEKTUR TEKNIS (TECHNICAL SPECIFICATIONS)

### 2.1 Arsitektur Autentikasi Two-Tier High-Performance

Untuk menjamin performa super cepat dan keamanan maksimal:
1. **L1 In-Memory Process Cache (Go RAM)**:
   - Validasi sesi untuk 99% request berlangsung dalam **`< 0.005 milidetik`** langsung dari memori proses Go tanpa overhead I/O jaringan.
   - Menggunakan cache *thread-safe* berbasis `sync.RWMutex` dengan sliding TTL 60 detik.
2. **L2 Redis In-Memory Key-Value Store**:
   - Penyimpanan sesi terpusat dengan masa aktif (TTL) 24 jam.
   - Kunci sesi: `session:<token>` bernilai payload JSON sesi pengguna.
   - Reverse index: `user_sessions:<user_id>` (Set string session ID) untuk mendukung *multi-device logout* dan *instant force logout*.
3. **Transport HttpOnly Cookie (Anti-XSS)**:
   - Token acak kriptografis 32-Byte Hex (`sess_...`) dikirim via header response `Set-Cookie`.
   - Parameter Cookie: `HttpOnly; Path=/; SameSite=Lax; MaxAge=86400; Secure(in production)`.
   - **Bebas XSS**: JavaScript di browser (`document.cookie` / `localStorage`) tidak dapat membaca token ini sama sekali.

---

### 2.2 Sequence Diagram: Alur Autentikasi & Validasi Two-Tier

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna (Browser)
    participant Next as Next.js Frontend
    participant Go as Backend Go API
    participant L1 as L1 In-Memory Cache (Go Process)
    participant L2 as L2 Redis Store (Port 6379)
    participant DB as PostgreSQL DB

    Note over User,DB: 1. PROSES LOGIN
    User->>Next: Input Identifier (Email/Phone) & Password
    Next->>Go: POST /api/v1/auth/login (credentials: include)
    Go->>DB: Query user by email/phone
    DB-->>Go: User data (password_hash, role, status)
    Go->>Go: Verifikasi hash password (bcrypt)
    Go->>Go: Cek status == 'ACTIVE'
    Go->>Go: Generate 32-byte Opaque Token (sess_abc123...)
    Go->>L2: SETEX session:sess_abc123... 86400 (JSON Sesi)
    Go->>L2: SADD user_sessions:<user_id> sess_abc123...
    Go->>L1: SET L1 session:sess_abc123... (TTL 60s)
    Go->>DB: UPDATE users SET last_login_at = NOW()
    Go-->>User: 200 OK + Set-Cookie: auth_session=sess_abc123...; HttpOnly; SameSite=Lax

    Note over User,DB: 2. PROSES REQUEST API TERPROTEKSI
    User->>Next: Buka Menu / Transaksi Cashflow
    Next->>Go: GET /api/v1/cashflow (Cookie terkirim otomatis)
    Go->>Go: Ekstrak cookie 'auth_session'
    Go->>L1: GET L1 session:sess_abc123...
    alt L1 Cache Hit (99% Request)
        L1-->>Go: UserSession data (< 0.005 ms)
    else L1 Cache Miss (1% Request)
        Go->>L2: GET session:sess_abc123... (~0.1 ms)
        L2-->>Go: UserSession data
        Go->>L1: Simpan ke L1 Cache (TTL 60s)
    end
    Go->>Go: Middleware RequireRole (Cek hak akses)
    Go->>DB: Query data cashflow
    DB-->>Go: Data transaksi
    Go-->>Next: Return 200 OK + Data Transaksi

    Note over User,DB: 3. INSTANT FORCE LOGOUT (ADMIN UBAH ROLE/STATUS)
    Admin->>Next: Nonaktifkan Staf / Ganti Password
    Next->>Go: PUT /api/v1/users/{id}
    Go->>DB: Update status = 'INACTIVE'
    Go->>L2: SMEMBERS user_sessions:<target_user_id>
    L2-->>Go: Daftar session_id target
    Go->>L2: DEL session:<id1> session:<id2>... & user_sessions:<target_user_id>
    Go->>L1: Purge L1 cache untuk target_user_id
    Go-->>Admin: 200 OK (Akun dinonaktifkan & sesi terputus seketika)
```

---

### 2.3 Skema Database PostgreSQL DDL

File Migrasi: `services/core-go/migrations/000007_enhance_users_management.up.sql`

```sql
-- 1. Penyesuaian Tipe Enum Role & Status
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'direktur';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Penambahan Kolom Manajemen Akun
ALTER TABLE users ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 3. Indeks Performa Query
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email, phone);
```

---

### 2.4 Struktur Model Data Go (Backend Domain)

```go
package domain

import (
    "time"
    "github.com/google/uuid"
)

type UserRole string

const (
    RoleSuperAdmin UserRole = "super_admin" // IT Master / Developer (Hidden)
    RoleAdmin      UserRole = "admin"       // Administrator Bisnis (Level Tertinggi Aplikasi)
    RoleFinance    UserRole = "finance"     // Staf Keuangan & Akuntansi
    RoleDirektur   UserRole = "direktur"    // Direktur Operasional
    RoleOwner      UserRole = "owner"       // Pemilik Modal / Investor
)

type UserStatus string

const (
    StatusActive    UserStatus = "ACTIVE"
    StatusInactive  UserStatus = "INACTIVE"
    StatusSuspended UserStatus = "SUSPENDED"
)

type User struct {
    ID           uuid.UUID   `json:"id" db:"id"`
    Email        string      `json:"email" db:"email"`
    Phone        *string     `json:"phone,omitempty" db:"phone"`
    PasswordHash string      `json:"-" db:"password_hash"`
    FullName     string      `json:"full_name" db:"full_name"`
    Role         UserRole    `json:"role" db:"role"`
    Status       UserStatus  `json:"status" db:"status"`
    LastLoginAt  *time.Time  `json:"last_login_at,omitempty" db:"last_login_at"`
    CreatedAt    time.Time   `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time   `json:"updated_at" db:"updated_at"`
    DeletedAt    *time.Time  `json:"deleted_at,omitempty" db:"deleted_at"`
}

type UserSession struct {
    SessionID string     `json:"session_id"`
    UserID    uuid.UUID  `json:"user_id"`
    Email     string     `json:"email"`
    Phone     *string    `json:"phone,omitempty"`
    FullName  string     `json:"full_name"`
    Role      UserRole   `json:"role"`
    CreatedAt time.Time  `json:"created_at"`
    ExpiresAt time.Time  `json:"expires_at"`
}
```

---

### 2.5 Katalog REST API Endpoints

| Method | Path | Deskripsi | Hak Akses (*Role Required*) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Login user, pasang HttpOnly Cookie, create Redis session | Publik |
| `POST` | `/api/v1/auth/logout` | Logout user, hapus Redis session, bersihkan cookie | Terautentikasi |
| `GET` | `/api/v1/auth/me` | Mengambil profil user & session aktif saat ini | Terautentikasi |
| `GET` | `/api/v1/users` | List user bisnis (Pagination, Search, Filter Role & Status) | `admin`, `super_admin` |
| `POST` | `/api/v1/users` | Tambah user bisnis baru | `admin`, `super_admin` |
| `GET` | `/api/v1/users/{id}` | Detail user spesifik | `admin`, `super_admin` |
| `PUT` | `/api/v1/users/{id}` | Update nama, phone, role, status (*Auto force logout*) | `admin`, `super_admin` |
| `PATCH`| `/api/v1/users/{id}/password`| Reset password user (*Auto force logout*) | `admin`, `super_admin` |
| `DELETE`| `/api/v1/users/{id}`| Soft delete user (*Proteksi anti-lockout*) | `admin`, `super_admin` |

---

### 2.6 Desain Antarmuka Frontend Next.js (`apps/web-next`)

1. **Sidebar Navigation** ([layout.tsx](file:///home/aliube/Workspace/Adi/cashflow-shipment-app/apps/web-next/src/app/dashboard/layout.tsx)):
   - Grup Menu **PENGATURAN SISTEM**:
     - 👥 **Manajemen User** (`/dashboard/users`) $\rightarrow$ Hanya ditampilkan untuk role `admin` dan `super_admin`.
   - Profil User di bagian bawah menampilkan:
     - Avatar inisial nama dengan warna gradasi role.
     - Nama lengkap & Badge Role resmi (*ADMIN*, *FINANCE*, *DIREKTUR*, *PEMILIK MODAL*).
2. **Halaman Manajemen User** (`/dashboard/users/page.tsx`):
   - **4 KPI Summary Cards**:
     - Total User Terdaftar
     - Admin Bisnis
     - Finance & Akuntansi
     - Direktur & Owner
   - **Filter & Search Bar**: Filter Role, Filter Status, dan Input Pencarian.
   - **Tabel User Profesional**: Avatar inisial, Badge Role khas, Status (Aktif/Nonaktif), Last Login, dan terintegrasi dengan **`TablePagination`**.
   - **Modal Tambah/Edit User** (`UserModal.tsx`):
     - Pilihan role hanya menampilkan: `Admin`, `Finance`, `Direktur`, `Pemilik Modal`.
     - *Role `super_admin` disembunyikan dari dropdown*.
   - **Modal Reset Password** (`ResetPasswordModal.tsx`):
     - Form reset password instan oleh Admin Bisnis.
   - **Modal Hapus Aman** (`DeleteUserModal.tsx`):
     - Konfirmasi keamanan dengan proteksi: user tidak dapat menghapus akunnya sendiri.
3. **Role Action Guards di Modul Transaksi & Invoice**:
   - Role `finance`: Tombol Tambah & Edit aktif, tombol **Hapus** disembunyikan.
   - Role `direktur` & `owner`: Mode *Read-Only*, tombol aksi mutasi dinonaktifkan secara aman.
