# Panduan Manajemen Database (Make Commands) & Akun Demo Eksekutif
## PT. Adijayantara Logistics Indonesia — Cashflow, Shipment & Invoice System

Dokumen ini merupakan panduan resmi langkah demi langkah (*step-by-step*) penggunaan perintah otomasi database melalui `Makefile` dan skrip `db_manager.sh`, serta katalog lengkap akun pengguna demo, kata sandi (*password*), hak akses (*role*), dan matriks perizinan PBAC (*Permission-Based Access Control*).

---

## 1. Prasyarat & Informasi Koneksi Database

Seluruh otomasi basis data dijalankan menggunakan container PostgreSQL 15 dan Redis 7 yang dikelola via Docker Compose (atau Podman Compose).

### A. Memastikan Infrastruktur Berjalan
Sebelum mengeksekusi perintah manajemen database, pastikan container basis data dan cache sudah menyala:

```bash
# Menjalankan container PostgreSQL 15 dan Redis 7 di latar belakang
make infra-up

# (Opsional) Memeriksa logs container jika terjadi kendala koneksi
make infra-logs
```

### B. Kredensial Koneksi Internal & Host
| Komponen | Parameter | Nilai Default |
| :--- | :--- | :--- |
| **PostgreSQL Host** | Host OS / Container | `localhost` / `postgres` |
| **PostgreSQL Port** | Port Forwarding | `5432` |
| **Database Name** | Database Utama | `cashflow_db` |
| **Database User** | Username | `cashflow_user` |
| **Database Password** | Password | `cashflow_password` |
| **Connection URL** | Standard DSN | `postgres://cashflow_user:cashflow_password@localhost:5432/cashflow_db?sslmode=disable` |
| **Redis Cache** | Host & Port | `localhost:6379` (Container: `redis:6379`) |

---

## 2. Matriks Perbandingan Perintah Database

Gunakan tabel berikut untuk memilih perintah yang tepat sesuai kebutuhan pengujian dan pengembangan:

| Perintah Make | Operasi Skema | Master Data | Data Transaksi | Flush Redis? | Rekomendasi Penggunaan |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `make db-fresh-2026` | **Reset Total** | ✅ Terisi | ✅ Penuh (Jan–Sep 2026) | ✅ Ya | **Sangat Direkomendasikan**: Menyiapkan demo analitik eksekutif 9 bulan, chart makro, dan BCG matrix. |
| `make db-fresh` | **Reset Total** | ✅ Terisi | ✅ Standar (Agt–Sep) | ✅ Ya | Menyiapkan data demo standar periode 2 bulan operasional. |
| `make db-seed-2026` | Pertahankan | ✅ Terisi | ✅ Tambah Jan–Sep 2026 | ✅ Ya | Mengisi data 9 bulan ke dalam skema database yang sudah bermigrasi tanpa drop skema. |
| `make db-seed` | Pertahankan | ✅ Terisi | ✅ Tambah Agt–Sep | ✅ Ya | Mengisi data standar tanpa drop skema. |
| `make db-clean` | Pertahankan | ✅ **Tetap Utuh** | ❌ **Dihapus Bersih** | ✅ Ya | Mengosongkan data transaksi kas & invoice, tetapi akun login dan rekanan tetap ada. |
| `make db-reset` | **Reset Total** | ❌ Kosong | ❌ Kosong | ✅ Ya | Menghasilkan database kosong murni (hanya struktur tabel) untuk pengujian dari nol. |
| `make db-migrate` | **Update Skema**| Tidak Berubah | Tidak Berubah | ❌ Tidak | Mengaplikasikan file migrasi baru (`000001` s.d. `000014`) tanpa menghapus data. |
| `make db-status` | Hanya Baca | - | - | - | Memeriksa status koneksi, row count tabel, dan saldo kas berjalan riil. |
| `make redis-flush` | - | - | - | ✅ Ya | Menghapus seluruh cache query, metrik telemetri, dan sesi login aktif di Redis. |

---

## 3. Panduan Langkah-demi-Langkah Penggunaan Perintah

### 1. `make db-fresh-2026` — Full Fresh Restart (Dataset 9 Bulan Jan–Sep 2026)
> **Pilihan Utama untuk Presentasi & Analisis Eksekutif Tab 2 & Tab 3**

* **Apa yang dilakukan sistem:**
  1. Melakukan `DROP SCHEMA IF EXISTS public CASCADE` dan membuat ulang `CREATE SCHEMA public`.
  2. Mengeksekusi seluruh 14 file migrasi SQL (`000001` hingga `000014`) secara berurutan.
  3. Menginjeksi data komprehensif 9 bulan dari `scripts/database/seed_demo_2026_jan_sep.sql`:
     - Master data lengkap (5 akun user, roles, permissions, customer, vendor rekanan, activity presets).
     - Ratusan transaksi kas & shipment dari Januari hingga September 2026 dengan pergerakan saldo dinamis.
     - Puluhan tagihan invoice, histori pelunasan parsial/lunas, dan histori reschedule jatuh tempo.
     - Data pendukung 6 grafik intelijen strategis (BCG matrix margin rute, skor disiplin bayar DSO, pareto klien, efisiensi vendor, dan cash runway).
  4. Menjalankan `FLUSHALL` di Redis untuk menghapus cache basi.
  5. Menampilkan tabel statistik akhir dan saldo kas berjalan.
* **Cara Penggunaan:**
  ```bash
  make db-fresh-2026
  ```
* **Kapan Digunakan:**
  - Saat ingin mendemonstrasikan dashboard analitik eksekutif dengan data tren 9 bulan penuh.
  - Setelah ada perubahan besar pada skema database dan membutuhkan data realistis untuk pengujian UI.

---

### 2. `make db-fresh` — Full Fresh Restart (Dataset Standar Agustus–September)
* **Apa yang dilakukan sistem:**
  1. Mereset skema `public` total (Drop & Create).
  2. Menjalankan seluruh file migrasi SQL.
  3. Memuat data demo standar 2 bulan operasional dari `scripts/database/seed_demo_data.sql`.
  4. Mengosongkan cache Redis.
  5. Menampilkan statistik jumlah baris data dan saldo akhir (~Rp 528.900.000).
* **Cara Penggunaan:**
  ```bash
  make db-fresh
  ```
* **Kapan Digunakan:**
  - Pengujian alur operasional standar harian kas buku berjalan tanpa beban riwayat histori yang terlalu panjang.

---

### 3. `make db-seed-2026` — Populate 9-Month Demo Data
* **Apa yang dilakukan sistem:**
  - Membaca file `scripts/database/seed_demo_2026_jan_sep.sql` dan mengeksekusinya langsung ke PostgreSQL.
  - Menggunakan klausa `ON CONFLICT DO UPDATE / DO NOTHING` sehingga aman dijalankan tanpa harus mereset skema dari awal.
  - Mengosongkan cache Redis secara otomatis setelah seeding selesai.
* **Cara Penggunaan:**
  ```bash
  make db-seed-2026
  ```
* **Kapan Digunakan:**
  - Jika tabel sudah termigrasi tetapi data transaksi belum ada atau ingin diperbarui dengan data 9 bulan tanpa menghapus skema tabel kustom.

---

### 4. `make db-seed` — Populate Standard Executive Demo Data
* **Apa yang dilakukan sistem:**
  - Menginjeksi data seeder standar dari `scripts/database/seed_demo_data.sql` ke database aktif.
  - Membersihkan cache Redis dan menampilkan statistik akhir.
* **Cara Penggunaan:**
  ```bash
  make db-seed
  ```
* **Kapan Digunakan:**
  - Mengisi kembali data demo standar jika sebelumnya telah dilakukan pembersihan parsial.

---

### 5. `make db-clean` — Wipe Transactional Data (Keep Master Data)
> **Pembersihan Bersih Tanpa Menghapus User Login & Rekanan**

* **Apa yang dilakukan sistem:**
  - Menjalankan `TRUNCATE TABLE` secara cascading pada tabel-tabel transaksi:
    * `cashflow_entries` & `cashflow_entries_history`
    * `invoices`, `invoice_payment_history`, `invoice_due_date_history`
    * `notifications`
  - **TIDAK MENGHAPUS** master data penting:
    * Akun pengguna (`users`), peran (`roles`), hak akses (`permissions`, `role_permissions`).
    * Rekanan transporter (`vendors`), klien (`customers`), dan preset armada (`activity_presets`).
  - Mengosongkan cache Redis.
* **Cara Penggunaan:**
  ```bash
  make db-clean
  ```
* **Kapan Digunakan:**
  - Saat ingin mulai menginput transaksi riil perusahaan tanpa kehilangan akun user dan master data pelanggan yang telah didaftarkan.
  - Reset pengujian form kas operasional.

---

### 6. `make db-reset` — Drop Schema, Recreate & Re-run All Migrations
> **Database Kosong Murni (Clean Empty Schema)**

* **Apa yang dilakukan sistem:**
  - Menghapus skema `public` secara menyeluruh beserta seluruh tabel, sequence, indeks, dan trigger.
  - Membuat ulang skema `public`.
  - Menjalankan seluruh file migrasi `000001` s.d. `000014`.
  - Database dalam kondisi struktur tabel 100% siap, namun **0 baris data** (tidak ada user, tidak ada vendor, tidak ada transaksi).
  - Mengosongkan cache Redis.
* **Cara Penggunaan:**
  ```bash
  make db-reset
  ```
* **Kapan Digunakan:**
  - Mempersiapkan database untuk lingkungan *Staging* atau *Production* baru.
  - Menguji kehandalan skrip inisialisasi awal atau *auto-bootstrap* sistem backend.

---

### 7. `make db-migrate` — Run All Database SQL Migrations
* **Apa yang dilakukan sistem:**
  - Mendeteksi seluruh berkas `*.up.sql` yang ada di direktori `services/core-go/migrations/` secara berurutan.
  - Berkas migrasi yang dieksekusi:
    1. `000001_init_schema.up.sql` (Tabel users, cashflow_entries, vendors, audit_logs)
    2. `000002_add_history_table.up.sql` (Audit kas & histori)
    3. `000002_add_phone_to_users.up.sql` (Kolom telepon pengguna)
    4. `000003_add_soft_delete_to_vendors.up.sql` (Soft delete vendor)
    5. `000004_create_invoices_table.up.sql` (Modul invoice piutang)
    6. `000005_create_customers_table.up.sql` (Master customer/klien)
    7. `000006_create_activity_presets_table.up.sql` (Preset armada & rute)
    8. `000007_enhance_users_management.up.sql` (Struktur user & status akun)
    9. `000008_dynamic_rbac_permissions.up.sql` (Tabel roles, permissions, PBAC)
    10. `000009_partial_unique_indices.up.sql` (Integritas unik transaksi aktif)
    11. `000010_create_notifications_table.up.sql` (Pusat notifikasi in-app)
    12. `000011_invoice_settlement_and_reschedule_history.up.sql` (Histori pelunasan & reschedule)
    13. `000012_add_sorting_and_performance_indices.up.sql` (Indeks performa & pencarian)
    14. `000013_add_invoice_payment_entry_type.up.sql` (Tipe kas pelunasan piutang)
    15. `000014_create_audit_logs_table.up.sql` (Audit log forensik aktivitas pengguna)
* **Cara Penggunaan:**
  ```bash
  make db-migrate
  ```
* **Kapan Digunakan:**
  - Setelah melakukan `git pull` fitur baru yang membawa berkas migrasi database baru.

---

### 8. `make db-status` — Check Connection & Row Count Statistics
* **Apa yang dilakukan sistem:**
  - Memverifikasi konektivitas ke PostgreSQL (`pg_isready`).
  - Menjalankan agregasi query penghitungan jumlah baris data (`count(*)`) per tabel, dikelompokkan berdasarkan kategori:
    * **Master & RBAC**: `users`, `roles`, `permissions`, `role_permissions`
    * **Master Operasional**: `customers`, `vendors`, `activity_presets`
    * **Transaksi Piutang**: `invoices`, `invoice_payment_history`, `invoice_due_date_history`
    * **Transaksi Kas & Shipment**: `cashflow_entries`
    * **Pusat Notifikasi & Audit**: `notifications`, `audit_logs`
  - Menghitung dan mencetak **Saldo Buku Kas Berjalan Riil Saat Ini** (Rp).
* **Cara Penggunaan:**
  ```bash
  make db-status
  ```
* **Contoh Output:**
  ```text
  ==============================================================================
     RINGKASAN STATISTIK BASIS DATA - PT ADIJAYANTARA LOGISTICS INDONESIA       
  ==============================================================================
   Tabel Database            | Jumlah Baris | Kategori Data
  ---------------------------+--------------+--------------------------
   permissions               | 23           | Master & RBAC
   role_permissions          | 68           | Master & RBAC
   roles                     | 5            | Master & RBAC
   users                     | 5            | Master & RBAC
   activity_presets          | 5            | Master Operasional
   customers                 | 8            | Master Operasional
   vendors                   | 8            | Master Operasional
   invoice_due_date_history  | 14           | Histori Reschedule
   invoice_payment_history   | 28           | Histori Pelunasan
   invoices                  | 42           | Transaksi Piutang
   cashflow_entries          | 120          | Transaksi Kas & Shipment
   notifications             | 15           | Pusat Notifikasi
   audit_logs                | 0            | Audit Forensik & SLA
  Saldo Buku Kas Berjalan Saat Ini: Rp 712.450.000
  ==============================================================================
  ```

---

### 9. `make redis-flush` — Flush Redis In-Memory Cache
* **Apa yang dilakukan sistem:**
  - Menjalankan instruksi `redis-cli flushall` di dalam container `cashflow_redis`.
  - Mengosongkan session token yang aktif, cache ringkasan kas, cache metrik analitik, dan rate limiting counters.
* **Cara Penggunaan:**
  ```bash
  make redis-flush
  ```
* **Kapan Digunakan:**
  - Saat data di database telah diubah secara manual via SQL dan frontend masih menampilkan data lama akibat cache Redis.
  - Untuk memaksa seluruh user yang sedang login melakukan login ulang (*Force Logout All Sessions*).

---

## 4. Daftar Akun Pengguna Demo, Password & Hak Akses (RBAC)

Seluruh akun demo telah dienkripsi menggunakan algoritma **Bcrypt** (*cost factor: 10*).

> [!IMPORTANT]
> **Password Default untuk Seluruh Akun Demo adalah:**  
> **`password123`**  
> *Hash Bcrypt*: `$2a$14$4jy/s63YXdDzVJCEBe4V6eTJyl.pLO.6ite2o0OeITIpuoeW7RfPi`

### Tabel Kredensial Pengguna Demo

| Nama Lengkap | Email Login | Password | Kode Peran (*Role*) | Nama Peran | No. Telepon | Status Akun |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| **IT Super Admin** | `odealidj.go@gmail.com` | `password123` | `super_admin` | IT Super Admin | `082111391380` | `ACTIVE` |
| **Admin Bisnis** | `admin.bisnis@adijayantara.co.id` | `password123` | `admin` | Administrator Bisnis | `0812-3456-7890` | `ACTIVE` |
| **Ayu** | `finance.ayu@adijayantara.co.id` | `password123` | `finance` | Finance & Akuntansi | `0813-9876-5432` | `ACTIVE` |
| **Wildan** | `direktur.wildan@adijayantara.co.id` | `password123` | `direktur` | Direktur Perusahaan | `0818-8899-0011` | `ACTIVE` |
| **Adi Jayantara** | `owner.adi@adijayantara.co.id` | `password123` | `owner` | Pemilik Perusahaan (Owner) | `0811-2233-4455` | `ACTIVE` |

---

### Rincian Wewenang & Cakupan Akses Per Peran

```
                        ┌──────────────────────────────┐
                        │   SUPER ADMIN (Root Access)  │
                        │   Bypass seluruh izin (PBAC) │
                        └──────────────┬───────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│      ADMIN       │          │     FINANCE      │          │ DIREKTUR & OWNER │
│ Operasional Bisnis│         │ Input Kas & Inv  │          │ Eksekutif Read-Only│
│ & Kelola Pengguna│          │ Rekanan & Preset │          │ Metrik & Export  │
└──────────────────┘          └──────────────────┘          └──────────────────┘
```

#### 1. IT Super Admin (`super_admin`)
* **Karakteristik**: Role teknis tertinggi (*System Root*).
* **Hak Akses**:
  * **Fail-Safe All-Access Bypass**: Di level kode backend Go, setiap middleware otorisasi memiliki aturan `if user.Role == "super_admin" { return next() }`.
  * Mengakses dan mengelola seluruh modul tanpa batasan.
  * Manajemen pengguna, reset password, konfigurasi hak akses peran, audit log forensik, dan metrik server/telemetri.

#### 2. Administrator Bisnis (`admin`)
* **Karakteristik**: Penanggung jawab operasional harian kantor logistik.
* **Hak Akses**:
  * Mengelola seluruh transaksi kas operasional dan pengiriman (*create, read, update, delete, export, import*).
  * Mengelola faktur tagihan invoice piutang klien.
  * Menambah dan mengelola master data customer, vendor armada, dan preset rute.
  * Mengelola akun staf pengguna (*User Management*) dan melihat matriks peran.

#### 3. Finance & Akuntansi (`finance`)
* **Karakteristik**: Divisi pembukuan, kasir, dan penagihan piutang.
* **Hak Akses**:
  * **Modul Kas**: Melihat tabel kas, menambah transaksi shipment/top-up, mencatat biaya pengeluaran, dan export laporan Excel.
  * **Modul Invoice**: Membuat invoice baru, mengirim penagihan, menandai status pelunasan (*mark as paid/partial*), mencatat histori pembayaran, dan reschedule jatuh tempo.
  * **Master Data**: Melihat dan mendaftarkan rekanan (vendor transporter & klien).
  * **Batasan**: Tidak memiliki akses ke manajemen akun pengguna (*User Management*), konfigurasi peran (*Roles*), maupun pengaturan sistem.

#### 4. Direktur Perusahaan (`direktur`)
* **Karakteristik**: Pimpinan eksekutif pengambil kebijakan strategis.
* **Hak Akses**:
  * **Executive Read-Only & Monitoring**: Melihat ringkasan kas, grafik pertumbuhan bisnis, tren makro eksekutif, dan intelijen strategis (6 matriks).
  * Mengunduh rekapitulasi laporan kas dan invoice (Export Excel & Cetak PDF).
  * Memantau notifikasi tagihan jatuh tempo dan margin rute yang defisit.
  * **Batasan**: Tidak memiliki izin mutasi data (*create/edit/delete*) untuk menjaga independensi pengawasan operasional.

#### 5. Pemilik Perusahaan / Owner (`owner`)
* **Karakteristik**: Pemilik modal (*Shareholder/Owner*). Fokus pengawasan keuangan tingkat tinggi, likuiditas, piutang, dan audit forensik anomali.
* **Hak Akses Default (7 Hak Akses Terpilih)**:
  1. `cashflow.view` — Menu Kas & monitoring buku kas berjalan serta transaksi shipment armada.
  2. `cashflow.export` — Unduh laporan transaksi kas ke format Excel/CSV.
  3. `invoices.view` — Menu Invoice & monitoring daftar tagihan piutang customer.
  4. `invoices.print` — Cetak dokumen invoice penagihan resmi & PDF rekapitulasi.
  5. `notifications.view` — Pusat notifikasi pengingat jatuh tempo piutang dan radar anomali kas.
  6. `audit.view` — Menu Audit forensik eksekutif & pemantauan radar anomali kas / keterlambatan input SLA.
  7. `audit.manage` — Unduh dan ekspor laporan forensik audit keuangan.
* **Batasan**: Tidak dibebani modul teknis operasional harian (Master Klien, Master Vendor Armada, Preset Rute, Metrik Server/Telemetri, maupun Manajemen Staf Kantor).

---

## 5. Skenario Alur Kerja Cepat (*Quick Runbook*)

### Skenario A: Pertama Kali Setup Proyek di Laptop Baru
Jalankan urutan perintah berikut:
```bash
# 1. Nyalakan infrastruktur
make infra-up

# 2. Inisialisasi skema dan langsung muat data demo 9 bulan
make db-fresh-2026

# 3. Jalankan backend Go (Core API di :8080)
make run-local-core-go

# 4. Di terminal terpisah, jalankan frontend Next.js
make run-local-web-next
```
Buka browser di `http://localhost:3000/dashboard`, login menggunakan `odealidj.go@gmail.com` dan `password123`.

---

### Skenario B: Menyiapkan Demo Presentasi / Rapat Direksi
Jika sebelumnya database telah diacak-acak untuk pengetesan, kembalikan ke kondisi ideal 9 bulan:
```bash
make db-fresh-2026
```
Seluruh grafik analitik (BCG Matrix Rute, Cashflow Runway, DSO Discipline, Pareto 80/20, Vendor Efficiency, Cash Conversion Gap) akan langsung menampilkan data visual yang kaya dan konsisten.

---

### Skenario C: Ingin Memulai Pencatatan Kas Riil Perusahaan
Gunakan pembersihan data transaksi agar tidak perlu mendaftarkan ulang nama klien, vendor, dan akun login staf:
```bash
make db-clean
```
Saldo kas akan kembali ke Rp 0 dan tabel kas siap menerima transaksi riil pertama.

---

### Skenario D: Sinkronisasi Migrasi Tim (Git Pull)
Jika rekan tim menambahkan file migrasi baru di folder `migrations/`:
```bash
make db-migrate
make db-status
```

---

*Dokumen ini dikelola secara resmi oleh Tim Engineering PT Adijayantara Logistics Indonesia.*
