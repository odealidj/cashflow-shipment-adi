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

func (r *PostgresCustomerRepo) ListAll(ctx context.Context, offset, limit int, search, sortBy, sortDir string) ([]domain.Customer, int, error) {
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
		where += fmt.Sprintf(" AND (LOWER(name) LIKE $%d OR LOWER(pic_name) LIKE $%d OR LOWER(phone) LIKE $%d OR LOWER(email) LIKE $%d OR LOWER(address) LIKE $%d OR LOWER(notes) LIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchPattern)
		argIdx++
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM customers %s", where)
	var total int
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	listQuery := fmt.Sprintf(`
		SELECT id, name, pic_name, email, phone, address, notes, created_at, updated_at, deleted_at 
		FROM customers 
		%s 
		ORDER BY %s %s, id DESC 
		LIMIT $%d OFFSET $%d
	`, where, sortCol, dir, argIdx, argIdx+1)

	args = append(args, limit, offset)
	var customers []domain.Customer
	if err := r.db.SelectContext(ctx, &customers, listQuery, args...); err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}
