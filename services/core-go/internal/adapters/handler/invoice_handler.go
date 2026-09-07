package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/dateutil"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/xuri/excelize/v2"
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
		SortDir: "DESC",
		SortBy:  "created_at",
	}

	if sd := strings.ToUpper(strings.TrimSpace(q.Get("sort_dir"))); sd != "" {
		if sd == "ASC" {
			filter.SortDir = "ASC"
		} else {
			filter.SortDir = "DESC"
		}
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
// @Param        X-API-Version header string false "API Version (default: v1)"
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
// @Param        X-API-Version header string false "API Version (default: v1)"
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
// @Param        X-API-Version header string false "API Version (default: v1)"
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
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
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
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
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
// @Summary      Mark invoice as paid / Settle invoice
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Router       /invoices/{id}/pay [patch]
func (h *InvoiceHandler) MarkPaid(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	var input services.SettleInvoiceInput
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&input)
	}

	session := middleware.GetUserSessionFromContext(r.Context())
	if session != nil {
		input.CreatedBy = &session.UserID
		if session.FullName != "" {
			input.CreatedByName = session.FullName
		}
	}

	inv, err := h.invoiceService.SettleInvoice(r.Context(), id, input)
	if err != nil {
		response.HandleError(w, err, http.StatusBadRequest)
		return
	}

	response.JSON(w, http.StatusOK, "Invoice berhasil dilunasi", inv)
}

// Reschedule Due Date godoc
// @Summary      Reschedule invoice due date with audit reason
// @Tags         invoices
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Router       /invoices/{id}/reschedule [post]
func (h *InvoiceHandler) RescheduleDueDate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	var input services.RescheduleDueDateInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.Error(w, http.StatusBadRequest, "Payload request tidak valid")
		return
	}

	session := middleware.GetUserSessionFromContext(r.Context())
	if session != nil {
		input.ChangedBy = &session.UserID
		if session.FullName != "" {
			input.ChangedByName = session.FullName
		}
	}

	inv, err := h.invoiceService.RescheduleDueDate(r.Context(), id, input)
	if err != nil {
		response.HandleError(w, err, http.StatusBadRequest)
		return
	}

	response.JSON(w, http.StatusOK, "Tanggal jatuh tempo invoice berhasil diperpanjang", inv)
}

// Get Invoice History godoc
// @Summary      Get full audit trail history of an invoice
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Router       /invoices/{id}/history [get]
func (h *InvoiceHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID tidak valid")
		return
	}

	history, err := h.invoiceService.GetInvoiceHistory(r.Context(), id)
	if err != nil {
		response.HandleError(w, err, http.StatusNotFound)
		return
	}

	response.JSON(w, http.StatusOK, "Riwayat invoice berhasil dimuat", history)
}

// Delete Invoice (Soft Delete) godoc
// @Summary      Soft delete invoice
// @Tags         invoices
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
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

func formatDateIndo(t time.Time) string {
	return dateutil.FormatDateIndo(t)
}

func formatTopTerms(inv domain.Invoice) string {
	if inv.TopTerms != "" {
		return inv.TopTerms
	}
	if inv.TopDays == 0 {
		return "COD (Cash on Delivery)"
	}
	if inv.TopDays > 0 {
		return fmt.Sprintf("Net %d Hari", inv.TopDays)
	}
	return "-"
}

func formatPeriodLabel(dateFrom, dateTo *string) string {
	if (dateFrom == nil || *dateFrom == "") && (dateTo == nil || *dateTo == "") {
		return "Semua Periode"
	}
	formatStr := func(s *string) string {
		if s == nil || *s == "" {
			return ""
		}
		t, err := time.Parse("2006-01-02", *s)
		if err != nil {
			return *s
		}
		return formatDateIndo(t)
	}
	if dateFrom != nil && *dateFrom != "" && dateTo != nil && *dateTo != "" {
		return fmt.Sprintf("%s s/d %s", formatStr(dateFrom), formatStr(dateTo))
	}
	if dateFrom != nil && *dateFrom != "" {
		return fmt.Sprintf("Mulai %s", formatStr(dateFrom))
	}
	return fmt.Sprintf("Sampai %s", formatStr(dateTo))
}

func formatStatusLabel(st *domain.InvoiceStatus) string {
	if st == nil || *st == "" {
		return "Aktif / Berjalan (Semua Status)"
	}
	switch *st {
	case domain.InvoiceStatusPaid:
		return "Lunas"
	case domain.InvoiceStatusUnpaid:
		return "Menunggu Pembayaran"
	case domain.InvoiceStatusOverdue:
		return "Jatuh Tempo (Overdue)"
	default:
		return string(*st)
	}
}

// ExportExcel godoc
// @Summary      Export invoice recap data to Excel
// @Tags         invoices
// @Produce      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// @Security     BearerAuth
// @Router       /invoices/export [get]
func (h *InvoiceHandler) ExportExcel(w http.ResponseWriter, r *http.Request) {
	filter := extractInvoiceFilter(r)
	invoices, _, err := h.invoiceService.ListInvoices(r.Context(), 1, 100000, filter)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Gagal mengambil data invoice untuk ekspor")
		return
	}

	var totalAmount, paidAmount, unpaidAmount, overdueAmount float64
	var totalCount, paidCount, unpaidCount, overdueCount int
	for _, inv := range invoices {
		totalAmount += inv.Amount
		totalCount++
		switch inv.Status {
		case domain.InvoiceStatusPaid:
			paidAmount += inv.Amount
			paidCount++
		case domain.InvoiceStatusUnpaid:
			unpaidAmount += inv.Amount
			unpaidCount++
		case domain.InvoiceStatusOverdue:
			overdueAmount += inv.Amount
			overdueCount++
		}
	}

	f := excelize.NewFile()
	defer func() {
		_ = f.Close()
	}()
	sheetName := "Rekapitulasi Invoice"
	f.SetSheetName("Sheet1", sheetName)

	// Styles
	companyTitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   14,
			Color:  "1A365D",
			Family: "Calibri",
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})

	taglineStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   10,
			Color:  "4A5568",
			Family: "Calibri",
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})

	addressStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Size:   8.5,
			Color:  "64748B",
			Family: "Calibri",
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})

	borderDoubleBottomStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "bottom", Color: "1A365D", Style: 6}, // Double border
		},
	})

	docTitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   13,
			Color:  "1A365D",
			Family: "Calibri",
		},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
	})

	docSubtitleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Italic: true,
			Size:   9.5,
			Color:  "4A5568",
			Family: "Calibri",
		},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
	})

	metaStyleLeft, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   9,
			Color:  "1A365D",
			Family: "Calibri",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"F1F5F9"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "left",
			Vertical:   "center",
		},
	})

	metaStyleCenter, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   9,
			Color:  "1A365D",
			Family: "Calibri",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"F1F5F9"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})

	metaStyleRight, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:   true,
			Size:   9,
			Color:  "1A365D",
			Family: "Calibri",
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"F1F5F9"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "right",
			Vertical:   "center",
		},
	})

	// KPI Card Styles Helper
	createKpiStyles := func(bgHex, fontHex string) (headerStyle, valueStyle, subStyle int) {
		h, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 8.5, Color: fontHex, Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "top", Color: "E2E8F0", Style: 1},
				{Type: "left", Color: "E2E8F0", Style: 1},
				{Type: "right", Color: "E2E8F0", Style: 1},
			},
		})
		v, _ := f.NewStyle(&excelize.Style{
			CustomNumFmt: func() *string { s := `"Rp "#,##0`; return &s }(),
			Font: &excelize.Font{Bold: true, Size: 12, Color: fontHex, Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "E2E8F0", Style: 1},
				{Type: "right", Color: "E2E8F0", Style: 1},
			},
		})
		s, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Size: 8, Color: "64748B", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "bottom", Color: "E2E8F0", Style: 1},
				{Type: "left", Color: "E2E8F0", Style: 1},
				{Type: "right", Color: "E2E8F0", Style: 1},
			},
		})
		return h, v, s
	}

	kpi1Header, kpi1Value, kpi1Sub := createKpiStyles("F8FAFC", "1A365D") // Total Tagihan
	kpi2Header, kpi2Value, kpi2Sub := createKpiStyles("F0FDF4", "166534") // Lunas
	kpi3Header, kpi3Value, kpi3Sub := createKpiStyles("FFFBEB", "C2410C") // Unpaid
	kpi4Header, kpi4Value, kpi4Sub := createKpiStyles("FEF2F2", "B91C1C") // Overdue

	// Table Header Style (Dark Navy #1A365D)
	tblHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 9, Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"1A365D"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})
	tblHeaderLeftStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 9, Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"1A365D"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})
	tblHeaderRightStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF", Size: 9, Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"1A365D"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})

	// Data Row Styles Helper
	createDataStyles := func(bgHex string) (centerStyle, boldLeftStyle, amountStyle, statusPaidStyle, statusOverdueStyle, statusUnpaidStyle int) {
		cs, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Size: 9, Color: "2D3748", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		bl, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 9, Color: "2D3748", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		am, _ := f.NewStyle(&excelize.Style{
			CustomNumFmt: func() *string { s := `"Rp "#,##0`; return &s }(),
			Font: &excelize.Font{Bold: true, Size: 9, Color: "2D3748", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		sp, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 9, Color: "166534", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		so, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 9, Color: "B91C1C", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		su, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 9, Color: "C2410C", Family: "Calibri"},
			Fill: excelize.Fill{Type: "pattern", Color: []string{bgHex}, Pattern: 1},
			Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
			Border: []excelize.Border{
				{Type: "left", Color: "CBD5E0", Style: 1},
				{Type: "top", Color: "CBD5E0", Style: 1},
				{Type: "bottom", Color: "CBD5E0", Style: 1},
				{Type: "right", Color: "CBD5E0", Style: 1},
			},
		})
		return cs, bl, am, sp, so, su
	}

	evenCenter, evenBoldLeft, evenAmtStyle, evenPaidStyle, evenOverdueStyle, evenUnpaidStyle := createDataStyles("FFFFFF")
	oddCenter, oddBoldLeft, oddAmtStyle, oddPaidStyle, oddOverdueStyle, oddUnpaidStyle := createDataStyles("F8FAFC")
	odCenter, odBoldLeft, odAmtStyle, odPaidStyle, odOverdueStyle, odUnpaidStyle := createDataStyles("FEF2F2")

	// Total Row Style (Background #EDF2F7, Bold #1A365D)
	totalLabelStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 9, Color: "1A365D", Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"EDF2F7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})
	totalAmountStyle, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: func() *string { s := `"Rp "#,##0`; return &s }(),
		Font: &excelize.Font{Bold: true, Size: 9, Color: "1A365D", Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"EDF2F7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})
	totalCountStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 8.5, Color: "1A365D", Family: "Calibri"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"EDF2F7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "top", Color: "CBD5E0", Style: 1},
			{Type: "bottom", Color: "CBD5E0", Style: 1},
			{Type: "left", Color: "CBD5E0", Style: 1},
			{Type: "right", Color: "CBD5E0", Style: 1},
		},
	})

	// Signatures Styles
	sigHeaderStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: false, Size: 9.5, Color: "2D3748", Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	sigLineStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 9.5, Color: "2D3748", Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "bottom"},
	})
	sigRoleStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Italic: true, Size: 9, Color: "4A5568", Family: "Calibri"},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "top"},
	})

	// Set Row Heights
	f.SetRowHeight(sheetName, 1, 22)
	f.SetRowHeight(sheetName, 2, 16)
	f.SetRowHeight(sheetName, 3, 16)
	f.SetRowHeight(sheetName, 4, 16)
	f.SetRowHeight(sheetName, 5, 8)
	f.SetRowHeight(sheetName, 6, 20)
	f.SetRowHeight(sheetName, 7, 16)
	f.SetRowHeight(sheetName, 8, 22)
	f.SetRowHeight(sheetName, 9, 8)
	f.SetRowHeight(sheetName, 10, 18)
	f.SetRowHeight(sheetName, 11, 24)
	f.SetRowHeight(sheetName, 12, 16)
	f.SetRowHeight(sheetName, 13, 8)
	f.SetRowHeight(sheetName, 14, 24)

	// Write Kop Surat
	f.MergeCell(sheetName, "B1", "H1")
	f.SetCellValue(sheetName, "B1", "PT ADIJAYANTARA LOGISTIC INDONESIA")
	f.SetCellStyle(sheetName, "B1", "H1", companyTitleStyle)

	f.MergeCell(sheetName, "B2", "H2")
	f.SetCellValue(sheetName, "B2", "Freight Forwarding & Logistics Services")
	f.SetCellStyle(sheetName, "B2", "H2", taglineStyle)

	f.MergeCell(sheetName, "B3", "H3")
	f.SetCellValue(sheetName, "B3", "WISMA SMR JL YOS SUDARSO, Kav. 89 Lantai 9, UNIT 904, Jakarta Utara 14350")
	f.SetCellStyle(sheetName, "B3", "H3", addressStyle)

	f.MergeCell(sheetName, "B4", "H4")
	f.SetCellValue(sheetName, "B4", "Email: adijantara.logistic@gmail.com")
	f.SetCellStyle(sheetName, "B4", "H4", addressStyle)

	// Row 5: Border double bottom
	for c := 1; c <= 9; c++ {
		cell, _ := excelize.CoordinatesToCellName(c, 5)
		f.SetCellStyle(sheetName, cell, cell, borderDoubleBottomStyle)
	}

	// Insert Logo at Top Right (I1)
	if logoPath := findLogoPath(); logoPath != "" {
		enable := true
		_ = f.AddPicture(sheetName, "I1", logoPath, &excelize.GraphicOptions{
			ScaleX:          0.12,
			ScaleY:          0.12,
			OffsetX:         10,
			OffsetY:         4,
			LockAspectRatio: true,
			PrintObject:     &enable,
			Positioning:     "oneCell",
		})
	}

	// Document Title & Subtitle (Row 6 & 7)
	f.MergeCell(sheetName, "A6", "I6")
	f.SetCellValue(sheetName, "A6", "DAFTAR REKAPITULASI INVOICE & PIUTANG")
	f.SetCellStyle(sheetName, "A6", "I6", docTitleStyle)

	f.MergeCell(sheetName, "A7", "I7")
	f.SetCellValue(sheetName, "A7", "Laporan Pengiriman, Syarat Pembayaran (TOP), dan Jatuh Tempo Tagihan")
	f.SetCellStyle(sheetName, "A7", "I7", docSubtitleStyle)

	// Metadata Row 8
	periodText := "Periode: " + formatPeriodLabel(filter.DateFrom, filter.DateTo)
	statusText := "Status: " + formatStatusLabel(filter.Status)
	now := time.Now()
	printDateText := "Tanggal Cetak: " + formatDateIndo(now)

	f.MergeCell(sheetName, "A8", "C8")
	f.SetCellValue(sheetName, "A8", periodText)
	f.SetCellStyle(sheetName, "A8", "C8", metaStyleLeft)

	f.MergeCell(sheetName, "D8", "F8")
	f.SetCellValue(sheetName, "D8", statusText)
	f.SetCellStyle(sheetName, "D8", "F8", metaStyleCenter)

	f.MergeCell(sheetName, "G8", "I8")
	f.SetCellValue(sheetName, "G8", printDateText)
	f.SetCellStyle(sheetName, "G8", "I8", metaStyleRight)

	// 4 Summary KPI Cards (Rows 10-12)
	// Card 1: Total Tagihan
	f.MergeCell(sheetName, "A10", "B10")
	f.SetCellValue(sheetName, "A10", "TOTAL TAGIHAN")
	f.SetCellStyle(sheetName, "A10", "B10", kpi1Header)

	f.MergeCell(sheetName, "A11", "B11")
	f.SetCellValue(sheetName, "A11", totalAmount)
	f.SetCellStyle(sheetName, "A11", "B11", kpi1Value)

	f.MergeCell(sheetName, "A12", "B12")
	f.SetCellValue(sheetName, "A12", fmt.Sprintf("%d Invoice tercatat", totalCount))
	f.SetCellStyle(sheetName, "A12", "B12", kpi1Sub)

	// Card 2: Terbayar (Lunas)
	f.MergeCell(sheetName, "C10", "D10")
	f.SetCellValue(sheetName, "C10", "TERBAYAR (LUNAS)")
	f.SetCellStyle(sheetName, "C10", "D10", kpi2Header)

	f.MergeCell(sheetName, "C11", "D11")
	f.SetCellValue(sheetName, "C11", paidAmount)
	f.SetCellStyle(sheetName, "C11", "D11", kpi2Value)

	f.MergeCell(sheetName, "C12", "D12")
	f.SetCellValue(sheetName, "C12", fmt.Sprintf("%d Invoice terselesaikan", paidCount))
	f.SetCellStyle(sheetName, "C12", "D12", kpi2Sub)

	// Card 3: Menunggu Pembayaran
	f.MergeCell(sheetName, "E10", "F10")
	f.SetCellValue(sheetName, "E10", "MENUNGGU PEMBAYARAN")
	f.SetCellStyle(sheetName, "E10", "F10", kpi3Header)

	f.MergeCell(sheetName, "E11", "F11")
	f.SetCellValue(sheetName, "E11", unpaidAmount)
	f.SetCellStyle(sheetName, "E11", "F11", kpi3Value)

	f.MergeCell(sheetName, "E12", "F12")
	f.SetCellValue(sheetName, "E12", fmt.Sprintf("%d Invoice kredit berjalan", unpaidCount))
	f.SetCellStyle(sheetName, "E12", "F12", kpi3Sub)

	// Card 4: Jatuh Tempo (Overdue)
	f.MergeCell(sheetName, "G10", "I10")
	f.SetCellValue(sheetName, "G10", "JATUH TEMPO (OVERDUE)")
	f.SetCellStyle(sheetName, "G10", "I10", kpi4Header)

	f.MergeCell(sheetName, "G11", "I11")
	f.SetCellValue(sheetName, "G11", overdueAmount)
	f.SetCellStyle(sheetName, "G11", "I11", kpi4Value)

	f.MergeCell(sheetName, "G12", "I12")
	f.SetCellValue(sheetName, "G12", fmt.Sprintf("%d Invoice melewati tempo", overdueCount))
	f.SetCellStyle(sheetName, "G12", "I12", kpi4Sub)

	// Row 14: Table Headers
	f.SetCellValue(sheetName, "A14", "No")
	f.SetCellStyle(sheetName, "A14", "A14", tblHeaderStyle)

	f.SetCellValue(sheetName, "B14", "No. Invoice")
	f.SetCellStyle(sheetName, "B14", "B14", tblHeaderLeftStyle)

	f.SetCellValue(sheetName, "C14", "Nama Klien / Perusahaan")
	f.SetCellStyle(sheetName, "C14", "C14", tblHeaderLeftStyle)

	f.SetCellValue(sheetName, "D14", "Tgl Pengiriman")
	f.SetCellStyle(sheetName, "D14", "D14", tblHeaderStyle)

	f.SetCellValue(sheetName, "E14", "TOP (Terms)")
	f.SetCellStyle(sheetName, "E14", "E14", tblHeaderStyle)

	f.SetCellValue(sheetName, "F14", "Tgl Jatuh Tempo")
	f.SetCellStyle(sheetName, "F14", "F14", tblHeaderStyle)

	f.SetCellValue(sheetName, "G14", "Nominal Tagihan")
	f.SetCellStyle(sheetName, "G14", "G14", tblHeaderRightStyle)

	f.SetCellValue(sheetName, "H14", "Status")
	f.SetCellStyle(sheetName, "H14", "H14", tblHeaderStyle)

	f.SetCellValue(sheetName, "I14", "Tgl. Pelunasan")
	f.SetCellStyle(sheetName, "I14", "I14", tblHeaderStyle)

	// Data Rows (Row 15 onwards)
	startRow := 15
	for idx, inv := range invoices {
		rNum := startRow + idx
		f.SetRowHeight(sheetName, rNum, 20)

		var cStyle, blStyle, amStyle, stPaidStyle, stOverdueStyle, stUnpaidStyle int
		if inv.Status == domain.InvoiceStatusOverdue {
			cStyle, blStyle, amStyle, stPaidStyle, stOverdueStyle, stUnpaidStyle = odCenter, odBoldLeft, odAmtStyle, odPaidStyle, odOverdueStyle, odUnpaidStyle
		} else if idx%2 == 1 {
			cStyle, blStyle, amStyle, stPaidStyle, stOverdueStyle, stUnpaidStyle = oddCenter, oddBoldLeft, oddAmtStyle, oddPaidStyle, oddOverdueStyle, oddUnpaidStyle
		} else {
			cStyle, blStyle, amStyle, stPaidStyle, stOverdueStyle, stUnpaidStyle = evenCenter, evenBoldLeft, evenAmtStyle, evenPaidStyle, evenOverdueStyle, evenUnpaidStyle
		}

		// A: No
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", rNum), idx+1)
		f.SetCellStyle(sheetName, fmt.Sprintf("A%d", rNum), fmt.Sprintf("A%d", rNum), cStyle)

		// B: No. Invoice
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", rNum), inv.InvoiceNo)
		f.SetCellStyle(sheetName, fmt.Sprintf("B%d", rNum), fmt.Sprintf("B%d", rNum), blStyle)

		// C: Nama Klien / Perusahaan
		clientDisplay := inv.ClientName
		if inv.Notes != "" {
			clientDisplay = fmt.Sprintf("%s (%s)", inv.ClientName, inv.Notes)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", rNum), clientDisplay)
		f.SetCellStyle(sheetName, fmt.Sprintf("C%d", rNum), fmt.Sprintf("C%d", rNum), blStyle)

		// D: Tgl Pengiriman
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", rNum), formatDateIndo(inv.ShipmentDate))
		f.SetCellStyle(sheetName, fmt.Sprintf("D%d", rNum), fmt.Sprintf("D%d", rNum), cStyle)

		// E: TOP (Terms)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", rNum), formatTopTerms(inv))
		f.SetCellStyle(sheetName, fmt.Sprintf("E%d", rNum), fmt.Sprintf("E%d", rNum), cStyle)

		// F: Tgl Jatuh Tempo
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", rNum), formatDateIndo(inv.DueDate))
		f.SetCellStyle(sheetName, fmt.Sprintf("F%d", rNum), fmt.Sprintf("F%d", rNum), cStyle)

		// G: Nominal Tagihan
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", rNum), inv.Amount)
		f.SetCellStyle(sheetName, fmt.Sprintf("G%d", rNum), fmt.Sprintf("G%d", rNum), amStyle)

		// H: Status
		switch inv.Status {
		case domain.InvoiceStatusPaid:
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", rNum), "Lunas")
			f.SetCellStyle(sheetName, fmt.Sprintf("H%d", rNum), fmt.Sprintf("H%d", rNum), stPaidStyle)
		case domain.InvoiceStatusOverdue:
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", rNum), "Jatuh Tempo (Overdue)")
			f.SetCellStyle(sheetName, fmt.Sprintf("H%d", rNum), fmt.Sprintf("H%d", rNum), stOverdueStyle)
		default:
			f.SetCellValue(sheetName, fmt.Sprintf("H%d", rNum), "Menunggu Pembayaran")
			f.SetCellStyle(sheetName, fmt.Sprintf("H%d", rNum), fmt.Sprintf("H%d", rNum), stUnpaidStyle)
		}

		// I: Tgl. Pelunasan
		paidAtDisplay := "-"
		if inv.PaidAt != nil && !inv.PaidAt.IsZero() {
			paidAtDisplay = formatDateIndo(*inv.PaidAt)
		}
		f.SetCellValue(sheetName, fmt.Sprintf("I%d", rNum), paidAtDisplay)
		f.SetCellStyle(sheetName, fmt.Sprintf("I%d", rNum), fmt.Sprintf("I%d", rNum), cStyle)
	}

	// Total Row
	sumRow := startRow + len(invoices)
	f.SetRowHeight(sheetName, sumRow, 22)

	for c := 1; c <= 6; c++ {
		cell, _ := excelize.CoordinatesToCellName(c, sumRow)
		f.SetCellStyle(sheetName, cell, cell, totalLabelStyle)
	}
	f.MergeCell(sheetName, fmt.Sprintf("A%d", sumRow), fmt.Sprintf("F%d", sumRow))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", sumRow), "TOTAL KESELURUHAN INVOICE:")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", sumRow), fmt.Sprintf("F%d", sumRow), totalLabelStyle)

	f.SetCellValue(sheetName, fmt.Sprintf("G%d", sumRow), totalAmount)
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", sumRow), fmt.Sprintf("G%d", sumRow), totalAmountStyle)

	f.SetCellValue(sheetName, fmt.Sprintf("H%d", sumRow), fmt.Sprintf("%d Tagihan", len(invoices)))
	f.SetCellStyle(sheetName, fmt.Sprintf("H%d", sumRow), fmt.Sprintf("H%d", sumRow), totalCountStyle)

	f.SetCellStyle(sheetName, fmt.Sprintf("I%d", sumRow), fmt.Sprintf("I%d", sumRow), totalLabelStyle)

	// Signature Section
	sigStartRow := sumRow + 3
	f.SetRowHeight(sheetName, sigStartRow, 18)
	f.SetRowHeight(sheetName, sigStartRow+1, 20)
	f.SetRowHeight(sheetName, sigStartRow+2, 20)
	f.SetRowHeight(sheetName, sigStartRow+3, 20)
	f.SetRowHeight(sheetName, sigStartRow+4, 20)
	f.SetRowHeight(sheetName, sigStartRow+5, 18)

	// Headers
	f.MergeCell(sheetName, fmt.Sprintf("A%d", sigStartRow), fmt.Sprintf("C%d", sigStartRow))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", sigStartRow), "Dibuat Oleh,")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", sigStartRow), fmt.Sprintf("C%d", sigStartRow), sigHeaderStyle)

	f.MergeCell(sheetName, fmt.Sprintf("D%d", sigStartRow), fmt.Sprintf("F%d", sigStartRow))
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", sigStartRow), "Diperiksa Oleh,")
	f.SetCellStyle(sheetName, fmt.Sprintf("D%d", sigStartRow), fmt.Sprintf("F%d", sigStartRow), sigHeaderStyle)

	f.MergeCell(sheetName, fmt.Sprintf("G%d", sigStartRow), fmt.Sprintf("I%d", sigStartRow))
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", sigStartRow), "Disetujui Oleh,")
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", sigStartRow), fmt.Sprintf("I%d", sigStartRow), sigHeaderStyle)

	// Underlines
	f.MergeCell(sheetName, fmt.Sprintf("A%d", sigStartRow+4), fmt.Sprintf("C%d", sigStartRow+4))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", sigStartRow+4), "( _______________________ )")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", sigStartRow+4), fmt.Sprintf("C%d", sigStartRow+4), sigLineStyle)

	f.MergeCell(sheetName, fmt.Sprintf("D%d", sigStartRow+4), fmt.Sprintf("F%d", sigStartRow+4))
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", sigStartRow+4), "( _______________________ )")
	f.SetCellStyle(sheetName, fmt.Sprintf("D%d", sigStartRow+4), fmt.Sprintf("F%d", sigStartRow+4), sigLineStyle)

	f.MergeCell(sheetName, fmt.Sprintf("G%d", sigStartRow+4), fmt.Sprintf("I%d", sigStartRow+4))
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", sigStartRow+4), "( _______________________ )")
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", sigStartRow+4), fmt.Sprintf("I%d", sigStartRow+4), sigLineStyle)

	// Roles
	f.MergeCell(sheetName, fmt.Sprintf("A%d", sigStartRow+5), fmt.Sprintf("C%d", sigStartRow+5))
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", sigStartRow+5), "Staff Finance & Billing")
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", sigStartRow+5), fmt.Sprintf("C%d", sigStartRow+5), sigRoleStyle)

	f.MergeCell(sheetName, fmt.Sprintf("D%d", sigStartRow+5), fmt.Sprintf("F%d", sigStartRow+5))
	f.SetCellValue(sheetName, fmt.Sprintf("D%d", sigStartRow+5), "Supervisor Keuangan")
	f.SetCellStyle(sheetName, fmt.Sprintf("D%d", sigStartRow+5), fmt.Sprintf("F%d", sigStartRow+5), sigRoleStyle)

	f.MergeCell(sheetName, fmt.Sprintf("G%d", sigStartRow+5), fmt.Sprintf("I%d", sigStartRow+5))
	f.SetCellValue(sheetName, fmt.Sprintf("G%d", sigStartRow+5), "Finance Manager")
	f.SetCellStyle(sheetName, fmt.Sprintf("G%d", sigStartRow+5), fmt.Sprintf("I%d", sigStartRow+5), sigRoleStyle)

	// Set Column Widths
	f.SetColWidth(sheetName, "A", "A", 6)
	f.SetColWidth(sheetName, "B", "B", 20)
	f.SetColWidth(sheetName, "C", "C", 32)
	f.SetColWidth(sheetName, "D", "D", 15)
	f.SetColWidth(sheetName, "E", "E", 16)
	f.SetColWidth(sheetName, "F", "F", 16)
	f.SetColWidth(sheetName, "G", "G", 22)
	f.SetColWidth(sheetName, "H", "H", 20)
	f.SetColWidth(sheetName, "I", "I", 16)

	filename := "Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic.xlsx"
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))

	if err := f.Write(w); err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
	}
}

