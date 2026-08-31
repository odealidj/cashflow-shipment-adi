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

type VendorHandler struct {
	vendorService *services.VendorService
}

func NewVendorHandler(vendorService *services.VendorService) *VendorHandler {
	return &VendorHandler{vendorService: vendorService}
}

// List Vendors godoc
// @Summary      Get all vendors
// @Tags         vendors
// @Produce      json
// @Security     BearerAuth
// @Param        page query int false "Page number" default(1)
// @Param        limit query int false "Items per page" default(50)
// @Success      200  {object}  response.APIResponse
// @Router       /vendors [get]
func (h *VendorHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	vendors, total, err := h.vendorService.ListAllVendors(r.Context(), page, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve vendors")
		return
	}
	response.JSON(w, http.StatusOK, "Vendors retrieved", map[string]interface{}{
		"entries": vendors,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

// Get Vendor godoc
// @Summary      Get vendor by ID
// @Tags         vendors
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Vendor ID"
// @Success      200  {object}  response.APIResponse
// @Router       /vendors/{id} [get]
func (h *VendorHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid vendor ID")
		return
	}

	vendor, err := h.vendorService.GetVendorByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Vendor not found")
		return
	}

	response.JSON(w, http.StatusOK, "Vendor retrieved", vendor)
}

// Create Vendor godoc
// @Summary      Create new vendor
// @Tags         vendors
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.Vendor true "Vendor Data"
// @Success      201  {object}  response.APIResponse
// @Router       /vendors [post]
func (h *VendorHandler) Create(w http.ResponseWriter, r *http.Request) {
	var vendor domain.Vendor
	if err := json.NewDecoder(r.Body).Decode(&vendor); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.vendorService.CreateVendor(r.Context(), &vendor); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create vendor: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Vendor created successfully", vendor)
}

// Update Vendor godoc
// @Summary      Update vendor by ID
// @Tags         vendors
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Vendor ID"
// @Param        request body domain.Vendor true "Vendor Data"
// @Success      200  {object}  response.APIResponse
// @Router       /vendors/{id} [put]
func (h *VendorHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid vendor ID")
		return
	}

	var vendor domain.Vendor
	if err := json.NewDecoder(r.Body).Decode(&vendor); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	vendor.ID = id

	if err := h.vendorService.UpdateVendor(r.Context(), &vendor); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update vendor: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Vendor updated successfully", vendor)
}

// Delete Vendor (Soft Delete) godoc
// @Summary      Soft delete vendor by ID
// @Tags         vendors
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Vendor ID"
// @Success      200  {object}  response.APIResponse
// @Router       /vendors/{id} [delete]
func (h *VendorHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid vendor ID")
		return
	}

	if err := h.vendorService.DeleteVendor(r.Context(), id); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete vendor: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Vendor deleted successfully", nil)
}
