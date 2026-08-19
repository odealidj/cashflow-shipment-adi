package handler

import (
	"encoding/json"
	"net/http"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
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

// Login godoc
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
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	token, user, err := h.authService.Login(r.Context(), req.Identifier, req.Password)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	response.JSON(w, http.StatusOK, "Login successful", map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Phone    *string `json:"phone,omitempty"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// Register godoc
// @Summary      Register a new user
// @Description  Register a new user in the system (Admin only ideally, but open for now)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RegisterRequest true "User Registration Info"
// @Success      201  {object}  response.APIResponse
// @Router       /auth/register [post]
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	user := &domain.User{
		Email:    req.Email,
		Phone:    req.Phone,
		FullName: req.FullName,
		Role:     domain.UserRole(req.Role),
	}

	if err := h.authService.Register(r.Context(), user, req.Password); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to register user: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "User registered successfully", nil)
}
