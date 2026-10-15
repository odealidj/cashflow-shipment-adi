# Dokumen Pencapaian & Status Proyek (15 Oktober 2026)
## PT Adijayantara Logistics Indonesia — Cashflow, Shipment & Invoice System

Dokumen ini disusun sebagai ringkasan komprehensif (*handover summary & context keeper*) seluruh pencapaian, perubahan teknis, konfigurasi arsitektur, dan status operasional sistem yang telah diselesaikan pada sesi kerja hari ini. Dokumen ini memastikan kelanjutan proyek di masa mendatang dapat langsung diteruskan tanpa kehilangan konteks teknis maupun bisnis.

---

## 📌 Ringkasan Eksekutif Status Proyek

| Parameter | Status Terkini | Keterangan |
| :--- | :--- | :--- |
| **Repositori Git** | `github.com/odealidj/cashflow-shipment-adi` | Up-to-date di GitHub |
| **Branch Aktif** | `main` | Clean merge dari `feature/dynamic-month-filter` |
| **Server VPS Live** | Biznet GIO (`103.94.238.109`) | Aktif (Nginx + Go Systemd + Next.js PM2) |
| **Database Produksi** | PostgreSQL 15 & Redis 7 | 15 transaksi aktif, Saldo Kas: **Rp 1.040.347.951** |
| **Kredensial Superadmin** | `odealidj.go@gmail.com` / `password123` | Role: IT Super Admin (Full Privileges) |
| **Kredensial Direktur** | `direktur.basri@adijayantara.co.id` / `password123` | Role: Direktur Eksekutif |

---

## 🚀 Fitur & Pencapaian yang Diselesaikan Hari Ini

### 1. Filter Periode Dinamis Berbasis Data (*Data-Driven*) — Invoice & Piutang
- **Permasalahan Sebelumnya**:
  Filter tanggal pada card *"Daftar Rekapitulasi Invoice & Piutang"* menggunakan perulangan statis *hardcoded* (`for (let i = -12; i <= 5; i++)`) yang memunculkan bulan-bulan masa depan buatan (seperti tahun 2027) tanpa ada data aslinya.
- **Implementasi Solusi**:
  1. **Core Go Backend**:
     - Menambahkan method `GetAvailablePeriods` pada repositori dan service invoice (`services/core-go/internal/adapters/repository/postgres_invoice_repo.go`).
     - Mengambil agregasi periode murni dari kolom `shipment_date` pada tabel `invoices` (`deleted_at IS NULL`).
     - Menyediakan endpoint API: `GET /api/v1/invoices/periods`.
  2. **Frontend Next.js**:
     - Memperbarui `apps/web-next/src/app/dashboard/invoices/page.tsx` untuk mengambil periode langsung dari backend.
     - Menampilkan label informatif, misal: `Oktober 2026 (Bulan Ini - 1 invoice)`, `September 2026 (Bulan Lalu)`, dan `Semua Waktu (Tanpa Filter)`.
     - Tombol navigasi panah `<` dan `>` otomatis menyesuaikan batas data riil (ter-disable jika sudah di bulan awal/akhir).
     - Tombol preset cepat (`Bulan Ini`, `Bulan Lalu`, `Semua`) berfungsi sinkron dengan pilihan dropdown.
  3. **Modal Cetak Laporan Rekapitulasi**:
     - Memperbarui komponen `apps/web-next/src/components/InvoiceRecapReportModal.tsx` sehingga pratinjau cetak PDF/Excel juga menggunakan daftar periode dinamis.

---

### 2. Filter Periode Dinamis Berbasis Data — Transaksi Cashflow & Shipment
- Menghapus filter bulan statis pada halaman transaksi.
- Endpoint `GET /api/v1/cashflow/periods` mengembalikan daftar bulan riil dari kolom `date_of_entry` tabel `cashflow_entries` beserta jumlah transaksinya (`total_count`).
- Dropdown transaksi menampilkan jumlah catatan per bulan (misal `September 2026 (Bulan Lalu - 3 transaksi)`).
- Menjamin tidak ada lagi pilihan bulan fiktif di masa depan.

---

### 3. Soft Warning & Validasi Visual Saldo Defisit pada Form Tambah Shipment
- **Kebutuhan Bisnis**:
  Ketika saldo kas operasional tidak mencukupi atau sedang defisit (minus), sistem harus memberikan peringatan visual yang jelas kepada staf operasional, namun **tidak boleh memblokir** penyimpanan data (*non-blocking input*).
- **Implementasi**:
  1. Simulasi saldo akhir dihitung secara real-time saat pengguna mengetik biaya pengeluaran (*debit*).
  2. Garis batas (*border*) pada card **"Hasil Kalkulasi Otomatis Sistem"** berubah warna secara dinamis:
     - 🔴 **Merah (`border-rose-400 bg-rose-50/40`)**: Jika saldo kas defisit (< Rp 0).
     - 🟡 **Kuning/Amber (`border-amber-400 bg-amber-50/40`)**: Jika saldo kas menipis (< Rp 10.000.000).
     - 🟢 **Hijau (`border-emerald-200 bg-slate-50/60`)**: Jika saldo kas dalam batas aman dan surplus.
  3. Menghapus banner peringatan berukuran besar di bagian bawah modal untuk menghemat ruang vertikal (*vertical real-estate*) pada laptop berlayar 768p/900p.

---

### 4. Resolusi Konflik Port Host & Pembersihan Layanan
- Mengatasi kendala `failed to bind host port 0.0.0.0:8081/tcp: address already in use` saat menjalankan `make run-all-go`.
- Menghentikan proses background Go (`main`) pada port `8080` dan `8081`.
- Menghapus container stale Docker Compose (`cashflow_core_go` & `cashflow_gateway`), memastikan port host bersih dan siap untuk orkestrasi container maupun native.

---

### 5. Standardisasi Git, Versioning & Sinkronisasi GitHub
- Seluruh commit fitur pada branch `feature/dynamic-month-filter` telah di-push ke remote GitHub:
  - Commit `f0382f6`: `feat(invoice): implement dynamic data-driven period filter from invoice dates`
  - Commit `9acd15e`: `feat(filter): implement data-driven dynamic month filter with transaction counts and boundary controls`
  - Commit `d6038f4`: `refactor(modal): remove bottom warning banner box to keep modal layout compact on lower resolution screens`
  - Commit `519fed1`: `feat(ui): add dynamic border warning color (red/amber/green) to Hasil Kalkulasi Otomatis Sistem`
  - Commit `3a2ac11`: `feat(cashflow): implementasi soft validation dan inline warning untuk saldo defisit dan menipis`
- Dilakukan merge bersih (*clean merge*) ke branch `main`.
- Branch `main` telah di-push dan tersinkronisasi 100% dengan `origin/main`.

---

### 6. Pembaruan & Verifikasi Server VPS Biznet GIO (`103.94.238.109`)
- Menjalankan inspeksi browser langsung ke server produksi:
  - **Tabel Transaksi**: Menampilkan **15 transaksi** dengan total Saldo Kas Terkini sebesar **Rp 1.040.347.951**.
  - **Klarifikasi Tampilan Default**: Saat membuka halaman pertama kali, sistem otomatis menyaring transaksi pada **"Bulan Ini"** (Oktober 2026). Karena transaksi input riil pengguna berada pada bulan Agustus & September 2026, maka wajar jika bulan Oktober menampilkan status kosong. Data riil langsung muncul penuh begitu filter dialihkan ke tombol **"Bulan Lalu"** atau **"Semua"**.
  - **Keamanan Data**: Data transaksi, setoran modal, dan audit log di VPS terverifikasi 100% aman dan utuh.

---

## 🛠️ Catatan Teknis Operasional (Cheat Sheet)

### 1. Cara Eksekusi Script SQL Manual di Database
Jika ingin mengeksekusi file SQL seperti `scripts/database/seed_routes_from_excel.sql` (47 Rute Operasional), jangan jalankan langsung sebagai perintah bash (akan menghasilkan `Permission denied`), melainkan suntikkan ke dalam container PostgreSQL:

```bash
# Eksekusi via container PostgreSQL di host lokal atau VPS:
docker compose exec -T postgres psql -U cashflow_user -d cashflow_db < scripts/database/seed_routes_from_excel.sql
```

### 2. Prosedur Deploy Update Cepat ke VPS Biznet
Ketika ada perubahan kode baru di branch `main`:
```bash
ssh -i adijayantara-ssh.pem adminadi@103.94.238.109
sudo -i
cd /var/www/cashflow-shipment-app

# 1. Tarik perubahan terbaru
git checkout main
git pull origin main

# 2. Kompilasi ulang backend Go & restart service
cd services/core-go
go build -ldflags="-s -w" -o bin/cashflow-core ./cmd/api
systemctl restart cashflow-backend

# 3. Kompilasi ulang frontend Next.js & restart PM2
cd ../../apps/web-next
npm run build
pm2 restart cashflow-frontend

# 4. Cek status
systemctl status cashflow-backend --no-pager
pm2 status
```

---

## 🎯 Rekomendasi Rencana Kerja Lanjutan (Next Steps)

1. **Auto-Select Active Month Fallback**:
   Jika pada bulan berjalan (*current month*) belum ada transaksi sama sekali, filter secara cerdas dapat langsung mengarahkan tampilan default ke bulan terakhir yang memiliki transaksi (misal: otomatis memilih bulan September jika Oktober masih kosong), sehingga pengguna tidak mendapati tabel kosong pada awal buka halaman.
2. **Penyempurnaan 47 Preset Rute**:
   Mengintegrasikan eksekusi otomatis `scripts/database/seed_routes_from_excel.sql` ke dalam target `make db-seed-routes` pada `Makefile`.
3. **Penyelarasan Dashboard Mobile PWA (`/m`)**:
   Memastikan filter periode dinamis ini juga diadopsi secara seragam pada antarmuka mobile PWA.

---
*Dokumen ini dibuat otomatis sebagai catatan rekam jejak pengembangan sistem PT Adijayantara Logistics Indonesia.*
