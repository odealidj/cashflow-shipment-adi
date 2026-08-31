-- Create Invoice Status Enum
DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('UNPAID', 'PAID', 'OVERDUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Invoices Table with Soft Delete support
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR UNIQUE NOT NULL,
  client_name VARCHAR NOT NULL,
  shipment_date DATE NOT NULL,
  top_terms VARCHAR NOT NULL DEFAULT 'Net 30 Hari',
  top_days INT NOT NULL DEFAULT 30,
  due_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'UNPAID',
  paid_at TIMESTAMP,
  notes TEXT,
  cashflow_entry_id INT REFERENCES cashflow_entries(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_shipment_date ON invoices(shipment_date);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

-- Seed 8 Invoices dari Dokumen Resmi PT Adijayantara Logistic Indonesia
INSERT INTO invoices (invoice_no, client_name, shipment_date, top_terms, top_days, due_date, amount, status, paid_at)
VALUES 
  ('INV/2026/08/001', 'PT Surya Mandiri Abadi', '2026-08-01', 'Net 30 Hari', 30, '2026-08-31', 45000000.00, 'UNPAID', NULL),
  ('INV/2026/08/002', 'CV Berkah Jaya Sentosa', '2026-08-05', 'Net 14 Hari', 14, '2026-08-19', 18500000.00, 'PAID', '2026-08-19 10:30:00'),
  ('INV/2026/08/003', 'PT Nusantara Digital Kreatif', '2026-08-08', 'Net 45 Hari', 45, '2026-09-22', 72300000.00, 'UNPAID', NULL),
  ('INV/2026/08/004', 'PT Global Niaga Sejahtera', '2026-08-10', 'Net 14 Hari', 14, '2026-08-24', 12800000.00, 'OVERDUE', NULL),
  ('INV/2026/08/005', 'PT Sumber Rejeki Makmur', '2026-08-15', 'Net 30 Hari', 30, '2026-09-14', 33500000.00, 'UNPAID', NULL),
  ('INV/2026/08/006', 'CV Mitra Sarana Prima', '2026-08-18', 'COD (Cash on Delivery)', 0, '2026-08-18', 8750000.00, 'PAID', '2026-08-18 15:00:00'),
  ('INV/2026/08/007', 'PT Integra Multi Solusi', '2026-08-22', 'Net 30 Hari', 30, '2026-09-21', 54200000.00, 'UNPAID', NULL),
  ('INV/2026/08/008', 'PT Cahaya Utama Perkasa', '2026-08-25', 'Net 60 Hari', 60, '2026-10-24', 96000000.00, 'UNPAID', NULL)
ON CONFLICT (invoice_no) DO NOTHING;
