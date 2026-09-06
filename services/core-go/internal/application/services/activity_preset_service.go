package services

import (
	"context"
	"errors"
	"strings"

	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
)

type ActivityPresetService struct {
	repo  ports.ActivityPresetRepository
	cache repository.CacheService
}

func NewActivityPresetService(repo ports.ActivityPresetRepository) *ActivityPresetService {
	return &ActivityPresetService{repo: repo}
}

func (s *ActivityPresetService) SetCacheService(cache repository.CacheService) {
	s.cache = cache
}

func (s *ActivityPresetService) invalidateCache(ctx context.Context) {
	if s.cache != nil {
		_ = s.cache.InvalidatePrefix(ctx, "cache:presets:")
	}
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

	if err := s.repo.Create(ctx, preset); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
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

	if err := s.repo.Update(ctx, preset); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
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
	if err := s.repo.SoftDelete(ctx, id); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

type CachedPresetList struct {
	Presets []domain.ActivityPreset `json:"presets"`
	Total   int                     `json:"total"`
}

func (s *ActivityPresetService) ListPresets(ctx context.Context, category, search string, page, limit int, sortBy, sortDir string) ([]domain.ActivityPreset, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 100
	}
	offset := (page - 1) * limit

	cacheKey := fmt.Sprintf("cache:presets:cat:%s:p:%d:l:%d:s:%s:sb:%s:sd:%s", category, page, limit, search, sortBy, sortDir)
	if s.cache != nil {
		var cached CachedPresetList
		if found, err := s.cache.Get(ctx, cacheKey, &cached); err == nil && found {
			return cached.Presets, cached.Total, nil
		}
	}

	presets, total, err := s.repo.ListAll(ctx, category, search, offset, limit, sortBy, sortDir)
	if err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, CachedPresetList{Presets: presets, Total: total}, 5*time.Minute)
	}

	return presets, total, nil
}
