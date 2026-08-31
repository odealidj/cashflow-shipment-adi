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

type PostgresCustomerRepo struct {
	db *sqlx.DB
}

func NewPostgresCustomerRepo(db *sqlx.DB) *PostgresCustomerRepo {
	return &PostgresCustomerRepo{db: db}
}

func (r *PostgresCustomerRepo) Create(ctx context.Context, customer *domain.Customer) error {
	query := `
		INSERT INTO customers (name, pic_name, email, phone, address, notes) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id, created_at, updated_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		customer.Name, customer.PicName, customer.Email, customer.Phone, customer.Address, customer.Notes,
	).Scan(&customer.ID, &customer.CreatedAt, &customer.UpdatedAt)
	
	return err
}

func (r *PostgresCustomerRepo) GetByID(ctx context.Context, id int) (*domain.Customer, error) {
	query := `
		SELECT id, name, pic_name, email, phone, address, notes, created_at, updated_at, deleted_at 
		FROM customers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	var c domain.Customer
	err := r.db.GetContext(ctx, &c, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("customer tidak ditemukan")
		}
		return nil, err
	}
	
	return &c, nil
}

func (r *PostgresCustomerRepo) GetByName(ctx context.Context, name string) (*domain.Customer, error) {
	query := `
		SELECT id, name, pic_name, email, phone, address, notes, created_at, updated_at, deleted_at 
		FROM customers 
		WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND deleted_at IS NULL
	`
	var c domain.Customer
	err := r.db.GetContext(ctx, &c, query, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("customer tidak ditemukan")
		}
		return nil, err
	}
	
	return &c, nil
}

func (r *PostgresCustomerRepo) Update(ctx context.Context, customer *domain.Customer) error {
	query := `
		UPDATE customers 
		SET name = $1, pic_name = $2, email = $3, phone = $4, address = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND deleted_at IS NULL
	`
	res, err := r.db.ExecContext(ctx, query, 
		customer.Name, customer.PicName, customer.Email, customer.Phone, customer.Address, customer.Notes, customer.ID,
	)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("customer tidak ditemukan atau sudah dihapus")
	}
	return nil
}

func (r *PostgresCustomerRepo) SoftDelete(ctx context.Context, id int) error {
	query := `
		UPDATE customers 
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
		return errors.New("customer tidak ditemukan atau sudah dihapus")
	}
	return nil
}

func (r *PostgresCustomerRepo) ListAll(ctx context.Context, offset, limit int, search string) ([]domain.Customer, int, error) {
	search = strings.TrimSpace(search)
	var countQuery string
	var listQuery string
	var args []interface{}

	if search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", strings.ToLower(search))
		countQuery = `
			SELECT COUNT(*) 
			FROM customers 
			WHERE deleted_at IS NULL 
			  AND (LOWER(name) LIKE $1 OR LOWER(pic_name) LIKE $1 OR LOWER(phone) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(address) LIKE $1 OR LOWER(notes) LIKE $1)
		`
		listQuery = `
			SELECT id, name, pic_name, email, phone, address, notes, created_at, updated_at, deleted_at 
			FROM customers 
			WHERE deleted_at IS NULL 
			  AND (LOWER(name) LIKE $1 OR LOWER(pic_name) LIKE $1 OR LOWER(phone) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(address) LIKE $1 OR LOWER(notes) LIKE $1)
			ORDER BY name ASC 
			LIMIT $2 OFFSET $3
		`
		args = []interface{}{searchPattern, limit, offset}
		var total int
		if err := r.db.GetContext(ctx, &total, countQuery, searchPattern); err != nil {
			return nil, 0, err
		}

		var customers []domain.Customer
		if err := r.db.SelectContext(ctx, &customers, listQuery, args...); err != nil {
			return nil, 0, err
		}
		return customers, total, nil
	}

	countQuery = `SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL`
	listQuery = `
		SELECT id, name, pic_name, email, phone, address, notes, created_at, updated_at, deleted_at 
		FROM customers 
		WHERE deleted_at IS NULL 
		ORDER BY id ASC 
		LIMIT $1 OFFSET $2
	`
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery); err != nil {
		return nil, 0, err
	}

	var customers []domain.Customer
	if err := r.db.SelectContext(ctx, &customers, listQuery, limit, offset); err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}
