package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/cashflow-shipment-app/backend/docs"
	"github.com/cashflow-shipment-app/backend/internal/adapters/handler"
	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

// @title         Cashflow & Shipment Management API
// @version       1.0
// @description   High Performance Backend Service for PT. Adijayantara Logistics Indonesia.
// @description   Architecture & Headers:
// @description   - X-API-Version: Target API versioning (e.g. 'v1', 'v2')
// @description   - X-Idempotency-Key: Unique UUID token for safe mutations (POST/PUT/PATCH/DELETE) to prevent duplicates
// @description   - X-Request-ID: Distributed tracing correlation ID
// @termsOfService http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and the session token.

// @securityDefinitions.apikey ApiVersion
// @in header
// @name X-API-Version
// @description Target API Version Routing (e.g. v1, v2)

// @securityDefinitions.apikey IdempotencyKey
// @in header
// @name X-Idempotency-Key
// @description Unique UUID idempotency key for mutation operations (POST/PUT/PATCH/DELETE)

func loadEnvFiles() {
	envFiles := []string{".env", "../.env", "services/core-go/.env", ".env.example", "services/core-go/.env.example"}
	for _, file := range envFiles {
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				val = strings.Trim(val, `"'`)
				if os.Getenv(key) == "" {
					os.Setenv(key, val)
				}
			}
		}
	}
}

func main() {
	loadEnvFiles()
	ctx := context.Background()
	
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://cashflow_user:cashflow_password@localhost:5432/cashflow_db?sslmode=disable"
	}

	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl == "" {
		redisUrl = "localhost:6379"
	}

	// Initialize DB Pool
	dbPool, err := repository.NewDBPool(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer dbPool.Close()

	// Bind DB Connection Pool metrics to Prometheus GaugeFuncs
	telemetry.RegisterDBPoolMetrics(dbPool)

	// Initialize Redis Client
	redisClient, err := repository.NewRedisClient(ctx, redisUrl)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize Repositories
	roleRepo := repository.NewPostgresRoleRepo(dbPool)
	userRepo := repository.NewPostgresUserRepo(dbPool)
	vendorRepo := repository.NewPostgresVendorRepo(dbPool)
	customerRepo := repository.NewPostgresCustomerRepo(dbPool)
	activityPresetRepo := repository.NewPostgresActivityPresetRepo(dbPool)
	cashflowRepo := repository.NewPostgresCashflowRepo(dbPool)
	invoiceRepo := repository.NewPostgresInvoiceRepo(dbPool)
	sessionRepo := repository.NewRedisSessionRepo(redisClient)
	
	// Initialize Services (Two-Tier Session)
	sessionService := services.NewSessionService(sessionRepo)
	authService := services.NewAuthService(userRepo, sessionService)
	roleService := services.NewRoleService(roleRepo, sessionService)
	userService := services.NewUserService(userRepo, roleRepo, sessionService)
	vendorService := services.NewVendorService(vendorRepo)
	customerService := services.NewCustomerService(customerRepo)
	activityPresetService := services.NewActivityPresetService(activityPresetRepo)
	cashflowService := services.NewCashflowService(cashflowRepo, vendorService)
	invoiceService := services.NewInvoiceService(invoiceRepo)

	// 1. Auto-bootstrap System Roles and Permissions (Idempotent Zero-Config Seeding)
	if err := roleService.BootstrapSystemRolesAndPermissions(ctx); err != nil {
		log.Printf("[Warning] Gagal auto-bootstrap peran dan hak akses sistem: %v\n", err)
	} else {
		log.Println("[Bootstrap] Peran sistem & matriks izin (PBAC) berhasil diinisialisasi secara otomatis")
	}

	// 2. Auto-bootstrap Super Admin IT account from Environment Variables if not present
	superAdminEmail := os.Getenv("SUPERADMIN_EMAIL")
	if superAdminEmail == "" {
		superAdminEmail = "admin@example.com"
	}
	superAdminPassword := os.Getenv("SUPERADMIN_PASSWORD")
	if superAdminPassword == "" {
		superAdminPassword = "password123"
	}
	superAdminName := os.Getenv("SUPERADMIN_NAME")
	if superAdminName == "" {
		superAdminName = "IT Super Admin"
	}
	superAdminPhone := os.Getenv("SUPERADMIN_PHONE")
	if superAdminPhone == "" {
		superAdminPhone = "08123456789"
	}

	if err := authService.BootstrapSuperAdmin(ctx, superAdminEmail, superAdminPassword, superAdminName, superAdminPhone); err != nil {
		log.Printf("[Warning] Failed to auto-bootstrap Super Admin: %v\n", err)
	}

	// Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	roleHandler := handler.NewRoleHandler(roleService)
	userHandler := handler.NewUserHandler(userService)
	vendorHandler := handler.NewVendorHandler(vendorService)
	customerHandler := handler.NewCustomerHandler(customerService)
	activityPresetHandler := handler.NewActivityPresetHandler(activityPresetService)
	cashflowHandler := handler.NewCashflowHandler(cashflowService)
	invoiceHandler := handler.NewInvoiceHandler(invoiceService)
	utilityHandler := handler.NewUtilityHandler()
	startTime := time.Now()
	systemMetricsHandler := handler.NewSystemMetricsHandler(dbPool, redisClient, startTime)

	r := chi.NewRouter()

	// CORS Middleware (Strictly allow credentials for HttpOnly cookies)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID", "X-Idempotency-Key", "X-API-Version"},
		ExposedHeaders:   []string{"Link", "Content-Disposition", "Set-Cookie", "X-Request-ID", "X-Cache-Lookup"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Global Middlewares
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Metrics)

	// Prometheus Metrics Scrape Endpoint
	r.Handle("/metrics", promhttp.Handler())

	// Swagger Endpoint
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("OK"))
		})

		// Utility Routes (Public)
		r.Get("/utility/idempotency-key", utilityHandler.GenerateIdempotencyKey)
		r.Get("/idempotency-key", utilityHandler.GenerateIdempotencyKey)
		
		// Auth Routes (Public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout)
			r.Post("/register", authHandler.Register)
		})
		
		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(sessionService))
			
			// Profile & Current Session Info
			r.Get("/auth/me", authHandler.Me)

			// Role & Permission Management (PBAC)
			r.Route("/roles", func(r chi.Router) {
				r.Use(middleware.RequirePermission("roles.view"))
				r.Get("/", roleHandler.List)
				r.Get("/permissions", roleHandler.ListPermissions)
				r.Get("/{id}", roleHandler.Get)

				// Managing roles requires roles.manage
				r.With(middleware.RequirePermission("roles.manage")).Post("/", roleHandler.Create)
				r.With(middleware.RequirePermission("roles.manage")).Put("/{id}", roleHandler.Update)
				r.With(middleware.RequirePermission("roles.manage")).Delete("/{id}", roleHandler.Delete)
				r.With(middleware.RequirePermission("roles.manage")).Put("/{id}/permissions", roleHandler.UpdatePermissions)
			})

			// User Management
			r.Route("/users", func(r chi.Router) {
				r.Use(middleware.RequirePermission("users.view"))
				r.Get("/", userHandler.List)
				r.With(middleware.RequirePermission("users.create")).Post("/", userHandler.Create)
				r.Get("/{id}", userHandler.Get)
				r.With(middleware.RequirePermission("users.edit")).Put("/{id}", userHandler.Update)
				r.With(middleware.RequirePermission("users.reset_password")).Patch("/{id}/password", userHandler.ResetPassword)
				r.With(middleware.RequirePermission("users.delete")).Delete("/{id}", userHandler.Delete)
			})
			
			// Cashflow Routes
			r.Route("/cashflow", func(r chi.Router) {
				r.Use(middleware.RequirePermission("cashflow.view"))
				r.Get("/", cashflowHandler.List)
				r.Get("/summary", cashflowHandler.GetSummary)
				r.With(middleware.RequirePermission("cashflow.export")).Get("/export", cashflowHandler.ExportExcel)
				r.With(middleware.RequirePermission("cashflow.import")).Post("/import", cashflowHandler.ImportExcel)
				r.With(middleware.RequirePermission("cashflow.create")).Post("/shipment", cashflowHandler.CreateShipment)
				r.With(middleware.RequirePermission("cashflow.create")).Post("/topup", cashflowHandler.CreateTopUp)
				r.With(middleware.RequirePermission("cashflow.edit")).Put("/{id}", cashflowHandler.Update)
				r.With(middleware.RequirePermission("cashflow.edit")).Patch("/{id}/status", cashflowHandler.UpdateStatus)
				r.With(middleware.RequirePermission("cashflow.delete")).Delete("/{id}", cashflowHandler.Delete)
			})
			
			// Vendor Routes (Mitra Armada & Transporter)
			r.Route("/vendors", func(r chi.Router) {
				r.Use(middleware.RequirePermission("vendors.view"))
				r.Get("/", vendorHandler.List)
				r.With(middleware.RequirePermission("vendors.manage")).Post("/", vendorHandler.Create)
				r.Get("/{id}", vendorHandler.Get)
				r.With(middleware.RequirePermission("vendors.manage")).Put("/{id}", vendorHandler.Update)
				r.With(middleware.RequirePermission("vendors.manage")).Delete("/{id}", vendorHandler.Delete)
			})

			// Customer Routes (Klien / Pemilik Muatan)
			r.Route("/customers", func(r chi.Router) {
				r.Use(middleware.RequirePermission("customers.view"))
				r.Get("/", customerHandler.List)
				r.With(middleware.RequirePermission("customers.manage")).Post("/", customerHandler.Create)
				r.Get("/{id}", customerHandler.Get)
				r.With(middleware.RequirePermission("customers.manage")).Put("/{id}", customerHandler.Update)
				r.With(middleware.RequirePermission("customers.manage")).Delete("/{id}", customerHandler.Delete)
			})

			// Activity Presets Routes (Master Keterangan Aktivitas & Rute Armada)
			r.Route("/activity-presets", func(r chi.Router) {
				r.Use(middleware.RequirePermission("presets.view"))
				r.Get("/", activityPresetHandler.List)
				r.With(middleware.RequirePermission("presets.manage")).Post("/", activityPresetHandler.Create)
				r.Get("/{id}", activityPresetHandler.GetByID)
				r.With(middleware.RequirePermission("presets.manage")).Put("/{id}", activityPresetHandler.Update)
				r.With(middleware.RequirePermission("presets.manage")).Delete("/{id}", activityPresetHandler.Delete)
			})

			// Invoice Routes (Monitoring Piutang Klien)
			r.Route("/invoices", func(r chi.Router) {
				r.Use(middleware.RequirePermission("invoices.view"))
				r.Get("/", invoiceHandler.List)
				r.Get("/summary", invoiceHandler.GetSummary)
				r.With(middleware.RequirePermission("invoices.create")).Post("/", invoiceHandler.Create)
				r.Get("/{id}", invoiceHandler.GetByID)
				r.With(middleware.RequirePermission("invoices.edit")).Put("/{id}", invoiceHandler.Update)
				r.With(middleware.RequirePermission("invoices.mark_paid")).Patch("/{id}/pay", invoiceHandler.MarkPaid)
				r.With(middleware.RequirePermission("invoices.delete")).Delete("/{id}", invoiceHandler.Delete)
			})

			// System Metrics & Telemetry (PBAC Protected)
			r.Route("/system", func(r chi.Router) {
				r.Use(middleware.RequirePermission("system.view"))
				r.Get("/metrics", systemMetricsHandler.GetMetrics)
				r.Post("/simulate-slow-query", systemMetricsHandler.SimulateSlowQuery)
			})
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Server run context for graceful shutdown
	serverCtx, stopServer := context.WithCancel(context.Background())

	// Listen for OS signals for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		sig := <-sigChan
		log.Printf("Received shutdown signal (%v). Initiating graceful shutdown...\n", sig)

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP server shutdown error: %v\n", err)
		} else {
			log.Println("HTTP server stopped gracefully.")
		}

		if err := dbPool.Close(); err != nil {
			log.Printf("Database connection close error: %v\n", err)
		} else {
			log.Println("Database connection pool closed successfully.")
		}

		stopServer()
	}()

	fmt.Printf("Server running on port %s\n", port)
	fmt.Printf("Swagger UI available at http://localhost:%s/swagger/index.html\n", port)

	// Run the server
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("Server failed to start: %v", err)
	}

	<-serverCtx.Done()
	log.Println("Server gracefully stopped.")
}
