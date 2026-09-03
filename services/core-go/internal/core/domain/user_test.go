package domain_test

import (
	"testing"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
)

func TestUserHasPermission(t *testing.T) {
	// 1. Super Admin universal bypass
	superAdmin := domain.User{
		Role:        domain.RoleSuperAdmin,
		Permissions: []string{"*"},
	}
	if !superAdmin.HasPermission("cashflow.delete") {
		t.Errorf("expected super_admin to have cashflow.delete via wildcard")
	}
	if !superAdmin.HasPermission("random.permission") {
		t.Errorf("expected super_admin to have random.permission via wildcard")
	}

	// 2. Regular user with explicit permissions
	financeUser := domain.User{
		Role: domain.RoleFinance,
		Permissions: []string{
			"cashflow.view",
			"cashflow.create",
			"cashflow.export",
		},
	}
	if !financeUser.HasPermission("cashflow.view") {
		t.Errorf("expected finance user to have cashflow.view")
	}
	if !financeUser.HasPermission("cashflow.create") {
		t.Errorf("expected finance user to have cashflow.create")
	}
	if financeUser.HasPermission("cashflow.delete") {
		t.Errorf("expected finance user NOT to have cashflow.delete")
	}
	if financeUser.HasPermission("users.delete") {
		t.Errorf("expected finance user NOT to have users.delete")
	}

	// 3. UserSession HasPermission
	session := domain.UserSession{
		Role:        "admin",
		Permissions: []string{"cashflow.view", "cashflow.edit"},
	}
	if !session.HasPermission("cashflow.edit") {
		t.Errorf("expected session to have cashflow.edit")
	}
	if session.HasPermission("roles.manage") {
		t.Errorf("expected session NOT to have roles.manage")
	}
}
