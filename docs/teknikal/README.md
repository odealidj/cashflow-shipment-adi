# Docs: Dokumentasi Arsitektur & Spesifikasi Teknikal

Folder ini berisi seluruh dokumen rekayasa perangkat lunak, arsitektur teknis, spesifikasi keamanan, dan panduan tata kelola teknis untuk aplikasi **Cashflow & Shipment Management System (PT. Adijayantara Logistics Indonesia)**.

---

## Daftar Dokumen Teknikal

| File Dokumen | Topik & Cakupan Teknis |
| :--- | :--- |
| 📘 **[arsitektur_teknis_sistem.md](./arsitektur_teknis_sistem.md)** | **Dokumen Arsitektur Utama**: Modular Monolith, Hexagonal Architecture (Ports & Adapters), topologi three-tier, ERD Database, Monorepo layout, katalog REST API, dan panduan DevOps. |
| 🛡️ **[panduan_lengkap_user_role_pbac_dan_bootstrap.md](./panduan_lengkap_user_role_pbac_dan_bootstrap.md)** | **Spesifikasi & Proses Bisnis PBAC Lengkap**: Tata kelola pengguna & jabatan, 5 role bawaan sistem, aturan main (3 Aturan Emas), mekanisme injeksi otomatis (*Zero-Config Auto-Bootstrap* saat server menyala), katalog 25 izin granular, dan panduan operasional. |
| 🔒 **[rbac_two_tier_session_specification.md](./rbac_two_tier_session_specification.md)** | **Arsitektur Keamanan Sesi**: Opaque Session via HttpOnly Cookie, Two-Tier Caching (L1 RAM Go `< 0.005 ms` + L2 Redis 7 In-Memory Store), payload izin lengkap, dan protokol *Instant Force Logout*. |
| 🎛️ **[dynamic_rbac_matrix_specification.md](./dynamic_rbac_matrix_specification.md)** | **Spesifikasi Matriks Hak Akses Dinamis**: Detail teknis tabel relasi PBAC (`roles`, `permissions`, `role_permissions`), kode perizinan per modul, dan integrasi middleware Go. |

---

## 🏗️ Ringkasan Komponen Teknis Inti

### 1. Hexagonal Architecture (Ports & Adapters)
- **Domain Layer (`internal/core/domain`)**: Entitas bisnis murni (`User`, `Role`, `Permission`, `CashflowEntry`, `Invoice`). Bebas dari dependensi framework/DB.
- **Ports Layer (`internal/core/ports`)**: Kontrak antarmuka (*interfaces*) untuk Repository dan Service.
- **Adapters Layer (`internal/adapters`)**:
  - Inbound (Driver): HTTP REST Handlers (Chi Router, JSON Serialization).
  - Outbound (Driven): Database Repositories (PostgreSQL via sqlx) dan Session Storage (Redis).
- **Application Services (`internal/application/services`)**: Mengorkestrasi use case bisnis, aturan tata kelola, dan transaksi database.

### 2. Keamanan & Mesin Sesi Dua Tingkat (Two-Tier Session)
```text
Browser Client (HttpOnly Cookie)
       │
       ▼
[Chi HTTP Middleware]
       │
       ├──► L1 In-Memory Cache (RAM Go, < 0.005 ms) ───► Hit: Otorisasi Berhasil
       │
       └──► L2 Redis Store (< 1 ms) ───────────────────► Hit: Isi L1 & Loloskan
```

### 3. Skema Database Relasional PBAC
- `roles`: Master data jabatan (baik bawaan sistem `is_system = true` maupun kustom).
- `permissions`: Master data 25 kode izin aksi sistem.
- `role_permissions`: Tabel relasi *many-to-many* antara role dan izin yang dipetakan.
- `users`: Data staf pengguna yang terhubung ke `roles.id`.

### 4. Zero-Config Idempotent Auto-Bootstrap
Backend secara otomatis menyuntikkan 5 role bawaan, 25 master permissions, dan pemetaan default saat pertama kali dijalankan via `main.go` tanpa intervensi manual database admin.
