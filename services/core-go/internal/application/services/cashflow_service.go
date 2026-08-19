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
	return s.cashflowRepo.Create(ctx, entry)
}

func (s *CashflowService) RecordShipment(ctx context.Context, entry *domain.CashflowEntry) error {
	entry.EntryType = domain.EntryShipment
	
	// Auto-register vendor if it doesn't exist and VendorID is nil but VendorNameRaw is provided
	if entry.VendorID == nil && entry.VendorNameRaw != "" {
		vendor, err := s.vendorSvc.FindOrCreateVendor(ctx, entry.VendorNameRaw, "")
		if err == nil {
			entry.VendorID = &vendor.ID
		}
	}

	return s.cashflowRepo.Create(ctx, entry)
}

func (s *CashflowService) GetDashboardData(ctx context.Context, page, limit int) ([]domain.CashflowEntry, int, error) {
	offset := (page - 1) * limit
	return s.cashflowRepo.ListAll(ctx, offset, limit)
}

func (s *CashflowService) GetSummary(ctx context.Context) (map[string]float64, error) {
	return s.cashflowRepo.GetSummary(ctx)
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

	// Row 6 is index 5 (header). Row 7 is index 6 (data)
	for i := 6; i < len(rows); i++ {
		row := rows[i]
		for len(row) < 14 {
			row = append(row, "")
		}

		kredit := parseExcelFloat(row[0])
		debit := parseExcelFloat(row[1])
		
		// If both are 0 or empty, maybe it's an empty row
		if kredit == 0 && debit == 0 && row[4] == "" {
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

		if kredit > 0 {
			entriesToCreate = append(entriesToCreate, &domain.CashflowEntry{
				EntryType:   domain.EntryTopUp,
				DateOfEntry: dateDebit,
				Kredit:      kredit,
				CreatedBy:   userID,
				UpdatedBy:   userID,
				Remarks:     "PAID",
			})
		}

		if debit > 0 {
			entriesToCreate = append(entriesToCreate, &domain.CashflowEntry{
				EntryType:       domain.EntryShipment,
				DateOfEntry:     dateDebit,
				ActInformation:  actInfo,
				ActExplaination: actExp,
				VendorNameRaw:   vendorName,
				TopDays:         top,
				DueDate:         dueDate,
				GrandCost:       grandCost,
				GrandSelling:    grandSelling,
				Kredit:          0,
				Debit:           debit,
				Remarks:         remarks,
				CreatedBy:       userID,
				UpdatedBy:       userID,
			})
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
