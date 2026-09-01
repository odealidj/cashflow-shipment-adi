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
	List(ctx context.Context, limit, offset int, search, role, status string, includeHiddenSuperAdmin bool) ([]domain.User, int, error)
	Update(ctx context.Context, user *domain.User) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}
