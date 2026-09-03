package config

import (
	"os"
	"time"
)

type Config struct {
	Port               string
	CoreServiceURL     string
	TrackingServiceURL string
	RedisAddr          string
	RedisPassword      string
	IdempotencyTTL     time.Duration
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	coreURL := os.Getenv("CORE_SERVICE_URL")
	if coreURL == "" {
		coreURL = "http://localhost:8081"
	}

	trackingURL := os.Getenv("TRACKING_SERVICE_URL")
	if trackingURL == "" {
		trackingURL = "http://localhost:8082"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = os.Getenv("REDIS_URL")
		if redisAddr == "" {
			redisAddr = "localhost:6379"
		}
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")

	ttlStr := os.Getenv("IDEMPOTENCY_TTL")
	ttl, err := time.ParseDuration(ttlStr)
	if err != nil || ttl <= 0 {
		ttl = 24 * time.Hour
	}

	return &Config{
		Port:               port,
		CoreServiceURL:     coreURL,
		TrackingServiceURL: trackingURL,
		RedisAddr:          redisAddr,
		RedisPassword:      redisPassword,
		IdempotencyTTL:     ttl,
	}
}
