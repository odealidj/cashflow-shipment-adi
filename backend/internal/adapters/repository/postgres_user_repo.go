package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresUserRepo struct {
	db *sqlx.DB
}

func NewPostgresUserRepo(db *sqlx.DB) *PostgresUserRepo {
	return &PostgresUserRepo{db: db}
}

func (r *PostgresUserRepo) Create(ctx context.Context, user *domain.User) error {
	query := `
		INSERT INTO users (id, email, phone, password_hash, full_name, role) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING created_at, updated_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		user.ID, user.Email, user.Phone, user.PasswordHash, user.FullName, user.Role,
	).Scan(&user.CreatedAt, &user.UpdatedAt)
	
	return err
}

func (r *PostgresUserRepo) GetByEmailOrPhone(ctx context.Context, identifier string) (*domain.User, error) {
	query := `
		SELECT id, email, phone, password_hash, full_name, role, created_at, updated_at 
		FROM users 
		WHERE email = $1 OR phone = $1
	`
	
	var user domain.User
	err := r.db.GetContext(ctx, &user, query, identifier)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return &user, nil
}

func (r *PostgresUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	query := `
		SELECT id, email, phone, password_hash, full_name, role, created_at, updated_at 
		FROM users 
		WHERE id = $1
	`
	
	var user domain.User
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	
	return &user, nil
}
