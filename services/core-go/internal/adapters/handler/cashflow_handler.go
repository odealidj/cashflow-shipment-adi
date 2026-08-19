package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/auth"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/xuri/excelize/v2"
)

type CashflowHandler struct {
	cashflowService *services.CashflowService
}

func NewCashflowHandler(cashflowService *services.CashflowService) *CashflowHandler {
	return &CashflowHandler{cashflowService: cashflowService}
}

// List Cashflow godoc
// @Summary      Get dashboard cashflow entries
// @Tags         cashflow
// @Produce      json
// @Security     BearerAuth
// @Param        page query int false "Page number" default(1)
// @Param        limit query int false "Items per page" default(50)
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

	entries, total, err := h.cashflowService.GetDashboardData(r.Context(), page, limit)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to retrieve cashflow data")
		return
	}

	response.JSON(w, http.StatusOK, "Cashflow data retrieved", map[string]interface{}{
		"entries": entries,
		"total":   total,
		"page":    page,
		"limit":   limit,
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

// Get Summary godoc
// @Summary      Get dashboard cashflow summary
// @Tags         cashflow
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  response.APIResponse
// @Router       /cashflow/summary [get]
func (h *CashflowHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.cashflowService.GetSummary(r.Context())
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
	entries, _, err := h.cashflowService.GetDashboardData(r.Context(), 1, 100000)
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
	
	headers := []string{"Tanggal", "No", "Information", "Description", "Vendor", "T.O.P", "Due Date", "HPP", "Selling", "Kredit", "Debit", "Saldo", "Remarks"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	for i, entry := range entries {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), entry.DateOfEntry.Format("2006-01-02"))
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), entry.SequenceNo)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), entry.ActInformation)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), entry.ActExplaination)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), entry.VendorNameRaw)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), entry.TopDays)
		if entry.DueDate != nil {
			f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), entry.DueDate.Format("2006-01-02"))
		}
		f.SetCellValue(sheetName, fmt.Sprintf("H%d", row), entry.GrandCost)
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", row), entry.GrandSelling)
		f.SetCellValue(sheetName, fmt.Sprintf("J%d", row), entry.Kredit)
		f.SetCellValue(sheetName, fmt.Sprintf("K%d", row), entry.Debit)
		f.SetCellValue(sheetName, fmt.Sprintf("L%d", row), entry.Saldo)
		f.SetCellValue(sheetName, fmt.Sprintf("M%d", row), entry.Remarks)
	}

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
