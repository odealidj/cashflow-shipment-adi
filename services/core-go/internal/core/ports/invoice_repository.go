package ports

import (
	"context"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type InvoiceFilter struct {
	DateFrom   *string
	DateTo     *string
	Status     *domain.InvoiceStatus
	ClientName *string
	InvoiceNo  *string
	SortBy     string // default: "due_date" or "shipment_date"
	SortDir    string // "ASC" or "DESC"
}

type InvoiceRepository interface {
	Create(ctx context.Context, invoice *domain.Invoice) error
	Update(ctx context.Context, invoice *domain.Invoice) error
	Delete(ctx context.Context, id int) error // Soft delete (sets deleted_at)
	GetByID(ctx context.Context, id int) (*domain.Invoice, error)
	GetByInvoiceNo(ctx context.Context, invoiceNo string) (*domain.Invoice, error)
	ListAll(ctx context.Context, offset, limit int, filter InvoiceFilter) ([]domain.Invoice, int, error)
	GetSummary(ctx context.Context, filter InvoiceFilter) (map[string]interface{}, error)
	MarkPaid(ctx context.Context, id int) error
}
