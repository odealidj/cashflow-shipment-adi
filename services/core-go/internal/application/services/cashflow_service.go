package services

import (
	"context"
	"errors"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

type CashflowService struct {
	cashflowRepo ports.CashflowRepository
	vendorSvc    *VendorService
}

func NewCashflowService(cashflowRepo ports.CashflowRepository, vendorSvc *VendorService) *CashflowService {
	return &CashflowService{
		cashflowRepo: cashflowRepo,
		vendorSvc:    vendorSvc,
	}
}

func (s *CashflowService) RecordTopUp(ctx context.Context, entry *domain.CashflowEntry) error {
	if entry.Kredit <= 0 {
		return errors.New("top_up must have a positive kredit value")
	}
	entry.EntryType = domain.EntryTopUp
	entry.Debit = 0
	if entry.ActInformation == "" {
		entry.ActInformation = "TOP UP"
	}
	if entry.Remarks == "" {
		entry.Remarks = domain.PaymentPaid
	}
	if err := s.cashflowRepo.Create(ctx, entry); err != nil {
		return err
	}
	telemetry.RecordCashflowEntryCreated("TOP_UP")
	return nil
}

func (s *CashflowService) RecordShipment(ctx context.Context, entry *domain.CashflowEntry) error {
	entry.EntryType = domain.EntryShipment

	// Aturan Logika Bisnis: Untuk SHIPMENT, DEBIT harus sama dengan GRAND COST (HPP)
	if entry.GrandCost > 0 && entry.Debit == 0 {
		entry.Debit = entry.GrandCost
	} else if entry.Debit > 0 && entry.GrandCost == 0 {
		entry.GrandCost = entry.Debit
	} else if entry.Debit != entry.GrandCost {
		return errors.New("untuk transaksi shipment, nilai debit harus sama dengan grand cost (HPP)")
	}

	// Auto-kalkulasi Profit & Margin Pct
	entry.Profit = entry.GrandSelling - entry.GrandCost
	if entry.GrandSelling > 0 {
		entry.MarginPct = entry.Profit / entry.GrandSelling
	} else {
		entry.MarginPct = 0
	}
	
	// Auto-register vendor if it doesn't exist and VendorID is nil but VendorNameRaw is provided
	if entry.VendorID == nil && entry.VendorNameRaw != "" {
		vendor, err := s.vendorSvc.FindOrCreateVendor(ctx, entry.VendorNameRaw, "")
		if err == nil {
			entry.VendorID = &vendor.ID
		}
	}

	if entry.Remarks == "" {
		entry.Remarks = domain.PaymentUnpaid
	}

	if err := s.cashflowRepo.Create(ctx, entry); err != nil {
		return err
	}
	telemetry.RecordCashflowEntryCreated("SHIPMENT")
	return nil
}

func (s *CashflowService) UpdateEntry(ctx context.Context, entry *domain.CashflowEntry, userID uuid.UUID) error {
	oldEntry, err := s.cashflowRepo.GetByID(ctx, entry.ID)
	if err != nil {
		return err
	}

	// Validasi & sinkronisasi jika bertipe SHIPMENT
	if entry.EntryType == domain.EntryShipment {
		if entry.GrandCost > 0 && entry.Debit == 0 {
			entry.Debit = entry.GrandCost
		} else if entry.Debit > 0 && entry.GrandCost == 0 {
			entry.GrandCost = entry.Debit
		} else if entry.Debit != entry.GrandCost {
			return errors.New("untuk transaksi shipment, nilai debit harus sama dengan grand cost (HPP)")
		}

		entry.Profit = entry.GrandSelling - entry.GrandCost
		if entry.GrandSelling > 0 {
			entry.MarginPct = entry.Profit / entry.GrandSelling
		} else {
			entry.MarginPct = 0
		}
		if entry.VendorID == nil && entry.VendorNameRaw != "" {
			vendor, err := s.vendorSvc.FindOrCreateVendor(ctx, entry.VendorNameRaw, "")
			if err == nil {
				entry.VendorID = &vendor.ID
			}
		}
	}

	// Archive old state for audit/history
	_ = s.cashflowRepo.ArchiveEntry(ctx, oldEntry, userID, "manual_edit")

	// Calculate difference for cascading balance
	diff := (entry.Kredit - entry.Debit) - (oldEntry.Kredit - oldEntry.Debit)
	entry.Saldo = oldEntry.Saldo + diff
	entry.SequenceNo = oldEntry.SequenceNo
	entry.UpdatedBy = userID

	if err := s.cashflowRepo.Update(ctx, entry); err != nil {
		return err
	}

	if diff != 0 {
		if err := s.cashflowRepo.UpdateBalancesAfter(ctx, oldEntry.SequenceNo, diff); err != nil {
			return err
		}
	}

	return nil
}

func (s *CashflowService) DeleteEntry(ctx context.Context, id int, userID uuid.UUID) error {
	oldEntry, err := s.cashflowRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Archive old state before delete
	_ = s.cashflowRepo.ArchiveEntry(ctx, oldEntry, userID, "manual_delete")

	diff := -(oldEntry.Kredit - oldEntry.Debit)

	if err := s.cashflowRepo.Delete(ctx, id); err != nil {
		return err
	}

	if diff != 0 {
		if err := s.cashflowRepo.UpdateBalancesAfter(ctx, oldEntry.SequenceNo, diff); err != nil {
			return err
		}
	}

	return nil
}

func (s *CashflowService) UpdatePaymentStatus(ctx context.Context, id int, status domain.PaymentStatus, userID uuid.UUID) error {
	return s.cashflowRepo.UpdateRemarks(ctx, id, status, userID)
}

func (s *CashflowService) GetDashboardData(ctx context.Context, page, limit int, filter ports.ListFilter) ([]domain.CashflowEntry, int, error) {
	offset := (page - 1) * limit
	return s.cashflowRepo.ListAll(ctx, offset, limit, filter)
}

func (s *CashflowService) GetSummary(ctx context.Context, filter ports.ListFilter) (map[string]interface{}, error) {
	return s.cashflowRepo.GetSummary(ctx, filter)
}

func parseExcelDate(s string) time.Time {
	if s == "" {
		return time.Now()
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		t, _ := excelize.ExcelDateToTime(f, false)
		return t
	}
	layouts := []string{
		"02/01/2006", "1/2/06", "2006-01-02", "02-01-2006", "02-Jan-06", "02-Jan-2006", "01-02-06",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t
		}
	}
	return time.Now()
}

func parseExcelFloat(s string) float64 {
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "Rp", "")
	s = strings.ReplaceAll(s, " ", "")
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func parseTopDays(s string) int {
	s = strings.ToUpper(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, " HARI", "")
	s = strings.ReplaceAll(s, "HARI", "")
	i, _ := strconv.Atoi(strings.TrimSpace(s))
	return i
}

func (s *CashflowService) ProcessExcelImport(ctx context.Context, reader io.Reader, userID uuid.UUID) error {
	f, err := excelize.OpenReader(reader)
	if err != nil {
		return errors.New("failed to open excel file: " + err.Error())
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return errors.New("no sheets found in excel file")
	}
	sheetName := sheets[0]

	rows, err := f.GetRows(sheetName)
	if err != nil {
		return err
	}

	var entriesToCreate []*domain.CashflowEntry
	var previousSaldo float64
	isFirstRow := true

	// Row 6 is index 5 (header). Row 7 is index 6 (data)
	for i := 6; i < len(rows); i++ {
		row := rows[i]
		for len(row) < 14 {
			row = append(row, "")
		}

		kredit := parseExcelFloat(row[0])
		debit := parseExcelFloat(row[1])
		
		// If both are 0 or empty and info is empty, it's an empty row/placeholder
		if kredit == 0 && debit == 0 && row[4] == "" && row[6] == "" {
			continue
		}

		dateDebit := parseExcelDate(row[3])
		actInfo := row[4]
		actExp := row[5]
		vendorName := row[6]
		top := parseTopDays(row[7])
		var dueDate *time.Time
		if row[8] != "" {
			dd := parseExcelDate(row[8])
			dueDate = &dd
		}
		grandCost := parseExcelFloat(row[9])
		grandSelling := parseExcelFloat(row[10])
		
		remarksStr := strings.ToUpper(strings.TrimSpace(row[13]))
		var remarks domain.PaymentStatus
		if remarksStr == "PAID" {
			remarks = domain.PaymentPaid
		} else if remarksStr == "UNPAID" {
			remarks = domain.PaymentUnpaid
		} else {
			remarks = domain.PaymentPending
		}

		// Intelligent carry-over vs new top-up modal detection
		if isFirstRow {
			if kredit > 0 {
				entriesToCreate = append(entriesToCreate, &domain.CashflowEntry{
					EntryType:      domain.EntryTopUp,
					DateOfEntry:    dateDebit,
					Kredit:         kredit,
					ActInformation: "Modal Awal (Opening Balance)",
					CreatedBy:      userID,
					UpdatedBy:      userID,
					Remarks:        domain.PaymentPaid,
				})
				previousSaldo = kredit
			}
			isFirstRow = false
		} else {
			selisih := kredit - previousSaldo
			if selisih > 0.01 {
				entriesToCreate = append(entriesToCreate, &domain.CashflowEntry{
					EntryType:      domain.EntryTopUp,
					DateOfEntry:    dateDebit,
					Kredit:         selisih,
					ActInformation: "Penambahan Modal (Injeksi Dana)",
					CreatedBy:      userID,
					UpdatedBy:      userID,
					Remarks:        domain.PaymentPaid,
				})
				previousSaldo += selisih
			}
		}

		if debit > 0 || grandCost > 0 {
			cost := grandCost
			if cost == 0 {
				cost = debit
			}
			entriesToCreate = append(entriesToCreate, &domain.CashflowEntry{
				EntryType:       domain.EntryShipment,
				DateOfEntry:     dateDebit,
				ActInformation:  actInfo,
				ActExplaination: actExp,
				VendorNameRaw:   vendorName,
				TopDays:         top,
				DueDate:         dueDate,
				GrandCost:       cost,
				GrandSelling:    grandSelling,
				Profit:          grandSelling - cost,
				MarginPct: func() float64 {
					if grandSelling > 0 {
						return (grandSelling - cost) / grandSelling
					}
					return 0
				}(),
				Remarks:   remarks,
				Debit:     cost,
				CreatedBy: userID,
				UpdatedBy: userID,
			})
			previousSaldo -= cost
		}
	}

	// Insert all entries sequentially to maintain rolling balance
	for _, entry := range entriesToCreate {
		if entry.EntryType == domain.EntryTopUp {
			if err := s.RecordTopUp(ctx, entry); err != nil {
				return err
			}
		} else {
			if err := s.RecordShipment(ctx, entry); err != nil {
				return err
			}
		}
	}

	return nil
}
