-- Migration 000011: Add settlement details, original_due_date, and history tables for Invoices

-- 1. Extend invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS original_due_date DATE,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Backfill original_due_date from due_date for existing invoices
UPDATE invoices 
SET original_due_date = due_date 
WHERE original_due_date IS NULL;

-- 2. Create invoice_due_date_history table
CREATE TABLE IF NOT EXISTS invoice_due_date_history (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    previous_due_date DATE NOT NULL,
    new_due_date DATE NOT NULL,
    days_added INT NOT NULL,
    reason TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(100) NOT NULL DEFAULT 'Sistem',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_due_date_history_invoice_id ON invoice_due_date_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date_history_created_at ON invoice_due_date_history(created_at);

-- 3. Create invoice_payment_history table
CREATE TABLE IF NOT EXISTS invoice_payment_history (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL DEFAULT 'SETTLED', -- SETTLED, CANCELLED
    amount NUMERIC(15,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL,
    reference_no VARCHAR(100),
    proof_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(100) NOT NULL DEFAULT 'Staf Finance',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_payment_history_invoice_id ON invoice_payment_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payment_history_created_at ON invoice_payment_history(created_at);

-- 4. Seed initial payment history for existing PAID invoices
INSERT INTO invoice_payment_history (invoice_id, action, amount, payment_date, reference_no, notes, created_by_name, created_at)
SELECT id, 'SETTLED', amount, COALESCE(paid_at, updated_at, created_at), 'Pelunasan Awal Sistem', 'Pelunasan bawaan dokumen resmi', 'Sistem', COALESCE(paid_at, updated_at, created_at)
FROM invoices
WHERE status = 'PAID'
ON CONFLICT DO NOTHING;
