# Cashflow Shipment App 🚚💰

A modern, high-performance web application designed to manage and track operational cash flow, shipment costs, and vendor relationships for logistics and trucking businesses. 

Built with a clean **Hexagonal Architecture** on the backend and a premium **Glassmorphism** UI on the frontend.

---

## 🌟 Key Features

- **Real-time Rolling Balance:** Automatically calculates rolling cash flow balances (Kredit, Debit, Saldo) accurately per transaction.
- **Smart Excel Import & Export:** Seamlessly migrate historical data from standard Excel files (`.xlsx`). Intelligently splits mixed rows (Top-Up vs Shipment) to maintain database integrity.
- **Vendor Management:** Built-in auto-registration for vendors from Excel and a dedicated UI to manage transport partners.
- **Dashboard Analytics:** Live summary cards displaying Current Saldo, Total Kredit (Injections), and Total Debit (Expenses).
- **Secure Authentication:** JWT-based login supporting both Email and Phone Number authentication.
- **Modern UI/UX:** Built with Next.js and Tailwind CSS featuring a dynamic, responsive, and glassmorphism-inspired design.

---

## 🛠 Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **State Management:** React Hooks & Context

### Backend
- **Language:** [Go (Golang)](https://go.dev/)
- **Router:** [go-chi/chi](https://github.com/go-chi/chi)
- **Architecture:** Hexagonal Architecture (Domain-Driven Design)
- **ORM / SQL:** [sqlx](https://github.com/jmoiron/sqlx) & [lib/pq](https://github.com/lib/pq)
- **Excel Processor:** [Excelize (v2)](https://github.com/qax-os/excelize)
- **Documentation:** Swagger (Swag)

### Infrastructure
- **Database:** PostgreSQL
- **Containerization:** Podman / Docker Compose

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Go](https://go.dev/doc/install) (v1.20 or newer)
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Podman](https://podman.io/) or Docker

### 1. Database Setup
Start the PostgreSQL database using the provided compose file:
```bash
podman-compose up -d
```
*The database will run on `localhost:5432` with user `postgres` and password `password`.*

### 2. Backend Setup
Navigate to the backend directory, install dependencies, generate swagger docs, and run the server:
```bash
cd backend
go mod tidy

# Generate Swagger Documentation
go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/api/main.go

# Run the API Server
go run cmd/api/main.go
```
*The backend API will be available at `http://localhost:8080`.*
*Swagger UI is available at `http://localhost:8080/swagger/index.html`.*

### 3. Frontend Setup
In a new terminal, navigate to the frontend directory, install dependencies, and run the development server:
```bash
cd frontend
npm install
npm run dev
```
*The frontend application will be available at `http://localhost:3000`.*

---

## 📂 Project Structure

```text
cashflow-shipment-app/
├── backend/
│   ├── cmd/api/             # Application entrypoint & HTTP Router
│   ├── docs/                # Auto-generated Swagger documentation
│   ├── internal/
│   │   ├── adapters/        # HTTP Handlers and DB Repositories (PostgreSQL)
│   │   ├── application/     # Business logic & Services
│   │   ├── core/            # Domain models and Interfaces (Ports)
│   │   └── middleware/      # JWT Authentication middleware
│   ├── pkg/                 # Utility packages (Auth, Password Hashing)
│   └── go.mod
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── app/             # Next.js App Router (Pages & Layouts)
│   │   └── components/      # Reusable React components (Tables, Modals)
│   ├── tailwind.config.ts   # Tailwind CSS configuration
│   └── package.json
├── docker-compose.yml       # Database infrastructure
└── README.md
```

---

## 📄 API Documentation
The backend includes interactive API documentation powered by Swagger. Once the backend is running, visit:
[http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html)

## 🔒 Security Notes
- Passwords are securely hashed using `bcrypt` before entering the database.
- API endpoints are protected using JWT (JSON Web Tokens).

---
*Built with best practices for scalability, maintainability, and enterprise-grade performance.*
