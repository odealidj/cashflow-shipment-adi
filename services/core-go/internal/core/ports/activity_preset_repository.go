package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type ActivityPresetRepository interface {
	Create(ctx context.Context, preset *domain.ActivityPreset) error
	GetByID(ctx context.Context, id int) (*domain.ActivityPreset, error)
	GetByCategoryAndName(ctx context.Context, category, name string) (*domain.ActivityPreset, error)
	Update(ctx context.Context, preset *domain.ActivityPreset) error
	SoftDelete(ctx context.Context, id int) error
	ListAll(ctx context.Context, category, search string, offset, limit int, sortBy, sortDir string) ([]domain.ActivityPreset, int, error)
}
