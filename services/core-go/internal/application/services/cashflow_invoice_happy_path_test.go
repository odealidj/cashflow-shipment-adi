package services_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

// mockCashflowRepo implements ports.CashflowRepository for testing
type mockCashflowRepo struct {
	entries []domain.CashflowEntry
	seq     int
}

func (m *mockCashflowRepo) Create(ctx context.Context, entry *domain.CashflowEntry) error {
	m.seq++
	entry.ID = m.seq
	entry.SequenceNo = m.seq
	m.entries = append(m.entries, *entry)
	return nil
}

func (m *mockCashflowRepo) Update(ctx context.Context, entry *domain.CashflowEntry) error {
	for i := range m.entries {
		if m.entries[i].ID == entry.ID {
			m.entries[i] = *entry
			return nil
		}
	}
	return nil
}

func (m *mockCashflowRepo) Delete(ctx context.Context, id int) error {
	for i := range m.entries {
		if m.entries[i].ID == id {
			m.entries = append(m.entries[:i], m.entries[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *mockCashflowRepo) GetByID(ctx context.Context, id int) (*domain.CashflowEntry, error) {
	for _, e := range m.entries {
		if e.ID == id {
			return &e, nil
		}
	}
	return nil, nil
}

func (m *mockCashflowRepo) ListAll(ctx context.Context, offset, limit int, filter ports.ListFilter) ([]domain.CashflowEntry, int, error) {
	return m.entries, len(m.entries), nil
}

func (m *mockCashflowRepo) GetLatestEntry(ctx context.Context) (*domain.CashflowEntry, error) {
	if len(m.entries) == 0 {
		return nil, nil
	}
	return &m.entries[len(m.entries)-1], nil
}

func (m *mockCashflowRepo) UpdateBalancesAfter(ctx context.Context, sequenceNo int, diff float64) error {
	return nil
}

func (m *mockCashflowRepo) GetSummary(ctx context.Context, filter ports.ListFilter) (map[string]interface{}, error) {
	return map[string]interface{}{"total": len(m.entries)}, nil
}

func (m *mockCashflowRepo) UpdateRemarks(ctx context.Context, id int, status domain.PaymentStatus, updatedBy uuid.UUID) error {
	for i := range m.entries {
		if m.entries[i].ID == id {
			m.entries[i].Remarks = status
			return nil
		}
	}
	return nil
}

func (m *mockCashflowRepo) ArchiveEntry(ctx context.Context, entry *domain.CashflowEntry, archivedBy uuid.UUID, reason string) error {
	return nil
}

func (m *mockCashflowRepo) GetAvailablePeriods(ctx context.Context) ([]domain.AvailablePeriod, error) {
	return nil, nil
}

// mockInvoiceRepo implements ports.InvoiceRepository for testing
type mockInvoiceRepo struct {
	invoices []domain.Invoice
	seq      int
	history  []domain.InvoicePaymentHistory
}

func (m *mockInvoiceRepo) Create(ctx context.Context, invoice *domain.Invoice) error {
	m.seq++
	invoice.ID = m.seq
	m.invoices = append(m.invoices, *invoice)
	return nil
}

func (m *mockInvoiceRepo) Update(ctx context.Context, invoice *domain.Invoice) error {
	for i := range m.invoices {
		if m.invoices[i].ID == invoice.ID {
			m.invoices[i] = *invoice
			return nil
		}
	}
	return nil
}

func (m *mockInvoiceRepo) Delete(ctx context.Context, id int) error {
	for i := range m.invoices {
		if m.invoices[i].ID == id {
			m.invoices = append(m.invoices[:i], m.invoices[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *mockInvoiceRepo) GetByID(ctx context.Context, id int) (*domain.Invoice, error) {
	for _, inv := range m.invoices {
		if inv.ID == id {
			return &inv, nil
		}
	}
	return nil, fmt.Errorf("invoice not found")
}

func (m *mockInvoiceRepo) GetByInvoiceNo(ctx context.Context, invoiceNo string) (*domain.Invoice, error) {
	for _, inv := range m.invoices {
		if inv.InvoiceNo == invoiceNo {
			return &inv, nil
		}
	}
	return nil, nil
}

func (m *mockInvoiceRepo) ListAll(ctx context.Context, offset, limit int, filter ports.InvoiceFilter) ([]domain.Invoice, int, error) {
	return m.invoices, len(m.invoices), nil
}

func (m *mockInvoiceRepo) MarkPaid(ctx context.Context, id int) error {
	for i := range m.invoices {
		if m.invoices[i].ID == id {
			m.invoices[i].Status = domain.InvoiceStatusPaid
			return nil
		}
	}
	return fmt.Errorf("invoice not found")
}

func (m *mockInvoiceRepo) SettleInvoice(ctx context.Context, id int, payment domain.InvoicePaymentHistory) error {
	for i := range m.invoices {
		if m.invoices[i].ID == id {
			m.invoices[i].Status = domain.InvoiceStatusPaid
			m.invoices[i].PaidAt = &payment.PaymentDate
			m.history = append(m.history, payment)
			return nil
		}
	}
	return fmt.Errorf("invoice not found")
}

func (m *mockInvoiceRepo) RescheduleDueDate(ctx context.Context, id int, history domain.InvoiceDueDateHistory) error {
	return nil
}

func (m *mockInvoiceRepo) GetInvoiceHistory(ctx context.Context, invoiceID int) (*domain.InvoiceHistorySummary, error) {
	return nil, nil
}

func (m *mockInvoiceRepo) GetSummary(ctx context.Context, filter ports.InvoiceFilter) (map[string]interface{}, error) {
	return map[string]interface{}{"count": len(m.invoices)}, nil
}

func (m *mockInvoiceRepo) GetAvailablePeriods(ctx context.Context) ([]domain.AvailablePeriod, error) {
	return nil, nil
}

// TestCashflowService_ShipmentHappyPath tests business rules for recording shipments
func TestCashflowService_ShipmentHappyPath(t *testing.T) {
	cashflowRepo := &mockCashflowRepo{}
	cashflowSvc := services.NewCashflowService(cashflowRepo, nil)
	ctx := context.Background()

	// 1. Happy Path: Valid shipment entry
	entry := &domain.CashflowEntry{
		DateOfEntry:     time.Now(),
		ActInformation:  "Pengiriman Cargo Jakarta - Surabaya",
		ActExplaination: "Suku Cadang Mobil",
		GrandCost:       5000000,
		Debit:           5000000,
		GrandSelling:    7500000,
		Remarks:         domain.PaymentPaid,
	}

	err := cashflowSvc.RecordShipment(ctx, entry)
	if err != nil {
		t.Fatalf("RecordShipment failed on happy path: %v", err)
	}

	// Assertions
	if entry.EntryType != domain.EntryShipment {
		t.Errorf("expected EntryType %s, got %s", domain.EntryShipment, entry.EntryType)
	}
	expectedProfit := 2500000.0
	if entry.Profit != expectedProfit {
		t.Errorf("expected Profit %f, got %f", expectedProfit, entry.Profit)
	}
	expectedMargin := expectedProfit / 7500000.0
	if entry.MarginPct != expectedMargin {
		t.Errorf("expected MarginPct %f, got %f", expectedMargin, entry.MarginPct)
	}

	// 2. Guard Check: Debit and GrandCost mismatch must fail
	invalidEntry := &domain.CashflowEntry{
		DateOfEntry:  time.Now(),
		GrandCost:    5000000,
		Debit:        4000000, // Mismatch!
		GrandSelling: 7500000,
	}
	err = cashflowSvc.RecordShipment(ctx, invalidEntry)
	if err == nil {
		t.Errorf("expected error when GrandCost != Debit, got nil")
	}
}

// TestInvoiceService_FullHappyPath tests creating, due-date calculation, settling, and automatic cashflow integration
func TestInvoiceService_FullHappyPath(t *testing.T) {
	cashflowRepo := &mockCashflowRepo{}
	cashflowSvc := services.NewCashflowService(cashflowRepo, nil)

	invoiceRepo := &mockInvoiceRepo{}
	invoiceSvc := services.NewInvoiceService(invoiceRepo)
	invoiceSvc.SetCashflowService(cashflowSvc) // Wire cashflow service for automatic ledger entry
	ctx := context.Background()

	// 1. Create Invoice
	input := services.CreateInvoiceInput{
		InvoiceNo:    "INV/2026/10/001",
		ClientName:   "PT Mitra Bersama",
		ShipmentDate: "2026-10-15",
		TopTerms:     "TOP 14 Hari",
		TopDays:      14,
		Amount:       15000000,
		Notes:        "Pengiriman Ekspedisi Besi Beton",
	}

	inv, err := invoiceSvc.CreateInvoice(ctx, input)
	if err != nil {
		t.Fatalf("CreateInvoice failed on happy path: %v", err)
	}

	if inv.Status != domain.InvoiceStatusUnpaid {
		t.Errorf("expected initial status %s, got %s", domain.InvoiceStatusUnpaid, inv.Status)
	}

	// Check Due Date calculation: 2026-10-15 + 14 days = 2026-10-29
	expectedDueDate := "2026-10-29"
	actualDueDate := inv.DueDate.Format("2006-01-02")
	if actualDueDate != expectedDueDate {
		t.Errorf("expected DueDate %s, got %s", expectedDueDate, actualDueDate)
	}

	// 2. Settle Invoice (Mark as Paid)
	settleInput := services.SettleInvoiceInput{
		PaymentDate:   "2026-10-20",
		ReferenceNo:   "TRF-BCA-889911",
		Notes:         "Pelunasan Full Transfer Bank BCA",
		CreatedByName: "Ayu Finance",
	}

	settledInv, err := invoiceSvc.SettleInvoice(ctx, inv.ID, settleInput)
	if err != nil {
		t.Fatalf("SettleInvoice failed on happy path: %v", err)
	}

	if settledInv.Status != domain.InvoiceStatusPaid {
		t.Errorf("expected settled status %s, got %s", domain.InvoiceStatusPaid, settledInv.Status)
	}

	// 3. Verify Automatic Cashflow Entry
	if len(cashflowRepo.entries) != 1 {
		t.Fatalf("expected 1 automatic cashflow entry created, got %d", len(cashflowRepo.entries))
	}

	autoEntry := cashflowRepo.entries[0]
	if autoEntry.EntryType != domain.EntryInvoicePayment {
		t.Errorf("expected EntryType %s, got %s", domain.EntryInvoicePayment, autoEntry.EntryType)
	}
	if autoEntry.Kredit != 15000000 {
		t.Errorf("expected Kredit 15000000, got %f", autoEntry.Kredit)
	}
	if autoEntry.InvoiceID == nil || *autoEntry.InvoiceID != inv.ID {
		t.Errorf("expected linked InvoiceID %d, got %v", inv.ID, autoEntry.InvoiceID)
	}
	if autoEntry.Remarks != domain.PaymentPaid {
		t.Errorf("expected Remarks %s, got %s", domain.PaymentPaid, autoEntry.Remarks)
	}
}
