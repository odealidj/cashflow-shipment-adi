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
func (h *RoleHandler) List(w http.ResponseWriter, r *http.Request) {
	currentUserRole := middleware.GetUserRoleFromContext(r.Context())
	roles, err := h.roleService.ListRoles(r.Context(), currentUserRole)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memuat daftar peran: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Daftar peran berhasil dimuat", roles)
}

// Get handles retrieving role detail with its active permissions
func (h *RoleHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	roleDetail, err := h.roleService.GetRoleDetail(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Role tidak ditemukan: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Detail role berhasil dimuat", roleDetail)
}

// Create handles creating a new custom role
func (h *RoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateRoleInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	role, err := h.roleService.CreateRole(r.Context(), input)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Gagal membuat role: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Role baru berhasil dibuat", role)
}

// Update handles updating role name and description
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
		response.Error(w, http.StatusBadRequest, "Gagal memperbarui role: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Informasi role berhasil diperbarui", nil)
}

// Delete handles deleting a role (if not system and has 0 active users)
func (h *RoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID role tidak valid")
		return
	}

	if err := h.roleService.DeleteRole(r.Context(), id); err != nil {
		response.Error(w, http.StatusBadRequest, "Gagal menghapus role: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Role berhasil dihapus", nil)
}

// ListPermissions handles listing all available system permissions grouped by module
func (h *RoleHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	permsGrouped, err := h.roleService.ListPermissionsGrouped(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal memuat kamus izin: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Kamus izin berhasil dimuat", permsGrouped)
}

type UpdatePermissionsInput struct {
	Permissions []string `json:"permissions"`
}

// UpdatePermissions handles updating the permission checklist matrix for a role
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
		response.Error(w, http.StatusBadRequest, "Gagal memperbarui hak akses role: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Matriks hak akses role berhasil diperbarui", nil)
}
