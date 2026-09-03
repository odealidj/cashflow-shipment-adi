package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type PostgresRoleRepo struct {
	db *sqlx.DB
}

func NewPostgresRoleRepo(db *sqlx.DB) *PostgresRoleRepo {
	return &PostgresRoleRepo{db: db}
}

func (r *PostgresRoleRepo) ListRoles(ctx context.Context, includeSuperAdmin bool) ([]domain.Role, error) {
	query := `
		SELECT 
			r.id, 
			r.code, 
			r.name, 
			r.description, 
			r.is_system, 
			COUNT(u.id) AS user_count,
			r.created_at, 
			r.updated_at
		FROM roles r
		LEFT JOIN users u ON (u.role_id = r.id OR u.role::text = r.code) AND u.deleted_at IS NULL
		WHERE ($1 OR r.code != 'super_admin')
		GROUP BY r.id
		ORDER BY 
			CASE WHEN r.code = 'super_admin' THEN 1
			     WHEN r.code = 'admin' THEN 2
			     WHEN r.code = 'direktur' THEN 3
			     WHEN r.code = 'owner' THEN 4
			     WHEN r.code = 'finance' THEN 5
			     ELSE 6 END,
			r.created_at ASC
	`

	var roles []domain.Role
	err := r.db.SelectContext(ctx, &roles, query, includeSuperAdmin)
	if err != nil {
		return nil, err
	}
	return roles, nil
}

func (r *PostgresRoleRepo) GetRoleByID(ctx context.Context, id uuid.UUID) (*domain.Role, error) {
	query := `
		SELECT 
			r.id, 
			r.code, 
			r.name, 
			r.description, 
			r.is_system, 
			COUNT(u.id) AS user_count,
			r.created_at, 
			r.updated_at
		FROM roles r
		LEFT JOIN users u ON (u.role_id = r.id OR u.role::text = r.code) AND u.deleted_at IS NULL
		WHERE r.id = $1
		GROUP BY r.id
	`

	var role domain.Role
	err := r.db.GetContext(ctx, &role, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, err
	}
	return &role, nil
}

func (r *PostgresRoleRepo) GetRoleByCode(ctx context.Context, code string) (*domain.Role, error) {
	query := `
		SELECT 
			r.id, 
			r.code, 
			r.name, 
			r.description, 
			r.is_system, 
			COUNT(u.id) AS user_count,
			r.created_at, 
			r.updated_at
		FROM roles r
		LEFT JOIN users u ON (u.role_id = r.id OR u.role::text = r.code) AND u.deleted_at IS NULL
		WHERE r.code = $1
		GROUP BY r.id
	`

	var role domain.Role
	err := r.db.GetContext(ctx, &role, query, code)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("role tidak ditemukan")
		}
		return nil, err
	}
	return &role, nil
}

func (r *PostgresRoleRepo) CreateRole(ctx context.Context, role *domain.Role) error {
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	now := time.Now()
	role.CreatedAt = now
	role.UpdatedAt = now

	query := `
		INSERT INTO roles (id, code, name, description, is_system, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query,
		role.ID, role.Code, role.Name, role.Description, role.IsSystem, role.CreatedAt, role.UpdatedAt,
	)
	return err
}

func (r *PostgresRoleRepo) UpdateRole(ctx context.Context, role *domain.Role) error {
	role.UpdatedAt = time.Now()
	query := `
		UPDATE roles 
		SET name = $1, description = $2, updated_at = $3
		WHERE id = $4
	`
	res, err := r.db.ExecContext(ctx, query, role.Name, role.Description, role.UpdatedAt, role.ID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("role tidak ditemukan")
	}
	return nil
}

func (r *PostgresRoleRepo) DeleteRole(ctx context.Context, id uuid.UUID) error {
	// Pastikan bukan role sistem
	var isSystem bool
	var userCount int
	checkQuery := `
		SELECT r.is_system, COUNT(u.id)
		FROM roles r
		LEFT JOIN users u ON (u.role_id = r.id OR u.role::text = r.code) AND u.deleted_at IS NULL
		WHERE r.id = $1
		GROUP BY r.id
	`
	err := r.db.QueryRowContext(ctx, checkQuery, id).Scan(&isSystem, &userCount)
	if err != nil {
		return err
	}
	if isSystem {
		return errors.New("role sistem bawaan tidak dapat dihapus")
	}
	if userCount > 0 {
		return errors.New("tidak dapat menghapus role yang masih digunakan oleh staf pengguna")
	}

	deleteQuery := `DELETE FROM roles WHERE id = $1`
	_, err = r.db.ExecContext(ctx, deleteQuery, id)
	return err
}

func (r *PostgresRoleRepo) ListPermissions(ctx context.Context) ([]domain.Permission, error) {
	query := `
		SELECT id, module, code, name, description, created_at
		FROM permissions
		ORDER BY 
			CASE module
				WHEN 'CASHFLOW' THEN 1
				WHEN 'INVOICES' THEN 2
				WHEN 'CUSTOMERS' THEN 3
				WHEN 'VENDORS' THEN 4
				WHEN 'PRESETS' THEN 5
				WHEN 'USERS' THEN 6
				WHEN 'ROLES' THEN 7
				ELSE 8
			END,
			code ASC
	`
	var perms []domain.Permission
	err := r.db.SelectContext(ctx, &perms, query)
	if err != nil {
		return nil, err
	}
	return perms, nil
}

func (r *PostgresRoleRepo) GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]string, error) {
	query := `
		SELECT p.code
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = $1
		ORDER BY p.code ASC
	`
	var codes []string
	err := r.db.SelectContext(ctx, &codes, query, roleID)
	if err != nil {
		return nil, err
	}
	if codes == nil {
		codes = []string{}
	}
	return codes, nil
}

func (r *PostgresRoleRepo) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, permissionCodes []string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Hapus izin lama
	_, err = tx.ExecContext(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID)
	if err != nil {
		return err
	}

	// 2. Jika ada izin baru yang dipilih, insert secara batch
	if len(permissionCodes) > 0 {
		insertQuery := `
			INSERT INTO role_permissions (role_id, permission_id)
			SELECT $1, id FROM permissions WHERE code = ANY($2)
		`
		_, err = tx.ExecContext(ctx, insertQuery, roleID, pq.Array(permissionCodes))
		if err != nil {
			return err
		}
	}

	// 3. Update timestamp role
	_, err = tx.ExecContext(ctx, `UPDATE roles SET updated_at = NOW() WHERE id = $1`, roleID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresRoleRepo) CountActiveUsersByRoleCode(ctx context.Context, roleCode string) (int, error) {
	query := `
		SELECT COUNT(u.id)
		FROM users u
		LEFT JOIN roles r ON u.role_id = r.id
		WHERE (r.code = $1 OR u.role::text = $1)
		  AND u.status = 'ACTIVE'
		  AND u.deleted_at IS NULL
	`
	var count int
	err := r.db.GetContext(ctx, &count, query, roleCode)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *PostgresRoleRepo) BootstrapRolesAndPermissions(
	ctx context.Context, 
	defaultRoles []domain.Role, 
	defaultPermissions []domain.Permission, 
	defaultRoleMappings map[string][]string,
) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Injeksi Master Roles (Idempoten: ON CONFLICT DO UPDATE status sistem)
	roleQuery := `
		INSERT INTO roles (code, name, description, is_system)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (code) DO UPDATE 
		SET is_system = EXCLUDED.is_system
	`
	for _, role := range defaultRoles {
		_, err := tx.ExecContext(ctx, roleQuery, role.Code, role.Name, role.Description, role.IsSystem)
		if err != nil {
			return err
		}
	}

	// 2. Injeksi Master Permissions (Idempoten: ON CONFLICT DO UPDATE metadata modul & nama)
	permQuery := `
		INSERT INTO permissions (module, code, name, description)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (code) DO UPDATE 
		SET module = EXCLUDED.module, name = EXCLUDED.name, description = EXCLUDED.description
	`
	for _, perm := range defaultPermissions {
		_, err := tx.ExecContext(ctx, permQuery, perm.Module, perm.Code, perm.Name, perm.Description)
		if err != nil {
			return err
		}
	}

	// 3. Injeksi Pemetaan Default Bersyarat (Hanya jika role belum pernah dipetakan izinnya)
	for roleCode, permCodes := range defaultRoleMappings {
		if len(permCodes) == 0 {
			continue
		}

		var currentCount int
		countQuery := `
			SELECT COUNT(*) 
			FROM role_permissions rp
			JOIN roles r ON r.id = rp.role_id
			WHERE r.code = $1
		`
		if err := tx.GetContext(ctx, &currentCount, countQuery, roleCode); err != nil {
			return err
		}

		// Jika role belum memiliki izin (instalasi baru / cold start), injeksikan izin default
		if currentCount == 0 {
			mappingQuery := `
				INSERT INTO role_permissions (role_id, permission_id)
				SELECT r.id, p.id
				FROM roles r, permissions p
				WHERE r.code = $1 AND p.code = ANY($2)
				ON CONFLICT DO NOTHING
			`
			if _, err := tx.ExecContext(ctx, mappingQuery, roleCode, pq.Array(permCodes)); err != nil {
				return err
			}
		}
	}

	// 4. Pastikan akun user eksisting yang belum memiliki role_id disinkronkan ke role_id
	linkUsersQuery := `
		UPDATE users u
		SET role_id = r.id
		FROM roles r
		WHERE u.role::text = r.code AND u.role_id IS NULL
	`
	if _, err := tx.ExecContext(ctx, linkUsersQuery); err != nil {
		return err
	}

	return tx.Commit()
}
