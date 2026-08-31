package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/auth"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/xuri/excelize/v2"
)

type CashflowHandler struct {
	cashflowService *services.CashflowService
}

func NewCashflowHandler(cashflowService *services.CashflowService) *CashflowHandler {
	return &CashflowHandler{cashflowService: cashflowService}
}

func extractListFilter(r *http.Request) ports.ListFilter {
	q := r.URL.Query()
	sortDir := strings.ToUpper(strings.TrimSpace(q.Get("sort")))
	if sortDir != "DESC" {
		sortDir = "ASC" // Default is ASC as discussed
	}

	filter := ports.ListFilter{
		SortDir: sortDir,
	}

	if df := strings.TrimSpace(q.Get("date_from")); df != "" {
		filter.DateFrom = &df
	}
	if dt := strings.TrimSpace(q.Get("date_to")); dt != "" {
		filter.DateTo = &dt
	}
	if et := strings.TrimSpace(q.Get("entry_type")); et != "" {
		entryType := domain.EntryType(strings.ToUpper(et))
		filter.EntryType = &entryType
	}
	if rem := strings.TrimSpace(q.Get("remarks")); rem != "" {
		status := domain.PaymentStatus(strings.ToUpper(rem))
		filter.Remarks = &status
	}
	if vn := strings.TrimSpace(q.Get("vendor_name")); vn != "" {
		filter.VendorName = &vn
	}

	return filter
}

// List Cashflow godoc
// @Summary      Get dashboard cashflow entries
// @Tags         cashflow
// @Produce      json
// @Security     BearerAuth
// @Param        page query int false "Page number" default(1)
// @Param        limit query int false "Items per page" default(50)
// @Param        sort query string false "Sort direction (ASC/DESC)" default(ASC)
// @Param        date_from query string false "Start date (YYYY-MM-DD)"
// @Param        date_to query string false "End date (YYYY-MM-DD)"
// @Param        entry_type query string false "Entry type (SHIPMENT/TOP_UP)"
// @Param        remarks query string false "Payment status (PAID/UNPAID/PENDING)"
// @Param        vendor_name query string false "Vendor search keyword"
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow [get]
func (h *CashflowHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	filter := extractListFilter(r)
	entries, total, err := h.cashflowService.GetDashboardData(r.Context(), page, limit, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve cashflow data: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Cashflow data retrieved", map[string]interface{}{
		"entries": entries,
		"total":   total,
		"page":    page,
		"limit":   limit,
		"sort":    filter.SortDir,
	})
}

// Create Top-Up godoc
// @Summary      Record a Top-Up entry
// @Tags         cashflow
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.CashflowEntry true "Top-Up Entry Data"
// @Success      201  {object}  response.APIResponse
// @Router       /cashflow/topup [post]
func (h *CashflowHandler) CreateTopUp(w http.ResponseWriter, r *http.Request) {
	var entry domain.CashflowEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	entry.CreatedBy = claims.UserID
	entry.UpdatedBy = claims.UserID

	if err := h.cashflowService.RecordTopUp(r.Context(), &entry); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to record Top-Up: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Top-Up recorded successfully", entry)
}

// Create Shipment godoc
// @Summary      Record a Shipment entry
// @Tags         cashflow
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request body domain.CashflowEntry true "Shipment Entry Data"
// @Success      201  {object}  response.APIResponse
// @Router       /cashflow/shipment [post]
func (h *CashflowHandler) CreateShipment(w http.ResponseWriter, r *http.Request) {
	var entry domain.CashflowEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	entry.CreatedBy = claims.UserID
	entry.UpdatedBy = claims.UserID

	if err := h.cashflowService.RecordShipment(r.Context(), &entry); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to record Shipment: "+err.Error())
		return
	}

	response.JSON(w, http.StatusCreated, "Shipment recorded successfully", entry)
}

// Update Entry godoc
// @Summary      Update a cashflow entry
// @Tags         cashflow
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Entry ID"
// @Param        request body domain.CashflowEntry true "Updated Entry Data"
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/{id} [put]
func (h *CashflowHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid entry ID")
		return
	}

	var entry domain.CashflowEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	entry.ID = id

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	if err := h.cashflowService.UpdateEntry(r.Context(), &entry, claims.UserID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update entry: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Entry updated successfully", entry)
}

// Delete Entry godoc
// @Summary      Delete a cashflow entry
// @Tags         cashflow
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Entry ID"
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/{id} [delete]
func (h *CashflowHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid entry ID")
		return
	}

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	if err := h.cashflowService.DeleteEntry(r.Context(), id, claims.UserID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to delete entry: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Entry deleted successfully", nil)
}

type UpdateStatusRequest struct {
	Remarks domain.PaymentStatus `json:"remarks"`
}

// Update Status godoc
// @Summary      Update payment status (Remarks)
// @Tags         cashflow
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        id path int true "Entry ID"
// @Param        request body UpdateStatusRequest true "Payment Status Data"
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/{id}/status [patch]
func (h *CashflowHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid entry ID")
		return
	}

	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	if err := h.cashflowService.UpdatePaymentStatus(r.Context(), id, req.Remarks, claims.UserID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to update payment status: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Payment status updated successfully", map[string]interface{}{
		"id":      id,
		"remarks": req.Remarks,
	})
}

// Get Summary godoc
// @Summary      Get dashboard cashflow summary
// @Tags         cashflow
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/summary [get]
func (h *CashflowHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	filter := extractListFilter(r)
	summary, err := h.cashflowService.GetSummary(r.Context(), filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve summary")
		return
	}
	response.JSON(w, http.StatusOK, "Summary retrieved", summary)
}

// Export Excel godoc
// @Summary      Export cashflow data to Excel
// @Tags         cashflow
// @Produce      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Security     BearerAuth
// @Success      200
// @Router       /cashflow/export [get]
func (h *CashflowHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	filter := extractListFilter(r)
	entries, _, err := h.cashflowService.GetDashboardData(r.Context(), 1, 100000, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve cashflow data")
		return
	}

	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()
	sheetName := "Sheet1"

	// 1. Style Header (Navy Blue #223249, Bold Putih, Center, Border)
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Color:  "FFFFFF",
			Size:   10,
			Family: "Calibri",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"223249"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
			WrapText:   true,
		},
		Border: []excelize.Border{
			{Type: "left", Color: "CBD5E1", Style: 1},
			{Type: "top", Color: "CBD5E1", Style: 1},
			{Type: "bottom", Color: "CBD5E1", Style: 1},
			{Type: "right", Color: "CBD5E1", Style: 1},
		},
	})

	// 2. Style Nominal Finansial (Rata Kanan, Indikator Ribuan #,##0, Border)
	numStyle, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: func() *string { s := "#,##0"; return &s }(),
		Font: &excelize.Font{
			Family: "Calibri",
			Size:   10,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	// 3. Style Tanggal & Status (Center Aligned, Border)
	centerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Family: "Calibri",
			Size:   10,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	// 4. Style Teks Biasa (Rata Kiri, Border)
	textStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Family: "Calibri",
			Size:   10,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
		Border: []excelize.Border{
			{Type: "left", Color: "E2E8F0", Style: 1},
			{Type: "top", Color: "E2E8F0", Style: 1},
			{Type: "bottom", Color: "E2E8F0", Style: 1},
			{Type: "right", Color: "E2E8F0", Style: 1},
		},
	})

	// Set Headers
	headers := []string{"KREDIT", "DEBIT", "SALDO", "DATE OF DEBIT", "ACT INFORMATION", "ACT EXPLAINATION", "VENDOR", "T O P", "DUE DATE", "GRAND COST", "GRAND SELLING", "PROFIT", "MARGIN IN %", "REMARKS"}
	f.SetRowHeight(sheetName, 1, 26)

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
		f.SetCellStyle(sheetName, cell, cell, headerStyle)
	}

	// Tulis Baris Data
	for i, entry := range entries {
		row := i + 2
		f.SetRowHeight(sheetName, row, 20)

		// Nominal Finansial (A, B, C) -> Right Aligned dengan Format #,##0
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), entry.Kredit)
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), numStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), entry.Debit)
		f.SetCellStyle(sheetName, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), numStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), entry.Saldo)
		f.SetCellStyle(sheetName, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), numStyle)

		// Tanggal (D) -> Format dd/mm/yyyy (02/01/2006), Center
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), entry.DateOfEntry.Format("02/01/2006"))
		f.SetCellStyle(sheetName, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), centerStyle)

		// Teks Informasi & Keterangan (E, F, G) -> Left
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), entry.ActInformation)
		f.SetCellStyle(sheetName, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), textStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), entry.ActExplaination)
		f.SetCellStyle(sheetName, fmt.Sprintf("F%d", row), fmt.Sprintf("F%d", row), textStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), entry.VendorNameRaw)
		f.SetCellStyle(sheetName, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), textStyle)

		// TOP (H) -> Center
		if entry.TopDays > 0 {
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("%d HARI", entry.TopDays))
		} else {
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), "-")
		}
		f.SetCellStyle(sheetName, fmt.Sprintf("H%d", row), fmt.Sprintf("H%d", row), centerStyle)

		// Due Date (I) -> Format dd/mm/yyyy (02/01/2006), Center
		if entry.DueDate != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), entry.DueDate.Format("02/01/2006"))
		} else {
			f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), "-")
		}
		f.SetCellStyle(sheetName, fmt.Sprintf("I%d", row), fmt.Sprintf("I%d", row), centerStyle)

		// Grand Cost, Grand Selling, Profit (J, K, L) -> Right Aligned #,##0
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), entry.GrandCost)
		f.SetCellStyle(sheetName, fmt.Sprintf("J%d", row), fmt.Sprintf("J%d", row), numStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), entry.GrandSelling)
		f.SetCellStyle(sheetName, fmt.Sprintf("K%d", row), fmt.Sprintf("K%d", row), numStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), entry.Profit)
		f.SetCellStyle(sheetName, fmt.Sprintf("L%d", row), fmt.Sprintf("L%d", row), numStyle)

		// Margin & Remarks (M, N) -> Center
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), fmt.Sprintf("%.2f%%", entry.MarginPct*100))
		f.SetCellStyle(sheetName, fmt.Sprintf("M%d", row), fmt.Sprintf("M%d", row), centerStyle)

		f.SetCellValue(sheetName, fmt.Sprintf("N%d", row), entry.Remarks)
		f.SetCellStyle(sheetName, fmt.Sprintf("N%d", row), fmt.Sprintf("N%d", row), centerStyle)
	}

	// Atur Lebar Kolom yang Proporsional dan Rapi
	f.SetColWidth(sheetName, "A", "C", 16)
	f.SetColWidth(sheetName, "D", "D", 14)
	f.SetColWidth(sheetName, "E", "F", 28)
	f.SetColWidth(sheetName, "G", "G", 22)
	f.SetColWidth(sheetName, "H", "H", 12)
	f.SetColWidth(sheetName, "I", "I", 14)
	f.SetColWidth(sheetName, "J", "L", 16)
	f.SetColWidth(sheetName, "M", "N", 14)

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="Cashflow_Export.xlsx"`)
	
	if err := f.Write(w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// Import Excel godoc
// @Summary      Import cashflow data from Excel
// @Tags         cashflow
// @Accept       multipart/form-data
// @Produce      json
// @Security     BearerAuth
// @Param        file formData file true "Excel File"
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/import [post]
func (h *CashflowHandler) ImportExcel(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
		response.Error(w, http.StatusBadRequest, "File too large or invalid form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "File is required")
		return
	}
	defer file.Close()

	claims := r.Context().Value(middleware.ClaimsKey).(*auth.Claims)
	if err := h.cashflowService.ProcessExcelImport(r.Context(), file, claims.UserID); err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to process excel import: "+err.Error())
		return
	}

	response.JSON(w, http.StatusOK, "Excel imported successfully", nil)
}
