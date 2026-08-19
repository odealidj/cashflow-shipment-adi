package services

import (
	"context"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
)

type VendorService struct {
	vendorRepo ports.VendorRepository
}

func NewVendorService(vendorRepo ports.VendorRepository) *VendorService {
	return &VendorService{vendorRepo: vendorRepo}
}

func (s *VendorService) CreateVendor(ctx context.Context, vendor *domain.Vendor) error {
	return s.vendorRepo.Create(ctx, vendor)
}

func (s *VendorService) GetVendorByID(ctx context.Context, id int) (*domain.Vendor, error) {
	return s.vendorRepo.GetByID(ctx, id)
}

func (s *VendorService) ListAllVendors(ctx context.Context, page, limit int) ([]domain.Vendor, int, error) {
	offset := (page - 1) * limit
	return s.vendorRepo.ListAll(ctx, offset, limit)
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
