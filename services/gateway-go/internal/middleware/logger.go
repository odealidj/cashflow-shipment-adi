package middleware

import (
	"log"
	"net/http"
	"time"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(lrw, r)

		duration := time.Since(start)
		reqID := GetRequestID(r.Context())
		if reqID == "" {
			reqID = r.Header.Get("X-Request-ID")
		}

		log.Printf("[Gateway] %s %s -> %d in %v [ReqID: %s]",
			r.Method,
			r.URL.Path,
			lrw.statusCode,
			duration,
			reqID,
		)
	})
}
