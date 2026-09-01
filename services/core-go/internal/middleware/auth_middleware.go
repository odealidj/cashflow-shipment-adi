package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/google/uuid"
)

type contextKey string

const (
	SessionKey contextKey = "user_session"
	CookieAuthName        = "auth_session"
)

// RequireAuth extracts session from HttpOnly cookie or Authorization Bearer header
func RequireAuth(sessionService *services.SessionService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var token string

			// 1. Try reading from HttpOnly Cookie first
			cookie, err := r.Cookie(CookieAuthName)
			if err == nil && cookie != nil && cookie.Value != "" {
				token = cookie.Value
			}

			// 2. Fallback to Authorization Header (Bearer token)
			if token == "" {
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" {
					parts := strings.Split(authHeader, " ")
					if len(parts) == 2 && (parts[0] == "Bearer" || parts[0] == "bearer") {
						token = parts[1]
					}
				}
			}

			if token == "" {
				response.Error(w, http.StatusUnauthorized, "Sesi autentikasi tidak ditemukan. Silakan login kembali")
				return
			}

			// 3. Validate with Two-Tier Session Service (L1 Cache -> L2 Redis)
			session, err := sessionService.GetSession(r.Context(), token)
			if err != nil || session == nil {
				response.Error(w, http.StatusUnauthorized, "Sesi tidak valid atau telah berakhir. Silakan login kembali")
				return
			}

			// 4. Check if user status is still ACTIVE
			if session.Status != domain.StatusActive {
				response.Error(w, http.StatusForbidden, "Akun Anda dinonaktifkan. Silakan hubungi Administrator")
				return
			}

			// 5. Inject session into Context
			ctx := context.WithValue(r.Context(), SessionKey, session)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireRole enforces role-based access control
func RequireRole(allowedRoles ...domain.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			session := GetUserSessionFromContext(r.Context())
			if session == nil {
				response.Error(w, http.StatusUnauthorized, "Sesi tidak valid")
				return
			}

			// Super Admin IT has universal bypass for maintenance
			if session.Role == domain.RoleSuperAdmin {
				next.ServeHTTP(w, r)
				return
			}

			// Check allowed roles
			isAllowed := false
			for _, role := range allowedRoles {
				if session.Role == role {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				response.Error(w, http.StatusForbidden, "Akses ditolak: Anda tidak memiliki wewenang untuk mengakses fitur ini")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserSessionFromContext(ctx context.Context) *domain.UserSession {
	if val := ctx.Value(SessionKey); val != nil {
		if session, ok := val.(*domain.UserSession); ok {
			return session
		}
	}
	return nil
}

func GetUserIDFromContext(ctx context.Context) uuid.UUID {
	session := GetUserSessionFromContext(ctx)
	if session != nil {
		return session.UserID
	}
	return uuid.Nil
}

func GetUserRoleFromContext(ctx context.Context) domain.UserRole {
	session := GetUserSessionFromContext(ctx)
	if session != nil {
		return session.Role
	}
	return ""
}
