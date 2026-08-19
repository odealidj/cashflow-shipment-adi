# Cashflow Shipment App 🚚💰

A modern, high-performance web application designed to manage and track operational cash flow, shipment costs, and vendor relationships for logistics and trucking businesses. 

Built using a **Polyglot Monorepo** structure (`apps/` & `services/`), with **Hexagonal Architecture** on the backend and a premium **Glassmorphism** UI on the frontend.

---

## 🌟 Key Features

- **Real-time Rolling Balance:** Automatically calculates rolling cash flow balances (Kredit, Debit, Saldo) accurately per transaction.
- **Smart Excel Import & Export:** Seamlessly migrate historical data from standard Excel files (`.xlsx`). Intelligently splits mixed rows (Top-Up vs Shipment) to maintain database integrity.
- **Vendor Management:** Built-in auto-registration for vendors from Excel and a dedicated UI to manage transport partners.
- **Dashboard Analytics:** Live summary cards displaying Current Saldo, Total Kredit (Injections), and Total Debit (Expenses).
- **Secure Authentication:** JWT-based login supporting both Email and Phone Number authentication.
- **Modern UI/UX:** Built with Next.js and Tailwind CSS featuring a dynamic, responsive, and glassmorphism-inspired design.

---

## 🛠 Tech Stack & Architecture

### Applications (`apps/`)
- **`apps/web-next/`**: Web Application built with [Next.js](https://nextjs.org/) (React, Tailwind CSS, Lucide React).
- *(Roadmap)* **`apps/web-angular/`**: Admin/Enterprise portal built with Angular.
- *(Roadmap)* **`apps/mobile/`**: Mobile app for field operators (Flutter).

### Services (`services/`)
- **`services/core-go/`**: Core REST API & Business Logic built with [Go (Golang)](https://go.dev/) using Hexagonal Architecture, `go-chi/chi`, `sqlx`, and `Excelize`.
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
Anda dapat menjalankan aplikasi dengan mudah menggunakan perintah `make`:

```bash
# 1. Jalankan PostgreSQL Database (Infrastructure)
make infra-up

# 2. Jalankan Core Go Service (Terminal 1)
make run-local-core-go

# 3. Jalankan Next.js Web App (Terminal 2)
make run-local-web-next
```

---

### Manual Setup (Step-by-Step)

#### 1. Database Setup
```bash
docker-compose up -d
# atau
# podman-compose up -d
```
*The database will run on `localhost:5432` with user `cashflow_user` and database `cashflow_db`.*

#### 2. Backend Setup (`services/core-go`)
```bash
cd services/core-go
go mod tidy
go run cmd/api/main.go
```
*API: `http://localhost:8080`* | *Swagger UI: `http://localhost:8080/swagger/index.html`*

#### 3. Frontend Setup (`apps/web-next`)
```bash
cd apps/web-next
npm install
npm run dev
```
*Web App: `http://localhost:3000`*

---

## 📂 Project Structure

```text
cashflow-shipment-app/
├── apps/
│   └── web-next/            # Next.js Web App (React 19, Tailwind CSS)
│       ├── public/          # Static assets
│       ├── src/             # App Router & UI components
│       └── package.json
├── services/
│   └── core-go/             # Golang Core API Service
│       ├── cmd/api/         # Entrypoint & HTTP Router
│       ├── docs/            # Auto-generated Swagger docs
│       ├── internal/        # Hexagonal Architecture (domain, ports, adapters)
│       ├── pkg/             # Utilities (Auth, JWT, Hash)
│       └── go.mod
├── docker-compose.yml       # PostgreSQL database container configuration
├── .gitignore               # Root gitignore with monorepo patterns
└── README.md
```

---

## 📄 API Documentation
The backend includes interactive API documentation powered by Swagger. Once the backend is running, visit:  
[http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

## 🔒 Security Notes
- Passwords are securely hashed using `bcrypt`.
- API endpoints are protected using JWT (JSON Web Tokens).
