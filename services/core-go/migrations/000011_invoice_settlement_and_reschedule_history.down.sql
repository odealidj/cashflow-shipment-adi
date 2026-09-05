-- Rollback Migration 000011

DROP TABLE IF EXISTS invoice_payment_history CASCADE;
DROP TABLE IF EXISTS invoice_due_date_history CASCADE;

ALTER TABLE invoices 
DROP COLUMN IF EXISTS original_due_date,
DROP COLUMN IF EXISTS paid_by,
DROP COLUMN IF EXISTS payment_reference,
DROP COLUMN IF EXISTS payment_proof_url,
DROP COLUMN IF EXISTS payment_notes;
