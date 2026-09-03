package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// List handles listing users with pagination and filters
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 15
	}

	offset := (page - 1) * limit
	search := r.URL.Query().Get("search")
	role := r.URL.Query().Get("role")
	status := r.URL.Query().Get("status")

	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	users, total, err := h.userService.List(r.Context(), limit, offset, search, role, status, currentUserRole)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memuat daftar pengguna: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Daftar pengguna berhasil dimuat", map[string]interface{}{
		"users": users,
		"meta": map[string]interface{}{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"total_page": (total + limit - 1) / limit,
		},
	})
}

// Get handles retrieving a single user by ID
func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID pengguna tidak valid")
		return
	}

	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Pengguna tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, "Data pengguna berhasil dimuat", user)
}

// Create handles registering a new user by Admin
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	user, err := h.userService.Create(r.Context(), input, currentUserRole)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Pengguna baru berhasil ditambahkan", user)
}

// Update handles editing an existing user profile and role
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID pengguna tidak valid")
		return
	}

	var input services.UpdateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r.Context())
	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	user, err := h.userService.Update(r.Context(), id, input, currentUserID, currentUserRole)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Data pengguna berhasil diperbarui", user)
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
}

// ResetPassword handles resetting user password
func (h *UserHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID pengguna tidak valid")
		return
	}

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r.Context())
	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	if err := h.userService.ResetPassword(r.Context(), id, req.Password, currentUserID, currentUserRole); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Password pengguna berhasil direset", nil)
}

// Delete handles soft-deleting a user
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID pengguna tidak valid")
		return
	}

	currentUserID := middleware.GetUserIDFromContext(r.Context())
	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	if err := h.userService.Delete(r.Context(), id, currentUserID, currentUserRole); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Pengguna berhasil dinonaktifkan/dihapus", nil)
}
