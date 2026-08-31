package services

import (
	"context"
	"errors"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
)

type CustomerService struct {
	customerRepo ports.CustomerRepository
}

func NewCustomerService(customerRepo ports.CustomerRepository) *CustomerService {
	return &CustomerService{customerRepo: customerRepo}
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

	return s.customerRepo.Create(ctx, customer)
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

	return s.customerRepo.Update(ctx, customer)
}

func (s *CustomerService) DeleteCustomer(ctx context.Context, id int) error {
	return s.customerRepo.SoftDelete(ctx, id)
}

func (s *CustomerService) GetCustomerByID(ctx context.Context, id int) (*domain.Customer, error) {
	return s.customerRepo.GetByID(ctx, id)
}

func (s *CustomerService) ListAllCustomers(ctx context.Context, page, limit int, search string) ([]domain.Customer, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit
	return s.customerRepo.ListAll(ctx, offset, limit, search)
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
