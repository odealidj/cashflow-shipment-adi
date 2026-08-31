package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/jmoiron/sqlx"
)

type PostgresActivityPresetRepo struct {
	db *sqlx.DB
}

func NewPostgresActivityPresetRepo(db *sqlx.DB) *PostgresActivityPresetRepo {
	return &PostgresActivityPresetRepo{db: db}
}

func (r *PostgresActivityPresetRepo) Create(ctx context.Context, preset *domain.ActivityPreset) error {
	query := `
		INSERT INTO activity_presets (category, name, description, is_active) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		preset.Category, preset.Name, preset.Description, preset.IsActive,
	).Scan(&preset.ID, &preset.CreatedAt, &preset.UpdatedAt)
	
	return err
}

func (r *PostgresActivityPresetRepo) GetByID(ctx context.Context, id int) (*domain.ActivityPreset, error) {
	query := `
		SELECT id, category, name, description, is_active, created_at, updated_at, deleted_at 
		FROM activity_presets 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var p domain.ActivityPreset
	err := r.db.GetContext(ctx, &p, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("preset aktivitas tidak ditemukan")
		}
		return nil, err
	}
	
	return &p, nil
}

func (r *PostgresActivityPresetRepo) GetByCategoryAndName(ctx context.Context, category, name string) (*domain.ActivityPreset, error) {
	query := `
		SELECT id, category, name, description, is_active, created_at, updated_at, deleted_at 
		FROM activity_presets 
		WHERE category = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND deleted_at IS NULL
	`
	var p domain.ActivityPreset
	err := r.db.GetContext(ctx, &p, query, category, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("preset tidak ditemukan")
		}
		return nil, err
	}
	
	return &p, nil
}

func (r *PostgresActivityPresetRepo) Update(ctx context.Context, preset *domain.ActivityPreset) error {
	query := `
		UPDATE activity_presets 
		SET category = $1, name = $2, description = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		preset.Category, preset.Name, preset.Description, preset.IsActive, preset.ID,
	).Scan(&preset.UpdatedAt)
	
	return err
}

func (r *PostgresActivityPresetRepo) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE activity_presets 
		SET deleted_at = CURRENT_TIMESTAMP 
		WHERE id = $1 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("preset tidak ditemukan atau sudah dihapus")
	}
	
	return nil
}

func (r *PostgresActivityPresetRepo) ListAll(ctx context.Context, category, search string, offset, limit int) ([]domain.ActivityPreset, int, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	conditions = append(conditions, "deleted_at IS NULL")

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, category)
		argIdx++
	}

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(LOWER(name) LIKE $%d OR LOWER(description) LIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+strings.ToLower(strings.TrimSpace(search))+"%")
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Hitung total record
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM activity_presets WHERE %s", whereClause)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Query data dengan pagination
	query := fmt.Sprintf(`
		SELECT id, category, name, description, is_active, created_at, updated_at, deleted_at 
		FROM activity_presets 
		WHERE %s 
		ORDER BY id ASC 
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	args = append(args, limit, offset)

	var presets []domain.ActivityPreset
	err = r.db.SelectContext(ctx, &presets, query, args...)
	if err != nil {
		return nil, 0, err
	}

	return presets, total, nil
}
