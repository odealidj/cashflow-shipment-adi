package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/response"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // Email or Phone
	Password   string `json:"password"`
}

// Login authenticates user and sets HttpOnly session cookie
// @Summary      User login
// @Description  Login using email or phone number and password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Login Credentials"
// @Success      200  {object}  response.APIResponse
// @Failure      401  {object}  response.APIResponse
// @Router       /auth/login [post]
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	session, token, err := h.authService.Login(r.Context(), req.Identifier, req.Password)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, err.Error())
		return
	}

	// Set HttpOnly Secure Session Cookie (Anti-XSS)
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.CookieAuthName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set true in production behind HTTPS
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400, // 24 hours
	})

	response.JSON(w, http.StatusOK, "Login berhasil", map[string]interface{}{
		"token": token,
		"user":  session,
	})
}

// Logout revokes session and clears HttpOnly cookie
// @Summary      User logout
// @Description  Revokes session token and clears HttpOnly session cookie
// @Tags         auth
// @Produce      json
// @Success      200  {object}  response.APIResponse
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var token string
	if cookie, err := r.Cookie(middleware.CookieAuthName); err == nil && cookie != nil {
		token = cookie.Value
	}
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 {
				token = parts[1]
			}
		}
	}

	if token != "" {
		_ = h.authService.Logout(r.Context(), token)
	}

	// Expire cookie
	http.SetCookie(w, &http.Cookie{
		Name:     middleware.CookieAuthName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	response.JSON(w, http.StatusOK, "Logout berhasil", nil)
}

// Me returns current active session profile
// @Summary      Get current user profile
// @Description  Returns the active session profile including role and assigned permissions
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.APIResponse
// @Failure      401  {object}  response.APIResponse
// @Router       /auth/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	session := middleware.GetUserSessionFromContext(r.Context())
	if session == nil {
		response.Error(w, http.StatusUnauthorized, "Sesi tidak valid")
		return
	}

	response.JSON(w, http.StatusOK, "Sesi pengguna aktif", session)
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Phone    *string `json:"phone,omitempty"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// Register registers a new user account
// @Summary      Register new user
// @Description  Registers a new staff user pending administrator verification
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RegisterRequest true "Registration Data"
// @Success      201  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /auth/register [post]
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.FullName = strings.TrimSpace(req.FullName)
	if req.Email == "" || req.FullName == "" || req.Password == "" {
		response.Error(w, http.StatusBadRequest, "Nama lengkap, email, dan password wajib diisi")
		return
	}

	user := &domain.User{
		Email:    req.Email,
		Phone:    req.Phone,
		FullName: req.FullName,
		Role:     domain.RoleFinance,
		Status:   domain.StatusInactive,
	}

	if err := h.authService.Register(r.Context(), user, req.Password); err != nil {
		response.Error(w, http.StatusBadRequest, "Gagal mendaftarkan akun: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Pendaftaran berhasil! Akun Anda sedang menunggu verifikasi & aktivasi hak akses oleh Administrator.", map[string]interface{}{
		"email":     user.Email,
		"full_name": user.FullName,
		"status":    user.Status,
	})
}
