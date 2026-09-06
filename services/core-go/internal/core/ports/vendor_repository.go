package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type VendorRepository interface {
	Create(ctx context.Context, vendor *domain.Vendor) error
	GetByID(ctx context.Context, id int) (*domain.Vendor, error)
	GetByName(ctx context.Context, name string) (*domain.Vendor, error)
	Update(ctx context.Context, vendor *domain.Vendor) error
	SoftDelete(ctx context.Context, id int) error
	ListAll(ctx context.Context, offset, limit int, search, sortBy, sortDir string) ([]domain.Vendor, int, error)
}
