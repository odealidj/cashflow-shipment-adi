package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

const (
	redisBenchmarkStatusKey = "benchmark:status"
	redisBenchmarkHistoryKey = "benchmark:history"
	redisBenchmarkLockKey   = "benchmark:lock"
	maxStoredReports        = 10
)

type BenchmarkHandler struct {
	redisClient   *redis.Client
	db            *sqlx.DB
	workspaceRoot string
	cancelsMutex  sync.Mutex
	activeCancels map[string]context.CancelFunc
}

func NewBenchmarkHandler(redisClient *redis.Client, db *sqlx.DB, workspaceRoot string) *BenchmarkHandler {
	if workspaceRoot == "" {
		// Default: search up for tests/k6 or current working dir
		if _, err := os.Stat("tests/k6"); err == nil {
			workspaceRoot = "."
		} else if _, err := os.Stat("../../tests/k6"); err == nil {
			workspaceRoot = "../.."
		} else {
			workspaceRoot = "."
		}
	}
	return &BenchmarkHandler{
		redisClient:   redisClient,
		db:            db,
		workspaceRoot: workspaceRoot,
		activeCancels: make(map[string]context.CancelFunc),
	}
}

// Request & Model Structs
type BenchmarkStartRequest struct {
	Scenario string `json:"scenario" example:"smoke"` // smoke, load, idempotency, stress, spike, soak
}

type BenchmarkCheck struct {
	Name    string `json:"name"`
	Passes  int64  `json:"passes"`
	Fails   int64  `json:"fails"`
	Success bool   `json:"success"`
}

type DatabaseBenchmarkAnalysis struct {
	PoolMaxOpen        int     `json:"pool_max_open"`
	PeakInUse          int     `json:"peak_in_use"`
	PeakUtilizationPct float64 `json:"peak_utilization_pct"`
	WaitCountDelta     int64   `json:"wait_count_delta"`
	WaitDurationMs     float64 `json:"wait_duration_ms"`
	SlowQueriesCount   int     `json:"slow_queries_count"`
	DBVerdict          string  `json:"db_verdict"` // SEHAT, WASPADA, BOTTLENECK
	DBRecommendation   string  `json:"db_recommendation"`
}

type ExecutiveSummary struct {
	VerdictStatus   string   `json:"verdict_status"` // EXCELLENT, GOOD, WARNING, CRITICAL
	VerdictTitle    string   `json:"verdict_title"`
	KeyFindings     []string `json:"key_findings"`
	Recommendations []string `json:"recommendations"`
}

type BenchmarkReport struct {
	JobID            string                    `json:"job_id"`
	Scenario         string                    `json:"scenario"`
	ScenarioLabel    string                    `json:"scenario_label"`
	Timestamp        string                    `json:"timestamp"`
	VUs              int                       `json:"vus"`
	Duration         string                    `json:"duration"`
	TotalRequests    int64                     `json:"total_requests"`
	RPS              float64                   `json:"rps"`
	SuccessRatePct   float64                   `json:"success_rate_pct"`
	FailedRequests   int64                     `json:"failed_requests"`
	LatencyMinMs     float64                   `json:"latency_min_ms"`
	LatencyMedMs     float64                   `json:"latency_med_ms"`
	LatencyAvgMs     float64                   `json:"latency_avg_ms"`
	LatencyP90Ms     float64                   `json:"latency_p90_ms"`
	LatencyP95Ms     float64                   `json:"latency_p95_ms"`
	LatencyP99Ms     float64                   `json:"latency_p99_ms"`
	LatencyMaxMs     float64                   `json:"latency_max_ms"`
	DataReceivedKB   float64                   `json:"data_received_kb"`
	DataSentKB       float64                   `json:"data_sent_kb"`
	Checks           []BenchmarkCheck          `json:"checks"`
	DatabaseAnalysis DatabaseBenchmarkAnalysis `json:"database_analysis"`
	Summary          ExecutiveSummary          `json:"summary"`
}

type BenchmarkJobStatus struct {
	JobID                string           `json:"job_id"`
	Scenario             string           `json:"scenario"`
	ScenarioLabel        string           `json:"scenario_label"`
	Status               string           `json:"status"` // IDLE, RUNNING, COMPLETED, ABORTED, FAILED
	StartedAt            string           `json:"started_at"`
	EstimatedDurationSec int              `json:"estimated_duration_sec"`
	ElapsedSec           int              `json:"elapsed_sec"`
	ProgressPct          int              `json:"progress_pct"`
	ErrorMessage         string           `json:"error_message,omitempty"`
	LatestResult         *BenchmarkReport `json:"latest_result,omitempty"`
}

// Map scenario metadata
type scenarioMeta struct {
	label       string
	scriptPath  string
	defaultVUs  int
	durationSec int
}

func getScenarioMeta(scenario string) (scenarioMeta, bool) {
	metas := map[string]scenarioMeta{
		"smoke": {
			label:       "Smoke Test (5 VUs, 5s)",
			scriptPath:  "tests/k6/scenarios/01_smoke_test.js",
			defaultVUs:  5,
			durationSec: 5,
		},
		"load": {
			label:       "Average Load Test (50 VUs, 20s)",
			scriptPath:  "tests/k6/scenarios/02_load_test.js",
			defaultVUs:  50,
			durationSec: 20,
		},
		"idempotency": {
			label:       "Idempotency Burst Concurrency (30 VUs, 3s)",
			scriptPath:  "tests/k6/scenarios/03_idempotency_burst.js",
			defaultVUs:  30,
			durationSec: 3,
		},
		"stress": {
			label:       "Heavy Stress Test (200 VUs, 35s)",
			scriptPath:  "tests/k6/scenarios/04_stress_test.js",
			defaultVUs:  200,
			durationSec: 35,
		},
		"spike": {
			label:       "Instant Spike Test (160 VUs, 12s)",
			scriptPath:  "tests/k6/scenarios/05_spike_test.js",
			defaultVUs:  160,
			durationSec: 12,
		},
		"soak": {
			label:       "Soak / Endurance Test (30 VUs, 60s)",
			scriptPath:  "tests/k6/scenarios/06_soak_test.js",
			defaultVUs:  30,
			durationSec: 60,
		},
	}

	m, ok := metas[scenario]
	return m, ok
}

// StartBenchmark initiates an async background benchmark job
// @Summary Memulai Uji Beban k6 Latar Belakang (Async)
// @Tags System
// @Accept json
// @Produce json
// @Param request body BenchmarkStartRequest true "Pilihan Skenario Uji Beban"
// @Success 202 {object} response.APIResponse{data=BenchmarkJobStatus}
// @Router /api/v1/system/benchmark/start [post]
func (h *BenchmarkHandler) StartBenchmark(w http.ResponseWriter, r *http.Request) {
	var req BenchmarkStartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	meta, ok := getScenarioMeta(req.Scenario)
	if !ok {
		response.Error(w, http.StatusBadRequest, "Skenario tidak dikenal. Pilihan: smoke, load, idempotency, stress, spike, soak")
		return
	}

	ctx := r.Context()
	// Atomic Redis Lock
	locked, err := h.redisClient.SetNX(ctx, redisBenchmarkLockKey, "1", time.Duration(meta.durationSec+30)*time.Second).Result()
	if err != nil || !locked {
		response.Error(w, http.StatusConflict, "Pengujian beban sedang berjalan. Harap tunggu hingga selesai.")
		return
	}

	jobID := fmt.Sprintf("bench_%d", time.Now().Unix())
	nowStr := time.Now().Format(time.RFC3339)

	initialStatus := BenchmarkJobStatus{
		JobID:                jobID,
		Scenario:             req.Scenario,
		ScenarioLabel:        meta.label,
		Status:               "RUNNING",
		StartedAt:            nowStr,
		EstimatedDurationSec: meta.durationSec,
		ElapsedSec:           0,
		ProgressPct:          0,
	}

	// Simpan initial status di Redis
	statusBytes, _ := json.Marshal(initialStatus)
	_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, statusBytes, 24*time.Hour).Err()

	// Capture client authorization header to pass to k6
	authHeader := r.Header.Get("Authorization")

	// Create cancelable context for background job
	jobCtx, cancel := context.WithCancel(context.Background())
	h.cancelsMutex.Lock()
	h.activeCancels[jobID] = cancel
	h.cancelsMutex.Unlock()

	// Launch background Goroutine
	go h.executeBenchmarkAsync(jobCtx, jobID, req.Scenario, meta, authHeader)

	// Return 202 Accepted immediately
	response.JSON(w, http.StatusAccepted, fmt.Sprintf("Pengujian '%s' telah dimulai di latar belakang", meta.label), initialStatus)
}

// GetBenchmarkStatus returns the current live status or latest completed result
// @Summary Ambil Status Terkini Uji Beban k6
// @Tags System
// @Produce json
// @Success 200 {object} response.APIResponse{data=BenchmarkJobStatus}
// @Router /api/v1/system/benchmark/status [get]
func (h *BenchmarkHandler) GetBenchmarkStatus(w http.ResponseWriter, r *http.Request) {
	val, err := h.redisClient.Get(r.Context(), redisBenchmarkStatusKey).Result()
	if err != nil || val == "" {
		response.JSON(w, http.StatusOK, "Belum ada pengujian yang dijalankan", BenchmarkJobStatus{
			Status: "IDLE",
		})
		return
	}

	var status BenchmarkJobStatus
	if err := json.Unmarshal([]byte(val), &status); err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memproses data status")
		return
	}

	response.JSON(w, http.StatusOK, "Status pengujian berhasil diambil", status)
}

// AbortBenchmark cancels an actively running benchmark job
// @Summary Hentikan Pengujian Beban yang Sedang Berjalan (Emergency Stop)
// @Tags System
// @Produce json
// @Success 200 {object} response.APIResponse
// @Router /api/v1/system/benchmark/abort [post]
func (h *BenchmarkHandler) AbortBenchmark(w http.ResponseWriter, r *http.Request) {
	h.cancelsMutex.Lock()
	defer h.cancelsMutex.Unlock()

	ctx := r.Context()
	for jobID, cancel := range h.activeCancels {
		cancel()
		delete(h.activeCancels, jobID)
	}

	_ = h.redisClient.Del(ctx, redisBenchmarkLockKey).Err()

	// Update status to ABORTED
	val, err := h.redisClient.Get(ctx, redisBenchmarkStatusKey).Result()
	if err == nil && val != "" {
		var status BenchmarkJobStatus
		if err := json.Unmarshal([]byte(val), &status); err == nil {
			status.Status = "ABORTED"
			status.ErrorMessage = "Pengujian dihentikan secara manual oleh Admin (Emergency Abort)"
			bytes, _ := json.Marshal(status)
			_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, bytes, 24*time.Hour).Err()
		}
	}

	response.JSON(w, http.StatusOK, "Pengujian berhasil dihentikan secara darurat", nil)
}

// GetBenchmarkHistory returns the last 10 benchmark reports
// @Summary Ambil Riwayat 10 Pengujian Terakhir
// @Tags System
// @Produce json
// @Success 200 {object} response.APIResponse{data=[]BenchmarkReport}
// @Router /api/v1/system/benchmark/history [get]
func (h *BenchmarkHandler) GetBenchmarkHistory(w http.ResponseWriter, r *http.Request) {
	val, err := h.redisClient.Get(r.Context(), redisBenchmarkHistoryKey).Result()
	if err != nil || val == "" {
		response.JSON(w, http.StatusOK, "Riwayat kosong", []BenchmarkReport{})
		return
	}

	var history []BenchmarkReport
	if err := json.Unmarshal([]byte(val), &history); err != nil {
		response.JSON(w, http.StatusOK, "Riwayat kosong", []BenchmarkReport{})
		return
	}

	response.JSON(w, http.StatusOK, "Riwayat pengujian berhasil diambil", history)
}

// DownloadBenchmarkReport downloads the report as Markdown with full glossary
// @Summary Unduh Laporan Lengkap Pengujian Beban k6
// @Tags System
// @Produce octet-stream
// @Param id query string false "Job ID pengujian (default: hasil terakhir)"
// @Router /api/v1/system/benchmark/download [get]
func (h *BenchmarkHandler) DownloadBenchmarkReport(w http.ResponseWriter, r *http.Request) {
	jobID := r.URL.Query().Get("id")

	var report *BenchmarkReport

	// Cari di history Redis atau file
	val, err := h.redisClient.Get(r.Context(), redisBenchmarkHistoryKey).Result()
	if err == nil && val != "" {
		var history []BenchmarkReport
		_ = json.Unmarshal([]byte(val), &history)
		for _, rep := range history {
			if jobID == "" || rep.JobID == jobID {
				rCopy := rep
				report = &rCopy
				break
			}
		}
	}

	// Fallback ke latest_result
	if report == nil {
		statusVal, _ := h.redisClient.Get(r.Context(), redisBenchmarkStatusKey).Result()
		if statusVal != "" {
			var st BenchmarkJobStatus
			_ = json.Unmarshal([]byte(statusVal), &st)
			if st.LatestResult != nil {
				report = st.LatestResult
			}
		}
	}

	if report == nil {
		http.Error(w, "Laporan pengujian tidak ditemukan", http.StatusNotFound)
		return
	}

	mdContent := generateMarkdownReport(report)

	filename := fmt.Sprintf("laporan_k6_%s_%s.md", report.Scenario, report.JobID)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(mdContent))
}

// Internal Background Execution
func (h *BenchmarkHandler) executeBenchmarkAsync(ctx context.Context, jobID, scenario string, meta scenarioMeta, authHeader string) {
	defer func() {
		h.cancelsMutex.Lock()
		delete(h.activeCancels, jobID)
		h.cancelsMutex.Unlock()
		_ = h.redisClient.Del(context.Background(), redisBenchmarkLockKey).Err()
	}()

	reportsDir := filepath.Join(h.workspaceRoot, "tests/k6/reports")
	_ = os.MkdirAll(reportsDir, 0755)

	summaryExportPath := filepath.Join(reportsDir, fmt.Sprintf("report_%s.json", jobID))

	// Resolve script path
	scriptAbsPath := filepath.Join(h.workspaceRoot, meta.scriptPath)
	if _, err := os.Stat(scriptAbsPath); err != nil {
		log.Printf("[Benchmark Error] Script tidak ditemukan: %s", scriptAbsPath)
		h.updateStatusFailed(jobID, fmt.Sprintf("Script pengujian '%s' tidak ditemukan", meta.scriptPath))
		return
	}

	// Ticker for progress update
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	startTime := time.Now()
	doneChan := make(chan error, 1)

	// Snapshot initial DB connection stats
	var startWaitCount int64
	var startWaitDuration time.Duration
	var peakInUse int
	var poolMaxOpen int = 25
	if h.db != nil {
		stats := h.db.Stats()
		startWaitCount = stats.WaitCount
		startWaitDuration = stats.WaitDuration
		peakInUse = stats.InUse
		poolMaxOpen = stats.MaxOpenConnections
		if poolMaxOpen <= 0 {
			poolMaxOpen = 25
		}
	}

	// Build k6 command
	// Default target URL is local API Gateway
	targetURL := "http://localhost:8080"
	if envURL := os.Getenv("GATEWAY_PUBLIC_URL"); envURL != "" {
		targetURL = envURL
	}

	args := []string{
		"run",
		scriptAbsPath,
		"--summary-export=" + summaryExportPath,
		"-e", "TARGET_URL=" + targetURL,
		"-e", fmt.Sprintf("VUS=%d", meta.defaultVUs),
		"-e", fmt.Sprintf("DURATION=%ds", meta.durationSec),
	}
	if authHeader != "" {
		args = append(args, "-e", "AUTH_TOKEN="+authHeader)
	}

	// Check if k6 is in PATH, otherwise use docker-compose exec
	k6Binary := "k6"
	if _, err := exec.LookPath("k6"); err != nil {
		// Try docker-compose exec k6
		k6Binary = "docker-compose"
		containerScriptPath := "/scripts/scenarios/" + filepath.Base(meta.scriptPath)
		containerExportPath := "/scripts/reports/" + filepath.Base(summaryExportPath)
		args = []string{
			"exec", "-T", "k6", "k6", "run", containerScriptPath,
			"--summary-export=" + containerExportPath,
			"-e", "TARGET_URL=http://host.docker.internal:8080",
			"-e", fmt.Sprintf("VUS=%d", meta.defaultVUs),
			"-e", fmt.Sprintf("DURATION=%ds", meta.durationSec),
		}
		if authHeader != "" {
			args = append(args, "-e", "AUTH_TOKEN="+authHeader)
		}
	}

	cmd := exec.CommandContext(ctx, k6Binary, args...)

	go func() {
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[Benchmark Exec Output]: %s", string(output))
		}
		doneChan <- err
	}()

	// Loop ticker progress
	for {
		select {
		case <-ctx.Done():
			log.Printf("[Benchmark] Job %s dibatalkan (Abort)", jobID)
			h.updateStatusAborted(jobID)
			return
		case err := <-doneChan:
			if ctx.Err() != nil {
				h.updateStatusAborted(jobID)
				return
			}
			if err != nil {
				log.Printf("[Benchmark Warning] k6 exit with error/threshold: %v", err)
			}
			h.processCompletedBenchmark(jobID, scenario, meta, summaryExportPath, startTime, startWaitCount, startWaitDuration, peakInUse, poolMaxOpen)
			return
		case <-ticker.C:
			if h.db != nil {
				curInUse := h.db.Stats().InUse
				if curInUse > peakInUse {
					peakInUse = curInUse
				}
			}
			elapsed := int(time.Since(startTime).Seconds())
			progress := int(float64(elapsed) / float64(meta.durationSec) * 100)
			if progress > 98 {
				progress = 98 // Hold at 98% until parsing finishes
			}
			h.updateStatusProgress(jobID, elapsed, progress)
		}
	}
}

func (h *BenchmarkHandler) updateStatusProgress(jobID string, elapsed, progress int) {
	ctx := context.Background()
	val, err := h.redisClient.Get(ctx, redisBenchmarkStatusKey).Result()
	if err == nil && val != "" {
		var status BenchmarkJobStatus
		if err := json.Unmarshal([]byte(val), &status); err == nil && status.JobID == jobID {
			status.ElapsedSec = elapsed
			status.ProgressPct = progress
			b, _ := json.Marshal(status)
			_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, b, 24*time.Hour).Err()
		}
	}
}

func (h *BenchmarkHandler) updateStatusAborted(jobID string) {
	ctx := context.Background()
	val, err := h.redisClient.Get(ctx, redisBenchmarkStatusKey).Result()
	if err == nil && val != "" {
		var status BenchmarkJobStatus
		if err := json.Unmarshal([]byte(val), &status); err == nil && status.JobID == jobID {
			status.Status = "ABORTED"
			status.ErrorMessage = "Pengujian dihentikan secara manual oleh Admin (Emergency Abort)"
			b, _ := json.Marshal(status)
			_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, b, 24*time.Hour).Err()
		}
	}
}

func (h *BenchmarkHandler) updateStatusFailed(jobID, msg string) {
	ctx := context.Background()
	status := BenchmarkJobStatus{
		JobID:        jobID,
		Status:       "FAILED",
		ErrorMessage: msg,
	}
	b, _ := json.Marshal(status)
	_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, b, 24*time.Hour).Err()
}

// Process raw k6 summary JSON into a rich BenchmarkReport
func (h *BenchmarkHandler) processCompletedBenchmark(jobID, scenario string, meta scenarioMeta, summaryFile string, startTime time.Time, startWaitCount int64, startWaitDuration time.Duration, peakInUse, poolMaxOpen int) {
	data, err := os.ReadFile(summaryFile)
	if err != nil {
		h.updateStatusFailed(jobID, fmt.Sprintf("Gagal membaca file hasil k6: %v", err))
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		h.updateStatusFailed(jobID, fmt.Sprintf("Format JSON k6 tidak valid: %v", err))
		return
	}

	report := BenchmarkReport{
		JobID:         jobID,
		Scenario:      scenario,
		ScenarioLabel: meta.label,
		Timestamp:     time.Now().Format("2006-01-02 15:04:05"),
		VUs:           meta.defaultVUs,
		Duration:      fmt.Sprintf("%ds", meta.durationSec),
	}

	metrics, _ := raw["metrics"].(map[string]interface{})

	// Parse http_reqs
	if reqs, ok := metrics["http_reqs"].(map[string]interface{}); ok {
		report.TotalRequests = getInt64(reqs["count"])
		report.RPS = getFloat64(reqs["rate"])
	}

	// Parse http_req_failed
	if failed, ok := metrics["http_req_failed"].(map[string]interface{}); ok {
		report.FailedRequests = getInt64(failed["passes"])
		failureRate := getFloat64(failed["value"])
		report.SuccessRatePct = (1.0 - failureRate) * 100.0
		if report.SuccessRatePct < 0 {
			report.SuccessRatePct = 0
		}
	} else {
		report.SuccessRatePct = 100.0
	}

	// Parse http_req_duration
	if dur, ok := metrics["http_req_duration"].(map[string]interface{}); ok {
		report.LatencyMinMs = getFloat64(dur["min"])
		report.LatencyMedMs = getFloat64(dur["med"])
		report.LatencyAvgMs = getFloat64(dur["avg"])
		report.LatencyP90Ms = getFloat64(dur["p(90)"])
		report.LatencyP95Ms = getFloat64(dur["p(95)"])
		report.LatencyMaxMs = getFloat64(dur["max"])
		if p99, exists := dur["p(99)"]; exists {
			report.LatencyP99Ms = getFloat64(p99)
		} else {
			report.LatencyP99Ms = report.LatencyMaxMs
		}
	}

	// Parse network data
	if rec, ok := metrics["data_received"].(map[string]interface{}); ok {
		report.DataReceivedKB = getFloat64(rec["count"]) / 1024.0
	}
	if sent, ok := metrics["data_sent"].(map[string]interface{}); ok {
		report.DataSentKB = getFloat64(sent["count"]) / 1024.0
	}

	// Parse checks
	if rootGroup, ok := raw["root_group"].(map[string]interface{}); ok {
		if checksMap, ok := rootGroup["checks"].(map[string]interface{}); ok {
			for name, chkData := range checksMap {
				if chk, ok := chkData.(map[string]interface{}); ok {
					passes := getInt64(chk["passes"])
					fails := getInt64(chk["fails"])
					report.Checks = append(report.Checks, BenchmarkCheck{
						Name:    name,
						Passes:  passes,
						Fails:   fails,
						Success: fails == 0,
					})
				}
			}
		}
	}

	// Database impact analysis during benchmark
	var waitCountDelta int64
	var waitDurationMs float64
	if h.db != nil {
		finalStats := h.db.Stats()
		if finalStats.InUse > peakInUse {
			peakInUse = finalStats.InUse
		}
		if finalStats.WaitCount >= startWaitCount {
			waitCountDelta = finalStats.WaitCount - startWaitCount
		}
		if finalStats.WaitDuration >= startWaitDuration {
			waitDurationMs = float64(finalStats.WaitDuration-startWaitDuration) / float64(time.Millisecond)
		}
	}

	slowQueries := 0
	recentSlow := telemetry.GlobalSlowQueryTracker.GetRecent()
	for _, sq := range recentSlow {
		if sq.Timestamp.After(startTime) {
			slowQueries++
		}
	}

	var utilPct float64
	if poolMaxOpen > 0 {
		utilPct = (float64(peakInUse) / float64(poolMaxOpen)) * 100.0
	}
	if utilPct > 100.0 {
		utilPct = 100.0
	}

	var dbVerdict, dbRec string
	if waitCountDelta == 0 && utilPct < 80.0 && slowQueries == 0 {
		dbVerdict = "SEHAT"
		dbRec = fmt.Sprintf("Kapasitas pool %d koneksi sangat memadai. Tidak terjadi antrean koneksi maupun slow query selama pengujian beban.", poolMaxOpen)
	} else if waitCountDelta > 20 || waitDurationMs > 500.0 || utilPct >= 96.0 || slowQueries >= 10 {
		dbVerdict = "BOTTLENECK"
		if waitCountDelta > 0 {
			dbRec = fmt.Sprintf("Terjadi antrean koneksi signifikan (+%d request, total tunggu %.1f ms). Pertimbangkan menaikkan pool ke 50 atau mengoptimalkan transaksi lambat.", waitCountDelta, waitDurationMs)
		} else if slowQueries > 0 {
			dbRec = fmt.Sprintf("Utilisasi koneksi penuh (%d/%d) dan terdeteksi %d slow query (>100ms). Disarankan mengoptimalkan query/indexing atau menaikkan pool ke 50.", peakInUse, poolMaxOpen, slowQueries)
		} else {
			dbRec = fmt.Sprintf("Utilisasi pool mencapai titik jenuh (%d/%d koneksi, %.0f%%). Pertimbangkan menaikkan pool ke 50 saat traffic tinggi.", peakInUse, poolMaxOpen, utilPct)
		}
	} else {
		dbVerdict = "WASPADA"
		if waitCountDelta > 0 {
			dbRec = fmt.Sprintf("Kapasitas pool mencapai %.1f%% dengan antrean kecil (+%d request). Kapasitas masih mencukupi namun perlu dipantau saat traffic melonjak.", utilPct, waitCountDelta)
		} else if slowQueries > 0 {
			dbRec = fmt.Sprintf("Terdeteksi %d slow query (>100ms) meskipun antrean koneksi masih aman (+0 request). Periksa query pada endpoint terkait.", slowQueries)
		} else {
			dbRec = fmt.Sprintf("Kapasitas pool terpakai %.1f%% (%d/%d koneksi). Tidak ada antrean query tertahan.", utilPct, peakInUse, poolMaxOpen)
		}
	}

	report.DatabaseAnalysis = DatabaseBenchmarkAnalysis{
		PoolMaxOpen:        poolMaxOpen,
		PeakInUse:          peakInUse,
		PeakUtilizationPct: utilPct,
		WaitCountDelta:     waitCountDelta,
		WaitDurationMs:     waitDurationMs,
		SlowQueriesCount:   slowQueries,
		DBVerdict:          dbVerdict,
		DBRecommendation:   dbRec,
	}

	// Generate Executive Summary
	report.Summary = generateExecutiveSummary(&report)

	// Save to History (Rolling Ring Buffer max 10)
	h.saveToHistory(&report)

	// Prune old report files on disk (Keep max 10)
	h.pruneOldReports()

	// Update live status to COMPLETED
	ctx := context.Background()
	completedStatus := BenchmarkJobStatus{
		JobID:                jobID,
		Scenario:             scenario,
		ScenarioLabel:        meta.label,
		Status:               "COMPLETED",
		StartedAt:            report.Timestamp,
		EstimatedDurationSec: meta.durationSec,
		ElapsedSec:           meta.durationSec,
		ProgressPct:          100,
		LatestResult:         &report,
	}
	b, _ := json.Marshal(completedStatus)
	_ = h.redisClient.Set(ctx, redisBenchmarkStatusKey, b, 24*time.Hour).Err()
}

func generateExecutiveSummary(r *BenchmarkReport) ExecutiveSummary {
	var summary ExecutiveSummary

	// Tentukan Status Keseluruhan
	if r.SuccessRatePct >= 99.0 && r.LatencyP95Ms < 100.0 {
		summary.VerdictStatus = "EXCELLENT"
		summary.VerdictTitle = "Sistem Prima & Sangat Responsif"
	} else if r.SuccessRatePct >= 98.0 && r.LatencyP95Ms < 300.0 {
		summary.VerdictStatus = "GOOD"
		summary.VerdictTitle = "Sistem Sehat & Siap Operasional"
	} else if r.SuccessRatePct >= 90.0 || r.LatencyP95Ms < 800.0 {
		summary.VerdictStatus = "WARNING"
		summary.VerdictTitle = "Beban Mulai Mendekati Batas (Perlu Perhatian)"
	} else {
		summary.VerdictStatus = "CRITICAL"
		summary.VerdictTitle = "Sistem Mengalami Saturasi / Bottleneck"
	}

	// Temuan Kunci (Key Findings)
	findings := []string{}
	findings = append(findings, fmt.Sprintf("Throughput puncak mencapai %.1f Request/Detik dengan total %d request.", r.RPS, r.TotalRequests))
	findings = append(findings, fmt.Sprintf("95%% request selesai dalam waktu %.2f ms (rata-rata %.2f ms).", r.LatencyP95Ms, r.LatencyAvgMs))
	if r.SuccessRatePct == 100.0 {
		findings = append(findings, "Tingkat keberhasilan 100.00% tanpa adanya request yang gagal atau error 5xx.")
	} else {
		findings = append(findings, fmt.Sprintf("Tingkat keberhasilan %.2f%% (%d request gagal diproses).", r.SuccessRatePct, r.FailedRequests))
	}

	// Temuan Database
	findings = append(findings, fmt.Sprintf("Koneksi DB Puncak: %d/%d (%.1f%%), Antrean: +%d request (total tunggu: %.1f ms), Slow Queries: %d.",
		r.DatabaseAnalysis.PeakInUse, r.DatabaseAnalysis.PoolMaxOpen, r.DatabaseAnalysis.PeakUtilizationPct,
		r.DatabaseAnalysis.WaitCountDelta, r.DatabaseAnalysis.WaitDurationMs, r.DatabaseAnalysis.SlowQueriesCount))

	allChecksPassed := true
	for _, c := range r.Checks {
		if !c.Success {
			allChecksPassed = false
			break
		}
	}
	if allChecksPassed && len(r.Checks) > 0 {
		findings = append(findings, "Seluruh parameter validasi k6 (assertions) terpenuhi 100%.")
	}

	// Rekomendasi
	recommendations := []string{}
	if summary.VerdictStatus == "EXCELLENT" || summary.VerdictStatus == "GOOD" {
		recommendations = append(recommendations, "Kapasitas server saat ini sangat aman untuk melayani operasional armada dan pencatatan kas normal.")
		if r.DatabaseAnalysis.DBRecommendation != "" {
			recommendations = append(recommendations, r.DatabaseAnalysis.DBRecommendation)
		} else {
			recommendations = append(recommendations, "Konfigurasi Connection Pool PostgreSQL (25 koneksi) dan Redis atomic lock bekerja optimal.")
		}
	} else if summary.VerdictStatus == "WARNING" {
		if r.DatabaseAnalysis.DBRecommendation != "" {
			recommendations = append(recommendations, r.DatabaseAnalysis.DBRecommendation)
		}
		recommendations = append(recommendations, "Perhatikan query database pada halaman terkait. Pertimbangkan penambahan composite index.")
	} else {
		if r.DatabaseAnalysis.DBRecommendation != "" {
			recommendations = append(recommendations, r.DatabaseAnalysis.DBRecommendation)
		}
		recommendations = append(recommendations, "Segera lakukan profiling query lambat menggunakan tombol 'Slow Query Inspector' di dashboard.")
		recommendations = append(recommendations, "Periksa log container Go untuk memastikan tidak ada goroutine leak atau unclosed database transaction.")
	}

	summary.KeyFindings = findings
	summary.Recommendations = recommendations
	return summary
}

func (h *BenchmarkHandler) saveToHistory(report *BenchmarkReport) {
	ctx := context.Background()
	var history []BenchmarkReport

	val, err := h.redisClient.Get(ctx, redisBenchmarkHistoryKey).Result()
	if err == nil && val != "" {
		_ = json.Unmarshal([]byte(val), &history)
	}

	// Prepend report to front
	history = append([]BenchmarkReport{*report}, history...)
	if len(history) > maxStoredReports {
		history = history[:maxStoredReports]
	}

	b, _ := json.Marshal(history)
	_ = h.redisClient.Set(ctx, redisBenchmarkHistoryKey, b, 30*24*time.Hour).Err()
}

func (h *BenchmarkHandler) pruneOldReports() {
	reportsDir := filepath.Join(h.workspaceRoot, "tests/k6/reports")
	entries, err := os.ReadDir(reportsDir)
	if err != nil {
		return
	}

	type fileInfo struct {
		path    string
		modTime time.Time
		size    int64
	}

	var files []fileInfo
	var totalSize int64

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		info, err := entry.Info()
		if err == nil {
			files = append(files, fileInfo{
				path:    filepath.Join(reportsDir, entry.Name()),
				modTime: info.ModTime(),
				size:    info.Size(),
			})
			totalSize += info.Size()
		}
	}

	// Sort newest first
	sort.Slice(files, func(i, j int) bool {
		return files[i].modTime.After(files[j].modTime)
	})

	// Keep only top maxStoredReports, remove the rest
	if len(files) > maxStoredReports {
		for _, f := range files[maxStoredReports:] {
			_ = os.Remove(f.path)
			totalSize -= f.size
		}
	}

	log.Printf("[Disk Storage] tests/k6/reports/ maintained at %d files (Total: %.2f KB)", len(files), float64(totalSize)/1024.0)
}

func generateMarkdownReport(r *BenchmarkReport) string {
	var sb strings.Builder

	sb.WriteString("# Laporan Hasil Pengujian Beban Sistem (k6 Performance Benchmark)\n")
	sb.WriteString(fmt.Sprintf("**PT. Adijayantara Logistics Indonesia** | Tanggal: %s\n\n", r.Timestamp))
	sb.WriteString("---\n\n")

	sb.WriteString("## 1. Ringkasan Eksekutif (Executive Summary)\n\n")
	statusIcon := "🟢"
	if r.Summary.VerdictStatus == "WARNING" {
		statusIcon = "🟡"
	} else if r.Summary.VerdictStatus == "CRITICAL" {
		statusIcon = "🔴"
	}

	sb.WriteString(fmt.Sprintf("### %s Status Sistem: %s\n\n", statusIcon, r.Summary.VerdictTitle))
	sb.WriteString("**Temuan Utama:**\n")
	for _, f := range r.Summary.KeyFindings {
		sb.WriteString(fmt.Sprintf("- %s\n", f))
	}
	sb.WriteString("\n**Rekomendasi Tindakan Admin IT:**\n")
	for _, rec := range r.Summary.Recommendations {
		sb.WriteString(fmt.Sprintf("- %s\n", rec))
	}
	sb.WriteString("\n---\n\n")

	sb.WriteString("## 2. Parameter Pengujian\n\n")
	sb.WriteString(fmt.Sprintf("| Parameter | Nilai |\n| :--- | :--- |\n"))
	sb.WriteString(fmt.Sprintf("| **Skenario** | %s |\n", r.ScenarioLabel))
	sb.WriteString(fmt.Sprintf("| **Virtual Users (VUs)** | %d concurrent users |\n", r.VUs))
	sb.WriteString(fmt.Sprintf("| **Durasi Uji** | %s |\n", r.Duration))
	sb.WriteString(fmt.Sprintf("| **Total Request Terkirim** | %d request |\n", r.TotalRequests))
	sb.WriteString(fmt.Sprintf("| **Rata-Rata Throughput (RPS)** | %.2f Req/Detik |\n", r.RPS))
	sb.WriteString(fmt.Sprintf("| **Tingkat Keberhasilan** | %.2f%% |\n", r.SuccessRatePct))
	sb.WriteString("\n---\n\n")

	dbIcon := "🟢"
	if r.DatabaseAnalysis.DBVerdict == "WASPADA" {
		dbIcon = "🟡"
	} else if r.DatabaseAnalysis.DBVerdict == "BOTTLENECK" {
		dbIcon = "🔴"
	}

	sb.WriteString("## 3. Analisis Dampak Terhadap Database PostgreSQL\n\n")
	sb.WriteString("| Metrik Database | Nilai Selama Uji Beban | Evaluasi & Makna |\n")
	sb.WriteString("| :--- | :--- | :--- |\n")
	sb.WriteString(fmt.Sprintf("| **Puncak Koneksi Digunakan (Peak In-Use)** | %d / %d (%.1f%%) | Beban puncak koneksi aktif yang dibuka oleh pool Go |\n",
		r.DatabaseAnalysis.PeakInUse, r.DatabaseAnalysis.PoolMaxOpen, r.DatabaseAnalysis.PeakUtilizationPct))
	sb.WriteString(fmt.Sprintf("| **Antrean Koneksi Terjadi (Wait Count)** | +%d request | Jumlah request yang terpaksa mengantre menunggu slot koneksi kosong |\n",
		r.DatabaseAnalysis.WaitCountDelta))
	sb.WriteString(fmt.Sprintf("| **Total Waktu Tunggu Antrian** | %.2f ms | Akumulasi durasi latency akibat antrean koneksi |\n",
		r.DatabaseAnalysis.WaitDurationMs))
	sb.WriteString(fmt.Sprintf("| **Slow Query Terdeteksi (>100ms)** | %d query | Query lambat yang tertangkap ring-buffer selama pengujian |\n",
		r.DatabaseAnalysis.SlowQueriesCount))
	sb.WriteString(fmt.Sprintf("| **Status Kesehatan Database** | %s %s | Evaluasi kestabilan kapasitas pool database |\n",
		dbIcon, r.DatabaseAnalysis.DBVerdict))
	sb.WriteString(fmt.Sprintf("\n**Rekomendasi Optimalisasi Database:**\n- %s\n", r.DatabaseAnalysis.DBRecommendation))
	sb.WriteString("\n---\n\n")

	sb.WriteString("## 4. Distribusi Latensi Respons (HTTP Duration Quantiles)\n\n")
	sb.WriteString("| Metrik Latensi | Waktu Respons | Keterangan & Makna |\n")
	sb.WriteString("| :--- | :--- | :--- |\n")
	sb.WriteString(fmt.Sprintf("| **Min** | %.2f ms | Respon tercepat yang tercatat |\n", r.LatencyMinMs))
	sb.WriteString(fmt.Sprintf("| **Median (P50)** | %.2f ms | 50%% request selesai lebih cepat dari angka ini |\n", r.LatencyMedMs))
	sb.WriteString(fmt.Sprintf("| **Average (Mean)** | %.2f ms | Waktu respon rata-rata |\n", r.LatencyAvgMs))
	sb.WriteString(fmt.Sprintf("| **P90** | %.2f ms | 90%% request selesai di bawah waktu ini |\n", r.LatencyP90Ms))
	sb.WriteString(fmt.Sprintf("| **P95** | %.2f ms | Standard SLO industri (95%% request) |\n", r.LatencyP95Ms))
	sb.WriteString(fmt.Sprintf("| **P99** | %.2f ms | Worst-case 1%% request paling lambat |\n", r.LatencyP99Ms))
	sb.WriteString(fmt.Sprintf("| **Max** | %.2f ms | Titik paling lambat selama pengujian |\n", r.LatencyMaxMs))
	sb.WriteString("\n---\n\n")

	sb.WriteString("## 5. Hasil Validasi (k6 Assertions / Checks)\n\n")
	sb.WriteString("| Nama Pemeriksaan | Lolos | Gagal | Status |\n")
	sb.WriteString("| :--- | :--- | :--- | :--- |\n")
	for _, c := range r.Checks {
		st := "✓ PASSED"
		if !c.Success {
			st = "✗ FAILED"
		}
		sb.WriteString(fmt.Sprintf("| %s | %d | %d | %s |\n", c.Name, c.Passes, c.Fails, st))
	}
	sb.WriteString("\n---\n\n")

	sb.WriteString("## 6. Panduan Cara Membaca Metrik bagi Admin IT\n\n")
	sb.WriteString("1. **Mengapa P95 Lebih Penting daripada Average?**\n")
	sb.WriteString("   - Nilai *Average* dapat menipu jika ada 1 request yang sangat cepat menutupi 99 request yang lambat. Nilai **P95** menjamin pengalaman 95% pengguna nyata di lapangan.\n\n")
	sb.WriteString("2. **Batas Toleransi Error Rate:**\n")
	sb.WriteString("   - Normal: `0.00%`. Waspada: `0.5% - 2.0%`. Bahaya: `> 5.0%`.\n\n")
	sb.WriteString("3. **Korelasi dengan Connection Pool PostgreSQL:**\n")
	sb.WriteString("   - Jika P95 meningkat drastis saat VUs dinaikkan dari 50 ke 200, artinya koneksi database mulai mengantre (*wait queue*). Pertimbangkan menaikkan `max_open` koneksi pool di backend.\n\n")
	sb.WriteString("*Laporan ini digenerate secara otomatis oleh Antigravity Telemetry & k6 Benchmark Engine.* \n")

	return sb.String()
}

// Helpers
func getFloat64(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	default:
		return 0
	}
}

func getInt64(v interface{}) int64 {
	switch val := v.(type) {
	case int64:
		return val
	case int:
		return int64(val)
	case float64:
		return int64(val)
	case string:
		i, _ := strconv.ParseInt(val, 10, 64)
		return i
	default:
		return 0
	}
}

// Swagger Annotations Helper
var _ = io.EOF
