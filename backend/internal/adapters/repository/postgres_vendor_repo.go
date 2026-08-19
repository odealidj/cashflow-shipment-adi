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
		SELECT id, name, email, phone, notes, created_at 
		FROM vendors 
		WHERE id = $1
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
		SELECT id, name, email, phone, notes, created_at 
		FROM vendors 
		WHERE name = $1
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

func (r *PostgresVendorRepo) ListAll(ctx context.Context, offset, limit int) ([]domain.Vendor, int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM vendors`)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, name, email, phone, notes, created_at 
		FROM vendors 
		ORDER BY name ASC
		LIMIT $1 OFFSET $2
	`
	var vendors []domain.Vendor
	err = r.db.SelectContext(ctx, &vendors, query, limit, offset)
	return vendors, total, err
}
