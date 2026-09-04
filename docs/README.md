# Dokumentasi Resmi Aplikasi
## PT. Adijayantara Logistics Indonesia — Cashflow, Shipment & Invoice System

Selamat datang di direktori dokumentasi resmi sistem aplikasi **PT. Adijayantara Logistics Indonesia**. Dokumentasi ini terbagi ke dalam kategori arsitektur teknis sistem, keamanan, dan proses bisnis logistik operasional.

---

## 📚 Indeks Dokumen

### 1. Arsitektur Teknis & Rekayasa Perangkat Lunak (`docs/teknikal/`)
| Dokumen | Deskripsi |
| :--- | :--- |
| 📁 **[Index Folder Teknikal](./teknikal/README.md)** | Halaman pengantar seluruh dokumen teknikal, arsitektur, dan keamanan. |
| 📘 **[Arsitektur Teknis Sistem](./teknikal/arsitektur_teknis_sistem.md)** | **Dokumen Utama**: Klasifikasi Modular Monolith, Hexagonal Architecture (Ports & Adapters), topologi three-tier, ERD Database, Monorepo layout, katalog REST API, dan panduan DevOps. |
| 🛡️ **[Panduan Lengkap User, Role, PBAC & Auto-Bootstrap](./teknikal/panduan_lengkap_user_role_pbac_dan_bootstrap.md)** | **Spesifikasi & Proses Bisnis Lengkap**: Tata kelola pengguna, 5 role default, peran kustom, aturan main (3 Aturan Emas), mekanisme injeksi otomatis (*Zero-Config Auto-Bootstrap*), katalog 25 izin, dan panduan operasional. |
| 🔒 **[Spesifikasi RBAC & Two-Tier Session](./teknikal/rbac_two_tier_session_specification.md)** | Arsitektur keamanan mendalam: Opaque Session via HttpOnly Cookie, Two-Tier Caching (L1 RAM Go `< 0.005 ms` + L2 Redis 7), 5 tingkat peran, dan protokol *Instant Force Logout*. |
| 🎛️ **[Spesifikasi Matriks Hak Akses Dinamis](./teknikal/dynamic_rbac_matrix_specification.md)** | Detail teknis tabel perizinan modular, permission codes, dan pemetaan endpoint API. |
| 📡 **[Standarisasi Respon API & HTTP 409 Conflict](./teknikal/standarisasi_api_response.md)** | Format baku respon REST API (`status`, `message`, `data`, `meta`, `errors`), kontrak pagination koleksi array murni, dan penanganan duplikasi key (409 Conflict). |
| 📊 **[Analisis Metrik Telemetri & Panduan Benchmark k6](./teknikal/analisis_metrik_telemetri_dan_panduan_benchmark.md)** | **Buku Panduan Observabilitas & Benchmark**: Bedah detail 5 panel dashboard, analisa metrik Connection Pool & Slow Queries, evaluasi 6 skenario k6, dan runbook mitigasi bottleneck. |

### 2. Proses Bisnis, Kalkulasi & Kasus Operasional
| Dokumen | Deskripsi |
| :--- | :--- |
| 📊 **[Proses Bisnis Cashflow & Logistik](./proses-bisnis/01-proses-bisnis-cashflow.md)** | Alur kas berjalan (*rolling cashbook*), tipe transaksi (SHIPMENT vs TOP_UP), alur import/export Excel, dan status pembayaran. |
| 🧮 **[Logika Teknis & Kalkulasi Finansial](./proses-bisnis/02-logika-teknis-kalkulasi.md)** | Formula matematika rolling saldo, *cascade recalculation*, algoritma deteksi modal baru, dan riwayat audit trail. |
| 📑 **[Contoh Data & Skenario Nyata](./proses-bisnis/03-contoh-data-skenario.md)** | Simulasi data operasional 2 bulan pengiriman, skenario penyesuaian HPP vendor, pelunasan klien, dan pengujian sistem. |

---

## 🏗️ Ringkasan Stack Teknologi

- **Frontend**: Next.js 16 (App Router, Turbopack, Tailwind CSS, Lucide Icons, Desktop & Mobile PWA `/m`)
- **Backend**: Golang 1.22+ (Chi Router, Hexagonal Clean Architecture, sqlx, excelize/v2)
- **Database**: PostgreSQL 15 (ACID Transactions, pgcrypto, Soft Deletes, Indexing)
- **Cache & Session**: Two-Tier Caching (L1 Go Process Memory + L2 Redis 7 In-Memory Store)
- **Containerization**: Podman / Docker Compose (`cashflow_db`, `cashflow_redis`)
