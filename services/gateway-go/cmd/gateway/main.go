package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/cashflow-shipment-app/gateway/internal/config"
	"github.com/cashflow-shipment-app/gateway/internal/middleware"
	"github.com/cashflow-shipment-app/gateway/internal/proxy"
	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.LoadConfig()

	log.Println("=======================================================")
	log.Println("  ADJ LOGISTICS - CUSTOM GO API GATEWAY")
	log.Println("=======================================================")
	log.Printf("  Public Port         : %s\n", cfg.Port)
	log.Printf("  Core Upstream       : %s\n", cfg.CoreServiceURL)
	log.Printf("  Tracking Upstream   : %s\n", cfg.TrackingServiceURL)
	log.Printf("  Redis Addr          : %s\n", cfg.RedisAddr)
	log.Printf("  Idempotency TTL     : %v\n", cfg.IdempotencyTTL)
	log.Println("=======================================================")

	// 1. Initialize Redis Client
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("[Warning] Redis connection failed (%v). Idempotency lock will be disabled.\n", err)
	} else {
		log.Println("[Redis] Successfully connected to Redis for Idempotency & Session caching")
	}
	cancel()

	// 2. Initialize Reverse Proxy Router
	proxyRouter, err := proxy.NewGatewayRouter(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize gateway router: %v", err)
	}

	// 3. Setup Chi Middleware Pipeline
	r := chi.NewRouter()
	r.Use(middleware.Cors())
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Idempotency(rdb, cfg.IdempotencyTTL))

	// Delegate all traffic to Gateway Reverse Proxy
	r.Mount("/", proxyRouter)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// 4. Graceful Shutdown
	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("API Gateway listening on http://localhost:%s\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-stopChan
	log.Println("Shutting down API Gateway gracefully...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Error during server shutdown: %v", err)
	}

	_ = rdb.Close()
	log.Println("API Gateway stopped.")
}
