# 09 — Inventaris Fitur & Backend Mapping

> Dokumen ini merangkum seluruh fitur yang teridentifikasi dari contoh UI dan memetakannya ke backend yang sudah ada maupun yang perlu dibuat.

---

## 9.1 Inventaris Fitur Lengkap (23 Fitur)

| # | Fitur | Screen | Kategori | Prioritas |
|---|---|---|---|---|
| 1 | Splash Screen branding | Screen Awal | UI/Branding | P0 |
| 2 | PIN Lock 6-digit | Screen Awal | Auth/Security | P0 |
| 3 | Biometrik (fingerprint) | Screen Awal | Auth/Security | P0 |
| 4 | KPI Dashboard (4 cards) | Beranda | Analytics | P0 |
| 5 | Greeting dinamis (waktu + nama + tanggal) | Beranda | UX | P0 |
| 6 | Bar Chart Laba Bulanan | Beranda | Analytics | P1 |
| 7 | Line Chart Tren Saldo | Beranda | Analytics | P1 |
| 8 | Ringkasan Hari Ini | Beranda | Analytics | P1 |
| 9 | Hero Banner "Coming Soon" | Beranda | Marketing | P3 |
| 10 | Trial period indicator | Beranda | Subscription | P3 |
| 11 | Transaksi Terakhir (preview 5) | Beranda | Data | P0 |
| 12 | Search transaksi (vendor + aktivitas) | Laporan | Filter | P1 |
| 13 | Filter status (Semua/Lunas/Belum/Sebagian) | Laporan | Filter | P0 |
| 14 | Filter tanggal (date range) | Laporan | Filter | P1 |
| 15 | Filter vendor | Laporan | Filter | P1 |
| 16 | Sort transaksi | Laporan | Filter | P1 |
| 17 | Vendor Performance chart | Laporan | Analytics | P2 |
| 18 | Alert tagihan overdue | Tagihan | Notifikasi | P1 |
| 19 | Quick Pay (ubah status bayar) | Tagihan | Core Action | P1 |
| 20 | Form Tambah Transaksi (4 seksi, 15+ field) | Tambah | Core CRUD | P0 |
| 21 | Auto-calculate (Saldo, Profit, Margin, Due Date) | Tambah | Business Logic | P0 |
| 22 | Ekspor Excel & PDF | Pengaturan | Export | P2 |
| 23 | Manajemen Vendor & Kategori (CRUD) | Pengaturan | Master Data | P2 |

---

## 9.2 Backend Mapping — Status Implementasi

### ✅ Sudah Ada (Verified)

| Fitur | Endpoint | Method |
|---|---|---|
| KPI Summary | `/api/cashflow/summary` | GET |
| List Transaksi | `/api/cashflow` | GET |
| Ekspor Excel | `/api/cashflow/export` | GET |
| Tambah Transaksi | `/api/cashflow` | POST |

### ⚠️ Perlu Verifikasi / Kemungkinan Perlu Ekstensi

| Fitur | Endpoint | Yang Perlu Dicek |
|---|---|---|
| Filter Status Transaksi | `GET /api/cashflow?payment_status=` | Apakah param `payment_status` sudah support |
| Filter Tanggal | `GET /api/cashflow?date_from=&date_to=` | Apakah param date range sudah support |
| Filter Vendor | `GET /api/cashflow?vendor_id=` | Apakah param vendor_id sudah support |
| Sort | `GET /api/cashflow?sort=&order=` | Apakah param sort sudah support |
| Quick Pay | `PATCH /api/cashflow/:id` | Apakah hanya update `payment_status` saja |
| KPI Tagihan Count | `/api/cashflow/summary` | Apakah sudah ada field `tagihan_belum_bayar_count` |

### 🔧 Perlu Dibuat (New Endpoints)

| Fitur | Endpoint | Method | Response Shape |
|---|---|---|---|
| Chart Laba Bulanan | `/api/cashflow/monthly-chart` | GET | `[{ bulan, laba }]` |
| Chart Tren Saldo | `/api/cashflow/saldo-trend` | GET | `[{ periode, saldo }]` |
| Ringkasan Hari Ini | `/api/cashflow/today-summary` | GET | `{ pemasukan, pengeluaran, saldo }` |
| Vendor Performance | `/api/cashflow/vendor-performance` | GET | `[{ vendor_id, nama, profit, is_best, is_worst }]` |
| List Vendor | `/api/vendors` | GET | `[{ id, nama, kontak }]` |
| Tambah Vendor | `/api/vendors` | POST | `{ nama, kontak }` |
| Update Vendor | `/api/vendors/:id` | PUT | — |
| Hapus Vendor | `/api/vendors/:id` | DELETE | — |
| List Kategori | `/api/categories` | GET | `[{ id, nama, tipe }]` |
| Tambah Kategori | `/api/categories` | POST | `{ nama, tipe }` |
| Update Kategori | `/api/categories/:id` | PUT | — |
| Hapus Kategori | `/api/categories/:id` | DELETE | — |
| Ekspor PDF | `/api/cashflow/export-pdf` | GET | `?type=laba-rugi\|vendor-summary` |
| Impor Excel | `/api/cashflow/import` | POST | multipart/form-data |
| Soft Delete All | `/api/cashflow/soft-delete-all` | POST | — |

---

## 9.3 Field Model — Tambah Transaksi (Complete)

Tabel ini memetakan seluruh field pada form "Tambah Transaksi" ke kolom database yang sudah ada **dan** yang mungkin perlu ditambahkan:

| Field UI | Kolom DB | Tipe | Nullable | Status |
|---|---|---|---|---|
| Tanggal Debit | `tanggal_debit` | DATE | No | ✅ Ada |
| Kredit Awal | `kredit_awal` | NUMERIC | No | ✅ Ada |
| Debit Keluar | `debit_keluar` | NUMERIC | No | ✅ Ada |
| Saldo Akhir | `saldo_akhir` | NUMERIC | No | ✅ Ada |
| Informasi Aktivitas | `aktivitas` | VARCHAR | No | ✅ Ada |
| Detail Aktivitas | `keterangan` | TEXT | Yes | ✅ Ada |
| Vendor | `nama_vendor` / `vendor_id` | VARCHAR / FK | Yes | ⚠️ Perlu cek FK |
| Kategori | `kategori` | VARCHAR | Yes | ✅ Ada |
| Grand Cost | `grand_cost` | NUMERIC | Yes | ✅ Ada |
| Grand Selling | `grand_selling` | NUMERIC | Yes | ✅ Ada |
| Profit | `profit` | NUMERIC | Yes | ✅ Ada |
| Margin % | `margin_persen` | NUMERIC | Yes | ⚠️ Perlu cek |
| T.O.P Nilai | `top_nilai` | INTEGER | Yes | ⚠️ Perlu cek |
| T.O.P Satuan | `top_satuan` | VARCHAR/ENUM | Yes | ⚠️ Perlu cek |
| Due Date | `due_date` | DATE | Yes | ⚠️ Perlu cek |
| Status Pembayaran | `payment_status` | VARCHAR/ENUM | No | ✅ Ada |
| Nomor Invoice | `nomor_invoice` | VARCHAR | Yes | ⚠️ Perlu cek |
| Nomor Kendaraan | `nomor_kendaraan` | VARCHAR | Yes | ⚠️ Perlu cek |
| Rute Asal-Tujuan | `rute` | VARCHAR | Yes | ⚠️ Perlu cek |
| Nomor PO | `nomor_po` | VARCHAR | Yes | ⚠️ Perlu cek |
| PIC | `pic` | VARCHAR | Yes | ⚠️ Perlu cek |
| Tanggal Pembayaran | `tanggal_pembayaran` | DATE | Yes | ⚠️ Perlu cek |
| Metode Pembayaran | `metode_pembayaran` | VARCHAR | Yes | ⚠️ Perlu cek |

> ⚠️ Field dengan status "Perlu cek" kemungkinan sudah ada di schema namun perlu dikonfirmasi dengan memeriksa file migration SQL dan struct Go di `services/core-go`.

---

## 9.4 Mobile-Only (Tidak Memerlukan Backend)

Beberapa fitur berjalan sepenuhnya di sisi mobile tanpa API call:

| Fitur | Mekanisme | Storage |
|---|---|---|
| PIN 6-digit | Encrypted local storage | `flutter_secure_storage` |
| Biometrik / Fingerprint | Device OS API (`local_auth`) | — |
| Nama Pengguna | Local storage / shared preferences | `shared_preferences` |
| Auto-calculate (Saldo, Profit, dll) | Computed di UI layer | — |
| Greeting dinamis | Jam device + nama dari local storage | — |
| Tanggal hari ini | Device system date | — |

---

*Lanjut: [10-rekomendasi-teknologi.md](./10-rekomendasi-teknologi.md)*
