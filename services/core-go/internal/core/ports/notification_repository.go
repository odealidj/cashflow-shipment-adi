package ports

import (
	"context"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
)

type NotificationFilter struct {
	Category   *domain.NotificationCategory
	Severity   *domain.NotificationSeverity
	UnreadOnly bool
	Search     *string
}

type NotificationRepository interface {
	Create(ctx context.Context, notification *domain.Notification) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Notification, error)
	ListByUserOrRole(ctx context.Context, userID *uuid.UUID, role string, offset, limit int, filter NotificationFilter) ([]domain.Notification, int, error)
	GetUnreadCount(ctx context.Context, userID *uuid.UUID, role string) (int, error)
	MarkAsRead(ctx context.Context, id uuid.UUID, userID *uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID *uuid.UUID, role string) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteOlderThan(ctx context.Context, days int) (int64, error)
}
