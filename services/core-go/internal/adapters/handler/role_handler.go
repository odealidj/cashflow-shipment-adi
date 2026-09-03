package handler

import (
	"encoding/json"
	"net/http"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type RoleHandler struct {
	roleService *services.RoleService
}

func NewRoleHandler(roleService *services.RoleService) *RoleHandler {
	return &RoleHandler{roleService: roleService}
}

// List handles listing roles
// @Summary      List all roles
// @Description  Retrieves list of all available roles with user counts
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Success      200  {object}  response.APIResponse
// @Failure      500  {object}  response.APIResponse
// @Router       /roles [get]
func (h *RoleHandler) List(w http.ResponseWriter, r *http.Request) {
	currentUserRole := middleware.GetUserRoleFromContext(r.Context())
	roles, err := h.roleService.ListRoles(r.Context(), currentUserRole)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Daftar peran berhasil dimuat", roles)
}

// Get handles retrieving role detail with its active permissions
// @Summary      Get role detail with active permissions
// @Description  Retrieves role information along with active permission codes
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        id   path      string  true  "Role UUID"
// @Success      200  {object}  response.APIResponse
// @Failure      404  {object}  response.APIResponse
// @Router       /roles/{id} [get]
func (h *RoleHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	roleDetail, err := h.roleService.GetRoleDetail(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Role tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, "Detail role berhasil dimuat", roleDetail)
}

// Create handles creating a new custom role
// @Summary      Create new custom role
// @Description  Creates a new custom business role
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        request body   services.CreateRoleInput  true  "New Role Data"
// @Success      201  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /roles [post]
func (h *RoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateRoleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	role, err := h.roleService.CreateRole(r.Context(), input)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Role baru berhasil dibuat", role)
}

// Update handles updating role name and description
// @Summary      Update role information
// @Description  Updates name and description of a role
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id      path   string                    true  "Role UUID"
// @Param        request body   services.UpdateRoleInput  true  "Updated Role Data"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /roles/{id} [put]
func (h *RoleHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	var input services.UpdateRoleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	if err := h.roleService.UpdateRole(r.Context(), id, input); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Informasi role berhasil diperbarui", nil)
}

// Delete handles deleting a role (if not system and has 0 active users)
// @Summary      Delete custom role
// @Description  Deletes a custom role if no users are currently assigned
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id   path      string  true  "Role UUID"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /roles/{id} [delete]
func (h *RoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	if err := h.roleService.DeleteRole(r.Context(), id); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Role berhasil dihapus", nil)
}

// ListPermissions handles listing all available system permissions grouped by module
// @Summary      List all available system permissions
// @Description  Retrieves all permissions grouped by modules
// @Tags         roles
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Success      200  {object}  response.APIResponse
// @Failure      500  {object}  response.APIResponse
// @Router       /roles/permissions [get]
func (h *RoleHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	permsGrouped, err := h.roleService.ListPermissionsGrouped(r.Context())
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Kamus izin berhasil dimuat", permsGrouped)
}

type UpdatePermissionsInput struct {
	Permissions []string `json:"permissions"`
}

// UpdatePermissions handles updating the permission checklist matrix for a role
// @Summary      Update role permissions matrix
// @Description  Atomically updates the permission checklist assigned to a role
// @Tags         roles
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id      path   string                  true  "Role UUID"
// @Param        request body   UpdatePermissionsInput  true  "Permission Codes List"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /roles/{id}/permissions [put]
func (h *RoleHandler) UpdatePermissions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	var input UpdatePermissionsInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	if err := h.roleService.UpdateRolePermissions(r.Context(), id, input.Permissions); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Matriks hak akses role berhasil diperbarui", nil)
}
