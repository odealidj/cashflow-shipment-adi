package ports

import (
	"context"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
)

type SessionRepository interface {
	SaveSession(ctx context.Context, session *domain.UserSession, ttl time.Duration) error
	GetSession(ctx context.Context, sessionID string) (*domain.UserSession, error)
	DeleteSession(ctx context.Context, sessionID string) error
	DeleteAllUserSessions(ctx context.Context, userID uuid.UUID) error
}
