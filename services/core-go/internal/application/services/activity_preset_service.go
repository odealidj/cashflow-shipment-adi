package services

import (
	"context"
	"errors"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
)

type ActivityPresetService struct {
	repo ports.ActivityPresetRepository
}

func NewActivityPresetService(repo ports.ActivityPresetRepository) *ActivityPresetService {
	return &ActivityPresetService{repo: repo}
}

func (s *ActivityPresetService) CreatePreset(ctx context.Context, preset *domain.ActivityPreset) error {
	preset.Category = strings.ToUpper(strings.TrimSpace(preset.Category))
	if preset.Category != "ACT_INFO" && preset.Category != "ACT_EXPLAIN" {
		return errors.New("kategori harus 'ACT_INFO' (Keterangan Aktivitas) atau 'ACT_EXPLAIN' (Catatan Tambahan / Rute)")
	}

	preset.Name = strings.TrimSpace(preset.Name)
	if preset.Name == "" {
		return errors.New("nama keterangan / rute wajib diisi")
	}

	// Check if already exists in the same category
	existing, _ := s.repo.GetByCategoryAndName(ctx, preset.Category, preset.Name)
	if existing != nil {
		return errors.New("preset dengan nama ini sudah terdaftar pada kategori yang sama")
	}

	preset.Description = strings.TrimSpace(preset.Description)
	preset.IsActive = true

	return s.repo.Create(ctx, preset)
}

func (s *ActivityPresetService) UpdatePreset(ctx context.Context, preset *domain.ActivityPreset) error {
	preset.Category = strings.ToUpper(strings.TrimSpace(preset.Category))
	if preset.Category != "ACT_INFO" && preset.Category != "ACT_EXPLAIN" {
		return errors.New("kategori harus 'ACT_INFO' atau 'ACT_EXPLAIN'")
	}

	preset.Name = strings.TrimSpace(preset.Name)
	if preset.Name == "" {
		return errors.New("nama keterangan / rute wajib diisi")
	}

	// Check if ID exists
	_, err := s.repo.GetByID(ctx, preset.ID)
	if err != nil {
		return err
	}

	// Check collision in same category
	existing, _ := s.repo.GetByCategoryAndName(ctx, preset.Category, preset.Name)
	if existing != nil && existing.ID != preset.ID {
		return errors.New("nama preset sudah digunakan oleh data lain di kategori yang sama")
	}

	preset.Description = strings.TrimSpace(preset.Description)

	return s.repo.Update(ctx, preset)
}

func (s *ActivityPresetService) GetPresetByID(ctx context.Context, id int) (*domain.ActivityPreset, error) {
	if id <= 0 {
		return nil, errors.New("ID preset tidak valid")
	}
	return s.repo.GetByID(ctx, id)
}

func (s *ActivityPresetService) DeletePreset(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.New("ID preset tidak valid")
	}
	return s.repo.SoftDelete(ctx, id)
}

func (s *ActivityPresetService) ListPresets(ctx context.Context, category, search string, page, limit int) ([]domain.ActivityPreset, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	offset := (page - 1) * limit

	return s.repo.ListAll(ctx, category, search, offset, limit)
}
