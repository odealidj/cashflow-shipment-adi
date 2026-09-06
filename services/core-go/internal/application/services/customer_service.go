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

type CustomerService struct {
	customerRepo ports.CustomerRepository
	cache        repository.CacheService
}

func NewCustomerService(customerRepo ports.CustomerRepository) *CustomerService {
	return &CustomerService{customerRepo: customerRepo}
}

func (s *CustomerService) SetCacheService(cache repository.CacheService) {
	s.cache = cache
}

func (s *CustomerService) invalidateCache(ctx context.Context) {
	if s.cache != nil {
		_ = s.cache.InvalidatePrefix(ctx, "cache:customers:")
	}
}

func (s *CustomerService) CreateCustomer(ctx context.Context, customer *domain.Customer) error {
	customer.Name = strings.TrimSpace(customer.Name)
	if customer.Name == "" {
		return errors.New("nama customer / perusahaan wajib diisi")
	}

	// Check if already exists
	existing, _ := s.customerRepo.GetByName(ctx, customer.Name)
	if existing != nil {
		return errors.New("customer dengan nama ini sudah terdaftar")
	}

	customer.PicName = strings.TrimSpace(customer.PicName)
	customer.Email = strings.TrimSpace(customer.Email)
	customer.Phone = strings.TrimSpace(customer.Phone)
	customer.Address = strings.TrimSpace(customer.Address)
	customer.Notes = strings.TrimSpace(customer.Notes)

	if err := s.customerRepo.Create(ctx, customer); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *CustomerService) UpdateCustomer(ctx context.Context, customer *domain.Customer) error {
	customer.Name = strings.TrimSpace(customer.Name)
	if customer.Name == "" {
		return errors.New("nama customer / perusahaan wajib diisi")
	}

	// Check if ID exists
	_, err := s.customerRepo.GetByID(ctx, customer.ID)
	if err != nil {
		return err
	}

	// Check unique name collision
	existing, _ := s.customerRepo.GetByName(ctx, customer.Name)
	if existing != nil && existing.ID != customer.ID {
		return errors.New("nama customer sudah digunakan oleh data lain")
	}

	customer.PicName = strings.TrimSpace(customer.PicName)
	customer.Email = strings.TrimSpace(customer.Email)
	customer.Phone = strings.TrimSpace(customer.Phone)
	customer.Address = strings.TrimSpace(customer.Address)
	customer.Notes = strings.TrimSpace(customer.Notes)

	if err := s.customerRepo.Update(ctx, customer); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *CustomerService) DeleteCustomer(ctx context.Context, id int) error {
	if err := s.customerRepo.SoftDelete(ctx, id); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *CustomerService) GetCustomerByID(ctx context.Context, id int) (*domain.Customer, error) {
	return s.customerRepo.GetByID(ctx, id)
}

type CachedCustomerList struct {
	Customers []domain.Customer `json:"customers"`
	Total     int               `json:"total"`
}

func (s *CustomerService) ListAllCustomers(ctx context.Context, page, limit int, search, sortBy, sortDir string) ([]domain.Customer, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	cacheKey := fmt.Sprintf("cache:customers:p:%d:l:%d:s:%s:sb:%s:sd:%s", page, limit, search, sortBy, sortDir)
	if s.cache != nil {
		var cached CachedCustomerList
		if found, err := s.cache.Get(ctx, cacheKey, &cached); err == nil && found {
			return cached.Customers, cached.Total, nil
		}
	}

	customers, total, err := s.customerRepo.ListAll(ctx, offset, limit, search, sortBy, sortDir)
	if err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, CachedCustomerList{Customers: customers, Total: total}, 5*time.Minute)
	}

	return customers, total, nil
}

func (s *CustomerService) FindOrCreateCustomer(ctx context.Context, name string, picName string, email string, phone string) (*domain.Customer, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nama customer tidak boleh kosong")
	}

	customer, err := s.customerRepo.GetByName(ctx, name)
	if err == nil && customer != nil {
		return customer, nil
	}

	newCustomer := &domain.Customer{
		Name:    name,
		PicName: strings.TrimSpace(picName),
		Email:   strings.TrimSpace(email),
		Phone:   strings.TrimSpace(phone),
	}
	err = s.customerRepo.Create(ctx, newCustomer)
	if err != nil {
		return nil, err
	}
	return newCustomer, nil
}
