-- Migration: Add cashflow_entries_history table for backup on upsert/import
-- Tabel ini menyimpan versi lama dari entri yang diupdate saat proses import Excel

CREATE TABLE IF NOT EXISTS cashflow_entries_history (
  history_id    SERIAL PRIMARY KEY,
  entry_id      INT NOT NULL,              -- ID dari cashflow_entries aslinya
  sequence_no   INT,
  entry_type    entry_type,
  kredit        DECIMAL(15,2),
  debit         DECIMAL(15,2),
  saldo         DECIMAL(15,2),
  date_of_entry DATE,
  act_information   VARCHAR,
  act_explaination  VARCHAR,
  vendor_id         INT,
  vendor_name_raw   VARCHAR,
  top_days          INT,
  due_date          DATE,
  grand_cost        DECIMAL(15,2),
  grand_selling     DECIMAL(15,2),
  profit            DECIMAL(15,2),
  margin_pct        DECIMAL(5,4),
  remarks           payment_status,
  created_by        UUID,
  updated_by        UUID,
  original_created_at TIMESTAMP,
  original_updated_at TIMESTAMP,
  -- Metadata backup
  archived_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_by   UUID REFERENCES users(id),
  archive_reason VARCHAR DEFAULT 'import_upsert' -- 'import_upsert', 'manual_edit', dll
);

CREATE INDEX IF NOT EXISTS idx_cashflow_history_entry_id ON cashflow_entries_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_history_archived_at ON cashflow_entries_history(archived_at);
