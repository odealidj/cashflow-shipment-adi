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
- **`services/core-go/`**: Core REST API & Business Logic built with [Go (Golang)](https://go.dev/) using Hexagonal Architecture, `go-chi/chi`, `pgxpool`, `sqlx`, and `Excelize`.
- *(Roadmap)* **`services/engine-rust/`**: High-performance computing & background processing engine built with Rust.

### Infrastructure
- **Database:** PostgreSQL
- **Containerization:** Docker Compose / Podman

---

## 🚀 Getting Started

### Prerequisites
- [Go](https://go.dev/doc/install) (v1.20 or newer)
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Docker](https://www.docker.com/) or [Podman](https://podman.io/)

### Quick Start (Using Makefile) ⚡
Anda dapat menjalankan aplikasi dengan 3 perintah mudah berikut:

```bash
# 1. Jalankan PostgreSQL Database (Infrastructure)
make infra-up

# 2. Jalankan Core Go Service (Terminal 1)
make run-local-core-go

# 3. Jalankan Next.js Web & Mobile PWA (Terminal 2)
make run-local-web-next
```

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
│   └── core-go/             # Golang Core API Service (Hexagonal Architecture)
│       ├── cmd/api/         # Entrypoint & HTTP Router
│       ├── migrations/      # PostgreSQL DB Migrations (cashflow_entries 14-kolom)
│       ├── internal/        # Domain, ports, adapters
│       └── go.mod
├── docs/                    # Dokumentasi Proses Bisnis & Panduan UI Mobile
├── scripts/                 # Utility scripts (generate_mobile_ui_assets.py)
├── Makefile                 # Automation shortcuts
├── docker-compose.yml       # PostgreSQL database container configuration
└── README.md
```

---

## 🔒 Security Notes
- Password akun di-hash menggunakan algoritma `bcrypt`.
- REST API dilindungi menggunakan token JWT (JSON Web Tokens).
- Akses mobile diamankan dengan PIN 6-digit lokal + sesi terisolasi.
