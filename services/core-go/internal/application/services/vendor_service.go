package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
)

type VendorService struct {
	vendorRepo ports.VendorRepository
	cache      repository.CacheService
}

func NewVendorService(vendorRepo ports.VendorRepository) *VendorService {
	return &VendorService{vendorRepo: vendorRepo}
}

func (s *VendorService) SetCacheService(cache repository.CacheService) {
	s.cache = cache
}

func (s *VendorService) invalidateCache(ctx context.Context) {
	if s.cache != nil {
		_ = s.cache.InvalidatePrefix(ctx, "cache:vendors:")
	}
}

func (s *VendorService) CreateVendor(ctx context.Context, vendor *domain.Vendor) error {
	vendor.Name = strings.TrimSpace(vendor.Name)
	if vendor.Name == "" {
		return errors.New("vendor name cannot be empty")
	}
	if err := s.vendorRepo.Create(ctx, vendor); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *VendorService) UpdateVendor(ctx context.Context, vendor *domain.Vendor) error {
	vendor.Name = strings.TrimSpace(vendor.Name)
	if vendor.Name == "" {
		return errors.New("vendor name cannot be empty")
	}
	if err := s.vendorRepo.Update(ctx, vendor); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *VendorService) DeleteVendor(ctx context.Context, id int) error {
	if err := s.vendorRepo.SoftDelete(ctx, id); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *VendorService) GetVendorByID(ctx context.Context, id int) (*domain.Vendor, error) {
	return s.vendorRepo.GetByID(ctx, id)
}

type CachedVendorList struct {
	Vendors []domain.Vendor `json:"vendors"`
	Total   int             `json:"total"`
}

func (s *VendorService) ListAllVendors(ctx context.Context, page, limit int, search, sortBy, sortDir string) ([]domain.Vendor, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	cacheKey := fmt.Sprintf("cache:vendors:p:%d:l:%d:s:%s:sb:%s:sd:%s", page, limit, search, sortBy, sortDir)
	if s.cache != nil {
		var cached CachedVendorList
		if found, err := s.cache.Get(ctx, cacheKey, &cached); err == nil && found {
			return cached.Vendors, cached.Total, nil
		}
	}

	vendors, total, err := s.vendorRepo.ListAll(ctx, offset, limit, search, sortBy, sortDir)
	if err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, CachedVendorList{Vendors: vendors, Total: total}, 5*time.Minute)
	}

	return vendors, total, nil
}

// FindOrCreateVendor checks if a vendor exists by name. If not, creates it.
func (s *VendorService) FindOrCreateVendor(ctx context.Context, name string, email string) (*domain.Vendor, error) {
	vendor, err := s.vendorRepo.GetByName(ctx, name)
	if err == nil {
		return vendor, nil
	}

	newVendor := &domain.Vendor{
		Name:  name,
		Email: email,
	}
	err = s.vendorRepo.Create(ctx, newVendor)
	if err != nil {
		return nil, err
	}
	return newVendor, nil
}
