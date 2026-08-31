package domain

import "time"

type ActivityPreset struct {
	ID          int        `json:"id" db:"id"`
	Category    string     `json:"category" db:"category"` // 'ACT_INFO' or 'ACT_EXPLAIN'
	Name        string     `json:"name" db:"name"`
	Description string     `json:"description" db:"description"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
