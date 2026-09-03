package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

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
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	if user.Role == "" {
		user.Role = domain.RoleFinance
	}
	if user.Status == "" {
		user.Status = domain.StatusInactive
	}

	query := `
		INSERT INTO users (id, email, phone, password_hash, full_name, role, role_id, status) 
		VALUES (
			$1, $2, $3, $4, $5, $6, 
			COALESCE($7, (SELECT id FROM roles WHERE code = $6 LIMIT 1)), 
			$8
		) 
		RETURNING created_at, updated_at
	`
	err := r.db.QueryRowContext(ctx, query, 
		user.ID, user.Email, user.Phone, user.PasswordHash, user.FullName, user.Role, user.RoleID, user.Status,
	).Scan(&user.CreatedAt, &user.UpdatedAt)
	
	return err
}

func (r *PostgresUserRepo) GetByEmailOrPhone(ctx context.Context, identifier string) (*domain.User, error) {
	query := `
		SELECT id, email, phone, password_hash, full_name, role, role_id, status, last_login_at, created_at, updated_at, deleted_at 
		FROM users 
		WHERE (email = $1 OR phone = $1) AND deleted_at IS NULL
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
		SELECT id, email, phone, password_hash, full_name, role, role_id, status, last_login_at, created_at, updated_at, deleted_at 
		FROM users 
		WHERE id = $1 AND deleted_at IS NULL
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

func (r *PostgresUserRepo) List(ctx context.Context, limit, offset int, search, role, status string, includeHiddenSuperAdmin bool) ([]domain.User, int, error) {
	var whereClauses []string
	var args []interface{}
	argIdx := 1

	whereClauses = append(whereClauses, "deleted_at IS NULL")

	// Hide super_admin if requested (for business admin view)
	if !includeHiddenSuperAdmin {
		whereClauses = append(whereClauses, fmt.Sprintf("role != $%d", argIdx))
		args = append(args, domain.RoleSuperAdmin)
		argIdx++
	}

	if search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(full_name ILIKE $%d OR email ILIKE $%d OR phone ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if role != "" && role != "ALL" {
		whereClauses = append(whereClauses, fmt.Sprintf("role = $%d", argIdx))
		args = append(args, role)
		argIdx++
	}

	if status != "" && status != "ALL" {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, status)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE %s", whereSQL)
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT id, email, phone, full_name, role, role_id, status, last_login_at, created_at, updated_at 
		FROM users 
		WHERE %s 
		ORDER BY created_at DESC 
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)

	var users []domain.User
	err = r.db.SelectContext(ctx, &users, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *PostgresUserRepo) Update(ctx context.Context, user *domain.User) error {
	query := `
		UPDATE users 
		SET email = $1, 
		    phone = $2, 
		    full_name = $3, 
		    role = $4, 
		    role_id = COALESCE($5, (SELECT id FROM roles WHERE code = $4 LIMIT 1)),
		    status = $6, 
		    updated_at = NOW() 
		WHERE id = $7 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, 
		user.Email, user.Phone, user.FullName, user.Role, user.RoleID, user.Status, user.ID,
	)
	return err
}

func (r *PostgresUserRepo) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $1, updated_at = NOW() 
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, passwordHash, id)
	return err
}

func (r *PostgresUserRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.UserStatus) error {
	query := `
		UPDATE users 
		SET status = $1, updated_at = NOW() 
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, status, id)
	return err
}

func (r *PostgresUserRepo) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users 
		SET last_login_at = $1 
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	return err
}

func (r *PostgresUserRepo) Delete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users 
		SET deleted_at = NOW(), status = 'INACTIVE' 
		WHERE id = $1 AND deleted_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

func (r *PostgresUserRepo) GetUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	query := `
		SELECT DISTINCT p.code
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		JOIN users u ON (u.role_id = rp.role_id OR u.role::text = (SELECT code FROM roles WHERE id = rp.role_id))
		WHERE u.id = $1 AND u.deleted_at IS NULL
		ORDER BY p.code ASC
	`
	var perms []string
	err := r.db.SelectContext(ctx, &perms, query, userID)
	if err != nil {
		return nil, err
	}
	if perms == nil {
		perms = []string{}
	}
	return perms, nil
}
