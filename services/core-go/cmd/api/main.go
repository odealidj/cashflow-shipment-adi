package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/adapters/handler"
	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
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

	// Wait briefly for DB to be ready in docker-compose setup
	time.Sleep(2 * time.Second)

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
			})
			
			// Vendor Routes
			r.Route("/vendors", func(r chi.Router) {
				r.Get("/", vendorHandler.List)
				r.Post("/", vendorHandler.Create)
				r.Get("/{id}", vendorHandler.Get)
			})
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server running on port %s\n", port)
	fmt.Printf("Swagger UI available at http://localhost:%s/swagger/index.html\n", port)
	
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
