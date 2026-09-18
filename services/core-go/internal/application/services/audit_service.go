package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type AuditService struct {
	repo     ports.AuditRepository
	notifSvc *NotificationService
}

func NewAuditService(repo ports.AuditRepository, notifSvc *NotificationService) *AuditService {
	return &AuditService{
		repo:     repo,
		notifSvc: notifSvc,
	}
}

func (s *AuditService) Record(ctx context.Context, item *domain.AuditLog) error {
	if item.ActorName == "" {
		item.ActorName = "Sistem"
	}
	if item.ActorRole == "" {
		item.ActorRole = "system"
	}
	if item.SystemTimestamp.IsZero() {
		item.SystemTimestamp = time.Now()
	}

	// Calculate lag days if event date is available
	if item.EventDate != nil {
		eventMidnight := time.Date(item.EventDate.Year(), item.EventDate.Month(), item.EventDate.Day(), 0, 0, 0, 0, time.UTC)
		sysMidnight := time.Date(item.SystemTimestamp.Year(), item.SystemTimestamp.Month(), item.SystemTimestamp.Day(), 0, 0, 0, 0, time.UTC)
		diffDays := int(sysMidnight.Sub(eventMidnight).Hours() / 24)
		if diffDays > 0 {
			item.LagDays = diffDays
		}
	}

	// Auto-escalate severity and flag reason if applicable
	if item.Severity == "" || item.Severity == domain.AuditSeverityNormal {
		if item.Action == domain.AuditActionDelete || item.Action == domain.AuditActionVoid {
			item.Severity = domain.AuditSeverityCritical
			if item.FlagReason == nil || *item.FlagReason == "" {
				reason := fmt.Sprintf("Penghapusan data %s (%s)", item.EntityType, item.EntityReference)
				item.FlagReason = &reason
			}
		} else if item.LagDays > 3 {
			item.Severity = domain.AuditSeverityCritical
			if item.FlagReason == nil || *item.FlagReason == "" {
				reason := fmt.Sprintf("Keterlambatan input %d hari (melebihi toleransi SLA 3 hari)", item.LagDays)
				item.FlagReason = &reason
			}
		} else if item.LagDays >= 2 {
			item.Severity = domain.AuditSeverityWarning
			if item.FlagReason == nil || *item.FlagReason == "" {
				reason := fmt.Sprintf("Keterlambatan input %d hari", item.LagDays)
				item.FlagReason = &reason
			}
		} else {
			item.Severity = domain.AuditSeverityNormal
		}
	}

	err := s.repo.Record(ctx, item)
	if err != nil {
		log.Printf("[AuditService] Failed to record audit log: %v", err)
		return err
	}

	// Instant notification to Owner & Direktur if CRITICAL
	if item.Severity == domain.AuditSeverityCritical && s.notifSvc != nil {
		roleOwner := "owner"
		actionURL := "/dashboard/audit"
		flagMsg := ""
		if item.FlagReason != nil {
			flagMsg = *item.FlagReason
		}

		_, _ = s.notifSvc.Create(ctx, CreateNotificationInput{
			TargetRole: &roleOwner,
			Title:      fmt.Sprintf("⚠️ Alert Audit: %s", item.EntityReference),
			Message:    fmt.Sprintf("Aktivitas kritis dicatat oleh %s (%s): %s", item.ActorName, item.ActorRole, flagMsg),
			Category:   domain.NotificationCategorySystem,
			Severity:   domain.NotificationSeverityCritical,
			ActionURL:  &actionURL,
			Metadata: map[string]interface{}{
				"audit_id":         item.ID,
				"entity_type":      item.EntityType,
				"entity_reference": item.EntityReference,
				"lag_days":         item.LagDays,
			},
		})
	}

	return nil
}

func (s *AuditService) GetSummaryKPI(ctx context.Context, filter domain.AuditLogFilter) (*domain.AuditSummaryKPI, error) {
	return s.repo.GetSummaryKPI(ctx, filter)
}

func (s *AuditService) GetStaffSLAPerformance(ctx context.Context, filter domain.AuditLogFilter) ([]domain.StaffSLAItem, error) {
	return s.repo.GetStaffSLAPerformance(ctx, filter)
}

func (s *AuditService) GetFraudAnomalies(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.FraudAnomalyItem, int, error) {
	return s.repo.GetFraudAnomalies(ctx, page, limit, filter)
}

func (s *AuditService) GetInputLagRecords(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return s.repo.GetInputLagRecords(ctx, page, limit, filter)
}

func (s *AuditService) ListLogs(ctx context.Context, page, limit int, filter domain.AuditLogFilter) ([]domain.AuditLog, int, error) {
	return s.repo.List(ctx, page, limit, filter)
}

func (s *AuditService) GetLogByID(ctx context.Context, id int64) (*domain.AuditLog, error) {
	return s.repo.GetByID(ctx, id)
}

// ----------------------------------------------------------------------------
// Helper Methods for Recording Specific Business Events
// ----------------------------------------------------------------------------

func (s *AuditService) LogCashflowCreate(ctx context.Context, entry *domain.CashflowEntry, actorID *uuid.UUID, actorName, actorRole string) {
	if entry == nil {
		return
	}
	newVals, _ := json.Marshal(map[string]interface{}{
		"sequence_no":   entry.SequenceNo,
		"entry_type":    entry.EntryType,
		"act_info":      entry.ActInformation,
		"vendor_name":   entry.VendorNameRaw,
		"kredit":        entry.Kredit,
		"debit":         entry.Debit,
		"saldo":         entry.Saldo,
		"grand_cost":    entry.GrandCost,
		"grand_selling": entry.GrandSelling,
		"profit":        entry.Profit,
		"margin_pct":    entry.MarginPct,
	})

	severity := domain.AuditSeverityNormal
	var flagReason *string
	if entry.EntryType == domain.EntryShipment && entry.MarginPct < 0.08 && entry.GrandSelling > 0 {
		severity = domain.AuditSeverityCritical
		reason := fmt.Sprintf("Margin pengiriman di bawah standar (%.1f%%)", entry.MarginPct*100)
		flagReason = &reason
	}

	eventDate := time.Time(entry.DateOfEntry)

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionCreate,
		EntityType:      "cashflow",
		EntityID:        fmt.Sprintf("%d", entry.ID),
		EntityReference: fmt.Sprintf("Seq#%d (%s)", entry.SequenceNo, entry.ActInformation),
		EventDate:       &eventDate,
		Severity:        severity,
		FlagReason:      flagReason,
		NewValues:       newVals,
	})
}

func (s *AuditService) LogCashflowUpdate(ctx context.Context, oldEntry, newEntry *domain.CashflowEntry, actorID *uuid.UUID, actorName, actorRole string) {
	if newEntry == nil || oldEntry == nil {
		return
	}
	oldVals, _ := json.Marshal(map[string]interface{}{
		"kredit":        oldEntry.Kredit,
		"debit":         oldEntry.Debit,
		"saldo":         oldEntry.Saldo,
		"grand_cost":    oldEntry.GrandCost,
		"grand_selling": oldEntry.GrandSelling,
		"profit":        oldEntry.Profit,
		"margin_pct":    oldEntry.MarginPct,
		"act_info":      oldEntry.ActInformation,
	})
	newVals, _ := json.Marshal(map[string]interface{}{
		"kredit":        newEntry.Kredit,
		"debit":         newEntry.Debit,
		"saldo":         newEntry.Saldo,
		"grand_cost":    newEntry.GrandCost,
		"grand_selling": newEntry.GrandSelling,
		"profit":        newEntry.Profit,
		"margin_pct":    newEntry.MarginPct,
		"act_info":      newEntry.ActInformation,
	})

	severity := domain.AuditSeverityWarning
	reason := fmt.Sprintf("Koreksi transaksi kas Seq#%d", newEntry.SequenceNo)

	// Check if retroactive edit on old date (> 3 days after created)
	if time.Since(oldEntry.CreatedAt) > 3*24*time.Hour {
		severity = domain.AuditSeverityCritical
		reason = fmt.Sprintf("Pengeditan kas lampau (>3 hari sejak dicatat): Seq#%d", newEntry.SequenceNo)
	}

	eventDate := time.Time(newEntry.DateOfEntry)

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionUpdate,
		EntityType:      "cashflow",
		EntityID:        fmt.Sprintf("%d", newEntry.ID),
		EntityReference: fmt.Sprintf("Seq#%d (%s)", newEntry.SequenceNo, newEntry.ActInformation),
		EventDate:       &eventDate,
		Severity:        severity,
		FlagReason:      &reason,
		OldValues:       oldVals,
		NewValues:       newVals,
	})
}

func (s *AuditService) LogCashflowDelete(ctx context.Context, entry *domain.CashflowEntry, actorID *uuid.UUID, actorName, actorRole string) {
	if entry == nil {
		return
	}
	oldVals, _ := json.Marshal(map[string]interface{}{
		"sequence_no": entry.SequenceNo,
		"act_info":    entry.ActInformation,
		"kredit":      entry.Kredit,
		"debit":       entry.Debit,
		"saldo":       entry.Saldo,
	})

	reason := fmt.Sprintf("Penghapusan transaksi kas Seq#%d", entry.SequenceNo)
	eventDate := time.Time(entry.DateOfEntry)

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionDelete,
		EntityType:      "cashflow",
		EntityID:        fmt.Sprintf("%d", entry.ID),
		EntityReference: fmt.Sprintf("Seq#%d (%s)", entry.SequenceNo, entry.ActInformation),
		EventDate:       &eventDate,
		Severity:        domain.AuditSeverityCritical,
		FlagReason:      &reason,
		OldValues:       oldVals,
	})
}

func (s *AuditService) LogInvoiceCreate(ctx context.Context, inv *domain.Invoice, actorID *uuid.UUID, actorName, actorRole string) {
	if inv == nil {
		return
	}
	newVals, _ := json.Marshal(map[string]interface{}{
		"invoice_no":  inv.InvoiceNo,
		"client_name": inv.ClientName,
		"amount":      inv.Amount,
		"status":      inv.Status,
		"top_days":    inv.TopDays,
		"due_date":    inv.DueDate,
	})

	eventDate := inv.ShipmentDate
	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionCreate,
		EntityType:      "invoice",
		EntityID:        fmt.Sprintf("%d", inv.ID),
		EntityReference: fmt.Sprintf("%s (%s)", inv.InvoiceNo, inv.ClientName),
		EventDate:       &eventDate,
		NewValues:       newVals,
	})
}

func (s *AuditService) LogInvoiceReschedule(ctx context.Context, inv *domain.Invoice, prevDate, newDate time.Time, reason string, actorID *uuid.UUID, actorName, actorRole string) {
	if inv == nil {
		return
	}
	oldVals, _ := json.Marshal(map[string]interface{}{
		"due_date": prevDate.Format("2006-01-02"),
	})
	newVals, _ := json.Marshal(map[string]interface{}{
		"due_date": newDate.Format("2006-01-02"),
		"reason":   reason,
	})

	flagReason := fmt.Sprintf("Perpanjangan tempo invoice %s: %s", inv.InvoiceNo, reason)
	eventDate := inv.ShipmentDate

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionRescheduleDueDate,
		EntityType:      "invoice",
		EntityID:        fmt.Sprintf("%d", inv.ID),
		EntityReference: fmt.Sprintf("%s (%s)", inv.InvoiceNo, inv.ClientName),
		EventDate:       &eventDate,
		Severity:        domain.AuditSeverityWarning,
		FlagReason:      &flagReason,
		OldValues:       oldVals,
		NewValues:       newVals,
	})
}

func (s *AuditService) LogInvoiceSettle(ctx context.Context, inv *domain.Invoice, amount float64, ref string, actorID *uuid.UUID, actorName, actorRole string) {
	if inv == nil {
		return
	}
	newVals, _ := json.Marshal(map[string]interface{}{
		"settled_amount": amount,
		"reference_no":   ref,
	})

	flagReason := fmt.Sprintf("Pelunasan invoice %s sebesar Rp %.0f", inv.InvoiceNo, amount)
	eventDate := inv.ShipmentDate

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionSettleInvoice,
		EntityType:      "invoice",
		EntityID:        fmt.Sprintf("%d", inv.ID),
		EntityReference: fmt.Sprintf("%s (%s)", inv.InvoiceNo, inv.ClientName),
		EventDate:       &eventDate,
		Severity:        domain.AuditSeverityNormal,
		FlagReason:      &flagReason,
		NewValues:       newVals,
	})
}

func (s *AuditService) LogInvoiceDelete(ctx context.Context, inv *domain.Invoice, actorID *uuid.UUID, actorName, actorRole string) {
	if inv == nil {
		return
	}
	oldVals, _ := json.Marshal(map[string]interface{}{
		"invoice_no":  inv.InvoiceNo,
		"client_name": inv.ClientName,
		"amount":      inv.Amount,
		"status":      inv.Status,
	})

	reason := fmt.Sprintf("Penghapusan invoice %s (%s)", inv.InvoiceNo, inv.ClientName)
	eventDate := inv.ShipmentDate

	_ = s.Record(ctx, &domain.AuditLog{
		ActorID:         actorID,
		ActorName:       actorName,
		ActorRole:       actorRole,
		Action:          domain.AuditActionDelete,
		EntityType:      "invoice",
		EntityID:        fmt.Sprintf("%d", inv.ID),
		EntityReference: fmt.Sprintf("%s (%s)", inv.InvoiceNo, inv.ClientName),
		EventDate:       &eventDate,
		Severity:        domain.AuditSeverityCritical,
		FlagReason:      &reason,
		OldValues:       oldVals,
	})
}
