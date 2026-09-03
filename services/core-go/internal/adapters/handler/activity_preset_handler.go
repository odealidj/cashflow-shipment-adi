package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

type ActivityPresetHandler struct {
	service *services.ActivityPresetService
}

func NewActivityPresetHandler(service *services.ActivityPresetService) *ActivityPresetHandler {
	return &ActivityPresetHandler{service: service}
}

// List handles listing activity presets
// @Summary      List activity presets
// @Description  Retrieves master activity descriptions and routes with optional category/search filter
// @Tags         activity-presets
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        page      query  int     false  "Page number" default(1)
// @Param        limit     query  int     false  "Items per page" default(100)
// @Param        category  query  string  false  "Category filter"
// @Param        search    query  string  false  "Search keyword"
// @Success      200  {object}  response.APIResponse
// @Failure      500  {object}  response.APIResponse
// @Router       /activity-presets [get]
func (h *ActivityPresetHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 100
	}
	category := r.URL.Query().Get("category")
	search := r.URL.Query().Get("search")

	presets, total, err := h.service.ListPresets(r.Context(), category, search, page, limit)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	response.Paginated(w, http.StatusOK, "Daftar preset berhasil diambil", presets, page, limit, total)
}

// GetByID handles retrieving a single activity preset by ID
// @Summary      Get activity preset by ID
// @Description  Retrieves detail of a specific activity preset
// @Tags         activity-presets
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        id   path      int  true  "Preset ID"
// @Success      200  {object}  response.APIResponse
// @Failure      404  {object}  response.APIResponse
// @Router       /activity-presets/{id} [get]
func (h *ActivityPresetHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	preset, err := h.service.GetPresetByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Preset aktivitas tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, "Detail preset ditemukan", preset)
}

// Create handles creating a new activity preset
// @Summary      Create new activity preset
// @Description  Creates a new preset for activity description or armada route
// @Tags         activity-presets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        request body   domain.ActivityPreset  true  "New Preset Data"
// @Success      201  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /activity-presets [post]
func (h *ActivityPresetHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.ActivityPreset
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	if err := h.service.CreatePreset(r.Context(), &req); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Preset aktivitas berhasil ditambahkan", req)
}

// Update handles editing an existing activity preset
// @Summary      Update activity preset
// @Description  Updates an existing activity preset
// @Tags         activity-presets
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id      path   int                    true  "Preset ID"
// @Param        request body   domain.ActivityPreset  true  "Updated Preset Data"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /activity-presets/{id} [put]
func (h *ActivityPresetHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	var req domain.ActivityPreset
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	req.ID = id
	if err := h.service.UpdatePreset(r.Context(), &req); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Preset aktivitas berhasil diperbarui", req)
}

// Delete handles removing an activity preset
// @Summary      Delete activity preset
// @Description  Deletes an activity preset by ID
// @Tags         activity-presets
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id   path      int  true  "Preset ID"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Router       /activity-presets/{id} [delete]
func (h *ActivityPresetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	if err := h.service.DeletePreset(r.Context(), id); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Preset aktivitas berhasil dihapus", nil)
}
