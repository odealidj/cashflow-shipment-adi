package ports

import (
	"context"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

type AuditRepository interface {
	Record(ctx context.Context, log *domain.AuditLog) error
	GetByID(ctx context.Context, id int64) (*domain.AuditLog, error)
	List(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error)
	GetSummaryKPI(ctx context.Context, filter domain.AuditLogFilter) (*domain.AuditSummaryKPI, error)
	GetStaffSLAPerformance(ctx context.Context, filter domain.AuditLogFilter) ([]domain.StaffSLAItem, error)
	GetFraudAnomalies(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.FraudAnomalyItem, int, error)
	GetInputLagRecords(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error)
}
