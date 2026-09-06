package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type CustomerRepository interface {
	Create(ctx context.Context, customer *domain.Customer) error
	GetByID(ctx context.Context, id int) (*domain.Customer, error)
	GetByName(ctx context.Context, name string) (*domain.Customer, error)
	Update(ctx context.Context, customer *domain.Customer) error
	SoftDelete(ctx context.Context, id int) error
	ListAll(ctx context.Context, offset, limit int, search, sortBy, sortDir string) ([]domain.Customer, int, error)
}
