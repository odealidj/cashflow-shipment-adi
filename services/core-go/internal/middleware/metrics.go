package middleware

import (
	"net/http"
	"regexp"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
)

var (
	idRegex   = regexp.MustCompile(`/[0-9]+(/|$)`)
	uuidRegex = regexp.MustCompile(`/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}(/|$)`)
)

func normalizePath(path string) string {
	p := uuidRegex.ReplaceAllString(path, "/{id}$1")
	p = idRegex.ReplaceAllString(p, "/{id}$1")
	return p
}

type statusCapturingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *statusCapturingResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusCapturingResponseWriter) Write(b []byte) (int, error) {
	if w.statusCode == 0 {
		w.statusCode = http.StatusOK
	}
	return w.ResponseWriter.Write(b)
}

// Metrics captures latency and status code for Core Go
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		wrapped := &statusCapturingResponseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start).Seconds()
		cleanPath := normalizePath(r.URL.Path)

		telemetry.RecordCoreRequest(r.Method, cleanPath, wrapped.statusCode, duration)
	})
}
