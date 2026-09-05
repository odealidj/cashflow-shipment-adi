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
	ID               int           `json:"id" db:"id"`
	InvoiceNo        string        `json:"invoice_no" db:"invoice_no"`
	ClientName       string        `json:"client_name" db:"client_name"`
	ShipmentDate     time.Time     `json:"shipment_date" db:"shipment_date"`
	TopTerms         string        `json:"top_terms" db:"top_terms"`
	TopDays          int           `json:"top_days" db:"top_days"`
	DueDate          time.Time     `json:"due_date" db:"due_date"`
	OriginalDueDate  *time.Time    `json:"original_due_date,omitempty" db:"original_due_date"`
	Amount           float64       `json:"amount" db:"amount"`
	Status           InvoiceStatus `json:"status" db:"status"`
	PaidAt           *time.Time    `json:"paid_at,omitempty" db:"paid_at"`
	PaidBy           *uuid.UUID    `json:"paid_by,omitempty" db:"paid_by"`
	PaidByName       string        `json:"paid_by_name,omitempty" db:"paid_by_name"`
	PaymentReference string        `json:"payment_reference,omitempty" db:"payment_reference"`
	PaymentProofURL  string        `json:"payment_proof_url,omitempty" db:"payment_proof_url"`
	PaymentNotes     string        `json:"payment_notes,omitempty" db:"payment_notes"`
	Notes            string        `json:"notes" db:"notes"`
	CashflowEntryID  *int          `json:"cashflow_entry_id,omitempty" db:"cashflow_entry_id"`
	CreatedBy        *uuid.UUID    `json:"created_by,omitempty" db:"created_by"`
	CreatedByName    string        `json:"created_by_name,omitempty" db:"created_by_name"`
	RescheduleCount  int           `json:"reschedule_count" db:"reschedule_count"`
	CreatedAt        time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time     `json:"updated_at" db:"updated_at"`
	DeletedAt        *time.Time    `json:"deleted_at,omitempty" db:"deleted_at"`
}

type InvoiceDueDateHistory struct {
	ID              int        `json:"id" db:"id"`
	InvoiceID       int        `json:"invoice_id" db:"invoice_id"`
	PreviousDueDate time.Time  `json:"previous_due_date" db:"previous_due_date"`
	NewDueDate      time.Time  `json:"new_due_date" db:"new_due_date"`
	DaysAdded       int        `json:"days_added" db:"days_added"`
	Reason          string     `json:"reason" db:"reason"`
	ChangedBy       *uuid.UUID `json:"changed_by,omitempty" db:"changed_by"`
	ChangedByName   string     `json:"changed_by_name" db:"changed_by_name"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

type InvoicePaymentHistory struct {
	ID            int        `json:"id" db:"id"`
	InvoiceID     int        `json:"invoice_id" db:"invoice_id"`
	Action        string     `json:"action" db:"action"` // SETTLED, CANCELLED
	Amount        float64    `json:"amount" db:"amount"`
	PaymentDate   time.Time  `json:"payment_date" db:"payment_date"`
	ReferenceNo   string     `json:"reference_no,omitempty" db:"reference_no"`
	ProofURL      string     `json:"proof_url,omitempty" db:"proof_url"`
	Notes         string     `json:"notes,omitempty" db:"notes"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	CreatedByName string     `json:"created_by_name" db:"created_by_name"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
}

type InvoiceHistorySummary struct {
	Invoice        Invoice                 `json:"invoice"`
	RescheduleLogs []InvoiceDueDateHistory `json:"reschedule_logs"`
	PaymentLogs    []InvoicePaymentHistory `json:"payment_logs"`
}
