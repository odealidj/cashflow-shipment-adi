package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PostgresCashflowRepo struct {
	db *sqlx.DB
}

func NewPostgresCashflowRepo(db *sqlx.DB) *PostgresCashflowRepo {
	return &PostgresCashflowRepo{db: db}
}

func (r *PostgresCashflowRepo) Create(ctx context.Context, entry *domain.CashflowEntry) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("cashflow_repo", "Create", "INSERT INTO cashflow_entries ...", start, err)
	}()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Lock the latest row to prevent race conditions in rolling balance
	var lastSaldo float64
	queryLast := `SELECT saldo FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1 FOR UPDATE`
	err = tx.GetContext(ctx, &lastSaldo, queryLast)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	// Calculate new saldo
	entry.Saldo = lastSaldo + entry.Kredit - entry.Debit

	// Calculate Profit & Margin if Shipment
	if entry.EntryType == domain.EntryShipment {
		entry.Profit = entry.GrandSelling - entry.GrandCost
		if entry.GrandSelling > 0 {
			entry.MarginPct = entry.Profit / entry.GrandSelling
		}
	}

	queryInsert := `
		INSERT INTO cashflow_entries (
			entry_type, kredit, debit, saldo, date_of_entry, 
			act_information, act_explaination, vendor_id, vendor_name_raw, 
			top_days, due_date, grand_cost, grand_selling, profit, margin_pct, 
			remarks, created_by, updated_by, invoice_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
		) RETURNING id, sequence_no, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, queryInsert,
		entry.EntryType, entry.Kredit, entry.Debit, entry.Saldo, entry.DateOfEntry,
		entry.ActInformation, entry.ActExplaination, entry.VendorID, entry.VendorNameRaw,
		entry.TopDays, entry.DueDate, entry.GrandCost, entry.GrandSelling, entry.Profit, entry.MarginPct,
		entry.Remarks, entry.CreatedBy, entry.UpdatedBy, entry.InvoiceID,
	).Scan(&entry.ID, &entry.SequenceNo, &entry.CreatedAt, &entry.UpdatedAt)

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresCashflowRepo) Update(ctx context.Context, entry *domain.CashflowEntry) error {
	query := `
		UPDATE cashflow_entries SET
			entry_type = $1, kredit = $2, debit = $3, saldo = $4, date_of_entry = $5,
			act_information = $6, act_explaination = $7, vendor_id = $8, vendor_name_raw = $9,
			top_days = $10, due_date = $11, grand_cost = $12, grand_selling = $13, 
			profit = $14, margin_pct = $15, remarks = $16, updated_by = $17, invoice_id = $18, updated_at = CURRENT_TIMESTAMP
		WHERE id = $19
	`
	_, err := r.db.ExecContext(ctx, query,
		entry.EntryType, entry.Kredit, entry.Debit, entry.Saldo, entry.DateOfEntry,
		entry.ActInformation, entry.ActExplaination, entry.VendorID, entry.VendorNameRaw,
		entry.TopDays, entry.DueDate, entry.GrandCost, entry.GrandSelling,
		entry.Profit, entry.MarginPct, entry.Remarks, entry.UpdatedBy, entry.InvoiceID, entry.ID,
	)
	return err
}

func (r *PostgresCashflowRepo) Delete(ctx context.Context, id int) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM cashflow_entries WHERE id = $1`, id)
	return err
}

func (r *PostgresCashflowRepo) GetByID(ctx context.Context, id int) (*domain.CashflowEntry, error) {
	query := `SELECT * FROM cashflow_entries WHERE id = $1`
	var entry domain.CashflowEntry
	err := r.db.GetContext(ctx, &entry, query, id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("entry not found")
		}
		return nil, err
	}
	return &entry, nil
}

func (r *PostgresCashflowRepo) ListAll(ctx context.Context, offset, limit int, filter ports.ListFilter) (entries []domain.CashflowEntry, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("cashflow_repo", "ListAll", fmt.Sprintf("SELECT * FROM cashflow_entries LIMIT %d OFFSET %d", limit, offset), start, err)
	}()

	// Build dynamic WHERE clause
	where := "WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		where += fmt.Sprintf(" AND date_of_entry >= $%d", argIdx)
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		where += fmt.Sprintf(" AND date_of_entry <= $%d", argIdx)
		args = append(args, *filter.DateTo)
		argIdx++
	}
	if filter.EntryType != nil {
		where += fmt.Sprintf(" AND entry_type = $%d", argIdx)
		args = append(args, *filter.EntryType)
		argIdx++
	}
	if filter.Remarks != nil {
		where += fmt.Sprintf(" AND remarks = $%d", argIdx)
		args = append(args, *filter.Remarks)
		argIdx++
	}
	if filter.VendorName != nil && *filter.VendorName != "" {
		where += fmt.Sprintf(" AND vendor_name_raw ILIKE $%d", argIdx)
		likeVal := "%" + *filter.VendorName + "%"
		args = append(args, likeVal)
		argIdx++
	}

	// Sort direction — default ASC
	sortDir := "ASC"
	if filter.SortDir == "DESC" {
		sortDir = "DESC"
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM cashflow_entries %s", where)
	err = r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Data query
	dataArgs := append(args, limit, offset)
	dataQuery := fmt.Sprintf(
		`SELECT * FROM cashflow_entries %s ORDER BY sequence_no %s LIMIT $%d OFFSET $%d`,
		where, sortDir, argIdx, argIdx+1,
	)
	err = r.db.SelectContext(ctx, &entries, dataQuery, dataArgs...)
	return entries, total, err
}

func (r *PostgresCashflowRepo) GetLatestEntry(ctx context.Context) (*domain.CashflowEntry, error) {
	query := `SELECT * FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1`
	var entry domain.CashflowEntry
	err := r.db.GetContext(ctx, &entry, query)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // No entries yet
		}
		return nil, err
	}
	return &entry, nil
}

func (r *PostgresCashflowRepo) UpdateBalancesAfter(ctx context.Context, sequenceNo int, diff float64) error {
	query := `UPDATE cashflow_entries SET saldo = saldo + $1 WHERE sequence_no > $2`
	_, err := r.db.ExecContext(ctx, query, diff, sequenceNo)
	return err
}

func (r *PostgresCashflowRepo) UpdateRemarks(ctx context.Context, id int, status domain.PaymentStatus, updatedBy uuid.UUID) error {
	query := `
		UPDATE cashflow_entries 
		SET remarks = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	result, err := r.db.ExecContext(ctx, query, status, updatedBy, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errors.New("entry not found")
	}
	return nil
}

func (r *PostgresCashflowRepo) GetSummary(ctx context.Context, filter ports.ListFilter) (result map[string]interface{}, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("cashflow_repo", "GetSummary", "SELECT currentSaldo, totalKredit, totalDebit, ... FROM cashflow_entries", start, err)
	}()

	var currentSaldo, totalKredit, totalDebit, totalProfit, avgMargin float64
	var unpaidCount int
	var unpaidAmount float64

	// Query Saldo Terkini (Real-time current wallet balance, all-time latest)
	err = r.db.QueryRowContext(ctx, `SELECT COALESCE((SELECT saldo FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1), 0)`).Scan(&currentSaldo)
	if err != nil {
		return nil, err
	}

	// Build dynamic WHERE clause for periodic metrics
	wherePeriodic := "WHERE 1=1"
	argsPeriodic := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry >= $%d", argIdx)
		argsPeriodic = append(argsPeriodic, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry <= $%d", argIdx)
		argsPeriodic = append(argsPeriodic, *filter.DateTo)
		argIdx++
	}

	queryMain := fmt.Sprintf(`
		SELECT 
			COALESCE(SUM(kredit), 0) as total_kredit,
			COALESCE(SUM(debit), 0) as total_debit,
			COALESCE(SUM(CASE WHEN entry_type = 'SHIPMENT' THEN profit ELSE 0 END), 0) as total_profit,
			COALESCE(AVG(CASE WHEN entry_type = 'SHIPMENT' AND grand_selling > 0 THEN margin_pct ELSE NULL END), 0) as avg_margin
		FROM cashflow_entries %s;
	`, wherePeriodic)

	err = r.db.QueryRowContext(ctx, queryMain, argsPeriodic...).Scan(&totalKredit, &totalDebit, &totalProfit, &avgMargin)
	if err != nil {
		return nil, err
	}

	// Unpaid summary (also filtered by period if specified)
	whereUnpaid := "WHERE remarks = 'UNPAID' AND entry_type = 'SHIPMENT'"
	argsUnpaid := []interface{}{}
	argUnpaidIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		whereUnpaid += fmt.Sprintf(" AND date_of_entry >= $%d", argUnpaidIdx)
		argsUnpaid = append(argsUnpaid, *filter.DateFrom)
		argUnpaidIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		whereUnpaid += fmt.Sprintf(" AND date_of_entry <= $%d", argUnpaidIdx)
		argsUnpaid = append(argsUnpaid, *filter.DateTo)
		argUnpaidIdx++
	}

	queryUnpaid := fmt.Sprintf(`
		SELECT 
			COUNT(*) as unpaid_count,
			COALESCE(SUM(debit), 0) as unpaid_amount
		FROM cashflow_entries %s;
	`, whereUnpaid)

	err = r.db.QueryRowContext(ctx, queryUnpaid, argsUnpaid...).Scan(&unpaidCount, &unpaidAmount)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"current_saldo":  currentSaldo,
		"total_kredit":   totalKredit,
		"total_debit":    totalDebit,
		"total_profit":   totalProfit,
		"avg_margin_pct": avgMargin,
		"unpaid_count":   unpaidCount,
		"unpaid_amount":  unpaidAmount,
	}, nil
}

func (r *PostgresCashflowRepo) ArchiveEntry(ctx context.Context, entry *domain.CashflowEntry, archivedBy uuid.UUID, reason string) error {
	query := `
		INSERT INTO cashflow_entries_history (
			entry_id, sequence_no, entry_type, kredit, debit, saldo, date_of_entry,
			act_information, act_explaination, vendor_id, vendor_name_raw,
			top_days, due_date, grand_cost, grand_selling, profit, margin_pct,
			remarks, created_by, updated_by, original_created_at, original_updated_at,
			archived_by, archive_reason
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11,
			$12, $13, $14, $15, $16, $17,
			$18, $19, $20, $21, $22,
			$23, $24
		)
	`
	_, err := r.db.ExecContext(ctx, query,
		entry.ID, entry.SequenceNo, entry.EntryType, entry.Kredit, entry.Debit, entry.Saldo, entry.DateOfEntry,
		entry.ActInformation, entry.ActExplaination, entry.VendorID, entry.VendorNameRaw,
		entry.TopDays, entry.DueDate, entry.GrandCost, entry.GrandSelling, entry.Profit, entry.MarginPct,
		entry.Remarks, entry.CreatedBy, entry.UpdatedBy, entry.CreatedAt, entry.UpdatedAt,
		archivedBy, reason,
	)
	return err
}
