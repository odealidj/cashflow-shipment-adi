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
// @Summary      List users
// @Description  Retrieves list of users with pagination, search, role, and status filtering
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        page    query  int     false  "Page number" default(1)
// @Param        limit   query  int     false  "Items per page" default(15)
// @Param        search  query  string  false  "Search by name, email, or phone"
// @Param        role    query  string  false  "Filter by role code"
// @Param        status  query  string  false  "Filter by status (ACTIVE, INACTIVE, SUSPENDED)"
// @Success      200  {object}  response.APIResponse
// @Failure      500  {object}  response.APIResponse
// @Router       /users [get]
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
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Daftar pengguna berhasil dimuat", users, page, limit, total)
}

// Get handles retrieving a single user by ID
// @Summary      Get user by ID
// @Description  Retrieves profile of a specific user
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        id   path      string  true  "User UUID"
// @Success      200  {object}  response.APIResponse
// @Failure      404  {object}  response.APIResponse
// @Router       /users/{id} [get]
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
// @Summary      Create new user
// @Description  Registers a new staff user with designated role
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)"
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        request body   services.CreateUserInput  true  "New User Data"
// @Success      201  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /users [post]
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	currentUserRole := middleware.GetUserRoleFromContext(r.Context())

	user, err := h.userService.Create(r.Context(), input, currentUserRole)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Pengguna baru berhasil ditambahkan", user)
}

// Update handles editing an existing user profile and role
// @Summary      Update user
// @Description  Updates profile, status, or role of an existing user (enforces C-Level & Self-Deletion Golden Rules)
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)"
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id      path   string                    true  "User UUID"
// @Param        request body   services.UpdateUserInput  true  "Updated User Data"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /users/{id} [put]
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
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Data pengguna berhasil diperbarui", user)
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
}

// ResetPassword handles resetting user password
// @Summary      Reset user password
// @Description  Resets the password for a user account
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)"
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id      path   string                true  "User UUID"
// @Param        request body   ResetPasswordRequest  true  "New Password"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /users/{id}/password [patch]
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
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Password pengguna berhasil direset", nil)
}

// Delete handles soft-deleting a user
// @Summary      Soft delete / deactivate user
// @Description  Soft deletes or deactivates a user (enforces Anti Self-Deletion, Last Admin Standing, and C-Level Immunity)
// @Tags         users
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)"
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id   path      string  true  "User UUID"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /users/{id} [delete]
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
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Pengguna berhasil dinonaktifkan/dihapus", nil)
}
