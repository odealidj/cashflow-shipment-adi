package services

import (
	"context"
	"errors"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type RoleService struct {
	roleRepo       ports.RoleRepository
	sessionService *SessionService
}

func NewRoleService(roleRepo ports.RoleRepository, sessionService *SessionService) *RoleService {
	return &RoleService{
		roleRepo:       roleRepo,
		sessionService: sessionService,
	}
}

type CreateRoleInput struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type UpdateRoleInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

func (s *RoleService) ListRoles(ctx context.Context, currentUserRole domain.UserRole) ([]domain.Role, error) {
	includeSuperAdmin := (currentUserRole == domain.RoleSuperAdmin)
	return s.roleRepo.ListRoles(ctx, includeSuperAdmin)
}

func (s *RoleService) GetRoleDetail(ctx context.Context, id uuid.UUID) (*domain.RoleDetail, error) {
	role, err := s.roleRepo.GetRoleByID(ctx, id)
	if err != nil {
		return nil, err
	}

	perms, err := s.roleRepo.GetRolePermissions(ctx, id)
	if err != nil {
		return nil, err
	}

	return &domain.RoleDetail{
		Role:        *role,
		Permissions: perms,
	}, nil
}

func (s *RoleService) CreateRole(ctx context.Context, input CreateRoleInput) (*domain.Role, error) {
	code := strings.ToLower(strings.TrimSpace(input.Code))
	name := strings.TrimSpace(input.Name)

	if code == "" || name == "" {
		return nil, errors.New("kode role dan nama role wajib diisi")
	}

	if code == "super_admin" {
		return nil, errors.New("kode 'super_admin' dicadangkan khusus untuk IT Super Admin")
	}

	// Cek duplikasi kode
	existing, _ := s.roleRepo.GetRoleByCode(ctx, code)
	if existing != nil {
		return nil, errors.New("kode role sudah digunakan, silakan gunakan kode lain")
	}

	role := &domain.Role{
		ID:          uuid.New(),
		Code:        code,
		Name:        name,
		Description: input.Description,
		IsSystem:    false,
	}

	if err := s.roleRepo.CreateRole(ctx, role); err != nil {
		return nil, err
	}

	return role, nil
}

func (s *RoleService) UpdateRole(ctx context.Context, id uuid.UUID, input UpdateRoleInput) error {
	role, err := s.roleRepo.GetRoleByID(ctx, id)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return errors.New("nama role tidak boleh kosong")
	}

	role.Name = name
	role.Description = input.Description

	return s.roleRepo.UpdateRole(ctx, role)
}

func (s *RoleService) DeleteRole(ctx context.Context, id uuid.UUID) error {
	return s.roleRepo.DeleteRole(ctx, id)
}

func (s *RoleService) ListPermissionsGrouped(ctx context.Context) ([]domain.PermissionGroup, error) {
	perms, err := s.roleRepo.ListPermissions(ctx)
	if err != nil {
		return nil, err
	}

	groupMap := make(map[string][]domain.Permission)
	var orderedModules []string

	for _, p := range perms {
		if _, exists := groupMap[p.Module]; !exists {
			orderedModules = append(orderedModules, p.Module)
		}
		groupMap[p.Module] = append(groupMap[p.Module], p)
	}

	var result []domain.PermissionGroup
	for _, mod := range orderedModules {
		result = append(result, domain.PermissionGroup{
			Module:      mod,
			Permissions: groupMap[mod],
		})
	}

	return result, nil
}

func (s *RoleService) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, permissionCodes []string) error {
	role, err := s.roleRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		return err
	}

	// Super Admin kebal mutlak
	if role.Code == "super_admin" {
		return errors.New("role IT Super Admin kebal mutlak dan memiliki akses penuh (*)")
	}

	if err := s.roleRepo.UpdateRolePermissions(ctx, roleID, permissionCodes); err != nil {
		return err
	}

	return nil
}
