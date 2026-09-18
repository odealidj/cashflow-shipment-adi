package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type AuditHandler struct {
	auditService *services.AuditService
}

func NewAuditHandler(auditService *services.AuditService) *AuditHandler {
	return &AuditHandler{auditService: auditService}
}

func extractAuditFilter(r *http.Request) domain.AuditLogFilter {
	q := r.URL.Query()
	var filter domain.AuditLogFilter

	if actorIDStr := strings.TrimSpace(q.Get("actor_id")); actorIDStr != "" {
		if uid, err := uuid.Parse(actorIDStr); err == nil {
			filter.ActorID = &uid
		}
	}
	if actorName := strings.TrimSpace(q.Get("actor_name")); actorName != "" {
		filter.ActorName = &actorName
	}
	if actionStr := strings.TrimSpace(q.Get("action")); actionStr != "" {
		act := domain.AuditAction(actionStr)
		filter.Action = &act
	}
	if entityType := strings.TrimSpace(q.Get("entity_type")); entityType != "" {
		filter.EntityType = &entityType
	}
	if severityStr := strings.TrimSpace(q.Get("severity")); severityStr != "" {
		sev := domain.AuditSeverity(strings.ToUpper(severityStr))
		filter.Severity = &sev
	}
	if minLagStr := strings.TrimSpace(q.Get("min_lag_days")); minLagStr != "" {
		if val, err := strconv.Atoi(minLagStr); err == nil {
			filter.MinLagDays = &val
		}
	}
	if sDate := strings.TrimSpace(q.Get("start_date")); sDate != "" {
		if t, err := time.Parse("2006-01-02", sDate); err == nil {
			filter.StartDate = &t
		}
	}
	if eDate := strings.TrimSpace(q.Get("end_date")); eDate != "" {
		if t, err := time.Parse("2006-01-02", eDate); err == nil {
			filter.EndDate = &t
		}
	}
	if s := strings.TrimSpace(q.Get("search")); s != "" {
		filter.Search = &s
	}

	return filter
}

// GetSummary godoc
// @Summary      Get Executive Audit Summary KPI
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/summary [get]
func (h *AuditHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	filter := extractAuditFilter(r)
	summary, err := h.auditService.GetSummaryKPI(r.Context(), filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	response.JSON(w, http.StatusOK, "Audit summary KPI retrieved", summary)
}

// GetStaffScorecard godoc
// @Summary      Get Staff SLA & Input Discipline Scorecard
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/staff-scorecard [get]
func (h *AuditHandler) GetStaffScorecard(w http.ResponseWriter, r *http.Request) {
	filter := extractAuditFilter(r)
	items, err := h.auditService.GetStaffSLAPerformance(r.Context(), filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	response.JSON(w, http.StatusOK, "Staff SLA performance scorecard retrieved", items)
}

// GetAnomalies godoc
// @Summary      Get Fraud & Margin Anomalies
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/anomalies [get]
func (h *AuditHandler) GetAnomalies(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	filter := extractAuditFilter(r)
	items, total, err := h.auditService.GetFraudAnomalies(r.Context(), page, limit, filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Fraud and margin anomalies retrieved", items, page, limit, total)
}

// GetInputLag godoc
// @Summary      Get Input Lag and Delay Records
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/input-lag [get]
func (h *AuditHandler) GetInputLag(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	filter := extractAuditFilter(r)
	items, total, err := h.auditService.GetInputLagRecords(r.Context(), page, limit, filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Input lag records retrieved", items, page, limit, total)
}

// ListLogs godoc
// @Summary      Get Full Forensic Audit Logs List
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/logs [get]
func (h *AuditHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}

	filter := extractAuditFilter(r)
	items, total, err := h.auditService.ListLogs(r.Context(), page, limit, filter)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.Paginated(w, http.StatusOK, "Forensic audit logs retrieved", items, page, limit, total)
}

// GetLogDetail godoc
// @Summary      Get Audit Log Detail by ID
// @Tags         audit
// @Produce      json
// @Security     BearerAuth
// @Router       /audit/logs/{id} [get]
func (h *AuditHandler) GetLogDetail(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "ID log tidak valid")
		return
	}

	item, err := h.auditService.GetLogByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Audit log tidak ditemukan")
		return
	}

	response.JSON(w, http.StatusOK, "Audit log detail retrieved", item)
}
