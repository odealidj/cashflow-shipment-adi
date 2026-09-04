package middleware

import (
	"net/http"
	"regexp"
	"time"

	"github.com/cashflow-shipment-app/gateway/internal/metrics"
)

var (
	idRegex   = regexp.MustCompile(`/[0-9]+(/|$)`)
	uuidRegex = regexp.MustCompile(`/[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}(/|$)`)
)

// normalizePath replaces dynamic IDs with {id} to prevent metric cardinality explosion in Prometheus
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

// Metrics captures request duration, status code, and increments Prometheus counters
func Metrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Don't record internal metrics endpoint itself to avoid recursion
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

		metrics.RecordRequest(r.Method, cleanPath, wrapped.statusCode, duration)
	})
}
