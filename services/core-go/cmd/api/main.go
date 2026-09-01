package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/adapters/handler"
	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

// @title         Cashflow & Shipment Management API
// @version       1.0
// @description   High Performance Backend Service for PT. Adijayantara Logistics Indonesia.
// @termsOfService http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  Apache 2.0
// @license.url   http://www.apache.org/licenses/LICENSE-2.0.html

// @host      localhost:8080
// @BasePath  /api/v1

func main() {
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

	// Initialize Redis Client
	redisClient, err := repository.NewRedisClient(ctx, redisUrl)
	if err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize Repositories
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
	userService := services.NewUserService(userRepo, sessionService)
	vendorService := services.NewVendorService(vendorRepo)
	customerService := services.NewCustomerService(customerRepo)
	activityPresetService := services.NewActivityPresetService(activityPresetRepo)
	cashflowService := services.NewCashflowService(cashflowRepo, vendorService)
	invoiceService := services.NewInvoiceService(invoiceRepo)

	// Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	vendorHandler := handler.NewVendorHandler(vendorService)
	customerHandler := handler.NewCustomerHandler(customerService)
	activityPresetHandler := handler.NewActivityPresetHandler(activityPresetService)
	cashflowHandler := handler.NewCashflowHandler(cashflowService)
	invoiceHandler := handler.NewInvoiceHandler(invoiceService)

	r := chi.NewRouter()

	// CORS Middleware (Strictly allow credentials for HttpOnly cookies)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link", "Content-Disposition", "Set-Cookie"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Global Middlewares
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// Swagger Endpoint
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("http://localhost:8080/swagger/doc.json"),
	))

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("OK"))
		})
		
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

			// User Management (Admin & Super Admin only)
			r.Route("/users", func(r chi.Router) {
				r.Use(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin))
				r.Get("/", userHandler.List)
				r.Post("/", userHandler.Create)
				r.Get("/{id}", userHandler.Get)
				r.Put("/{id}", userHandler.Update)
				r.Patch("/{id}/password", userHandler.ResetPassword)
				r.Delete("/{id}", userHandler.Delete)
			})
			
			// Cashflow Routes
			r.Route("/cashflow", func(r chi.Router) {
				r.Get("/", cashflowHandler.List)
				r.Get("/summary", cashflowHandler.GetSummary)
				r.Get("/export", cashflowHandler.ExportExcel)
				r.Post("/import", cashflowHandler.ImportExcel)
				r.Post("/shipment", cashflowHandler.CreateShipment)
				r.Post("/topup", cashflowHandler.CreateTopUp)
				r.Put("/{id}", cashflowHandler.Update)
				r.Patch("/{id}/status", cashflowHandler.UpdateStatus)
				
				// Deletion requires Admin or Super Admin
				r.With(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin)).Delete("/{id}", cashflowHandler.Delete)
			})
			
			// Vendor Routes (Mitra Armada & Transporter)
			r.Route("/vendors", func(r chi.Router) {
				r.Get("/", vendorHandler.List)
				r.Post("/", vendorHandler.Create)
				r.Get("/{id}", vendorHandler.Get)
				r.Put("/{id}", vendorHandler.Update)
				r.With(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin)).Delete("/{id}", vendorHandler.Delete)
			})

			// Customer Routes (Klien / Pemilik Muatan)
			r.Route("/customers", func(r chi.Router) {
				r.Get("/", customerHandler.List)
				r.Post("/", customerHandler.Create)
				r.Get("/{id}", customerHandler.Get)
				r.Put("/{id}", customerHandler.Update)
				r.With(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin)).Delete("/{id}", customerHandler.Delete)
			})

			// Activity Presets Routes (Master Keterangan Aktivitas & Rute Armada)
			r.Route("/activity-presets", func(r chi.Router) {
				r.Get("/", activityPresetHandler.List)
				r.Post("/", activityPresetHandler.Create)
				r.Get("/{id}", activityPresetHandler.GetByID)
				r.Put("/{id}", activityPresetHandler.Update)
				r.With(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin)).Delete("/{id}", activityPresetHandler.Delete)
			})

			// Invoice Routes (Monitoring Piutang Klien)
			r.Route("/invoices", func(r chi.Router) {
				r.Get("/", invoiceHandler.List)
				r.Get("/summary", invoiceHandler.GetSummary)
				r.Post("/", invoiceHandler.Create)
				r.Get("/{id}", invoiceHandler.GetByID)
				r.Put("/{id}", invoiceHandler.Update)
				r.Patch("/{id}/pay", invoiceHandler.MarkPaid)
				r.With(middleware.RequireRole(domain.RoleAdmin, domain.RoleSuperAdmin)).Delete("/{id}", invoiceHandler.Delete)
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
