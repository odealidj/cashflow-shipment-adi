package ports

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByEmailOrPhone(ctx context.Context, identifier string) (*domain.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}
