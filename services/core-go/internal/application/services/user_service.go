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
	roleRepo       ports.RoleRepository
	sessionService *SessionService
}

func NewUserService(userRepo ports.UserRepository, roleRepo ports.RoleRepository, sessionService *SessionService) *UserService {
	return &UserService{
		userRepo:       userRepo,
		roleRepo:       roleRepo,
		sessionService: sessionService,
	}
}

type CreateUserInput struct {
	Email    string            `json:"email"`
	Phone    *string           `json:"phone,omitempty"`
	FullName string            `json:"full_name"`
	Password string            `json:"password"`
	Role     domain.UserRole   `json:"role"`
	Status   domain.UserStatus `json:"status"`
}

type UpdateUserInput struct {
	Email    string            `json:"email"`
	Phone    *string           `json:"phone,omitempty"`
	FullName string            `json:"full_name"`
	Role     domain.UserRole   `json:"role"`
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

	// Proteksi: Hanya Super Admin yang bisa membuat akun Super Admin
	if input.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("Anda tidak memiliki wewenang untuk menetapkan role Super Admin IT")
	}

	// C-Level Immunity: Admin biasa tidak boleh membuat akun Direktur/Owner
	if currentUserRole == domain.RoleAdmin && (input.Role == domain.RoleDirektur || input.Role == domain.RoleOwner) {
		return nil, errors.New("Administrator biasa tidak memiliki wewenang untuk membuat akun Direktur atau Pemilik Perusahaan")
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

	// Proteksi: Super Admin kebal dari modifikasi oleh siapapun selain Super Admin
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat diubah oleh Administrator Bisnis")
	}

	// Proteksi: Tidak boleh mempromosikan user menjadi Super Admin jika bukan Super Admin
	if input.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return nil, errors.New("Anda tidak memiliki wewenang untuk menetapkan role Super Admin IT")
	}

	// C-Level Immunity: Admin biasa tidak boleh mengubah akun Direktur atau Owner
	if currentUserRole == domain.RoleAdmin && (targetUser.Role == domain.RoleDirektur || targetUser.Role == domain.RoleOwner) {
		return nil, errors.New("Administrator tidak memiliki wewenang untuk mengubah data akun Direktur maupun Pemilik Perusahaan")
	}

	// Last Admin Standing Protection:
	// Jika targetUser adalah Admin dan statusnya diubah menjadi INACTIVE/SUSPENDED atau rolenya diturunkan:
	if targetUser.Role == domain.RoleAdmin && (input.Status != domain.StatusActive || (input.Role != "" && input.Role != domain.RoleAdmin)) {
		if s.roleRepo != nil {
			activeAdmins, err := s.roleRepo.CountActiveUsersByRoleCode(ctx, "admin")
			if err == nil && activeAdmins <= 1 {
				return nil, errors.New("tidak dapat menonaktifkan atau mengubah peran Administrator terakhir. Tunjuk Administrator lain terlebih dahulu untuk kelangsungan sistem.")
			}
		}
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

func (s *UserService) ResetPassword(ctx context.Context, id uuid.UUID, newPassword string, currentUserID uuid.UUID, currentUserRole domain.UserRole) error {
	targetUser, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Proteksi: Super Admin kebal dari reset password oleh Admin bisnis
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat direset oleh Administrator Bisnis")
	}

	// C-Level Immunity: Admin biasa tidak boleh mereset password Direktur atau Owner
	if currentUserRole == domain.RoleAdmin && (targetUser.Role == domain.RoleDirektur || targetUser.Role == domain.RoleOwner) {
		return errors.New("Administrator tidak memiliki wewenang untuk mereset password akun Direktur maupun Pemilik Perusahaan")
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
	// Golden Rule 1: Anti Self-Deletion
	if id == currentUserID {
		return errors.New("Anda tidak dapat menghapus atau menonaktifkan akun Anda sendiri")
	}

	targetUser, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Proteksi: Super Admin kebal mutlak
	if targetUser.Role == domain.RoleSuperAdmin && currentUserRole != domain.RoleSuperAdmin {
		return errors.New("akun Super Admin IT memiliki proteksi khusus dan tidak dapat dihapus oleh siapapun")
	}

	// Golden Rule 3: C-Level Immunity (Admin tidak boleh hapus Direktur / Owner)
	if currentUserRole == domain.RoleAdmin && (targetUser.Role == domain.RoleDirektur || targetUser.Role == domain.RoleOwner) {
		return errors.New("Administrator tidak memiliki wewenang untuk menghapus atau menonaktifkan akun Direktur maupun Pemilik Perusahaan")
	}

	// Golden Rule 2: Last Admin Standing Protection
	if targetUser.Role == domain.RoleAdmin {
		if s.roleRepo != nil {
			activeAdmins, err := s.roleRepo.CountActiveUsersByRoleCode(ctx, "admin")
			if err == nil && activeAdmins <= 1 {
				return errors.New("tidak dapat menghapus atau menonaktifkan akun Administrator terakhir. Tunjuk Administrator lain terlebih dahulu untuk kelangsungan sistem.")
			}
		}
	}

	if err := s.userRepo.Delete(ctx, id); err != nil {
		return err
	}

	// Force Logout all active sessions immediately
	_ = s.sessionService.RevokeAllUserSessions(ctx, id)

	return nil
}
