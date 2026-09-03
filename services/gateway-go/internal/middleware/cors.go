package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

func Cors() func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID", "X-Idempotency-Key", "X-API-Version"},
		ExposedHeaders:   []string{"Link", "Content-Disposition", "Set-Cookie", "X-Request-ID", "X-Cache-Lookup"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
