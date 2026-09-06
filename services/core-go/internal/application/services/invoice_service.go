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
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/google/uuid"
)

type InvoiceService struct {
	repo     ports.InvoiceRepository
	notifSvc *NotificationService
	cache    repository.CacheService
}

func NewInvoiceService(repo ports.InvoiceRepository) *InvoiceService {
	return &InvoiceService{repo: repo}
}

func (s *InvoiceService) SetNotificationService(notifSvc *NotificationService) {
	s.notifSvc = notifSvc
}

func (s *InvoiceService) SetCacheService(cache repository.CacheService) {
	s.cache = cache
}

func (s *InvoiceService) invalidateCache(ctx context.Context) {
	if s.cache != nil {
		_ = s.cache.InvalidatePrefix(ctx, "cache:invoices:")
	}
}

type CreateInvoiceInput struct {
	InvoiceNo       string     `json:"invoice_no"`
	ClientName      string     `json:"client_name"`
	ShipmentDate    string     `json:"shipment_date"` // YYYY-MM-DD
	TopTerms        string     `json:"top_terms"`
	TopDays         int        `json:"top_days"`
	Amount          float64    `json:"amount"`
	Status          string     `json:"status"` // UNPAID, PAID, OVERDUE (opsional)
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
	var paidAt *time.Time

	if input.Status != "" {
		stUpper := domain.InvoiceStatus(strings.ToUpper(input.Status))
		if stUpper == domain.InvoiceStatusPaid {
			status = domain.InvoiceStatusPaid
			t := time.Now()
			paidAt = &t
		} else if stUpper == domain.InvoiceStatusOverdue {
			status = domain.InvoiceStatusOverdue
		} else if stUpper == domain.InvoiceStatusUnpaid {
			status = domain.InvoiceStatusUnpaid
		}
	} else {
		// Default: Check if overdue upon creation
		now := time.Now()
		if now.After(dueDate) {
			status = domain.InvoiceStatusOverdue
		}
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
		PaidAt:          paidAt,
		Notes:           input.Notes,
		CashflowEntryID: input.CashflowEntryID,
		CreatedBy:       input.CreatedBy,
	}

	if err := s.repo.Create(ctx, invoice); err != nil {
		return nil, err
	}
	s.invalidateCache(ctx)
	telemetry.RecordInvoiceCreated()

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

	// Update status jika user secara eksplisit mengubahnya
	if input.Status != "" {
		stUpper := domain.InvoiceStatus(strings.ToUpper(input.Status))
		if stUpper == domain.InvoiceStatusPaid {
			inv.Status = domain.InvoiceStatusPaid
			if inv.PaidAt == nil {
				t := time.Now()
				inv.PaidAt = &t
			}
		} else if stUpper == domain.InvoiceStatusOverdue {
			inv.Status = domain.InvoiceStatusOverdue
			inv.PaidAt = nil
		} else if stUpper == domain.InvoiceStatusUnpaid {
			inv.Status = domain.InvoiceStatusUnpaid
			inv.PaidAt = nil
		}
	} else if inv.Status != domain.InvoiceStatusPaid {
		// Re-evaluate overdue if still unpaid
		if time.Now().After(inv.DueDate) {
			inv.Status = domain.InvoiceStatusOverdue
		} else {
			inv.Status = domain.InvoiceStatusUnpaid
		}
	}

	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, err
	}
	s.invalidateCache(ctx)

	return inv, nil
}

type SettleInvoiceInput struct {
	PaymentDate   string     `json:"payment_date"` // YYYY-MM-DD or RFC3339, default time.Now()
	ReferenceNo   string     `json:"reference_no"`
	ProofURL      string     `json:"proof_url"`
	Notes         string     `json:"notes"`
	CreatedBy     *uuid.UUID `json:"created_by"`
	CreatedByName string     `json:"created_by_name"`
}

type RescheduleDueDateInput struct {
	NewDueDate    string     `json:"new_due_date"` // YYYY-MM-DD
	Reason        string     `json:"reason"`
	ChangedBy     *uuid.UUID `json:"changed_by"`
	ChangedByName string     `json:"changed_by_name"`
}

func (s *InvoiceService) MarkAsPaid(ctx context.Context, id int) error {
	_, err := s.SettleInvoice(ctx, id, SettleInvoiceInput{})
	return err
}

func (s *InvoiceService) SettleInvoice(ctx context.Context, id int, input SettleInvoiceInput) (*domain.Invoice, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if inv.Status == domain.InvoiceStatusPaid {
		return nil, errors.New("invoice ini sudah berstatus lunas")
	}

	payDate := time.Now()
	if input.PaymentDate != "" {
		if d, err := time.Parse("2006-01-02", input.PaymentDate); err == nil {
			payDate = d
		} else if d, err := time.Parse(time.RFC3339, input.PaymentDate); err == nil {
			payDate = d
		}
	}

	creatorName := input.CreatedByName
	if creatorName == "" {
		creatorName = "Staf Finance"
	}

	payment := domain.InvoicePaymentHistory{
		InvoiceID:     id,
		Action:        "SETTLED",
		Amount:        inv.Amount,
		PaymentDate:   payDate,
		ReferenceNo:   input.ReferenceNo,
		ProofURL:      input.ProofURL,
		Notes:         input.Notes,
		CreatedBy:     input.CreatedBy,
		CreatedByName: creatorName,
	}

	if err := s.repo.SettleInvoice(ctx, id, payment); err != nil {
		return nil, err
	}
	telemetry.RecordInvoicePaid()

	if s.notifSvc != nil {
		go func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			target := "finance"
			title := fmt.Sprintf("✅ Invoice Lunas: %s", inv.InvoiceNo)
			msg := fmt.Sprintf("Tagihan Invoice %s dari '%s' sebesar Rp %s telah dilunasi dan kas bertambah.",
				inv.InvoiceNo, inv.ClientName, FormatRupiah(inv.Amount))
			actionURL := fmt.Sprintf("/dashboard/invoices?search=%s", inv.InvoiceNo)
			_, _ = s.notifSvc.Create(bgCtx, CreateNotificationInput{
				TargetRole: &target,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryInvoice,
				Severity:   domain.NotificationSeverityInfo,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"invoice_id": inv.ID,
					"invoice_no": inv.InvoiceNo,
					"amount":     inv.Amount,
				},
			})
		}()
	}

	s.invalidateCache(ctx)
	return s.repo.GetByID(ctx, id)
}

func (s *InvoiceService) RescheduleDueDate(ctx context.Context, id int, input RescheduleDueDateInput) (*domain.Invoice, error) {
	inv, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if inv.Status == domain.InvoiceStatusPaid {
		return nil, errors.New("tidak dapat mengubah tanggal jatuh tempo invoice yang sudah lunas")
	}

	if input.NewDueDate == "" {
		return nil, errors.New("tanggal jatuh tempo baru wajib diisi")
	}
	newDueDate, err := time.Parse("2006-01-02", input.NewDueDate)
	if err != nil {
		return nil, fmt.Errorf("format tanggal jatuh tempo baru tidak valid: %v", err)
	}

	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		return nil, errors.New("alasan perubahan tanggal jatuh tempo wajib diisi demi akuntabilitas audit")
	}

	daysAdded := int(newDueDate.Sub(inv.DueDate).Hours() / 24)

	changedByName := input.ChangedByName
	if changedByName == "" {
		changedByName = "Sistem"
	}

	history := domain.InvoiceDueDateHistory{
		InvoiceID:       id,
		PreviousDueDate: inv.DueDate,
		NewDueDate:      newDueDate,
		DaysAdded:       daysAdded,
		Reason:          input.Reason,
		ChangedBy:       input.ChangedBy,
		ChangedByName:   changedByName,
	}

	if err := s.repo.RescheduleDueDate(ctx, id, history); err != nil {
		return nil, err
	}

	if s.notifSvc != nil {
		go func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			target := "finance"
			title := fmt.Sprintf("📅 Jatuh Tempo Invoice Diundur: %s", inv.InvoiceNo)
			msg := fmt.Sprintf("Jatuh tempo invoice %s (%s) diperpanjang ke %s (%+d hari). Alasan: %s",
				inv.InvoiceNo, inv.ClientName, newDueDate.Format("02 Jan 2006"), daysAdded, input.Reason)
			actionURL := fmt.Sprintf("/dashboard/invoices?search=%s", inv.InvoiceNo)
			_, _ = s.notifSvc.Create(bgCtx, CreateNotificationInput{
				TargetRole: &target,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryInvoice,
				Severity:   domain.NotificationSeverityInfo,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"invoice_id":   inv.ID,
					"invoice_no":   inv.InvoiceNo,
					"new_due_date": newDueDate.Format("2006-01-02"),
				},
			})
		}()
	}

	s.invalidateCache(ctx)
	return s.repo.GetByID(ctx, id)
}

func (s *InvoiceService) GetInvoiceHistory(ctx context.Context, id int) (*domain.InvoiceHistorySummary, error) {
	return s.repo.GetInvoiceHistory(ctx, id)
}

func (s *InvoiceService) DeleteInvoice(ctx context.Context, id int) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidateCache(ctx)
	return nil
}

func (s *InvoiceService) GetInvoice(ctx context.Context, id int) (*domain.Invoice, error) {
	return s.repo.GetByID(ctx, id)
}

type CachedInvoiceList struct {
	Invoices []domain.Invoice `json:"invoices"`
	Total    int              `json:"total"`
}

func (s *InvoiceService) ListInvoices(ctx context.Context, page, limit int, filter ports.InvoiceFilter) ([]domain.Invoice, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	var df, dt, st, cn, invNo string
	if filter.DateFrom != nil {
		df = *filter.DateFrom
	}
	if filter.DateTo != nil {
		dt = *filter.DateTo
	}
	if filter.Status != nil {
		st = string(*filter.Status)
	}
	if filter.ClientName != nil {
		cn = *filter.ClientName
	}
	if filter.InvoiceNo != nil {
		invNo = *filter.InvoiceNo
	}

	cacheKey := fmt.Sprintf("cache:invoices:p:%d:l:%d:df:%s:dt:%s:st:%s:cn:%s:inv:%s:sb:%s:sd:%s", page, limit, df, dt, st, cn, invNo, filter.SortBy, filter.SortDir)
	if s.cache != nil {
		var cached CachedInvoiceList
		if found, err := s.cache.Get(ctx, cacheKey, &cached); err == nil && found {
			return cached.Invoices, cached.Total, nil
		}
	}

	invoices, total, err := s.repo.ListAll(ctx, offset, limit, filter)
	if err != nil {
		return nil, 0, err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, CachedInvoiceList{Invoices: invoices, Total: total}, 5*time.Minute)
	}

	return invoices, total, nil
}

func (s *InvoiceService) GetSummary(ctx context.Context, filter ports.InvoiceFilter) (map[string]interface{}, error) {
	var df, dt, st, cn, invNo string
	if filter.DateFrom != nil {
		df = *filter.DateFrom
	}
	if filter.DateTo != nil {
		dt = *filter.DateTo
	}
	if filter.Status != nil {
		st = string(*filter.Status)
	}
	if filter.ClientName != nil {
		cn = *filter.ClientName
	}
	if filter.InvoiceNo != nil {
		invNo = *filter.InvoiceNo
	}

	cacheKey := fmt.Sprintf("cache:invoices:sum:df:%s:dt:%s:st:%s:cn:%s:inv:%s", df, dt, st, cn, invNo)
	if s.cache != nil {
		var cached map[string]interface{}
		if found, err := s.cache.Get(ctx, cacheKey, &cached); err == nil && found {
			return cached, nil
		}
	}

	summary, err := s.repo.GetSummary(ctx, filter)
	if err != nil {
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, summary, 5*time.Minute)
	}

	return summary, nil
}

