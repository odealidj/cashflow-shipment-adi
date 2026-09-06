package domain

import (
	"time"
	"github.com/google/uuid"
)

type PaymentStatus string
type EntryType string

const (
	PaymentPaid    PaymentStatus = "PAID"
	PaymentUnpaid  PaymentStatus = "UNPAID"
	PaymentPending PaymentStatus = "PENDING"

	EntryShipment       EntryType = "SHIPMENT"
	EntryTopUp          EntryType = "TOP_UP"
	EntryInvoicePayment EntryType = "INVOICE_PAYMENT"
)

type CashflowEntry struct {
	ID              int           `json:"id" db:"id"`
	SequenceNo      int           `json:"sequence_no" db:"sequence_no"`
	EntryType       EntryType     `json:"entry_type" db:"entry_type"`
	Kredit          float64       `json:"kredit" db:"kredit"`
	Debit           float64       `json:"debit" db:"debit"`
	Saldo           float64       `json:"saldo" db:"saldo"`
	DateOfEntry     time.Time     `json:"date_of_entry" db:"date_of_entry"`
	ActInformation  string        `json:"act_information" db:"act_information"`
	ActExplaination string        `json:"act_explaination" db:"act_explaination"`
	VendorID        *int          `json:"vendor_id" db:"vendor_id"`
	VendorNameRaw   string        `json:"vendor_name_raw" db:"vendor_name_raw"`
	TopDays         int           `json:"top_days" db:"top_days"`
	DueDate         *time.Time    `json:"due_date" db:"due_date"`
	GrandCost       float64       `json:"grand_cost" db:"grand_cost"`
	GrandSelling    float64       `json:"grand_selling" db:"grand_selling"`
	Profit          float64       `json:"profit" db:"profit"`
	MarginPct       float64       `json:"margin_pct" db:"margin_pct"`
	Remarks         PaymentStatus `json:"remarks" db:"remarks"`
	CreatedBy       uuid.UUID     `json:"created_by" db:"created_by"`
	UpdatedBy       uuid.UUID     `json:"updated_by" db:"updated_by"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" db:"updated_at"`
	InvoiceID       *int          `json:"invoice_id,omitempty" db:"invoice_id"`
}
