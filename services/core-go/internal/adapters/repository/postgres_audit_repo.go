package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/jmoiron/sqlx"
)

type PostgresAuditRepo struct {
	db *sqlx.DB
}

func NewPostgresAuditRepo(db *sqlx.DB) *PostgresAuditRepo {
	return &PostgresAuditRepo{db: db}
}

var _ ports.AuditRepository = (*PostgresAuditRepo)(nil)

const auditSelectColumns = `
	id, actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_reference,
	event_date, system_timestamp, lag_days, severity, flag_reason,
	COALESCE(old_values, '{}'::jsonb) AS old_values,
	COALESCE(new_values, '{}'::jsonb) AS new_values,
	ip_address, user_agent, created_at
`

func (r *PostgresAuditRepo) Record(ctx context.Context, log *domain.AuditLog) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "Record", "INSERT INTO audit_logs ...", start, err)
	}()

	if log.SystemTimestamp.IsZero() {
		log.SystemTimestamp = time.Now()
	}

	if log.EventDate != nil && log.LagDays == 0 {
		days := int(log.SystemTimestamp.Sub(*log.EventDate).Hours() / 24)
		if days > 0 {
			log.LagDays = days
		}
	}

	query := `
		INSERT INTO audit_logs (
			actor_id, actor_name, actor_role, action, entity_type, entity_id, entity_reference,
			event_date, system_timestamp, lag_days, severity, flag_reason, old_values, new_values,
			ip_address, user_agent, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12, $13, $14,
			$15, $16, NOW()
		)
		RETURNING id, created_at
	`

	return r.db.QueryRowContext(ctx, query,
		log.ActorID, log.ActorName, log.ActorRole, log.Action, log.EntityType, log.EntityID, log.EntityReference,
		log.EventDate, log.SystemTimestamp, log.LagDays, log.Severity, log.FlagReason, log.OldValues, log.NewValues,
		log.IPAddress, log.UserAgent,
	).Scan(&log.ID, &log.CreatedAt)
}

func (r *PostgresAuditRepo) GetByID(ctx context.Context, id int64) (log *domain.AuditLog, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "GetByID", "SELECT FROM audit_logs WHERE id = $1", start, err)
	}()

	query := `SELECT ` + auditSelectColumns + ` FROM audit_logs WHERE id = $1`
	var item domain.AuditLog
	if err := r.db.GetContext(ctx, &item, query, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("audit log tidak ditemukan")
		}
		return nil, err
	}
	return &item, nil
}

func (r *PostgresAuditRepo) buildWhere(filter domain.AuditLogFilter) (string, []interface{}) {
	var whereConditions []string
	var args []interface{}
	idx := 1

	if filter.ActorID != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("actor_id = $%d", idx))
		args = append(args, *filter.ActorID)
		idx++
	}
	if filter.ActorName != nil && *filter.ActorName != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("actor_name ILIKE $%d", idx))
		args = append(args, "%"+*filter.ActorName+"%")
		idx++
	}
	if filter.Action != nil && *filter.Action != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("action = $%d", idx))
		args = append(args, *filter.Action)
		idx++
	}
	if filter.EntityType != nil && *filter.EntityType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("entity_type = $%d", idx))
		args = append(args, *filter.EntityType)
		idx++
	}
	if filter.Severity != nil && *filter.Severity != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("severity = $%d", idx))
		args = append(args, *filter.Severity)
		idx++
	}
	if filter.MinLagDays != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("lag_days >= $%d", idx))
		args = append(args, *filter.MinLagDays)
		idx++
	}
	if filter.StartDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("event_date >= $%d", idx))
		args = append(args, *filter.StartDate)
		idx++
	}
	if filter.EndDate != nil {
		whereConditions = append(whereConditions, fmt.Sprintf("event_date <= $%d", idx))
		args = append(args, *filter.EndDate)
		idx++
	}
	if filter.Search != nil && *filter.Search != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("(entity_reference ILIKE $%d OR flag_reason ILIKE $%d OR actor_name ILIKE $%d)", idx, idx, idx))
		args = append(args, "%"+*filter.Search+"%")
		idx++
	}

	whereClause := ""
	if len(whereConditions) > 0 {
		whereClause = " WHERE " + strings.Join(whereConditions, " AND ")
	}
	return whereClause, args
}

func (r *PostgresAuditRepo) List(ctx context.Context, page, limit int, filter domain.AuditLogFilter) (logs []domain.AuditLog, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "List", "SELECT FROM audit_logs ...", start, err)
	}()

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	whereClause, args := r.buildWhere(filter)

	countQuery := `SELECT COUNT(*) FROM audit_logs` + whereClause
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT %s FROM audit_logs
		%s
		ORDER BY id DESC
		LIMIT %d OFFSET %d
	`, auditSelectColumns, whereClause, limit, offset)

	logs = make([]domain.AuditLog, 0)
	if err := r.db.SelectContext(ctx, &logs, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

func (r *PostgresAuditRepo) GetSummaryKPI(ctx context.Context, filter domain.AuditLogFilter) (kpi *domain.AuditSummaryKPI, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "GetSummaryKPI", "SELECT KPI FROM audit_logs", start, err)
	}()

	whereClause, args := r.buildWhere(filter)

	query := fmt.Sprintf(`
		SELECT 
			COUNT(*) AS total_logs,
			COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS total_critical,
			COUNT(*) FILTER (WHERE severity = 'WARNING') AS total_warning,
			COUNT(*) FILTER (WHERE lag_days > 1) AS total_late_inputs,
			COALESCE(AVG(lag_days) FILTER (WHERE entity_type = 'cashflow'), 0) AS avg_cashflow_lag_days,
			COALESCE(AVG(lag_days) FILTER (WHERE entity_type = 'invoice'), 0) AS avg_invoice_lag_days,
			COUNT(*) FILTER (WHERE severity IN ('WARNING', 'CRITICAL') OR action IN ('DELETE', 'VOID', 'RESCHEDULE_DUE_DATE')) AS total_anomalies_count,
			COUNT(DISTINCT COALESCE(actor_name, 'Sistem')) AS total_staff_monitored
		FROM audit_logs
		%s
	`, whereClause)

	var res domain.AuditSummaryKPI
	if err := r.db.GetContext(ctx, &res, query, args...); err != nil {
		return nil, err
	}

	return &res, nil
}

func (r *PostgresAuditRepo) GetStaffSLAPerformance(ctx context.Context, filter domain.AuditLogFilter) (items []domain.StaffSLAItem, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "GetStaffSLAPerformance", "SELECT SLA GROUP BY staff", start, err)
	}()

	whereClause, args := r.buildWhere(filter)

	query := fmt.Sprintf(`
		SELECT 
			actor_id,
			actor_name,
			actor_role,
			COUNT(*) AS total_entries,
			COUNT(*) FILTER (WHERE lag_days <= 1) AS on_time_entries,
			COUNT(*) FILTER (WHERE lag_days BETWEEN 2 AND 3) AS acceptable_entries,
			COUNT(*) FILTER (WHERE lag_days > 3) AS critical_late_entries,
			COALESCE(ROUND((COUNT(*) FILTER (WHERE lag_days <= 1)::numeric / NULLIF(COUNT(*), 0)) * 100, 1), 0) AS on_time_percentage,
			COALESCE(ROUND(AVG(lag_days)::numeric, 1), 0) AS avg_lag_days,
			COUNT(*) FILTER (WHERE action = 'UPDATE') AS total_edits,
			COUNT(*) FILTER (WHERE action IN ('DELETE', 'VOID')) AS total_deletions,
			MAX(created_at) AS last_active_at
		FROM audit_logs
		%s
		GROUP BY actor_id, actor_name, actor_role
		ORDER BY critical_late_entries DESC, avg_lag_days DESC, total_entries DESC
	`, whereClause)

	items = make([]domain.StaffSLAItem, 0)
	if err := r.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}

	return items, nil
}

func (r *PostgresAuditRepo) GetFraudAnomalies(ctx context.Context, page, limit int, filter domain.AuditLogFilter) (items []domain.FraudAnomalyItem, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "GetFraudAnomalies", "SELECT ANOMALIES FROM audit_logs", start, err)
	}()

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	whereClause, args := r.buildWhere(filter)
	anomalyCondition := `(severity IN ('WARNING', 'CRITICAL') OR action IN ('DELETE', 'VOID', 'RESCHEDULE_DUE_DATE') OR flag_reason ILIKE '%margin%' OR lag_days > 3)`

	if whereClause == "" {
		whereClause = " WHERE " + anomalyCondition
	} else {
		whereClause += " AND " + anomalyCondition
	}

	countQuery := `SELECT COUNT(*) FROM audit_logs` + whereClause
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT 
			id, actor_name, actor_role, action, entity_type, entity_id, entity_reference,
			event_date, system_timestamp, lag_days, severity, COALESCE(flag_reason, '') AS flag_reason,
			COALESCE(old_values, '{}'::jsonb) AS old_values,
			COALESCE(new_values, '{}'::jsonb) AS new_values,
			created_at
		FROM audit_logs
		%s
		ORDER BY severity = 'CRITICAL' DESC, lag_days DESC, id DESC
		LIMIT %d OFFSET %d
	`, whereClause, limit, offset)

	items = make([]domain.FraudAnomalyItem, 0)
	if err := r.db.SelectContext(ctx, &items, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *PostgresAuditRepo) GetInputLagRecords(ctx context.Context, page, limit int, filter domain.AuditLogFilter) (logs []domain.AuditLog, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("audit_repo", "GetInputLagRecords", "SELECT LAG RECORDS FROM audit_logs", start, err)
	}()

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	whereClause, args := r.buildWhere(filter)
	lagCondition := `lag_days > 0`

	if whereClause == "" {
		whereClause = " WHERE " + lagCondition
	} else {
		whereClause += " AND " + lagCondition
	}

	countQuery := `SELECT COUNT(*) FROM audit_logs` + whereClause
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT %s FROM audit_logs
		%s
		ORDER BY lag_days DESC, id DESC
		LIMIT %d OFFSET %d
	`, auditSelectColumns, whereClause, limit, offset)

	logs = make([]domain.AuditLog, 0)
	if err := r.db.SelectContext(ctx, &logs, selectQuery, args...); err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}
