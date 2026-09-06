-- Migration: Add INVOICE_PAYMENT to entry_type enum and link invoice_id to cashflow_entries

-- 1. Extend entry_type enum with INVOICE_PAYMENT
ALTER TYPE entry_type ADD VALUE IF NOT EXISTS 'INVOICE_PAYMENT';

-- 2. Add invoice_id column to cashflow_entries referencing invoices table
ALTER TABLE cashflow_entries 
ADD COLUMN IF NOT EXISTS invoice_id INT REFERENCES invoices(id) ON DELETE SET NULL;

-- 3. Performance indices
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_invoice_id ON cashflow_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_entry_type ON cashflow_entries(entry_type);
