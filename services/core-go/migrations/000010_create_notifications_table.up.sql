-- 000010_create_notifications_table.up.sql
-- Tabel Notifikasi Terarah untuk PT. Adijayantara Logistics Indonesia

DO $$ BEGIN
    CREATE TYPE notification_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_category AS ENUM ('INVOICE', 'CASHFLOW', 'VENDOR', 'SHIPMENT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_role VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category notification_category NOT NULL DEFAULT 'SYSTEM',
  severity notification_severity NOT NULL DEFAULT 'INFO',
  action_url VARCHAR(255),
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
