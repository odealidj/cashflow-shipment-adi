package services

import (
	"context"
	"errors"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/hash"
	"github.com/google/uuid"
)

type UserService struct {
	userRepo       ports.UserRepository
	sessionService *SessionService
}

func NewUserService(userRepo ports.UserRepository, sessionService *SessionService) *UserService {
	return &UserService{
		userRepo:       userRepo,
		sessionService: sessionService,
	}
}

type CreateUserInput struct {
	Email    string          `json:"email"`
	Phone    *string         `json:"phone,omitempty"`
	FullName string          `json:"full_name"`
	Password string          `json:"password"`
	Role     domain.UserRole `json:"role"`
	Status   domain.UserStatus `json:"status"`
}

type UpdateUserInput struct {
	Email    string          `json:"email"`
	Phone    *string         `json:"phone,omitempty"`
	FullName string          `json:"full_name"`
	Role     domain.UserRole `json:"role"`
	Status   domain.UserStatus `json:"status"`
}

func (s *UserService) List(ctx context.Context, limit, offset int, search, role, status string, currentUserRole domain.UserRole) ([]domain.User, int, error) {
	includeSuperAdmin := (currentUserRole == domain.RoleSuperAdmin)
	return s.userRepo.List(ctx, limit, offset, search, role, status, includeSuperAdmin)
}

func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *UserService) Create(ctx context.Context, input CreateUserInput, currentUserRole domain.UserRole) (*domain.User, error) {
	if input.FullName == "" || input.Email == "" || input.Password == "" {
		return nil, errors.New("nama lengkap, email, dan password wajib diisi")
	}

	// Security: Only Super Admin can create another Super Admin
	if input.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("Anda tidak memiliki wewenang untuk menetapkan role Super Admin IT")
	}

	if input.Role == "" {
		input.Role = domain.RoleFinance
	}

	if input.Status == "" {
		input.Status = domain.StatusActive
	}

	hashedPassword, err := hash.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Email:        input.Email,
		Phone:        input.Phone,
		FullName:     input.FullName,
		PasswordHash: hashedPassword,
		Role:         input.Role,
		Status:       input.Status,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) Update(ctx context.Context, id uuid.UUID, input UpdateUserInput, currentUserID uuid.UUID, currentUserRole domain.UserRole) (*domain.User, error) {
	targetUser, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Security: Cannot edit Super Admin if not Super Admin
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat diubah oleh Administrator Bisnis")
	}

	// Security: Non-SuperAdmin cannot promote someone to SuperAdmin
	if input.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("Anda tidak memiliki wewenang untuk menetapkan role Super Admin IT")
	}

	// Check if role or status changes
	roleOrStatusChanged := (targetUser.Role != input.Role || targetUser.Status != input.Status)

	targetUser.Email = input.Email
	targetUser.Phone = input.Phone
	targetUser.FullName = input.FullName
	if input.Role != "" {
		targetUser.Role = input.Role
	}
	if input.Status != "" {
		targetUser.Status = input.Status
	}

	if err := s.userRepo.Update(ctx, targetUser); err != nil {
		return nil, err
	}

	// Force Logout active sessions if role or status was changed
	if roleOrStatusChanged {
		_ = s.sessionService.RevokeAllUserSessions(ctx, id)
	}

	return targetUser, nil
}

func (s *UserService) ResetPassword(ctx context.Context, id uuid.UUID, newPassword string, currentUserRole domain.UserRole) error {
	targetUser, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Security: Cannot reset Super Admin password if not Super Admin
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat direset oleh Administrator Bisnis")
	}

	if len(newPassword) < 6 {
		return errors.New("password baru minimal 6 karakter")
	}

	hashedPassword, err := hash.HashPassword(newPassword)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(ctx, id, hashedPassword); err != nil {
		return err
	}

	// Force Logout all old sessions for this user
	_ = s.sessionService.RevokeAllUserSessions(ctx, id)

	return nil
}

func (s *UserService) Delete(ctx context.Context, id uuid.UUID, currentUserID uuid.UUID, currentUserRole domain.UserRole) error {
	if id == currentUserID {
		return errors.New("Anda tidak dapat menghapus akun Anda sendiri")
	}

	targetUser, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Security: Cannot delete Super Admin if not Super Admin
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat dihapus oleh Administrator Bisnis")
	}

	if err := s.userRepo.Delete(ctx, id); err != nil {
		return err
	}

	// Force Logout all active sessions immediately
	_ = s.sessionService.RevokeAllUserSessions(ctx, id)

	return nil
}
