package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

type InvoiceHandler struct {
	invoiceService *services.InvoiceService
}

func NewInvoiceHandler(invoiceService *services.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{invoiceService: invoiceService}
}

func extractInvoiceFilter(r *http.Request) ports.InvoiceFilter {
	q := r.URL.Query()
	filter := ports.InvoiceFilter{
		SortDir: "ASC",
		SortBy:  "shipment_date",
	}

	if sd := strings.ToUpper(strings.TrimSpace(q.Get("sort_dir"))); sd == "DESC" {
		filter.SortDir = "DESC"
	}
	if sb := strings.TrimSpace(q.Get("sort_by")); sb != "" {
		filter.SortBy = sb
	}
	if df := strings.TrimSpace(q.Get("date_from")); df != "" {
		filter.DateFrom = &df
	}
	if dt := strings.TrimSpace(q.Get("date_to")); dt != "" {
		filter.DateTo = &dt
	}
	if st := strings.ToUpper(strings.TrimSpace(q.Get("status"))); st != "" {
		status := domain.InvoiceStatus(st)
		filter.Status = &status
	}
	if cn := strings.TrimSpace(q.Get("client_name")); cn != "" {
		filter.ClientName = &cn
	}
	if invNo := strings.TrimSpace(q.Get("invoice_no")); invNo != "" {
		filter.InvoiceNo = &invNo
	}

	return filter
}

// List Invoices godoc
// @Summary      Get invoices list
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices [get]
func (h *InvoiceHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	filter := extractInvoiceFilter(r)
	invoices, total, err := h.invoiceService.ListInvoices(r.Context(), page, limit, filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Invoices retrieved", invoices, page, limit, total)
}

// Get Invoice Summary godoc
// @Summary      Get invoice summary KPI
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/summary [get]
func (h *InvoiceHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	filter := extractInvoiceFilter(r)
	summary, err := h.invoiceService.GetSummary(r.Context(), filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	response.JSON(w, http.StatusOK, "Invoice summary retrieved", summary)
}

// Get Invoice Detail godoc
// @Summary      Get invoice by ID
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/{id} [get]
func (h *InvoiceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	inv, err := h.invoiceService.GetInvoice(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Invoice tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, "Invoice retrieved", inv)
}

// Create Invoice godoc
// @Summary      Create new invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices [post]
func (h *InvoiceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input services.CreateInvoiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	inv, err := h.invoiceService.CreateInvoice(r.Context(), input)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Invoice berhasil dibuat", inv)
}

// Update Invoice godoc
// @Summary      Update invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/{id} [put]
func (h *InvoiceHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	var input services.CreateInvoiceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	inv, err := h.invoiceService.UpdateInvoice(r.Context(), id, input)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Invoice berhasil diperbarui", inv)
}

// Mark Paid godoc
// @Summary      Mark invoice as paid
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/{id}/pay [patch]
func (h *InvoiceHandler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	if err := h.invoiceService.MarkAsPaid(r.Context(), id); err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Invoice berhasil ditandai lunas", map[string]interface{}{"id": id, "status": "PAID"})
}

// Delete Invoice (Soft Delete) godoc
// @Summary      Soft delete invoice
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/{id} [delete]
func (h *InvoiceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	if err := h.invoiceService.DeleteInvoice(r.Context(), id); err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Invoice berhasil dihapus", nil)
}
