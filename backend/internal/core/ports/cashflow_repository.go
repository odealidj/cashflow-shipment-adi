package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type CashflowRepository interface {
	Create(ctx context.Context, entry *domain.CashflowEntry) error
	Update(ctx context.Context, entry *domain.CashflowEntry) error
	Delete(ctx context.Context, id int) error
	GetByID(ctx context.Context, id int) (*domain.CashflowEntry, error)
	ListAll(ctx context.Context, offset, limit int) ([]domain.CashflowEntry, int, error)
	GetLatestEntry(ctx context.Context) (*domain.CashflowEntry, error)
	UpdateBalancesAfter(ctx context.Context, sequenceNo int, diff float64) error
	GetSummary(ctx context.Context) (map[string]float64, error)
}
