package services

import (
	"context"
	"errors"
	"log"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/hash"
	"github.com/google/uuid"
)

type AuthService struct {
	userRepo       ports.UserRepository
	sessionService *SessionService
}

func NewAuthService(userRepo ports.UserRepository, sessionService *SessionService) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		sessionService: sessionService,
	}
}

func (s *AuthService) Login(ctx context.Context, identifier, password string) (*domain.UserSession, string, error) {
	user, err := s.userRepo.GetByEmailOrPhone(ctx, identifier)
	if err != nil {
		return nil, "", errors.New("kredensial tidak valid")
	}

	if user.Status != domain.StatusActive {
		return nil, "", errors.New("akun Anda tidak aktif atau dinonaktifkan. Silakan hubungi Administrator")
	}

	if !hash.CheckPasswordHash(password, user.PasswordHash) {
		return nil, "", errors.New("kredensial tidak valid")
	}

	// Update last login timestamp
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Create Two-Tier Session (L1 Memory + L2 Redis)
	session, token, err := s.sessionService.CreateSession(ctx, user)
	if err != nil {
		return nil, "", err
	}

	return session, token, nil
}

func (s *AuthService) Logout(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return nil
	}
	return s.sessionService.RevokeSession(ctx, sessionID)
}

func (s *AuthService) Register(ctx context.Context, user *domain.User, plainPassword string) error {
	hashedPassword, err := hash.HashPassword(plainPassword)
	if err != nil {
		return err
	}

	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.PasswordHash = hashedPassword
	if user.Status == "" {
		user.Status = domain.StatusActive
	}

	return s.userRepo.Create(ctx, user)
}

// BootstrapSuperAdmin auto-initializes the initial Super Admin account from Environment Variables if not present
func (s *AuthService) BootstrapSuperAdmin(ctx context.Context, email, password, fullName, phone string) error {
	if email == "" || password == "" {
		return nil // No env configuration provided, skip
	}

	// Check if user with this email already exists
	existingUser, _ := s.userRepo.GetByEmailOrPhone(ctx, email)
	if existingUser != nil {
		return nil // Already initialized, skip
	}

	if fullName == "" {
		fullName = "IT Super Admin"
	}

	var phonePtr *string
	if phone != "" {
		phonePtr = &phone
	}

	hashedPassword, err := hash.HashPassword(password)
	if err != nil {
		return err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		Phone:        phonePtr,
		FullName:     fullName,
		PasswordHash: hashedPassword,
		Role:         domain.RoleSuperAdmin,
		Status:       domain.StatusActive,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return err
	}

	log.Printf("[Bootstrap] Akun IT Super Admin berhasil diinisialisasi otomatis dari .env untuk: %s\n", email)
	return nil
}
