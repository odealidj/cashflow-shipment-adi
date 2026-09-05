package services

import (
	"context"
	"errors"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type RoleService struct {
	roleRepo       ports.RoleRepository
	sessionService *SessionService
}

func NewRoleService(roleRepo ports.RoleRepository, sessionService *SessionService) *RoleService {
	return &RoleService{
		roleRepo:       roleRepo,
		sessionService: sessionService,
	}
}

type CreateRoleInput struct {
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type UpdateRoleInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

func (s *RoleService) ListRoles(ctx context.Context, currentUserRole domain.UserRole) ([]domain.Role, error) {
	includeSuperAdmin := (currentUserRole == domain.RoleSuperAdmin)
	return s.roleRepo.ListRoles(ctx, includeSuperAdmin)
}

func (s *RoleService) GetRoleDetail(ctx context.Context, id uuid.UUID) (*domain.RoleDetail, error) {
	role, err := s.roleRepo.GetRoleByID(ctx, id)
	if err != nil {
		return nil, err
	}

	perms, err := s.roleRepo.GetRolePermissions(ctx, id)
	if err != nil {
		return nil, err
	}

	return &domain.RoleDetail{
		Role:        *role,
		Permissions: perms,
	}, nil
}

func (s *RoleService) CreateRole(ctx context.Context, input CreateRoleInput) (*domain.Role, error) {
	code := strings.ToLower(strings.TrimSpace(input.Code))
	name := strings.TrimSpace(input.Name)

	if code == "" || name == "" {
		return nil, errors.New("kode role dan nama role wajib diisi")
	}

	if code == "super_admin" {
		return nil, errors.New("kode 'super_admin' dicadangkan khusus untuk IT Super Admin")
	}

	// Cek duplikasi kode
	existing, _ := s.roleRepo.GetRoleByCode(ctx, code)
	if existing != nil {
		return nil, errors.New("kode role sudah digunakan, silakan gunakan kode lain")
	}

	role := &domain.Role{
		ID:          uuid.New(),
		Code:        code,
		Name:        name,
		Description: input.Description,
		IsSystem:    false,
	}

	if err := s.roleRepo.CreateRole(ctx, role); err != nil {
		return nil, err
	}

	return role, nil
}

func (s *RoleService) UpdateRole(ctx context.Context, id uuid.UUID, input UpdateRoleInput) error {
	role, err := s.roleRepo.GetRoleByID(ctx, id)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return errors.New("nama role tidak boleh kosong")
	}

	role.Name = name
	role.Description = input.Description

	return s.roleRepo.UpdateRole(ctx, role)
}

func (s *RoleService) DeleteRole(ctx context.Context, id uuid.UUID) error {
	return s.roleRepo.DeleteRole(ctx, id)
}

func (s *RoleService) ListPermissionsGrouped(ctx context.Context) ([]domain.PermissionGroup, error) {
	perms, err := s.roleRepo.ListPermissions(ctx)
	if err != nil {
		return nil, err
	}

	groupMap := make(map[string][]domain.Permission)
	var orderedModules []string

	for _, p := range perms {
		if _, exists := groupMap[p.Module]; !exists {
			orderedModules = append(orderedModules, p.Module)
		}
		groupMap[p.Module] = append(groupMap[p.Module], p)
	}

	var result []domain.PermissionGroup
	for _, mod := range orderedModules {
		result = append(result, domain.PermissionGroup{
			Module:      mod,
			Permissions: groupMap[mod],
		})
	}

	return result, nil
}

func (s *RoleService) UpdateRolePermissions(ctx context.Context, roleID uuid.UUID, permissionCodes []string) error {
	role, err := s.roleRepo.GetRoleByID(ctx, roleID)
	if err != nil {
		return err
	}

	// Super Admin kebal mutlak
	if role.Code == "super_admin" {
		return errors.New("role IT Super Admin kebal mutlak dan memiliki akses penuh (*)")
	}

	if err := s.roleRepo.UpdateRolePermissions(ctx, roleID, permissionCodes); err != nil {
		return err
	}

	return nil
}

// BootstrapSystemRolesAndPermissions menginjeksi peran sistem, kode izin, dan pemetaan default saat startup (Idempoten)
func (s *RoleService) BootstrapSystemRolesAndPermissions(ctx context.Context) error {
	descPtr := func(s string) *string { return &s }

	defaultRoles := []domain.Role{
		{Code: "super_admin", Name: "IT Super Admin", Description: descPtr("Hak akses penuh sistem, konfigurasi teknis, dan audit trail (*fail-safe root*)"), IsSystem: true},
		{Code: "admin", Name: "Administrator Bisnis", Description: descPtr("Pengelola operasional, user management, dan seluruh fitur bisnis"), IsSystem: true},
		{Code: "finance", Name: "Finance & Akuntansi", Description: descPtr("Pengelola transaksi kas operasional, tagihan shipment, dan rekonsiliasi pembayaran"), IsSystem: true},
		{Code: "direktur", Name: "Direktur Perusahaan", Description: descPtr("Monitoring kinerja finansial, persetujuan shipment, dan supervisi operasional"), IsSystem: true},
		{Code: "owner", Name: "Pemilik Perusahaan", Description: descPtr("Pemilik bisnis dengan wewenang pengawasan eksekutif dan audit keuangan"), IsSystem: true},
	}

	defaultPermissions := []domain.Permission{
		// Module CASHFLOW
		{Module: "CASHFLOW", Code: "cashflow.view", Name: "Menu & Halaman Kas Operasional", Description: descPtr("Menampilkan menu Kas di sidebar dan membaca data tabel kas operasional & pengiriman armada")},
		{Module: "CASHFLOW", Code: "cashflow.create", Name: "Tambah Transaksi Kas", Description: descPtr("Membuat transaksi pemasukan/pengeluaran baru")},
		{Module: "CASHFLOW", Code: "cashflow.edit", Name: "Edit Transaksi Kas", Description: descPtr("Mengubah rincian transaksi kas atau status shipment")},
		{Module: "CASHFLOW", Code: "cashflow.delete", Name: "Hapus Transaksi Kas", Description: descPtr("Menghapus pencatatan transaksi kas")},
		{Module: "CASHFLOW", Code: "cashflow.export", Name: "Export Data Kas & Pengiriman", Description: descPtr("Mengunduh laporan kas ke format Excel / CSV")},
		{Module: "CASHFLOW", Code: "cashflow.import", Name: "Import Data Kas", Description: descPtr("Mengunggah dan mengimpor file data transaksi kas")},

		// Module INVOICES
		{Module: "INVOICES", Code: "invoices.view", Name: "Menu & Halaman Invoice Piutang", Description: descPtr("Menampilkan menu Invoice di sidebar dan membaca daftar tagihan piutang customer")},
		{Module: "INVOICES", Code: "invoices.create", Name: "Buat Tagihan Invoice", Description: descPtr("Membuat invoice baru dari transaksi pengiriman")},
		{Module: "INVOICES", Code: "invoices.edit", Name: "Edit Data Invoice", Description: descPtr("Memperbarui nominal, tanggal jatuh tempo, atau status invoice")},
		{Module: "INVOICES", Code: "invoices.delete", Name: "Hapus Invoice", Description: descPtr("Membatalkan atau menghapus draft tagihan invoice")},
		{Module: "INVOICES", Code: "invoices.mark_paid", Name: "Pelunasan Invoice", Description: descPtr("Mencatat pembayaran dan pelunasan piutang customer")},
		{Module: "INVOICES", Code: "invoices.print", Name: "Cetak & PDF Invoice", Description: descPtr("Mencetak dokumen resmi invoice penagihan")},

		// Module CUSTOMERS
		{Module: "CUSTOMERS", Code: "customers.view", Name: "Menu & Master Klien (Customer)", Description: descPtr("Menampilkan menu Klien di sidebar dan membaca daftar rekanan pelanggan")},
		{Module: "CUSTOMERS", Code: "customers.manage", Name: "Kelola Klien", Description: descPtr("Menambah, mengedit, atau menghapus master data pelanggan")},

		// Module VENDORS
		{Module: "VENDORS", Code: "vendors.view", Name: "Menu & Master Mitra Vendor", Description: descPtr("Menampilkan menu Mitra Armada di sidebar dan membaca daftar transporter/vendor")},
		{Module: "VENDORS", Code: "vendors.manage", Name: "Kelola Vendor", Description: descPtr("Menambah, mengedit, atau menghapus master vendor armada")},

		// Module PRESETS
		{Module: "PRESETS", Code: "presets.view", Name: "Menu & Master Preset Aktivitas", Description: descPtr("Menampilkan menu Preset di sidebar dan membaca master rute & keterangan armada")},
		{Module: "PRESETS", Code: "presets.manage", Name: "Kelola Preset Aktivitas", Description: descPtr("Menambah, mengedit, atau menghapus master preset aktivitas")},

		// Module USERS
		{Module: "USERS", Code: "users.view", Name: "Menu & Manajemen Pengguna", Description: descPtr("Menampilkan menu Manajemen Pengguna di sidebar dan melihat daftar akun staf")},
		{Module: "USERS", Code: "users.create", Name: "Tambah Pengguna Baru", Description: descPtr("Menambahkan staf pengguna baru")},
		{Module: "USERS", Code: "users.edit", Name: "Edit Pengguna & Peran", Description: descPtr("Mengubah data akun, peran jabatan, atau status pengguna")},
		{Module: "USERS", Code: "users.delete", Name: "Nonaktifkan / Hapus Pengguna", Description: descPtr("Menonaktifkan akses login atau menghapus pengguna")},
		{Module: "USERS", Code: "users.reset_password", Name: "Reset Password Pengguna", Description: descPtr("Mereset kata sandi akun pengguna")},

		// Module ROLES
		{Module: "ROLES", Code: "roles.view", Name: "Menu & Peran Hak Akses (PBAC)", Description: descPtr("Menampilkan menu Peran & Hak Akses di sidebar dan melihat matriks perizinan")},
		{Module: "ROLES", Code: "roles.manage", Name: "Kelola Peran & Hak Akses", Description: descPtr("Membuat peran baru dan mengatur matriks hak akses tombol")},

		// Module SYSTEM
		{Module: "SYSTEM", Code: "system.view", Name: "Menu & Metrik Sistem Telemetri", Description: descPtr("Menampilkan menu Metrik Sistem dan performa infrastruktur real-time")},

		// Module NOTIFICATIONS
		{Module: "NOTIFICATIONS", Code: "notifications.view", Name: "Pusat Notifikasi & Peringatan", Description: descPtr("Melihat daftar notifikasi dan pengingat jatuh tempo / kas")},
	}

	allCodes := make([]string, len(defaultPermissions))
	for i, p := range defaultPermissions {
		allCodes[i] = p.Code
	}

	defaultRoleMappings := map[string][]string{
		"admin": allCodes,
		"finance": {
			"cashflow.view", "cashflow.create", "cashflow.edit", "cashflow.export", "cashflow.import",
			"invoices.view", "invoices.create", "invoices.edit", "invoices.mark_paid", "invoices.print",
			"customers.view", "vendors.view", "presets.view",
			"notifications.view",
		},
		"direktur": {
			"cashflow.view", "cashflow.export",
			"invoices.view", "invoices.print",
			"customers.view", "vendors.view", "presets.view",
			"users.view", "users.edit", "users.delete", "users.reset_password",
			"roles.view",
			"notifications.view",
		},
		"owner": {
			"cashflow.view", "cashflow.export",
			"invoices.view", "invoices.print",
			"customers.view", "vendors.view", "presets.view",
			"users.view", "users.edit", "users.delete", "users.reset_password",
			"roles.view",
			"notifications.view",
		},
	}

	return s.roleRepo.BootstrapRolesAndPermissions(ctx, defaultRoles, defaultPermissions, defaultRoleMappings)
}
