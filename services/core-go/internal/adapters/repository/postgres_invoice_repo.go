package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/jmoiron/sqlx"
)

type PostgresInvoiceRepo struct {
	db *sqlx.DB
}

func NewPostgresInvoiceRepo(db *sqlx.DB) *PostgresInvoiceRepo {
	return &PostgresInvoiceRepo{db: db}
}

func (r *PostgresInvoiceRepo) Create(ctx context.Context, inv *domain.Invoice) error {
	query := `
		INSERT INTO invoices (
			invoice_no, client_name, shipment_date, top_terms, top_days,
			due_date, amount, status, paid_at, notes, cashflow_entry_id, created_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		) RETURNING id, created_at, updated_at;
	`
	return r.db.QueryRowContext(
		ctx, query,
		inv.InvoiceNo, inv.ClientName, inv.ShipmentDate, inv.TopTerms, inv.TopDays,
		inv.DueDate, inv.Amount, inv.Status, inv.PaidAt, inv.Notes, inv.CashflowEntryID, inv.CreatedBy,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
}

func (r *PostgresInvoiceRepo) Update(ctx context.Context, inv *domain.Invoice) error {
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
	_, err := r.db.ExecContext(
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
	id, invoice_no, client_name, shipment_date, top_terms, top_days,
	due_date, amount, status, paid_at, COALESCE(notes, '') AS notes,
	cashflow_entry_id, created_by, created_at, updated_at, deleted_at
`

func (r *PostgresInvoiceRepo) GetByID(ctx context.Context, id int) (*domain.Invoice, error) {
	var inv domain.Invoice
	query := fmt.Sprintf(`SELECT %s FROM invoices WHERE id = $1 AND deleted_at IS NULL`, invoiceSelectColumns)
	err := r.db.GetContext(ctx, &inv, query, id)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *PostgresInvoiceRepo) GetByInvoiceNo(ctx context.Context, invoiceNo string) (*domain.Invoice, error) {
	var inv domain.Invoice
	query := fmt.Sprintf(`SELECT %s FROM invoices WHERE invoice_no = $1 AND deleted_at IS NULL`, invoiceSelectColumns)
	err := r.db.GetContext(ctx, &inv, query, invoiceNo)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *PostgresInvoiceRepo) ListAll(ctx context.Context, offset, limit int, filter ports.InvoiceFilter) ([]domain.Invoice, int, error) {
	var invoices []domain.Invoice
	var total int

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
	if filter.Status != nil && *filter.Status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, *filter.Status)
		argIdx++
	}
	if filter.ClientName != nil && *filter.ClientName != "" {
		where += fmt.Sprintf(" AND client_name ILIKE $%d", argIdx)
		args = append(args, "%"+*filter.ClientName+"%")
		argIdx++
	}
	if filter.InvoiceNo != nil && *filter.InvoiceNo != "" {
		where += fmt.Sprintf(" AND invoice_no ILIKE $%d", argIdx)
		args = append(args, "%"+*filter.InvoiceNo+"%")
		argIdx++
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices %s", where)
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Sorting
	sortBy := "shipment_date"
	if filter.SortBy == "due_date" {
		sortBy = "due_date"
	} else if filter.SortBy == "invoice_no" {
		sortBy = "invoice_no"
	}
	sortDir := "ASC"
	if filter.SortDir == "DESC" {
		sortDir = "DESC"
	}

	dataArgs := append(args, limit, offset)
	dataQuery := fmt.Sprintf(
		`SELECT %s FROM invoices %s ORDER BY %s %s, id %s LIMIT $%d OFFSET $%d`,
		invoiceSelectColumns, where, sortBy, sortDir, sortDir, argIdx, argIdx+1,
	)
	err = r.db.SelectContext(ctx, &invoices, dataQuery, dataArgs...)
	return invoices, total, err
}

func (r *PostgresInvoiceRepo) GetSummary(ctx context.Context, filter ports.InvoiceFilter) (map[string]interface{}, error) {
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

	err := r.db.QueryRowContext(ctx, query, args...).Scan(
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

func (r *PostgresInvoiceRepo) MarkPaid(ctx context.Context, id int) error {
	now := time.Now()
	query := `
		UPDATE invoices 
		SET status = 'PAID', paid_at = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL;
	`
	_, err := r.db.ExecContext(ctx, query, now, id)
	return err
}
