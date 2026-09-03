# Adijayantara Logistics 🚚💰
### PT. Adijayantara Logistics Indonesia — Cashflow & Shipment Control System

A modern, high-performance web & mobile PWA application designed to manage and track operational cash flow, shipment costs, rolling balance, and vendor relationships for **PT. Adijayantara Logistics Indonesia**. 

Built using a **Polyglot Monorepo** structure (`apps/` & `services/`), with **Hexagonal Architecture** on the backend, **Executive Slate Desktop UI**, and a dedicated **Adijayantara Mobile PWA**.

---

## 🌟 Key Features

- **Real-time Rolling Balance (14 Kolom):** Automatically calculates rolling cash flow balances (Kredit, Debit, Saldo, Profit, Margin %, Due Date) accurately per transaction.
- **Dedicated Mobile PWA (Adijayantara PWA):** Native-like mobile experience under `/m` with 6-digit PIN Lock, scrollable Beranda, Laporan & Vendor Performance, Tagihan Overdue dengan **Quick Pay `[✓ Bayar]`**, serta form Tambah Transaksi 3-seksi ringkas.
- **Smart Device Routing:** Secara otomatis mendeteksi perangkat pengguna (membuka dari HP langsung dialihkan ke `/m`, membuka dari Laptop/PC dialihkan ke `/dashboard`).
- **Smart Excel Import & Export:** Seamlessly migrate historical data from standard Excel files (`.xlsx`). Intelligently splits mixed rows (Top-Up vs Shipment) to maintain database integrity.
- **Vendor Management & Performance:** Auto-registration for vendors from Excel and live ranking (Vendor Terbaik vs Perlu Perhatian).
- **Dashboard Analytics:** Live summary cards displaying Current Saldo, Total Kredit (Injections), Total Debit (Expenses), Total Profit, and Overdue Tagihan.
- **Secure Authentication:** JWT-based login supporting both Email and Phone Number authentication, plus Local 6-Digit PIN on Mobile.

---

## 🛠 Tech Stack & Architecture

### Applications (`apps/`)
- **`apps/web-next/`**: Next.js 16 (React 19, Tailwind CSS v4, Lucide React).
  - 💻 **Desktop Back-Office:** `/dashboard` (Data grid lebar 14 kolom, kartu metrik, manajemen vendor).
  - 📱 **Mobile PWA:** `/m` (Adijayantara PWA, standalone PWA manifest, offline service worker, touch-optimized).
- *(Roadmap)* **`apps/web-angular/`**: Admin/Enterprise portal built with Angular.
- *(Roadmap)* **`apps/mobile/`**: Mobile app native for field operators (Flutter).

### Services (`services/`)
- **`services/gateway-go/`**: Custom Go API Gateway (Single Entry Point, Dual-Routing & Auto-Rewrite, X-Request-ID, X-Idempotency-Key via Redis, Error Upstream Shield).
- **`services/core-go/`**: Core REST API & Business Logic built with [Go (Golang)](https://go.dev/) using Hexagonal Architecture, `go-chi/chi`, `pgxpool`, `sqlx`, and `Excelize`.
- *(Roadmap)* **`services/tracking-go/`**: Layanan pelacakan armada logistik dan GPS real-time.
- *(Roadmap)* **`services/engine-rust/`**: High-performance computing & background processing engine built with Rust.

### Infrastructure
- **Database:** PostgreSQL 15 (`cashflow_db`)
- **Cache & Session:** Redis 7 (`cashflow_redis` untuk L2 Session dan Idempotency Lock)
- **Containerization:** Docker Compose / Podman

---

## 🚀 Getting Started

### Prerequisites
- [Go](https://go.dev/doc/install) (v1.20 or newer)
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Docker](https://www.docker.com/) or [Podman](https://podman.io/)

### Quick Start (Using Makefile) ⚡

Sistem menyediakan berbagai opsi eksekusi yang fleksibel, baik secara lokal di Host OS (untuk kenyamanan development) maupun di dalam Docker Container (untuk keseragaman production):

#### A. Menjalankan Seluruh Sistem Secara Cepat (Rekomendasi)

```bash
# Opsi 1: Menjalankan Seluruh Backend di Docker Container
make run-all-go

# Opsi 2: Menjalankan Seluruh Backend di Host OS (Core :8081 + Gateway :8080)
make infra-up            # Nyalakan PostgreSQL & Redis
make run-local-all-go    # Nyalakan Core Go & API Gateway di Host OS

# Di Terminal Lain: Jalankan Frontend Web & Mobile PWA
make run-local-web-next
```

---

#### B. Daftar Lengkap Perintah Makefile

| Perintah Makefile | Lingkungan | Deskripsi & Fungsi |
| :--- | :---: | :--- |
| **Infrastruktur Database & Cache** | | |
| `make infra-up` | Container | Menjalankan container PostgreSQL 15 (`cashflow_db:5432`) dan Redis 7 (`cashflow_redis:6379`). |
| `make infra-down` | Container | Menghentikan dan membersihkan container infrastruktur. |
| `make infra-logs` | Container | Melihat stream log container database dan Redis secara real-time. |
| **Backend Go Services (Host OS)** | | |
| `make run-local-core-go` | Host OS | Menjalankan Core Go API secara mandiri pada port `8080` (mode standalone). |
| `make run-local-api-gateway-go` | Host OS | Menjalankan API Gateway pada port `8080` (mem-proxy request ke Core di `localhost:8081`). |
| `make run-local-all-go` | Host OS | Menjalankan Core Go (`:8081`) dan API Gateway (`:8080`) secara paralel di Host OS dengan graceful shutdown saat `Ctrl+C`. |
| **Backend Go Services (Docker Container)** | | |
| `make run-core-go` | Container | Membangun dan menjalankan Core Go API di dalam container Docker (`:8081`). |
| `make run-api-gateway-go` | Container | Membangun dan menjalankan API Gateway di dalam container Docker (`:8080`). |
| `make run-all-go` | Container | Membangun dan menjalankan seluruh stack backend (Postgres, Redis, Core Go, Gateway) di Docker. |
| **Frontend & Utilitas** | | |
| `make run-local-web-next` | Host OS | Menjalankan Next.js Web App (`/dashboard`) dan Mobile PWA (`/m`) pada port `3000`. |
| `make swagger-gen` | Host OS | Men-generate ulang spesifikasi Swagger OpenAPI (`docs/docs.go`, `swagger.json`). |
| `make generate-ui-assets` | Host OS | Meng-generate tangkapan layar komposit seluruh halaman UI mobile untuk dokumentasi. |

---

## 🌐 Akses Aplikasi

Setelah menjalankan perintah di atas, Anda dapat mengakses:

| Platform | URL | Keterangan & Kredensial Default |
|---|---|---|
| 💻 **Desktop Dashboard** | [http://localhost:3000/dashboard](http://localhost:3000/dashboard) | Email: `admin@example.com` / Password: `password123` |
| 📱 **Mobile PWA** | [http://localhost:3000/m](http://localhost:3000/m) | PIN Keamanan 6-Digit: `123456` |
| 📄 **Swagger API Docs** | [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html) | Dokumentasi interaktif REST API Go |

---

## 🔑 Default Login Credentials

### Desktop Login:
* **Email / Phone:** `admin@example.com` atau `08123456789`
* **Password:** `password123`
* **Role:** `super_admin`

### Mobile PWA PIN:
* **Default PIN:** `123456` *(dapat diubah langsung pada menu Pengaturan $\rightarrow$ Ubah PIN)*

---

## 📂 Project Structure

```text
cashflow-shipment-app/
├── apps/
│   └── web-next/            # Next.js 16 Web App & Mobile PWA
│       ├── public/          # Static assets, PWA manifest.json, sw.js, icons
│       ├── src/
│       │   ├── app/
│       │   │   ├── dashboard/   # Desktop Web App Route
│       │   │   ├── m/           # Dedicated Mobile PWA Route (CashTrack)
│       │   │   │   ├── beranda/     # Tab 1: Beranda
│       │   │   │   ├── laporan/     # Tab 2: Laporan & Performa Vendor
│       │   │   │   ├── tagihan/     # Tab 3: Tagihan Overdue & Quick Pay
│       │   │   │   ├── pengaturan/  # Tab 4: Profil, Vendor, Export, Backup
│       │   │   │   ├── pin/         # Screen Awal: PIN Lock 6-Digit
│       │   │   │   └── tambah/      # FAB Flow: Form Tambah Transaksi Ringkas
│       │   │   └── proxy.ts     # Smart device detection & redirect
│       │   ├── components/  # Desktop & Mobile UI components
│       │   └── hooks/       # useAutoCalculate, useCashflowMobile, usePinAuth
│       └── package.json
├── services/
│   ├── gateway-go/          # Custom Go API Gateway (Reverse Proxy, Idempotency, Request-ID)
│   │   ├── cmd/gateway/     # Entrypoint Gateway
│   │   ├── internal/        # Proxy router, Idempotency, Request-ID, CORS
│   │   └── Dockerfile       # Container definition
│   └── core-go/             # Golang Core API Service (Hexagonal Architecture)
│       ├── cmd/api/         # Entrypoint & HTTP Router
│       ├── migrations/      # PostgreSQL DB Migrations
│       ├── internal/        # Domain, ports, adapters
│       └── Dockerfile       # Container definition
├── docs/                    # Dokumentasi Teknis & Proses Bisnis
├── scripts/                 # Utility scripts (generate_mobile_ui_assets.py)
├── Makefile                 # 6 perintah orkestrasi service Go & utilitas
├── docker-compose.yml       # Orchestration container: Postgres, Redis, Core Go, Gateway
└── README.md
```

---

## 🔒 Security Notes
- Password akun di-hash menggunakan algoritma `bcrypt`.
- REST API dilindungi menggunakan token JWT (JSON Web Tokens).
- Akses mobile diamankan dengan PIN 6-digit lokal + sesi terisolasi.
