package domain

import "time"

type Customer struct {
	ID        int        `json:"id" db:"id"`
	Name      string     `json:"name" db:"name"`
	PicName   string     `json:"pic_name" db:"pic_name"`
	Email     string     `json:"email" db:"email"`
	Phone     string     `json:"phone" db:"phone"`
	Address   string     `json:"address" db:"address"`
	Notes     string     `json:"notes" db:"notes"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty" db:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}
