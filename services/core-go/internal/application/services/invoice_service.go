package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type InvoiceService struct {
	repo ports.InvoiceRepository
}

func NewInvoiceService(repo ports.InvoiceRepository) *InvoiceService {
	return &InvoiceService{repo: repo}
}

type CreateInvoiceInput struct {
	InvoiceNo       string     `json:"invoice_no"`
	ClientName      string     `json:"client_name"`
	ShipmentDate    string     `json:"shipment_date"` // YYYY-MM-DD
	TopTerms        string     `json:"top_terms"`
	TopDays         int        `json:"top_days"`
	Amount          float64    `json:"amount"`
	Notes           string     `json:"notes"`
	CashflowEntryID *int       `json:"cashflow_entry_id"`
	CreatedBy       *uuid.UUID `json:"created_by"`
}

func (s *InvoiceService) CreateInvoice(ctx context.Context, input CreateInvoiceInput) (*domain.Invoice, error) {
	if input.InvoiceNo == "" {
		return nil, errors.New("nomor invoice wajib diisi")
	}
	if input.ClientName == "" {
		return nil, errors.New("nama klien / perusahaan wajib diisi")
	}
	if input.Amount <= 0 {
		return nil, errors.New("nominal tagihan harus lebih dari 0")
	}

	// Parse shipment date
	shipmentDate, err := time.Parse("2006-01-02", input.ShipmentDate)
	if err != nil {
		shipmentDate = time.Now()
	}

	// Auto-calculate due date: shipmentDate + topDays
	dueDate := shipmentDate.AddDate(0, 0, input.TopDays)

	// Check if invoice number exists
	existing, _ := s.repo.GetByInvoiceNo(ctx, input.InvoiceNo)
	if existing != nil {
		return nil, fmt.Errorf("invoice dengan nomor '%s' sudah terdaftar", input.InvoiceNo)
	}

	terms := input.TopTerms
	if terms == "" {
		if input.TopDays == 0 {
			terms = "COD (Cash on Delivery)"
		} else {
			terms = fmt.Sprintf("Net %d Hari", input.TopDays)
		}
	}

	status := domain.InvoiceStatusUnpaid
	// Check if overdue upon creation
	now := time.Now()
	if now.After(dueDate) {
		status = domain.InvoiceStatusOverdue
	}

	invoice := &domain.Invoice{
		InvoiceNo:       input.InvoiceNo,
		ClientName:      input.ClientName,
		ShipmentDate:    shipmentDate,
		TopTerms:        terms,
		TopDays:         input.TopDays,
		DueDate:         dueDate,
		Amount:          input.Amount,
		Status:          status,
		Notes:           input.Notes,
		CashflowEntryID: input.CashflowEntryID,
		CreatedBy:       input.CreatedBy,
	}

	if err := s.repo.Create(ctx, invoice); err != nil {
		return nil, err
	}

	return invoice, nil
}

func (s *InvoiceService) UpdateInvoice(ctx context.Context, id int, input CreateInvoiceInput) (*domain.Invoice, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.ClientName != "" {
		inv.ClientName = input.ClientName
	}
	if input.Amount > 0 {
		inv.Amount = input.Amount
	}
	if input.Notes != "" {
		inv.Notes = input.Notes
	}
	if input.ShipmentDate != "" {
		if d, err := time.Parse("2006-01-02", input.ShipmentDate); err == nil {
			inv.ShipmentDate = d
		}
	}
	if input.TopDays >= 0 {
		inv.TopDays = input.TopDays
		inv.DueDate = inv.ShipmentDate.AddDate(0, 0, input.TopDays)
	}
	if input.TopTerms != "" {
		inv.TopTerms = input.TopTerms
	} else if input.TopDays >= 0 {
		if input.TopDays == 0 {
			inv.TopTerms = "COD (Cash on Delivery)"
		} else {
			inv.TopTerms = fmt.Sprintf("Net %d Hari", input.TopDays)
		}
	}

	// Re-evaluate overdue if still unpaid
	if inv.Status != domain.InvoiceStatusPaid {
		if time.Now().After(inv.DueDate) {
			inv.Status = domain.InvoiceStatusOverdue
		} else {
			inv.Status = domain.InvoiceStatusUnpaid
		}
	}

	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, err
	}

	return inv, nil
}

func (s *InvoiceService) MarkAsPaid(ctx context.Context, id int) error {
	return s.repo.MarkPaid(ctx, id)
}

func (s *InvoiceService) DeleteInvoice(ctx context.Context, id int) error {
	return s.repo.Delete(ctx, id)
}

func (s *InvoiceService) GetInvoice(ctx context.Context, id int) (*domain.Invoice, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *InvoiceService) ListInvoices(ctx context.Context, page, limit int, filter ports.InvoiceFilter) ([]domain.Invoice, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit
	return s.repo.ListAll(ctx, offset, limit, filter)
}

func (s *InvoiceService) GetSummary(ctx context.Context, filter ports.InvoiceFilter) (map[string]interface{}, error) {
	return s.repo.GetSummary(ctx, filter)
}
