package domain

import (
	"time"

	"github.com/google/uuid"
)

// Role merepresentasikan peran jabatan pengguna dalam sistem
type Role struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Code        string    `json:"code" db:"code"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	IsSystem    bool      `json:"is_system" db:"is_system"`
	UserCount   int       `json:"user_count" db:"user_count"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Permission merepresentasikan wewenang atomik (per aksi / fitur / tombol)
type Permission struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Module      string    `json:"module" db:"module"`
	Code        string    `json:"code" db:"code"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// RoleDetail berisi entitas Role beserta seluruh kode izin yang dimiliki
type RoleDetail struct {
	Role
	Permissions []string `json:"permissions"`
}

// PermissionGroup mengelompokkan permissions berdasarkan nama modul untuk tampilan matriks di UI
type PermissionGroup struct {
	Module      string       `json:"module"`
	Permissions []Permission `json:"permissions"`
}
