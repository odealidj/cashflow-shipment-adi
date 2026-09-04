package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/gateway/internal/metrics"
	"github.com/redis/go-redis/v9"
)

type CachedResponse struct {
	StatusCode int                 `json:"status_code"`
	Headers    map[string][]string `json:"headers"`
	Body       []byte              `json:"body"`
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	body       bytes.Buffer
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	return r.ResponseWriter.Write(b)
}

// Idempotency middleware enforces single-execution semantics for mutating requests
func Idempotency(rdb *redis.Client, ttl time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only apply to state-changing operations
			if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodPatch {
				next.ServeHTTP(w, r)
				return
			}

			idempotencyKey := strings.TrimSpace(r.Header.Get("X-Idempotency-Key"))
			if idempotencyKey == "" || rdb == nil {
				next.ServeHTTP(w, r)
				return
			}

			redisKey := fmt.Sprintf("idempotency:%s", idempotencyKey)

			// 1. Check existing record in Redis
			val, err := rdb.Get(r.Context(), redisKey).Result()
			if err == nil {
				metrics.RecordIdempotencyHit()
				if val == "PROCESSING" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusConflict)
					_ = json.NewEncoder(w).Encode(map[string]interface{}{
						"status":  false,
						"message": "Permintaan dengan kunci transaksi ini sedang diproses. Mohon tunggu.",
						"data":    nil,
					})
					return
				}

				// Replay cached response
				var cached CachedResponse
				if err := json.Unmarshal([]byte(val), &cached); err == nil {
					for k, v := range cached.Headers {
						for _, h := range v {
							w.Header().Add(k, h)
						}
					}
					w.Header().Set("X-Cache-Lookup", "HIT-IDEMPOTENT")
					w.WriteHeader(cached.StatusCode)
					_, _ = w.Write(cached.Body)
					return
				}
			}

			// 2. Acquire atomic lock (SetNX) with 60-second processing TTL
			locked, err := rdb.SetNX(r.Context(), redisKey, "PROCESSING", 60*time.Second).Result()
			if err != nil || !locked {
				metrics.RecordIdempotencyHit()
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusConflict)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"status":  false,
					"message": "Transaksi sedang diproses pada koneksi lain. Silakan coba sesaat lagi.",
					"data":    nil,
				})
				return
			}

			metrics.RecordIdempotencyMiss()

			// 3. Record downstream response
			recorder := &responseRecorder{
				ResponseWriter: w,
				statusCode:     http.StatusOK, // default HTTP status
			}

			next.ServeHTTP(recorder, r)

			// 4. If downstream succeeded (2xx), cache full response payload
			if recorder.statusCode >= 200 && recorder.statusCode < 300 {
				cached := CachedResponse{
					StatusCode: recorder.statusCode,
					Headers:    recorder.Header().Clone(),
					Body:       recorder.body.Bytes(),
				}
				if cachedBytes, err := json.Marshal(cached); err == nil {
					_ = rdb.Set(r.Context(), redisKey, cachedBytes, ttl).Err()
				}
			} else {
				// If downstream failed (4xx/5xx), release lock so client can correct payload and retry
				_ = rdb.Del(r.Context(), redisKey).Err()
			}
		})
	}
}
