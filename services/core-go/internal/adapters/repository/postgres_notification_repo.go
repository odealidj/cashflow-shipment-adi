package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresNotificationRepo struct {
	db *sqlx.DB
}

func NewPostgresNotificationRepo(db *sqlx.DB) *PostgresNotificationRepo {
	return &PostgresNotificationRepo{db: db}
}

const notificationSelectColumns = `
	id, user_id, target_role, title, message, category, severity,
	action_url, metadata, is_read, read_at, created_at
`

func (r *PostgresNotificationRepo) Create(ctx context.Context, n *domain.Notification) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "Create", "INSERT INTO notifications ...", start, err)
	}()

	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}

	query := `
		INSERT INTO notifications (
			id, user_id, target_role, title, message, category, severity, action_url, metadata, is_read, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
		)
		RETURNING created_at
	`

	err = r.db.QueryRowContext(ctx, query,
		n.ID, n.UserID, n.TargetRole, n.Title, n.Message, n.Category, n.Severity, n.ActionURL, n.Metadata, n.IsRead,
	).Scan(&n.CreatedAt)

	return err
}

func (r *PostgresNotificationRepo) GetByID(ctx context.Context, id uuid.UUID) (n *domain.Notification, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "GetByID", "SELECT ... FROM notifications WHERE id = $1", start, err)
	}()

	var notif domain.Notification
	query := fmt.Sprintf(`SELECT %s FROM notifications WHERE id = $1`, notificationSelectColumns)
	err = r.db.GetContext(ctx, &notif, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("notifikasi tidak ditemukan")
		}
		return nil, err
	}
	return &notif, nil
}

func (r *PostgresNotificationRepo) ListByUserOrRole(ctx context.Context, userID *uuid.UUID, role string, offset, limit int, filter ports.NotificationFilter) (notifications []domain.Notification, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "ListByUserOrRole", "SELECT ... FROM notifications ...", start, err)
	}()

	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	// Filter target penerima: spesifik user ATAU broadcast untuk role terkait ATAU broadcast all
	if role != "super_admin" {
		if userID != nil {
			where += fmt.Sprintf(" AND (user_id = $%d OR (user_id IS NULL AND (target_role = $%d OR target_role IS NULL)))", argIdx, argIdx+1)
			args = append(args, *userID, role)
			argIdx += 2
		} else {
			where += fmt.Sprintf(" AND (user_id IS NULL AND (target_role = $%d OR target_role IS NULL))", argIdx)
			args = append(args, role)
			argIdx++
		}
	}

	if filter.Category != nil && *filter.Category != "" {
		where += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, *filter.Category)
		argIdx++
	}

	if filter.Severity != nil && *filter.Severity != "" {
		where += fmt.Sprintf(" AND severity = $%d", argIdx)
		args = append(args, *filter.Severity)
		argIdx++
	}

	if filter.UnreadOnly {
		where += " AND is_read = false"
	}

	if filter.Search != nil && *filter.Search != "" {
		where += fmt.Sprintf(" AND (title ILIKE $%d OR message ILIKE $%d)", argIdx, argIdx)
		args = append(args, "%"+*filter.Search+"%")
		argIdx++
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM notifications %s`, where)
	err = r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count notifications: %w", err)
	}

	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	query := fmt.Sprintf(`
		SELECT %s 
		FROM notifications 
		%s 
		ORDER BY created_at DESC 
		LIMIT $%d OFFSET $%d
	`, notificationSelectColumns, where, argIdx, argIdx+1)
	args = append(args, limit, offset)

	notifications = []domain.Notification{}
	err = r.db.SelectContext(ctx, &notifications, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to fetch notifications: %w", err)
	}

	return notifications, total, nil
}

func (r *PostgresNotificationRepo) GetUnreadCount(ctx context.Context, userID *uuid.UUID, role string) (count int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "GetUnreadCount", "SELECT COUNT(*) FROM notifications WHERE is_read = false ...", start, err)
	}()

	where := "WHERE is_read = false"
	args := []interface{}{}
	argIdx := 1

	if role != "super_admin" {
		if userID != nil {
			where += fmt.Sprintf(" AND (user_id = $%d OR (user_id IS NULL AND (target_role = $%d OR target_role IS NULL)))", argIdx, argIdx+1)
			args = append(args, *userID, role)
		} else {
			where += fmt.Sprintf(" AND (user_id IS NULL AND (target_role = $%d OR target_role IS NULL))", argIdx)
			args = append(args, role)
		}
	}

	query := fmt.Sprintf(`SELECT COUNT(*) FROM notifications %s`, where)
	err = r.db.GetContext(ctx, &count, query, args...)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *PostgresNotificationRepo) MarkAsRead(ctx context.Context, id uuid.UUID, userID *uuid.UUID) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "MarkAsRead", "UPDATE notifications SET is_read = true ...", start, err)
	}()

	query := `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1`
	args := []interface{}{id}

	res, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("notifikasi tidak ditemukan")
	}

	return nil
}

func (r *PostgresNotificationRepo) MarkAllAsRead(ctx context.Context, userID *uuid.UUID, role string) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "MarkAllAsRead", "UPDATE notifications SET is_read = true ...", start, err)
	}()

	where := "WHERE is_read = false"
	args := []interface{}{}
	argIdx := 1

	if role != "super_admin" {
		if userID != nil {
			where += fmt.Sprintf(" AND (user_id = $%d OR (user_id IS NULL AND (target_role = $%d OR target_role IS NULL)))", argIdx, argIdx+1)
			args = append(args, *userID, role)
		} else {
			where += fmt.Sprintf(" AND (user_id IS NULL AND (target_role = $%d OR target_role IS NULL))", argIdx)
			args = append(args, role)
		}
	}

	query := fmt.Sprintf(`UPDATE notifications SET is_read = true, read_at = NOW() %s`, where)
	_, err = r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *PostgresNotificationRepo) Delete(ctx context.Context, id uuid.UUID) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "Delete", "DELETE FROM notifications WHERE id = $1", start, err)
	}()

	query := `DELETE FROM notifications WHERE id = $1`
	_, err = r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresNotificationRepo) DeleteOlderThan(ctx context.Context, days int) (rowsAffected int64, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("notification_repo", "DeleteOlderThan", "DELETE FROM notifications WHERE created_at < NOW() - ...", start, err)
	}()

	query := `DELETE FROM notifications WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`
	res, err := r.db.ExecContext(ctx, query, days)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
