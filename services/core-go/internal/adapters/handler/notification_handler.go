package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/middleware"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
	invoiceRepo         ports.InvoiceRepository
}

func NewNotificationHandler(notificationService *services.NotificationService, invoiceRepo ports.InvoiceRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
		invoiceRepo:         invoiceRepo,
	}
}

// List Notifications godoc
// @Summary      Get notifications feed for current user
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        page query int false "Page number" default(1)
// @Param        limit query int false "Items per page" default(20)
// @Param        category query string false "Filter by category (INVOICE, CASHFLOW, VENDOR, SHIPMENT, SYSTEM)"
// @Param        severity query string false "Filter by severity (CRITICAL, WARNING, INFO)"
// @Param        unread_only query bool false "Only show unread notifications"
// @Param        search query string false "Search query"
// @Success      200 {object} response.APIResponse
// @Router       /notifications [get]
func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	}

	unreadOnly := r.URL.Query().Get("unread_only") == "true"
	searchParam := r.URL.Query().Get("search")
	var search *string
	if strings.TrimSpace(searchParam) != "" {
		trimmed := strings.TrimSpace(searchParam)
		search = &trimmed
	}

	categoryParam := r.URL.Query().Get("category")
	var category *domain.NotificationCategory
	if strings.TrimSpace(categoryParam) != "" {
		cat := domain.NotificationCategory(strings.ToUpper(strings.TrimSpace(categoryParam)))
		category = &cat
	}

	severityParam := r.URL.Query().Get("severity")
	var severity *domain.NotificationSeverity
	if strings.TrimSpace(severityParam) != "" {
		sev := domain.NotificationSeverity(strings.ToUpper(strings.TrimSpace(severityParam)))
		severity = &sev
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	userRole := string(middleware.GetUserRoleFromContext(r.Context()))

	offset := (page - 1) * limit
	filter := ports.NotificationFilter{
		Category:   category,
		Severity:   severity,
		UnreadOnly: unreadOnly,
		Search:     search,
	}

	notifications, total, err := h.notificationService.List(r.Context(), &userID, userRole, offset, limit, filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Daftar notifikasi berhasil diambil", notifications, page, limit, total)
}

// GetUnreadCount godoc
// @Summary      Get unread notifications count
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} response.APIResponse
// @Router       /notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	userRole := string(middleware.GetUserRoleFromContext(r.Context()))

	count, err := h.notificationService.GetUnreadCount(r.Context(), &userID, userRole)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Jumlah notifikasi belum dibaca berhasil diambil", map[string]int{
		"unread_count": count,
	})
}

// MarkAsRead godoc
// @Summary      Mark a notification as read
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Notification UUID"
// @Success      200 {object} response.APIResponse
// @Router       /notifications/{id}/read [patch]
func (h *NotificationHandler) MarkAsRead(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID notifikasi tidak valid")
		return
	}

	userID := middleware.GetUserIDFromContext(r.Context())
	err = h.notificationService.MarkAsRead(r.Context(), id, &userID)
	if err != nil {
		response.HandleError(w, err, http.StatusBadRequest)
		return
	}

	response.JSON(w, http.StatusOK, "Notifikasi telah ditandai sebagai dibaca", nil)
}

// MarkAllAsRead godoc
// @Summary      Mark all notifications as read for current user/role
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} response.APIResponse
// @Router       /notifications/read-all [post]
func (h *NotificationHandler) MarkAllAsRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	userRole := string(middleware.GetUserRoleFromContext(r.Context()))

	err := h.notificationService.MarkAllAsRead(r.Context(), &userID, userRole)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Semua notifikasi berhasil ditandai sebagai telah dibaca", nil)
}

// Delete godoc
// @Summary      Delete a notification
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Param        id path string true "Notification UUID"
// @Success      200 {object} response.APIResponse
// @Router       /notifications/{id} [delete]
func (h *NotificationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Format ID notifikasi tidak valid")
		return
	}

	err = h.notificationService.Delete(r.Context(), id)
	if err != nil {
		response.HandleError(w, err, http.StatusBadRequest)
		return
	}

	response.JSON(w, http.StatusOK, "Notifikasi berhasil dihapus", nil)
}

// TriggerCheckInvoices godoc
// @Summary      Trigger scan for due and overdue invoices
// @Tags         notifications
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} response.APIResponse
// @Router       /notifications/check-invoices [post]
func (h *NotificationHandler) TriggerCheckInvoices(w http.ResponseWriter, r *http.Request) {
	if h.invoiceRepo == nil {
		response.Error(w, http.StatusInternalServerError, "Invoice repository belum dihubungkan")
		return
	}

	count, err := h.notificationService.CheckInvoiceDueDates(r.Context(), h.invoiceRepo)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Pemindaian jatuh tempo invoice berhasil diproses", map[string]int{
		"dispatched_count": count,
	})
}
