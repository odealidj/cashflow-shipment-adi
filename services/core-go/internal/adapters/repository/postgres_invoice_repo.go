package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/jmoiron/sqlx"
)

type PostgresInvoiceRepo struct {
	db *sqlx.DB
}

func NewPostgresInvoiceRepo(db *sqlx.DB) *PostgresInvoiceRepo {
	return &PostgresInvoiceRepo{db: db}
}

func (r *PostgresInvoiceRepo) Create(ctx context.Context, inv *domain.Invoice) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "Create", "INSERT INTO invoices ...", start, err)
	}()

	query := `
		INSERT INTO invoices (
			invoice_no, client_name, shipment_date, top_terms, top_days,
			due_date, original_due_date, amount, status, paid_at, notes, cashflow_entry_id, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, COALESCE($7, $6), $8, $9, $10, $11, $12, $13
		) RETURNING id, created_at, updated_at;
	`
	return r.db.QueryRowContext(
		ctx, query,
		inv.InvoiceNo, inv.ClientName, inv.ShipmentDate, inv.TopTerms, inv.TopDays,
		inv.DueDate, inv.OriginalDueDate, inv.Amount, inv.Status, inv.PaidAt, inv.Notes, inv.CashflowEntryID, inv.CreatedBy,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
}

func (r *PostgresInvoiceRepo) Update(ctx context.Context, inv *domain.Invoice) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "Update", "UPDATE invoices ...", start, err)
	}()

	query := `
		UPDATE invoices SET
			client_name = $1,
			shipment_date = $2,
			top_terms = $3,
			top_days = $4,
			due_date = $5,
			amount = $6,
			status = $7,
			paid_at = $8,
			notes = $9,
			cashflow_entry_id = $10,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $11 AND deleted_at IS NULL;
	`
	_, err = r.db.ExecContext(
		ctx, query,
		inv.ClientName, inv.ShipmentDate, inv.TopTerms, inv.TopDays,
		inv.DueDate, inv.Amount, inv.Status, inv.PaidAt, inv.Notes,
		inv.CashflowEntryID, inv.ID,
	)
	return err
}

// Soft delete
func (r *PostgresInvoiceRepo) Delete(ctx context.Context, id int) error {
	query := `UPDATE invoices SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

const invoiceSelectColumns = `
	i.id, i.invoice_no, i.client_name, i.shipment_date, i.top_terms, i.top_days,
	i.due_date, COALESCE(i.original_due_date, i.due_date) AS original_due_date,
	i.amount, i.status, i.paid_at, i.paid_by,
	COALESCE(u_paid.full_name, '') AS paid_by_name,
	COALESCE(i.payment_reference, '') AS payment_reference,
	COALESCE(i.payment_proof_url, '') AS payment_proof_url,
	COALESCE(i.payment_notes, '') AS payment_notes,
	COALESCE(i.notes, '') AS notes,
	i.cashflow_entry_id, i.created_by,
	COALESCE(u_create.full_name, '') AS created_by_name,
	COALESCE((SELECT COUNT(*) FROM invoice_due_date_history WHERE invoice_id = i.id), 0) AS reschedule_count,
	i.created_at, i.updated_at, i.deleted_at
`

const invoiceFromWithJoins = `
	FROM invoices i
	LEFT JOIN users u_paid ON i.paid_by = u_paid.id
	LEFT JOIN users u_create ON i.created_by = u_create.id
`

func (r *PostgresInvoiceRepo) GetByID(ctx context.Context, id int) (*domain.Invoice, error) {
	var inv domain.Invoice
	query := fmt.Sprintf(`SELECT %s %s WHERE i.id = $1 AND i.deleted_at IS NULL`, invoiceSelectColumns, invoiceFromWithJoins)
	err := r.db.GetContext(ctx, &inv, query, id)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *PostgresInvoiceRepo) GetByInvoiceNo(ctx context.Context, invoiceNo string) (*domain.Invoice, error) {
	var inv domain.Invoice
	query := fmt.Sprintf(`SELECT %s %s WHERE i.invoice_no = $1 AND i.deleted_at IS NULL`, invoiceSelectColumns, invoiceFromWithJoins)
	err := r.db.GetContext(ctx, &inv, query, invoiceNo)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *PostgresInvoiceRepo) ListAll(ctx context.Context, offset, limit int, filter ports.InvoiceFilter) (invoices []domain.Invoice, total int, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "ListAll", "SELECT ... FROM invoices ...", start, err)
	}()

	where := "WHERE i.deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		where += fmt.Sprintf(" AND i.shipment_date >= $%d", argIdx)
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		where += fmt.Sprintf(" AND i.shipment_date <= $%d", argIdx)
		args = append(args, *filter.DateTo)
		argIdx++
	}
	if filter.Status != nil && *filter.Status != "" {
		where += fmt.Sprintf(" AND i.status = $%d", argIdx)
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.ClientName != nil && *filter.ClientName != "" {
		where += fmt.Sprintf(" AND i.client_name ILIKE $%d", argIdx)
		args = append(args, "%"+*filter.ClientName+"%")
		argIdx++
	}
	if filter.InvoiceNo != nil && *filter.InvoiceNo != "" {
		where += fmt.Sprintf(" AND i.invoice_no ILIKE $%d", argIdx)
		args = append(args, "%"+*filter.InvoiceNo+"%")
		argIdx++
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices i %s", where)
	err = r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Sorting (Default: created_at DESC)
	sortBy := "i.created_at"
	sortDir := "DESC"

	switch strings.ToLower(filter.SortBy) {
	case "name", "client_name":
		sortBy = "i.client_name"
		sortDir = "ASC"
	case "due_date":
		sortBy = "i.due_date"
	case "shipment_date":
		sortBy = "i.shipment_date"
	case "invoice_no":
		sortBy = "i.invoice_no"
	case "amount":
		sortBy = "i.amount"
	case "created_at":
		sortBy = "i.created_at"
	}

	if strings.ToUpper(filter.SortDir) == "ASC" {
		sortDir = "ASC"
	} else if strings.ToUpper(filter.SortDir) == "DESC" {
		sortDir = "DESC"
	}

	dataArgs := append(args, limit, offset)
	dataQuery := fmt.Sprintf(
		`SELECT %s %s %s ORDER BY %s %s, i.id %s LIMIT $%d OFFSET $%d`,
		invoiceSelectColumns, invoiceFromWithJoins, where, sortBy, sortDir, sortDir, argIdx, argIdx+1,
	)
	err = r.db.SelectContext(ctx, &invoices, dataQuery, dataArgs...)
	return invoices, total, err
}

func (r *PostgresInvoiceRepo) GetSummary(ctx context.Context, filter ports.InvoiceFilter) (res map[string]interface{}, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "GetSummary", "SELECT SUM(amount)... FROM invoices ...", start, err)
	}()

	where := "WHERE deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		where += fmt.Sprintf(" AND shipment_date >= $%d", argIdx)
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		where += fmt.Sprintf(" AND shipment_date <= $%d", argIdx)
		args = append(args, *filter.DateTo)
		argIdx++
	}
	if filter.ClientName != nil && *filter.ClientName != "" {
		where += fmt.Sprintf(" AND client_name ILIKE $%d", argIdx)
		args = append(args, "%"+*filter.ClientName+"%")
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT
			COALESCE(SUM(amount), 0) as total_amount,
			COUNT(*) as total_count,
			COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) as paid_amount,
			COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_count,
			COALESCE(SUM(CASE WHEN status = 'UNPAID' THEN amount ELSE 0 END), 0) as unpaid_amount,
			COUNT(CASE WHEN status = 'UNPAID' THEN 1 END) as unpaid_count,
			COALESCE(SUM(CASE WHEN status = 'OVERDUE' THEN amount ELSE 0 END), 0) as overdue_amount,
			COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END) as overdue_count
		FROM invoices %s;
	`, where)

	var totalAmount, paidAmount, unpaidAmount, overdueAmount float64
	var totalCount, paidCount, unpaidCount, overdueCount int

	err = r.db.QueryRowContext(ctx, query, args...).Scan(
		&totalAmount, &totalCount,
		&paidAmount, &paidCount,
		&unpaidAmount, &unpaidCount,
		&overdueAmount, &overdueCount,
	)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_amount":   totalAmount,
		"total_count":    totalCount,
		"paid_amount":    paidAmount,
		"paid_count":     paidCount,
		"unpaid_amount":  unpaidAmount,
		"unpaid_count":   unpaidCount,
		"overdue_amount": overdueAmount,
		"overdue_count":  overdueCount,
	}, nil
}

func (r *PostgresInvoiceRepo) MarkPaid(ctx context.Context, id int) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "MarkPaid", "UPDATE invoices SET status = 'PAID' ...", start, err)
	}()

	now := time.Now()
	query := `
		UPDATE invoices 
		SET status = 'PAID', paid_at = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL;
	`
	_, err = r.db.ExecContext(ctx, query, now, id)
	return err
}

func (r *PostgresInvoiceRepo) SettleInvoice(ctx context.Context, id int, payment domain.InvoicePaymentHistory) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "SettleInvoice", "UPDATE invoices ... INSERT INTO invoice_payment_history ...", start, err)
	}()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update invoice status to PAID
	queryUpdate := `
		UPDATE invoices 
		SET status = 'PAID'::invoice_status,
		    paid_at = $1,
		    paid_by = $2,
		    payment_reference = $3,
		    payment_proof_url = $4,
		    payment_notes = $5,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND deleted_at IS NULL;
	`
	res, err := tx.ExecContext(ctx, queryUpdate,
		payment.PaymentDate, payment.CreatedBy, payment.ReferenceNo,
		payment.ProofURL, payment.Notes, id,
	)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("invoice tidak ditemukan atau sudah dihapus")
	}

	// 2. Insert into invoice_payment_history
	queryInsert := `
		INSERT INTO invoice_payment_history (
			invoice_id, action, amount, payment_date, reference_no, proof_url, notes, created_by, created_by_name
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9
		);
	`
	_, err = tx.ExecContext(ctx, queryInsert,
		id, payment.Action, payment.Amount, payment.PaymentDate,
		payment.ReferenceNo, payment.ProofURL, payment.Notes,
		payment.CreatedBy, payment.CreatedByName,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresInvoiceRepo) RescheduleDueDate(ctx context.Context, id int, history domain.InvoiceDueDateHistory) (err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("invoice_repo", "RescheduleDueDate", "UPDATE invoices ... INSERT INTO invoice_due_date_history ...", start, err)
	}()

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Update invoice due_date, set original_due_date if null, and normalize OVERDUE to UNPAID if new due date is in the future
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)

	queryUpdate := `
		UPDATE invoices 
		SET due_date = $1,
		    original_due_date = COALESCE(original_due_date, $2),
		    status = CASE 
		        WHEN status = 'PAID'::invoice_status THEN 'PAID'::invoice_status
		        WHEN $1 >= $3::date THEN 'UNPAID'::invoice_status
		        ELSE 'OVERDUE'::invoice_status
		    END,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $4 AND deleted_at IS NULL;
	`
	res, err := tx.ExecContext(ctx, queryUpdate, history.NewDueDate, history.PreviousDueDate, today, id)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("invoice tidak ditemukan atau sudah dihapus")
	}

	// 2. Insert into invoice_due_date_history
	queryInsert := `
		INSERT INTO invoice_due_date_history (
			invoice_id, previous_due_date, new_due_date, days_added, reason, changed_by, changed_by_name
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7
		);
	`
	_, err = tx.ExecContext(ctx, queryInsert,
		id, history.PreviousDueDate, history.NewDueDate, history.DaysAdded,
		history.Reason, history.ChangedBy, history.ChangedByName,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *PostgresInvoiceRepo) GetInvoiceHistory(ctx context.Context, invoiceID int) (*domain.InvoiceHistorySummary, error) {
	inv, err := r.GetByID(ctx, invoiceID)
	if err != nil {
		return nil, err
	}

	summary := &domain.InvoiceHistorySummary{
		Invoice:        *inv,
		RescheduleLogs: []domain.InvoiceDueDateHistory{},
		PaymentLogs:    []domain.InvoicePaymentHistory{},
	}

	// Query reschedule logs
	qReschedule := `
		SELECT id, invoice_id, previous_due_date, new_due_date, days_added, reason,
		       changed_by, changed_by_name, created_at
		FROM invoice_due_date_history
		WHERE invoice_id = $1
		ORDER BY created_at DESC, id DESC;
	`
	err = r.db.SelectContext(ctx, &summary.RescheduleLogs, qReschedule, invoiceID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	// Query payment logs
	qPayments := `
		SELECT id, invoice_id, action, amount, payment_date,
		       COALESCE(reference_no, '') AS reference_no,
		       COALESCE(proof_url, '') AS proof_url,
		       COALESCE(notes, '') AS notes,
		       created_by, created_by_name, created_at
		FROM invoice_payment_history
		WHERE invoice_id = $1
		ORDER BY created_at DESC, id DESC;
	`
	err = r.db.SelectContext(ctx, &summary.PaymentLogs, qPayments, invoiceID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	return summary, nil
}
