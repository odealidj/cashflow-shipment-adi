package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/dateutil"
	"github.com/google/uuid"
)

type NotificationService struct {
	repo ports.NotificationRepository
}

func NewNotificationService(repo ports.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

type CreateNotificationInput struct {
	UserID     *uuid.UUID                  `json:"user_id,omitempty"`
	TargetRole *string                     `json:"target_role,omitempty"`
	Title      string                      `json:"title"`
	Message    string                      `json:"message"`
	Category   domain.NotificationCategory `json:"category"`
	Severity   domain.NotificationSeverity `json:"severity"`
	ActionURL  *string                     `json:"action_url,omitempty"`
	Metadata   map[string]interface{}      `json:"metadata,omitempty"`
}

func (s *NotificationService) Create(ctx context.Context, input CreateNotificationInput) (*domain.Notification, error) {
	var metadataStr *string
	if input.Metadata != nil {
		bytes, err := json.Marshal(input.Metadata)
		if err == nil {
			str := string(bytes)
			metadataStr = &str
		}
	}

	notif := &domain.Notification{
		ID:         uuid.New(),
		UserID:     input.UserID,
		TargetRole: input.TargetRole,
		Title:      strings.TrimSpace(input.Title),
		Message:    strings.TrimSpace(input.Message),
		Category:   input.Category,
		Severity:   input.Severity,
		ActionURL:  input.ActionURL,
		Metadata:   metadataStr,
		IsRead:     false,
	}

	if notif.Title == "" || notif.Message == "" {
		return nil, fmt.Errorf("title and message are required")
	}

	err := s.repo.Create(ctx, notif)
	if err != nil {
		return nil, err
	}

	return notif, nil
}

func (s *NotificationService) List(ctx context.Context, userID *uuid.UUID, role string, offset, limit int, filter ports.NotificationFilter) ([]domain.Notification, int, error) {
	return s.repo.ListByUserOrRole(ctx, userID, role, offset, limit, filter)
}

func (s *NotificationService) GetUnreadCount(ctx context.Context, userID *uuid.UUID, role string) (int, error) {
	return s.repo.GetUnreadCount(ctx, userID, role)
}

func (s *NotificationService) MarkAsRead(ctx context.Context, id uuid.UUID, userID *uuid.UUID) error {
	return s.repo.MarkAsRead(ctx, id, userID)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID *uuid.UUID, role string) error {
	return s.repo.MarkAllAsRead(ctx, userID, role)
}

func (s *NotificationService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// -----------------------------------------------------------------------------
// BUSINESS TRIGGERS (Penjaga Kas & Piutang Perusahaan)
// -----------------------------------------------------------------------------

// FormatRupiah memformat float64 menjadi format mata uang Rupiah standar (contoh: 15.000.000)
func FormatRupiah(amount float64) string {
	intPart := int64(math.Round(amount))
	negative := intPart < 0
	if negative {
		intPart = -intPart
	}

	str := fmt.Sprintf("%d", intPart)
	n := len(str)
	if n <= 3 {
		if negative {
			return "-" + str
		}
		return str
	}

	var result []byte
	rem := n % 3
	if rem > 0 {
		result = append(result, str[:rem]...)
		if rem < n {
			result = append(result, '.')
		}
	}
	for i := rem; i < n; i += 3 {
		result = append(result, str[i:i+3]...)
		if i+3 < n {
			result = append(result, '.')
		}
	}

	if negative {
		return "-" + string(result)
	}
	return string(result)
}

// NotifyLowCashBalance memicu notifikasi darurat saat saldo kas operasional berada di bawah ambang batas (default: Rp 15.000.000)
func (s *NotificationService) NotifyLowCashBalance(ctx context.Context, currentSaldo float64, threshold float64) {
	if threshold <= 0 {
		threshold = 15000000.0 // Default Rp 15 Juta
	}

	if currentSaldo >= threshold {
		return
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		roles := []string{"finance", "direktur", "owner"}
		title := "🚨 PERINGATAN KAS KRITIS: Saldo Menipis"
		msg := fmt.Sprintf("Sisa saldo kas operasional berjalan saat ini tersisa Rp %s (di bawah batas aman Rp %s). Segera lakukan pengajuan Top-Up kas untuk menjamin kelancaran uang jalan armada supir.", FormatRupiah(currentSaldo), FormatRupiah(threshold))
		actionURL := "/dashboard/transactions"

		for _, r := range roles {
			target := r
			_, err := s.Create(bgCtx, CreateNotificationInput{
				TargetRole: &target,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryCashflow,
				Severity:   domain.NotificationSeverityCritical,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"current_saldo": currentSaldo,
					"threshold":     threshold,
					"triggered_at":  time.Now().Format(time.RFC3339),
				},
			})
			if err != nil {
				log.Printf("[NotificationService] Gagal membuat notifikasi low cash ke role %s: %v\n", r, err)
			}
		}
	}()
}

// NotifyNegativeMargin memicu notifikasi saat transaksi shipment mencatat margin profit minus / rugi
func (s *NotificationService) NotifyNegativeMargin(ctx context.Context, actInfo, actExplain string, cost, selling, profit, marginPct float64) {
	if profit >= 0 && marginPct >= 0 {
		return
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		roles := []string{"direktur", "finance"}
		title := "🚨 Anomali Margin Minus / Transaksi Rugi"
		msg := fmt.Sprintf("Pengiriman '%s - %s' mencatat kerugian! Biaya Vendor: Rp %s, Nilai Jual: Rp %s, Selisih Rugi: Rp %s (Margin: %.2f%%). Mohon evaluasi HPP rute terkait.",
			actInfo, actExplain, FormatRupiah(cost), FormatRupiah(selling), FormatRupiah(math.Abs(profit)), marginPct*100)
		actionURL := "/dashboard/transactions"

		for _, r := range roles {
			target := r
			_, err := s.Create(bgCtx, CreateNotificationInput{
				TargetRole: &target,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryShipment,
				Severity:   domain.NotificationSeverityCritical,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"cost":       cost,
					"selling":    selling,
					"profit":     profit,
					"margin_pct": marginPct,
					"act_info":   actInfo,
				},
			})
			if err != nil {
				log.Printf("[NotificationService] Gagal membuat notifikasi margin minus ke role %s: %v\n", r, err)
			}
		}
	}()
}

// CheckInvoiceDueDates memindai daftar invoice dan mengirimkan notifikasi H-3, Hari H, dan Overdue
func (s *NotificationService) CheckInvoiceDueDates(ctx context.Context, invoiceRepo ports.InvoiceRepository) (int, error) {
	statusUnpaid := domain.InvoiceStatusUnpaid
	statusOverdue := domain.InvoiceStatusOverdue

	// Ambil invoice aktif yang belum lunas
	unpaidInvoices, _, err := invoiceRepo.ListAll(ctx, 0, 500, ports.InvoiceFilter{
		Status: &statusUnpaid,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch unpaid invoices: %w", err)
	}

	overdueInvoices, _, err := invoiceRepo.ListAll(ctx, 0, 500, ports.InvoiceFilter{
		Status: &statusOverdue,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to fetch overdue invoices: %w", err)
	}

	allInvoices := append(unpaidInvoices, overdueInvoices...)
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	countCreated := 0
	targetFinance := "finance"
	targetDirektur := "direktur"

	for _, inv := range allInvoices {
		invDue := time.Date(inv.DueDate.Year(), inv.DueDate.Month(), inv.DueDate.Day(), 0, 0, 0, 0, now.Location())
		daysDiff := int(invDue.Sub(today).Hours() / 24)

		actionURL := fmt.Sprintf("/dashboard/invoices?search=%s", inv.InvoiceNo)

		// 1. H-3 Jatuh Tempo (Warning)
		if daysDiff == 3 {
			title := fmt.Sprintf("⏳ Invoice Jatuh Tempo dalam 3 Hari: %s", inv.InvoiceNo)
			msg := fmt.Sprintf("Tagihan Invoice %s kepada '%s' senilai Rp %s akan jatuh tempo pada %s. Siapkan berkas tanda terima & penagihan.",
				inv.InvoiceNo, inv.ClientName, FormatRupiah(inv.Amount), dateutil.FormatDateIndo(inv.DueDate))

			_, err := s.Create(ctx, CreateNotificationInput{
				TargetRole: &targetFinance,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryInvoice,
				Severity:   domain.NotificationSeverityWarning,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"invoice_id": inv.ID,
					"invoice_no": inv.InvoiceNo,
					"amount":     inv.Amount,
					"days_diff":  daysDiff,
				},
			})
			if err == nil {
				countCreated++
			}
		}

		// 2. Hari-H Jatuh Tempo (Warning)
		if daysDiff == 0 {
			title := fmt.Sprintf("📅 Hari Ini Jatuh Tempo Invoice: %s", inv.InvoiceNo)
			msg := fmt.Sprintf("Hari ini adalah batas akhir pembayaran tagihan Invoice %s oleh '%s' senilai Rp %s. Segera hubungi bagian keuangan klien.",
				inv.InvoiceNo, inv.ClientName, FormatRupiah(inv.Amount))

			_, err := s.Create(ctx, CreateNotificationInput{
				TargetRole: &targetFinance,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryInvoice,
				Severity:   domain.NotificationSeverityWarning,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"invoice_id": inv.ID,
					"invoice_no": inv.InvoiceNo,
					"amount":     inv.Amount,
					"days_diff":  0,
				},
			})
			if err == nil {
				countCreated++
			}
		}

		// 3. Overdue / Melewati Jatuh Tempo (Critical)
		if daysDiff < 0 {
			overdueDays := -daysDiff
			title := fmt.Sprintf("🚨 Tagihan Invoice OVERDUE (%d Hari): %s", overdueDays, inv.InvoiceNo)
			msg := fmt.Sprintf("Invoice %s dari '%s' senilai Rp %s telah MELEWATI batas jatuh tempo selama %d hari (sejak %s). Tindak lanjuti surat peringatan/penangguhan trip.",
				inv.InvoiceNo, inv.ClientName, FormatRupiah(inv.Amount), overdueDays, dateutil.FormatDateIndo(inv.DueDate))

			// Kirim ke Finance
			_, err := s.Create(ctx, CreateNotificationInput{
				TargetRole: &targetFinance,
				Title:      title,
				Message:    msg,
				Category:   domain.NotificationCategoryInvoice,
				Severity:   domain.NotificationSeverityCritical,
				ActionURL:  &actionURL,
				Metadata: map[string]interface{}{
					"invoice_id":   inv.ID,
					"invoice_no":   inv.InvoiceNo,
					"amount":       inv.Amount,
					"overdue_days": overdueDays,
				},
			})
			if err == nil {
				countCreated++
			}

			// Jika menunggak > 7 hari dan bernilai besar (> 10 Juta), eskalasi ke Direktur
			if overdueDays >= 7 && inv.Amount >= 10000000 {
				_, _ = s.Create(ctx, CreateNotificationInput{
					TargetRole: &targetDirektur,
					Title:      title,
					Message:    msg,
					Category:   domain.NotificationCategoryInvoice,
					Severity:   domain.NotificationSeverityCritical,
					ActionURL:  &actionURL,
					Metadata: map[string]interface{}{
						"invoice_id":   inv.ID,
						"invoice_no":   inv.InvoiceNo,
						"amount":       inv.Amount,
						"overdue_days": overdueDays,
					},
				})
			}
		}
	}

	return countCreated, nil
}
