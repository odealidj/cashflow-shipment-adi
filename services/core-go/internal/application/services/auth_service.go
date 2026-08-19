package services

import (
	"context"
	"errors"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/auth"
	"github.com/cashflow-shipment-app/backend/pkg/hash"
	"github.com/google/uuid"
)

type AuthService struct {
	userRepo ports.UserRepository
	jwtSecret string
}

func NewAuthService(userRepo ports.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) Login(ctx context.Context, identifier, password string) (string, *domain.User, error) {
	user, err := s.userRepo.GetByEmailOrPhone(ctx, identifier)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	if !hash.CheckPasswordHash(password, user.PasswordHash) {
		return "", nil, errors.New("invalid credentials")
	}

	// Token expires in 24 hours
	token, err := auth.GenerateToken(user.ID, user.Role, s.jwtSecret, 24*time.Hour)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (s *AuthService) Register(ctx context.Context, user *domain.User, plainPassword string) error {
	hashedPassword, err := hash.HashPassword(plainPassword)
	if err != nil {
		return err
	}

	user.ID = uuid.New()
	user.PasswordHash = hashedPassword

	return s.userRepo.Create(ctx, user)
}
