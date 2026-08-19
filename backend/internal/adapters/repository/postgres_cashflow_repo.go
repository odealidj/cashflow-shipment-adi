package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/jmoiron/sqlx"
)

type PostgresCashflowRepo struct {
	db *sqlx.DB
}

func NewPostgresCashflowRepo(db *sqlx.DB) *PostgresCashflowRepo {
	return &PostgresCashflowRepo{db: db}
}

func (r *PostgresCashflowRepo) Create(ctx context.Context, entry *domain.CashflowEntry) error {
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
			remarks, created_by, updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		) RETURNING id, sequence_no, created_at, updated_at
	`
	err = tx.QueryRowContext(ctx, queryInsert,
		entry.EntryType, entry.Kredit, entry.Debit, entry.Saldo, entry.DateOfEntry,
		entry.ActInformation, entry.ActExplaination, entry.VendorID, entry.VendorNameRaw,
		entry.TopDays, entry.DueDate, entry.GrandCost, entry.GrandSelling, entry.Profit, entry.MarginPct,
		entry.Remarks, entry.CreatedBy, entry.UpdatedBy,
	).Scan(&entry.ID, &entry.SequenceNo, &entry.CreatedAt, &entry.UpdatedAt)

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresCashflowRepo) Update(ctx context.Context, entry *domain.CashflowEntry) error {
	// Full update implementation with balance rippling will be implemented in the Service layer
	// by calling UpdateBalancesAfter. This is just a basic row update.
	query := `
		UPDATE cashflow_entries SET
			entry_type = $1, kredit = $2, debit = $3, saldo = $4, date_of_entry = $5,
			act_information = $6, act_explaination = $7, vendor_id = $8, vendor_name_raw = $9,
			top_days = $10, due_date = $11, grand_cost = $12, grand_selling = $13, 
			profit = $14, margin_pct = $15, remarks = $16, updated_by = $17, updated_at = CURRENT_TIMESTAMP
		WHERE id = $18
	`
	_, err := r.db.ExecContext(ctx, query,
		entry.EntryType, entry.Kredit, entry.Debit, entry.Saldo, entry.DateOfEntry,
		entry.ActInformation, entry.ActExplaination, entry.VendorID, entry.VendorNameRaw,
		entry.TopDays, entry.DueDate, entry.GrandCost, entry.GrandSelling,
		entry.Profit, entry.MarginPct, entry.Remarks, entry.UpdatedBy, entry.ID,
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

func (r *PostgresCashflowRepo) ListAll(ctx context.Context, offset, limit int) ([]domain.CashflowEntry, int, error) {
	var entries []domain.CashflowEntry
	var total int

	err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM cashflow_entries`)
	if err != nil {
		return nil, 0, err
	}

	query := `SELECT * FROM cashflow_entries ORDER BY sequence_no DESC LIMIT $1 OFFSET $2`
	err = r.db.SelectContext(ctx, &entries, query, limit, offset)
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

func (r *PostgresCashflowRepo) GetSummary(ctx context.Context) (map[string]float64, error) {
	var currentSaldo, totalKredit, totalDebit float64
	query := `
		SELECT 
			COALESCE((SELECT saldo FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1), 0) as current_saldo,
			COALESCE(SUM(kredit), 0) as total_kredit,
			COALESCE(SUM(debit), 0) as total_debit
		FROM cashflow_entries;
	`
	err := r.db.QueryRowContext(ctx, query).Scan(&currentSaldo, &totalKredit, &totalDebit)
	if err != nil {
		return nil, err
	}
	return map[string]float64{
		"current_saldo": currentSaldo,
		"total_kredit":  totalKredit,
		"total_debit":   totalDebit,
	}, nil
}
