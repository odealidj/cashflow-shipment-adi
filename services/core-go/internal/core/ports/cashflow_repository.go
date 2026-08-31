package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
)

type ListFilter struct {
	SortDir    string // "ASC" or "DESC", default "ASC"
	DateFrom   *string
	DateTo     *string
	EntryType  *domain.EntryType
	Remarks    *domain.PaymentStatus
	VendorName *string
}

type CashflowRepository interface {
	Create(ctx context.Context, entry *domain.CashflowEntry) error
	Update(ctx context.Context, entry *domain.CashflowEntry) error
	Delete(ctx context.Context, id int) error
	GetByID(ctx context.Context, id int) (*domain.CashflowEntry, error)
	ListAll(ctx context.Context, offset, limit int, filter ListFilter) ([]domain.CashflowEntry, int, error)
	GetLatestEntry(ctx context.Context) (*domain.CashflowEntry, error)
	UpdateBalancesAfter(ctx context.Context, sequenceNo int, diff float64) error
	GetSummary(ctx context.Context, filter ListFilter) (map[string]interface{}, error)
	UpdateRemarks(ctx context.Context, id int, status domain.PaymentStatus, updatedBy uuid.UUID) error
	ArchiveEntry(ctx context.Context, entry *domain.CashflowEntry, archivedBy uuid.UUID, reason string) error
}
