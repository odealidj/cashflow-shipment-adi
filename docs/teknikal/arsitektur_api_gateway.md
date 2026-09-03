# Arsitektur Custom Go API Gateway (Reverse Proxy, Dual-Routing & Idempotency)

Dokumen ini menjelaskan rancangan arsitektur, mekanisme kerja, spesifikasi header, dan panduan integrasi untuk **Custom Go API Gateway** (`services/gateway-go`) pada sistem **Cashflow & Shipment Management System (PT. Adijayantara Logistics Indonesia)**.

---

## 1. Latar Belakang & Visi Arsitektur

Seiring perkembangan sistem yang akan segera menyertakan modul-modul baru (seperti modul **Tracking Armada & GPS** pada port `8082`, dan modul downstream lainnya), menempatkan API Gateway sebagai pintu gerbang tunggal (*Single Entry Point*) memberikan keuntungan:
1. **Pemisahan Peran (Decoupling)**: Frontend tidak perlu mengetahui alamat IP atau port internal masing-masing microservice backend.
2. **Evergreen Clean URL**: Frontend cukup memanggil rute `/api/cashflow`, `/api/invoices`, `/api/tracking` tanpa terikat siklus versi internal.
3. **Sentralisasi Keamanan & Tracing**: Pengecekan Idempotency, Request Tracing ID, dan proteksi kegagalan downstream dipusatkan di Gateway.

---

## 2. Diagram Alur Kerja Gateway

```
                              [ Frontend Web / Mobile PWA ]
                                             │
                                             │ HTTP Request
                                             │ (Port 8080)
                                             ▼
                             ┌───────────────────────────────┐
                             │     CUSTOM GO API GATEWAY     │
                             │      (services/gateway-go)    │
                             └───────────────┬───────────────┘
                                             │
                 ┌───────────────────────────┴───────────────────────────┐
                 │                                                       │
                 ▼                                                       ▼
  [ Middleware Pipeline ]                                  [ Redis 7 Cache ]
  - CORS Pass-through                                      - Atomic Key Lock (60s)
  - X-Request-ID Injection                                 - Response Cache (24h)
  - X-Idempotency-Key Lock & Replay
  - Dual-Routing & Auto-Rewrite
                 │
                 ├───────────────────────────────────────────────────────┐
                 │                                                       │
                 ▼ (Port 8081)                                           ▼ (Port 8082)
      ┌──────────────────────┐                                ┌──────────────────────┐
      │     CORE GO API      │                                │   TRACKING SERVICE   │
      │ (services/core-go)   │                                │(services/tracking-go)│
      │ - Cashflow & Topup   │                                │ - GPS Armada Stream  │
      │ - Invoices & Summary │                                │ - Status Perjalanan  │
      │ - Customer & Vendor  │                                └──────────────────────┘
      │ - Users & Roles      │
      └──────────────────────┘
```

---

## 3. Tiga Header Baku Gateway

### A. `X-Request-ID` (Correlation Tracing)
- **Tujuan**: Menghubungkan setiap baris log di server dengan respon yang diterima oleh browser.
- **Perilaku**: Jika client mengirim header `X-Request-ID`, Gateway akan menggunakannya. Jika kosong, Gateway otomatis men-generate ID acak unik `req-<uuid>`.
- Header ini otomatis ditempelkan ke upstream request dan client response.

### B. `X-Idempotency-Key` (Anti Transaksi Ganda)
- **Tujuan**: Mencegah request mutasi (`POST`, `PUT`, `PATCH`) dieksekusi lebih dari 1 kali akibat *double-click*, *network dropout*, atau *client retry*.
- **Alur Redis**:
  1. Gateway memeriksa `idempotency:<key>` di Redis.
  2. Jika sedang `PROCESSING` $\rightarrow$ Tolak langsung dengan **HTTP 409 Conflict**.
  3. Jika berhasil diproses downstream (2xx) $\rightarrow$ Hasil respon dicache di Redis (TTL 24 jam).
  4. Jika request dengan kunci yang sama terkirim ulang $\rightarrow$ Gateway langsung membalas dengan salinan respon cache dan menyertakan header `X-Cache-Lookup: HIT-IDEMPOTENT` tanpa menyentuh database downstream.

### C. `X-API-Version` (Dynamic Versioning & Zero Breaking Changes)
- **Tujuan**: Mengizinkan client meminta versi API tertentu tanpa harus mengubah URL endpoint.
- **Contoh**:
  - `GET /api/cashflow` tanpa header $\rightarrow$ diarahkan ke default `v1` (`/api/v1/cashflow`).
  - `GET /api/cashflow` dengan `X-API-Version: 2` $\rightarrow$ diarahkan ke `v2` (`/api/v2/cashflow`).

---

## 4. Mekanisme Dual-Routing & Auto-Rewrite

Gateway mendukung dua bentuk pemanggilan sekaligus tanpa *breaking change*:

| Format Pemanggilan di Client | Rute Asli yang Diteruskan Gateway | Target Upstream |
| :--- | :--- | :--- |
| `GET /api/cashflow` | `GET /api/v1/cashflow` (Auto-Rewrite) | Core Service (`:8081`) |
| `GET /api/v1/cashflow` | `GET /api/v1/cashflow` (Pass-through) | Core Service (`:8081`) |
| `POST /api/invoices` | `POST /api/v1/invoices` | Core Service (`:8081`) |
| `GET /api/tracking/armada` | `GET /api/v1/tracking/armada` | Tracking Service (`:8082`) |
| `GET /swagger/*` | `GET /swagger/*` | Core Service (`:8081`) |
| `GET /health` | Ditangani langsung oleh Gateway | API Gateway |

---

## 5. Panduan Operasional Makefile

Sistem menyediakan 6 perintah eksekusi terpadu:

```bash
# Menjalankan Core Go saja di Host (Port 8080)
make run-local-core-go

# Menjalankan Core Go saja di Docker (Port 8081)
make run-core-go

# Menjalankan Gateway saja di Host (Port 8080)
make run-local-api-gateway-go

# Menjalankan Gateway saja di Docker (Port 8080)
make run-api-gateway-go

# Menjalankan seluruh Go services di Host secara paralel (Core :8081 + Gateway :8080)
make run-local-all-go

# Menjalankan seluruh stack (Database, Redis, Core Go, Gateway) di Docker Container
make run-all-go
```
