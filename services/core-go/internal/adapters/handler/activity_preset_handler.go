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
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil daftar preset: "+err.Error())
		return
	}
	response.JSON(w, http.StatusOK, "Daftar preset berhasil diambil", map[string]interface{}{
		"entries": presets,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *ActivityPresetHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	preset, err := h.service.GetPresetByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Detail preset ditemukan", preset)
}

func (h *ActivityPresetHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.ActivityPreset
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload JSON tidak valid")
		return
	}

	if err := h.service.CreatePreset(r.Context(), &req); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Preset aktivitas berhasil ditambahkan", req)
}

func (h *ActivityPresetHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	var req domain.ActivityPreset
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload JSON tidak valid")
		return
	}

	req.ID = id
	if err := h.service.UpdatePreset(r.Context(), &req); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Preset aktivitas berhasil diperbarui", req)
}

func (h *ActivityPresetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID preset tidak valid")
		return
	}

	if err := h.service.DeletePreset(r.Context(), id); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Preset aktivitas berhasil dihapus", map[string]interface{}{
		"id": id,
	})
}
