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
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	_ "github.com/cashflow-shipment-app/backend/docs"
)

// @title           Cashflow Shipment App API
// @version         1.0
// @description     API for managing continuous rolling cashflow for logistics/trucking.
// @termsOfService  http://swagger.io/terms/

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

func main() {
	ctx := context.Background()
	
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://cashflow_user:cashflow_password@localhost:5432/cashflow_db?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-key-for-dev-only"
	}

	// Initialize DB Pool
	dbPool, err := repository.NewDBPool(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer dbPool.Close()

	// Initialize Repositories
	userRepo := repository.NewPostgresUserRepo(dbPool)
	vendorRepo := repository.NewPostgresVendorRepo(dbPool)
	cashflowRepo := repository.NewPostgresCashflowRepo(dbPool)
	
	// Initialize Services
	authService := services.NewAuthService(userRepo, jwtSecret)
	vendorService := services.NewVendorService(vendorRepo)
	cashflowService := services.NewCashflowService(cashflowRepo, vendorService)

	// Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	vendorHandler := handler.NewVendorHandler(vendorService)
	cashflowHandler := handler.NewCashflowHandler(cashflowService)

	r := chi.NewRouter()

	// CORS Middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Global Middlewares
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)

	// Swagger Endpoint
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("http://localhost:8080/swagger/doc.json"), //The url pointing to API definition
	))

	// API Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("OK"))
		})
		
		// Auth Routes (Public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", authHandler.Login)
			r.Post("/register", authHandler.Register)
		})
		
		// Protected Routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireAuth(jwtSecret))
			
			// Cashflow Routes
			r.Route("/cashflow", func(r chi.Router) {
				r.Get("/", cashflowHandler.List)
				r.Get("/summary", cashflowHandler.GetSummary)
				r.Get("/export", cashflowHandler.ExportExcel)
				r.Post("/import", cashflowHandler.ImportExcel)
				r.Post("/shipment", cashflowHandler.CreateShipment)
				r.Post("/topup", cashflowHandler.CreateTopUp)
				r.Put("/{id}", cashflowHandler.Update)
				r.Delete("/{id}", cashflowHandler.Delete)
				r.Patch("/{id}/status", cashflowHandler.UpdateStatus)
			})
			
			// Vendor Routes
			r.Route("/vendors", func(r chi.Router) {
				r.Get("/", vendorHandler.List)
				r.Post("/", vendorHandler.Create)
				r.Get("/{id}", vendorHandler.Get)
				r.Put("/{id}", vendorHandler.Update)
				r.Delete("/{id}", vendorHandler.Delete)
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

		// Create shutdown context with 10 second timeout
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Shutdown HTTP server gracefully
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("HTTP server shutdown error: %v\n", err)
		} else {
			log.Println("HTTP server stopped gracefully.")
		}

		// Close DB connections
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

	// Wait for shutdown goroutine to complete
	<-serverCtx.Done()
	log.Println("Server gracefully stopped.")
}
