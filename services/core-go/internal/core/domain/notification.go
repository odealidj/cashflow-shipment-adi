package domain

import (
	"time"

	"github.com/google/uuid"
)

type NotificationSeverity string

const (
	NotificationSeverityCritical NotificationSeverity = "CRITICAL"
	NotificationSeverityWarning  NotificationSeverity = "WARNING"
	NotificationSeverityInfo     NotificationSeverity = "INFO"
)

type NotificationCategory string

const (
	NotificationCategoryInvoice  NotificationCategory = "INVOICE"
	NotificationCategoryCashflow NotificationCategory = "CASHFLOW"
	NotificationCategoryVendor   NotificationCategory = "VENDOR"
	NotificationCategoryShipment NotificationCategory = "SHIPMENT"
	NotificationCategorySystem   NotificationCategory = "SYSTEM"
)

type Notification struct {
	ID         uuid.UUID            `json:"id" db:"id"`
	UserID     *uuid.UUID           `json:"user_id,omitempty" db:"user_id"`
	TargetRole *string              `json:"target_role,omitempty" db:"target_role"`
	Title      string               `json:"title" db:"title"`
	Message    string               `json:"message" db:"message"`
	Category   NotificationCategory `json:"category" db:"category"`
	Severity   NotificationSeverity `json:"severity" db:"severity"`
	ActionURL  *string              `json:"action_url,omitempty" db:"action_url"`
	Metadata   *string              `json:"metadata,omitempty" db:"metadata"`
	IsRead     bool                 `json:"is_read" db:"is_read"`
	ReadAt     *time.Time           `json:"read_at,omitempty" db:"read_at"`
	CreatedAt  time.Time            `json:"created_at" db:"created_at"`
}
