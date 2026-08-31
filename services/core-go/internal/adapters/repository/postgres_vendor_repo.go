package repository

import (
	"context"
	"database/sql"
	"errors"

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

func (r *PostgresVendorRepo) ListAll(ctx context.Context, offset, limit int) ([]domain.Vendor, int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM vendors WHERE deleted_at IS NULL`)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, name, email, phone, notes, created_at, updated_at, deleted_at 
		FROM vendors 
		WHERE deleted_at IS NULL
		ORDER BY name ASC
		LIMIT $1 OFFSET $2
	`
	var vendors []domain.Vendor
	err = r.db.SelectContext(ctx, &vendors, query, limit, offset)
	return vendors, total, err
}
