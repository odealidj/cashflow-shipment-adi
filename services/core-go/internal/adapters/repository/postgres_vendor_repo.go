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

type PostgresVendorRepo struct {
	db *sqlx.DB
}

func NewPostgresVendorRepo(db *sqlx.DB) *PostgresVendorRepo {
	return &PostgresVendorRepo{db: db}
}

func (r *PostgresVendorRepo) Create(ctx context.Context, vendor *domain.Vendor) error {
	query := `
		INSERT INTO vendors (name, email, phone, notes) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, created_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		vendor.Name, vendor.Email, vendor.Phone, vendor.Notes,
	).Scan(&vendor.ID, &vendor.CreatedAt)
	
	return err
}

func (r *PostgresVendorRepo) GetByID(ctx context.Context, id int) (*domain.Vendor, error) {
	query := `
		SELECT id, name, email, phone, notes, created_at, updated_at, deleted_at 
		FROM vendors 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var v domain.Vendor
	err := r.db.GetContext(ctx, &v, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("vendor not found")
		}
		return nil, err
	}
	
	return &v, nil
}

func (r *PostgresVendorRepo) GetByName(ctx context.Context, name string) (*domain.Vendor, error) {
	query := `
		SELECT id, name, email, phone, notes, created_at, updated_at, deleted_at 
		FROM vendors 
		WHERE name = $1 AND deleted_at IS NULL
	`
	var v domain.Vendor
	err := r.db.GetContext(ctx, &v, query, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("vendor not found")
		}
		return nil, err
	}
	
	return &v, nil
}

func (r *PostgresVendorRepo) Update(ctx context.Context, vendor *domain.Vendor) error {
	query := `
		UPDATE vendors 
		SET name = $1, email = $2, phone = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, vendor.Name, vendor.Email, vendor.Phone, vendor.Notes, vendor.ID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("vendor not found or already deleted")
	}
	return nil
}

func (r *PostgresVendorRepo) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE vendors 
		SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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
		return errors.New("vendor not found or already deleted")
	}
	return nil
}

func (r *PostgresVendorRepo) ListAll(ctx context.Context, offset, limit int, search, sortBy, sortDir string) ([]domain.Vendor, int, error) {
	search = strings.TrimSpace(search)

	// Determine sorting column
	sortCol := "created_at"
	if strings.ToLower(sortBy) == "name" {
		sortCol = "name"
	}

	// Determine sorting direction (default DESC for created_at, ASC for name)
	dir := "DESC"
	if strings.ToUpper(sortDir) == "ASC" {
		dir = "ASC"
	} else if strings.ToUpper(sortDir) == "DESC" {
		dir = "DESC"
	} else if sortCol == "name" {
		dir = "ASC"
	}

	where := "WHERE deleted_at IS NULL"
	var args []interface{}
	argIdx := 1

	if search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", strings.ToLower(search))
		where += fmt.Sprintf(" AND (LOWER(name) LIKE $%d OR LOWER(email) LIKE $%d OR LOWER(phone) LIKE $%d OR LOWER(notes) LIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchPattern)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vendors %s", where)
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	query := fmt.Sprintf(`
		SELECT id, name, email, phone, notes, created_at, updated_at, deleted_at 
		FROM vendors 
		%s 
		ORDER BY %s %s, id DESC 
		LIMIT $%d OFFSET $%d
	`, where, sortCol, dir, argIdx, argIdx+1)

	args = append(args, limit, offset)
	var vendors []domain.Vendor
	err := r.db.SelectContext(ctx, &vendors, query, args...)
	return vendors, total, err
}
