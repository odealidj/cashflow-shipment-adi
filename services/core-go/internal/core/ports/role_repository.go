package ports

import (
	"context"

	"github.com/google/uuid"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

// RoleRepository mendefinisikan kontrak akses basis data untuk modul Peran & Hak Akses
type RoleRepository interface {
	// Operasi Role
	ListRoles(ctx context.Context, includeSuperAdmin bool) ([]domain.Role, error)
	GetRoleByID(ctx context.Context, id uuid.UUID) (*domain.Role, error)
	GetRoleByCode(ctx context.Context, code string) (*domain.Role, error)
	CreateRole(ctx context.Context, role *domain.Role) error
	UpdateRole(ctx context.Context, role *domain.Role) error
	DeleteRole(ctx context.Context, id uuid.UUID) error

	// Operasi Permission & Matriks
	ListPermissions(ctx context.Context) ([]domain.Permission, error)
	GetRolePermissions(ctx context.Context, roleID uuid.UUID) ([]string, error)
	UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, permissionCodes []string) error

	// Validasi Tata Kelola Pengguna
	CountActiveUsersByRoleCode(ctx context.Context, roleCode string) (int, error)

	// Inisialisasi & Bootstrap Idempoten
	BootstrapRolesAndPermissions(ctx context.Context, defaultRoles []domain.Role, defaultPermissions []domain.Permission, defaultRoleMappings map[string][]string) error
}
