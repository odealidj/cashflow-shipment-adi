package proxy

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
	"strings"

	"github.com/cashflow-shipment-app/gateway/internal/config"
	"github.com/cashflow-shipment-app/gateway/internal/middleware"
)

var versionRegex = regexp.MustCompile(`^/api/v([0-9]+)(/.*)?$`)

// GatewayRouter orchestrates reverse proxy routing, dual-routing, auto-rewrite, and upstream resilience
type GatewayRouter struct {
	coreTarget     *url.URL
	trackingTarget *url.URL
	coreProxy      *httputil.ReverseProxy
	trackingProxy  *httputil.ReverseProxy
}

func NewGatewayRouter(cfg *config.Config) (*GatewayRouter, error) {
	coreURL, err := url.Parse(cfg.CoreServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid CORE_SERVICE_URL: %w", err)
	}

	trackingURL, err := url.Parse(cfg.TrackingServiceURL)
	if err != nil {
		return nil, fmt.Errorf("invalid TRACKING_SERVICE_URL: %w", err)
	}

	errorHandler := func(w http.ResponseWriter, r *http.Request, err error) {
		reqID := middleware.GetRequestID(r.Context())
		log.Printf("[Gateway Error] Upstream connection failed for %s %s: %v [ReqID: %s]", r.Method, r.URL.Path, err, reqID)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  false,
			"message": "Layanan backend downstream sedang tidak dapat dijangkau. Mohon coba beberapa saat lagi.",
			"data":    nil,
		})
	}

	coreProxy := httputil.NewSingleHostReverseProxy(coreURL)
	coreProxy.ErrorHandler = errorHandler

	trackingProxy := httputil.NewSingleHostReverseProxy(trackingURL)
	trackingProxy.ErrorHandler = errorHandler

	return &GatewayRouter{
		coreTarget:     coreURL,
		trackingTarget: trackingURL,
		coreProxy:      coreProxy,
		trackingProxy:  trackingProxy,
	}, nil
}

func (gr *GatewayRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// 1. Gateway Native Healthcheck
	if path == "/health" || path == "/gateway/health" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  true,
			"message": "API Gateway is operational",
			"data": map[string]interface{}{
				"core_upstream":     gr.coreTarget.String(),
				"tracking_upstream": gr.trackingTarget.String(),
			},
		})
		return
	}

	// 2. Swagger Docs Pass-through
	if strings.HasPrefix(path, "/swagger") {
		r.Host = gr.coreTarget.Host
		gr.coreProxy.ServeHTTP(w, r)
		return
	}

	// 3. Dual-Routing & Auto-Rewrite for /api paths
	if strings.HasPrefix(path, "/api") {
		targetPath, isTracking := resolveUpstreamPath(r)
		r.URL.Path = targetPath

		if isTracking {
			r.Host = gr.trackingTarget.Host
			gr.trackingProxy.ServeHTTP(w, r)
			return
		}

		r.Host = gr.coreTarget.Host
		gr.coreProxy.ServeHTTP(w, r)
		return
	}

	// Fallback 404 for unknown endpoints
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  false,
		"message": "Rute endpoint tidak ditemukan di API Gateway",
		"data":    nil,
	})
}

// resolveUpstreamPath determines the resolved path and whether it targets tracking service
func resolveUpstreamPath(r *http.Request) (string, bool) {
	rawPath := r.URL.Path

	// Check if URL already has an explicit version like /api/v1/cashflow or /api/v2/tracking
	if matches := versionRegex.FindStringSubmatch(rawPath); len(matches) > 0 {
		subpath := matches[2] // e.g. /tracking/something or /cashflow
		isTracking := strings.HasPrefix(subpath, "/tracking")
		return rawPath, isTracking
	}

	// Clean URL format: /api/{module}...
	// Determine version: Header X-API-Version > default "v1"
	version := "v1"
	if customVer := strings.TrimSpace(r.Header.Get("X-API-Version")); customVer != "" {
		if !strings.HasPrefix(customVer, "v") {
			customVer = "v" + customVer
		}
		version = customVer
	}

	// Strip "/api" prefix and rewrite to "/api/{version}/..."
	subpath := strings.TrimPrefix(rawPath, "/api")
	if !strings.HasPrefix(subpath, "/") {
		subpath = "/" + subpath
	}

	isTracking := strings.HasPrefix(subpath, "/tracking")
	resolved := fmt.Sprintf("/api/%s%s", version, subpath)

	return resolved, isTracking
}
