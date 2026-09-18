package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type AuditSeverity string

const (
	AuditSeverityNormal   AuditSeverity = "NORMAL"
	AuditSeverityWarning  AuditSeverity = "WARNING"
	AuditSeverityCritical AuditSeverity = "CRITICAL"
)

type AuditAction string

const (
	AuditActionCreate            AuditAction = "CREATE"
	AuditActionUpdate            AuditAction = "UPDATE"
	AuditActionDelete            AuditAction = "DELETE"
	AuditActionVoid              AuditAction = "VOID"
	AuditActionRescheduleDueDate AuditAction = "RESCHEDULE_DUE_DATE"
	AuditActionSettleInvoice     AuditAction = "SETTLE_INVOICE"
	AuditActionExportExcel       AuditAction = "EXPORT_EXCEL"
	AuditActionLogin             AuditAction = "LOGIN"
)

type AuditLog struct {
	ID              int64           `json:"id" db:"id"`
	ActorID         *uuid.UUID      `json:"actor_id,omitempty" db:"actor_id"`
	ActorName       string          `json:"actor_name" db:"actor_name"`
	ActorRole       string          `json:"actor_role" db:"actor_role"`
	Action          AuditAction     `json:"action" db:"action"`
	EntityType      string          `json:"entity_type" db:"entity_type"`
	EntityID        string          `json:"entity_id" db:"entity_id"`
	EntityReference string          `json:"entity_reference" db:"entity_reference"`
	EventDate       *time.Time      `json:"event_date,omitempty" db:"event_date"`
	SystemTimestamp time.Time       `json:"system_timestamp" db:"system_timestamp"`
	LagDays         int             `json:"lag_days" db:"lag_days"`
	Severity        AuditSeverity   `json:"severity" db:"severity"`
	FlagReason      *string         `json:"flag_reason,omitempty" db:"flag_reason"`
	OldValues       json.RawMessage `json:"old_values,omitempty" db:"old_values"`
	NewValues       json.RawMessage `json:"new_values,omitempty" db:"new_values"`
	IPAddress       *string         `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent       *string         `json:"user_agent,omitempty" db:"user_agent"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
}

type AuditLogFilter struct {
	ActorID    *uuid.UUID     `json:"actor_id,omitempty"`
	ActorName  *string        `json:"actor_name,omitempty"`
	Action     *AuditAction   `json:"action,omitempty"`
	EntityType *string        `json:"entity_type,omitempty"`
	Severity   *AuditSeverity `json:"severity,omitempty"`
	MinLagDays *int           `json:"min_lag_days,omitempty"`
	StartDate  *time.Time     `json:"start_date,omitempty"`
	EndDate    *time.Time     `json:"end_date,omitempty"`
	Search     *string        `json:"search,omitempty"`
}

type AuditSummaryKPI struct {
	TotalLogs           int64   `json:"total_logs" db:"total_logs"`
	TotalCritical       int64   `json:"total_critical" db:"total_critical"`
	TotalWarning        int64   `json:"total_warning" db:"total_warning"`
	TotalLateInputs     int64   `json:"total_late_inputs" db:"total_late_inputs"`
	AvgCashflowLagDays  float64 `json:"avg_cashflow_lag_days" db:"avg_cashflow_lag_days"`
	AvgInvoiceLagDays   float64 `json:"avg_invoice_lag_days" db:"avg_invoice_lag_days"`
	TotalAnomaliesCount int64   `json:"total_anomalies_count" db:"total_anomalies_count"`
	TotalStaffMonitored int64   `json:"total_staff_monitored" db:"total_staff_monitored"`
}

type StaffSLAItem struct {
	ActorID             *uuid.UUID `json:"actor_id,omitempty" db:"actor_id"`
	ActorName           string     `json:"actor_name" db:"actor_name"`
	ActorRole           string     `json:"actor_role" db:"actor_role"`
	TotalEntries        int        `json:"total_entries" db:"total_entries"`
	OnTimeEntries       int        `json:"on_time_entries" db:"on_time_entries"`
	AcceptableEntries   int        `json:"acceptable_entries" db:"acceptable_entries"`
	CriticalLateEntries int        `json:"critical_late_entries" db:"critical_late_entries"`
	OnTimePercentage    float64    `json:"on_time_percentage" db:"on_time_percentage"`
	AvgLagDays          float64    `json:"avg_lag_days" db:"avg_lag_days"`
	TotalEdits          int        `json:"total_edits" db:"total_edits"`
	TotalDeletions      int        `json:"total_deletions" db:"total_deletions"`
	LastActiveAt        time.Time  `json:"last_active_at" db:"last_active_at"`
}

type FraudAnomalyItem struct {
	ID              int64           `json:"id" db:"id"`
	ActorName       string          `json:"actor_name" db:"actor_name"`
	ActorRole       string          `json:"actor_role" db:"actor_role"`
	Action          AuditAction     `json:"action" db:"action"`
	EntityType      string          `json:"entity_type" db:"entity_type"`
	EntityID        string          `json:"entity_id" db:"entity_id"`
	EntityReference string          `json:"entity_reference" db:"entity_reference"`
	EventDate       *time.Time      `json:"event_date,omitempty" db:"event_date"`
	SystemTimestamp time.Time       `json:"system_timestamp" db:"system_timestamp"`
	LagDays         int             `json:"lag_days" db:"lag_days"`
	Severity        AuditSeverity   `json:"severity" db:"severity"`
	FlagReason      string          `json:"flag_reason" db:"flag_reason"`
	OldValues       json.RawMessage `json:"old_values,omitempty" db:"old_values"`
	NewValues       json.RawMessage `json:"new_values,omitempty" db:"new_values"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
}
