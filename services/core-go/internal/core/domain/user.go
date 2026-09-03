package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleSuperAdmin UserRole = "super_admin" // IT Master / Developer (Tersembunyi, Fail-safe All Access)
	RoleAdmin      UserRole = "admin"       // Administrator Bisnis / Head of Operations
	RoleFinance    UserRole = "finance"     // Staf Keuangan & Akuntansi (Input Transaksi & Invoice)
	RoleDirektur   UserRole = "direktur"    // Direktur / Manajemen (Monitoring & Review)
	RoleOwner      UserRole = "owner"       // Pemilik Modal / Investor (Executive Dashboard)
	
	// Legacy fallback aliases
	RoleOperator   UserRole = "operator"
	RoleViewer     UserRole = "viewer"
)

type UserStatus string

const (
	StatusActive    UserStatus = "ACTIVE"
	StatusInactive  UserStatus = "INACTIVE"
	StatusSuspended UserStatus = "SUSPENDED"
)

type User struct {
	ID           uuid.UUID   `json:"id" db:"id"`
	Email        string      `json:"email" db:"email"`
	Phone        *string     `json:"phone,omitempty" db:"phone"`
	PasswordHash string      `json:"-" db:"password_hash"`
	FullName     string      `json:"full_name" db:"full_name"`
	Role         UserRole    `json:"role" db:"role"`
	RoleID       *uuid.UUID  `json:"role_id,omitempty" db:"role_id"`
	Status       UserStatus  `json:"status" db:"status"`
	LastLoginAt  *time.Time  `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt    time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time  `json:"deleted_at,omitempty" db:"deleted_at"`
	Permissions  []string    `json:"permissions,omitempty" db:"-"`
}

type UserSession struct {
	SessionID   string     `json:"session_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Email       string     `json:"email"`
	Phone       *string    `json:"phone,omitempty"`
	FullName    string     `json:"full_name"`
	Role        UserRole   `json:"role"`
	RoleID      *uuid.UUID `json:"role_id,omitempty"`
	Status      UserStatus `json:"status"`
	Permissions []string   `json:"permissions"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
}

// HasPermission mengecek apakah user memiliki wewenang tertentu.
// super_admin secara otomatis memiliki akses ke semua izin (*).
func (u *User) HasPermission(code string) bool {
	if u.Role == RoleSuperAdmin {
		return true
	}
	for _, p := range u.Permissions {
		if p == "*" || p == code {
			return true
		}
	}
	return false
}

// HasPermission mengecek apakah sesi memiliki wewenang tertentu.
// super_admin secara otomatis memiliki akses ke semua izin (*).
func (s *UserSession) HasPermission(code string) bool {
	if s.Role == RoleSuperAdmin {
		return true
	}
	for _, p := range s.Permissions {
		if p == "*" || p == code {
			return true
		}
	}
	return false
}
