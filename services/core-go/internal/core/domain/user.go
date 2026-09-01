package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserRole string

const (
	RoleSuperAdmin UserRole = "super_admin" // IT Master / Developer (Tersembunyi)
	RoleAdmin      UserRole = "admin"       // Administrator Bisnis / Head of Finance (Level Tertinggi Aplikasi)
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
	Status       UserStatus  `json:"status" db:"status"`
	LastLoginAt  *time.Time  `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt    time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time  `json:"deleted_at,omitempty" db:"deleted_at"`
}

type UserSession struct {
	SessionID string     `json:"session_id"`
	UserID    uuid.UUID  `json:"user_id"`
	Email     string     `json:"email"`
	Phone     *string    `json:"phone,omitempty"`
	FullName  string     `json:"full_name"`
	Role      UserRole   `json:"role"`
	Status    UserStatus `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt time.Time  `json:"expires_at"`
}
