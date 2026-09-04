package metrics

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// Rate: Jumlah request per detik (RPS) dengan rincian method, path, dan status_code
	RequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gateway_http_requests_total",
			Help: "Total HTTP requests processed by API Gateway across all methods, paths, and status codes",
		},
		[]string{"method", "path", "status_code"},
	)

	// Errors: Counter khusus error (>=400, misal 4xx client errors dan 502 Bad Gateway)
	ErrorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "gateway_http_errors_total",
			Help: "Total HTTP error responses (>= 400) generated or proxied by API Gateway",
		},
		[]string{"status_code"},
	)

	// Duration: Histogram latency response per method dan path
	RequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "gateway_http_request_duration_seconds",
			Help:    "HTTP request latency histogram in seconds for API Gateway",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0},
		},
		[]string{"method", "path"},
	)

	// Idempotency Hits: Request berulang dengan key sama yang berhasil ditangkis oleh Redis lock
	IdempotencyHitsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "gateway_idempotency_hits_total",
			Help: "Total duplicate requests blocked or served from cache by Idempotency Guard",
		},
	)

	// Idempotency Misses: Request baru pertama kali yang diproses ke downstream
	IdempotencyMissesTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "gateway_idempotency_misses_total",
			Help: "Total unique initial mutation requests handled by Idempotency Guard",
		},
	)
)

// RecordRequest records rate, duration, and error metrics
func RecordRequest(method, path string, statusCode int, durationSeconds float64) {
	statusStr := strconv.Itoa(statusCode)
	RequestsTotal.WithLabelValues(method, path, statusStr).Inc()
	RequestDuration.WithLabelValues(method, path).Observe(durationSeconds)

	if statusCode >= 400 {
		ErrorsTotal.WithLabelValues(statusStr).Inc()
	}
}

// RecordIdempotencyHit increments idempotency hit counter
func RecordIdempotencyHit() {
	IdempotencyHitsTotal.Inc()
}

// RecordIdempotencyMiss increments idempotency miss counter
func RecordIdempotencyMiss() {
	IdempotencyMissesTotal.Inc()
}
