package domain

import (
	"time"

	"github.com/google/uuid"
)

type InvoiceStatus string

const (
	InvoiceStatusUnpaid  InvoiceStatus = "UNPAID"
	InvoiceStatusPaid    InvoiceStatus = "PAID"
	InvoiceStatusOverdue InvoiceStatus = "OVERDUE"
)

type Invoice struct {
	ID              int           `json:"id" db:"id"`
	InvoiceNo       string        `json:"invoice_no" db:"invoice_no"`
	ClientName      string        `json:"client_name" db:"client_name"`
	ShipmentDate    time.Time     `json:"shipment_date" db:"shipment_date"`
	TopTerms        string        `json:"top_terms" db:"top_terms"`
	TopDays         int           `json:"top_days" db:"top_days"`
	DueDate         time.Time     `json:"due_date" db:"due_date"`
	Amount          float64       `json:"amount" db:"amount"`
	Status          InvoiceStatus `json:"status" db:"status"`
	PaidAt          *time.Time    `json:"paid_at,omitempty" db:"paid_at"`
	Notes           string        `json:"notes" db:"notes"`
	CashflowEntryID *int          `json:"cashflow_entry_id,omitempty" db:"cashflow_entry_id"`
	CreatedBy       *uuid.UUID    `json:"created_by,omitempty" db:"created_by"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" db:"updated_at"`
	DeletedAt       *time.Time    `json:"deleted_at,omitempty" db:"deleted_at"`
}
