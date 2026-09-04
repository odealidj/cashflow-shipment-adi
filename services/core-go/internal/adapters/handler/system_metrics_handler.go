package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/jmoiron/sqlx"
)

type SystemMetricsHandler struct {
	db         *sqlx.DB
	httpClient *http.Client
}

func NewSystemMetricsHandler(db *sqlx.DB) *SystemMetricsHandler {
	return &SystemMetricsHandler{
		db: db,
		httpClient: &http.Client{
			Timeout: 2 * time.Second,
		},
	}
}

type GatewayMetrics struct {
	RPS               float64 `json:"rps" example:"14.5"`
	ErrorRatePct      float64 `json:"error_rate_pct" example:"0.2"`
	P95LatencyMs      float64 `json:"p95_latency_ms" example:"18.4"`
	TotalRequests     int64   `json:"total_requests" example:"2450"`
	IdempotencyHits   int64   `json:"idempotency_hits" example:"42"`
	IdempotencyMisses int64   `json:"idempotency_misses" example:"1520"`
}

type DBPoolMetrics struct {
	Open           int     `json:"open" example:"5"`
	InUse          int     `json:"in_use" example:"2"`
	Idle           int     `json:"idle" example:"3"`
	MaxOpen        int     `json:"max_open" example:"25"`
	WaitCount      int64   `json:"wait_count" example:"0"`
	WaitDurationMs float64 `json:"wait_duration_ms" example:"0.0"`
}

type BusinessKPIMetrics struct {
	ShipmentsToday       int `json:"shipments_today" example:"34"`
	TopupsToday          int `json:"topups_today" example:"8"`
	InvoicesCreatedToday int `json:"invoices_created_today" example:"12"`
	InvoicesPaidToday    int `json:"invoices_paid_today" example:"9"`
}

type SystemMetricsResponse struct {
	PrometheusConnected bool                        `json:"prometheus_connected"`
	Gateway             GatewayMetrics              `json:"gateway"`
	DatabasePool        DBPoolMetrics               `json:"database_pool"`
	BusinessKPI         BusinessKPIMetrics          `json:"business_kpi"`
	SlowQueries         []telemetry.SlowQueryRecord `json:"slow_queries"`
	Timestamp           time.Time                   `json:"timestamp"`
}

type promQueryResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Value  []interface{}     `json:"value"` // [ timestamp, "string_value" ]
		} `json:"result"`
	} `json:"data"`
}

// GetMetrics godoc
// @Summary      Get comprehensive system telemetry & metrics
// @Description  Aggregates real-time performance indicators, gateway throughput, database connection pool health, slow query ring-buffer, and daily business KPIs.
// @Tags         system
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Success      200 {object} response.APIResponse{data=handler.SystemMetricsResponse}
// @Router       /system/metrics [get]
func (h *SystemMetricsHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Database Connection Pool Metrics
	stats := h.db.Stats()
	maxOpen := stats.MaxOpenConnections
	if maxOpen <= 0 {
		maxOpen = 25
	}
	dbPool := DBPoolMetrics{
		Open:           stats.OpenConnections,
		InUse:          stats.InUse,
		Idle:           stats.Idle,
		MaxOpen:        maxOpen,
		WaitCount:      stats.WaitCount,
		WaitDurationMs: float64(stats.WaitDuration.Microseconds()) / 1000.0,
	}

	// 2. Business KPI Metrics from PostgreSQL (today's counts)
	var kpi BusinessKPIMetrics
	_ = h.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(COUNT(CASE WHEN entry_type::text = 'SHIPMENT' AND DATE(date_of_entry) = CURRENT_DATE THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN entry_type::text = 'TOP_UP' AND DATE(date_of_entry) = CURRENT_DATE THEN 1 END), 0)
		FROM cashflow_entries
	`).Scan(&kpi.ShipmentsToday, &kpi.TopupsToday)

	_ = h.db.QueryRowContext(ctx, `
		SELECT
			COALESCE(COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END), 0),
			COALESCE(COUNT(CASE WHEN status = 'PAID' AND DATE(paid_at) = CURRENT_DATE THEN 1 END), 0)
		FROM invoices WHERE deleted_at IS NULL
	`).Scan(&kpi.InvoicesCreatedToday, &kpi.InvoicesPaidToday)

	// 3. Slow Queries from In-Memory Ring Buffer
	slowQueries := telemetry.GlobalSlowQueryTracker.GetRecent()

	// 4. Gateway & Prometheus Metrics
	gateway, promConnected := h.fetchPrometheusMetrics(ctx)

	result := SystemMetricsResponse{
		PrometheusConnected: promConnected,
		Gateway:             gateway,
		DatabasePool:        dbPool,
		BusinessKPI:         kpi,
		SlowQueries:         slowQueries,
		Timestamp:           time.Now(),
	}

	response.JSON(w, http.StatusOK, "System metrics retrieved successfully", result)
}

// SimulateSlowQuery godoc
// @Summary      Simulate a slow query for testing telemetry
// @Description  Executes a query with pg_sleep to trigger slow query alerts and ring-buffer tracking.
// @Tags         system
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        duration_ms query int false "Sleep duration in milliseconds (default: 150)" default(150)
// @Success      200 {object} response.APIResponse
// @Router       /system/simulate-slow-query [post]
func (h *SystemMetricsHandler) SimulateSlowQuery(w http.ResponseWriter, r *http.Request) {
	durationMs, _ := strconv.Atoi(r.URL.Query().Get("duration_ms"))
	if durationMs <= 0 || durationMs > 5000 {
		durationMs = 150
	}

	sleepSeconds := float64(durationMs) / 1000.0
	start := time.Now()
	var err error
	defer func() {
		telemetry.TrackQuery(
			"system_metrics_handler",
			"SimulateSlowQuery",
			fmt.Sprintf("SELECT pg_sleep(%.3f)", sleepSeconds),
			start,
			err,
		)
	}()

	query := fmt.Sprintf("SELECT pg_sleep(%.3f)", sleepSeconds)
	_, err = h.db.ExecContext(r.Context(), query)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	elapsed := time.Since(start).Seconds() * 1000.0
	response.JSON(w, http.StatusOK, fmt.Sprintf("Simulasi query lambat berhasil dieksekusi (durasi: %.1f ms)", elapsed), map[string]interface{}{
		"duration_ms": elapsed,
		"threshold":   "100ms",
		"recorded":    true,
	})
}

func (h *SystemMetricsHandler) fetchPrometheusMetrics(ctx context.Context) (GatewayMetrics, bool) {
	var metrics GatewayMetrics

	promBase := os.Getenv("PROMETHEUS_URL")
	if promBase == "" {
		// Default try localhost:9090, or prometheus:9090
		promBase = "http://localhost:9090"
	}

	// Helper to execute instant PromQL query
	queryProm := func(query string) (float64, bool) {
		reqURL := fmt.Sprintf("%s/api/v1/query?query=%s", promBase, url.QueryEscape(query))
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
		if err != nil {
			return 0, false
		}

		resp, err := h.httpClient.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			return 0, false
		}
		defer resp.Body.Close()

		var res promQueryResponse
		if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
			return 0, false
		}

		if res.Status == "success" && len(res.Data.Result) > 0 && len(res.Data.Result[0].Value) > 1 {
			if strVal, ok := res.Data.Result[0].Value[1].(string); ok {
				if f, err := strconv.ParseFloat(strVal, 64); err == nil {
					return f, true
				}
			}
		}
		return 0, true
	}

	// 1. Throughput RPS (over last 1m)
	if rps, ok := queryProm("sum(rate(gateway_http_requests_total[1m]))"); ok {
		metrics.RPS = rps
	} else {
		// Prometheus unreachable
		return metrics, false
	}

	// 2. Error Rate % (over last 1m)
	if errRate, ok := queryProm("(sum(rate(gateway_http_errors_total[1m])) / (sum(rate(gateway_http_requests_total[1m])) > 0)) * 100"); ok {
		metrics.ErrorRatePct = errRate
	}

	// 3. P95 Latency (over last 5m) in ms
	if p95, ok := queryProm("histogram_quantile(0.95, sum(rate(gateway_http_request_duration_seconds_bucket[5m])) by (le)) * 1000"); ok {
		metrics.P95LatencyMs = p95
	}

	// 4. Total Requests
	if total, ok := queryProm("sum(gateway_http_requests_total)"); ok {
		metrics.TotalRequests = int64(total)
	}

	// 5. Idempotency Hits
	if hits, ok := queryProm("gateway_idempotency_hits_total"); ok {
		metrics.IdempotencyHits = int64(hits)
	}

	// 6. Idempotency Misses
	if misses, ok := queryProm("gateway_idempotency_misses_total"); ok {
		metrics.IdempotencyMisses = int64(misses)
	}

	return metrics, true
}
