-- Create Activity Presets Table
CREATE TABLE IF NOT EXISTS activity_presets (
  id SERIAL PRIMARY KEY,
  category VARCHAR(30) NOT NULL, -- 'ACT_INFO' (Keterangan Aktivitas) or 'ACT_EXPLAIN' (Catatan Tambahan / Rute)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT uq_activity_presets_cat_name UNIQUE (category, name)
);

CREATE INDEX IF NOT EXISTS idx_activity_presets_category ON activity_presets(category);
CREATE INDEX IF NOT EXISTS idx_activity_presets_name ON activity_presets(name);
CREATE INDEX IF NOT EXISTS idx_activity_presets_deleted_at ON activity_presets(deleted_at);

-- Seed Initial Presets from Dokumen Operasional PT Adijayantara
-- 1. Keterangan Aktivitas (Jenis Armada & Biaya Operasional)
INSERT INTO activity_presets (category, name, description)
VALUES
  ('ACT_INFO', 'Tronton Bak', 'Armada Tronton Bak Terbuka kapasitas 30 Ton'),
  ('ACT_INFO', 'Tronton Tracking Cost', 'Biaya tracking & pengawalan armada Tronton'),
  ('ACT_INFO', 'Tronton Wingbox', 'Armada Tronton Box Sayap hidrolik'),
  ('ACT_INFO', 'Fuso Box', 'Armada Fuso Box Tertutup kapasitas 10-15 Ton'),
  ('ACT_INFO', 'Fuso Bak', 'Armada Fuso Bak Terbuka'),
  ('ACT_INFO', 'Trailer 20 Feet', 'Truk Trailer kontainer 20 Feet'),
  ('ACT_INFO', 'Trailer 40 Feet', 'Truk Trailer kontainer 40 Feet'),
  ('ACT_INFO', 'CDD Box (Colt Diesel Double)', 'Armada 6 roda Box'),
  ('ACT_INFO', 'CDD Bak (Colt Diesel Double)', 'Armada 6 roda Bak'),
  ('ACT_INFO', 'CDE (Colt Diesel Engkel)', 'Armada 4 roda kecil'),
  ('ACT_INFO', 'Biaya Bongkar Muat / Buruh', 'Biaya tenaga kerja bongkar muat kargo'),
  ('ACT_INFO', 'Biaya Operasional Lapangan', 'Biaya koordinasi / operasional jalan')
ON CONFLICT ON CONSTRAINT uq_activity_presets_cat_name DO NOTHING;

-- 2. Catatan Tambahan (Rute & Pengiriman Muatan)
INSERT INTO activity_presets (category, name, description)
VALUES
  ('ACT_EXPLAIN', 'CIBINONG - SBY, Delivery', 'Rute Cibinong ke Surabaya'),
  ('ACT_EXPLAIN', 'DPK - MDN, Delivery', 'Rute Depok ke Medan'),
  ('ACT_EXPLAIN', 'JKT - SBY, Delivery', 'Rute Jakarta ke Surabaya'),
  ('ACT_EXPLAIN', 'JKT - SMG, Delivery', 'Rute Jakarta ke Semarang'),
  ('ACT_EXPLAIN', 'JKT - BDG, Delivery', 'Rute Jakarta ke Bandung'),
  ('ACT_EXPLAIN', 'TGR - BALI, Delivery', 'Rute Tangerang ke Denpasar Bali'),
  ('ACT_EXPLAIN', 'BOGOR - SBY, Delivery', 'Rute Bogor ke Surabaya'),
  ('ACT_EXPLAIN', 'CIBITUNG - SBY, Delivery', 'Rute Kawasan Industri Cibitung ke Surabaya'),
  ('ACT_EXPLAIN', 'Pengiriman Muatan Rutin (Pabrik)', 'Pengiriman bahan baku / produk jadi pabrik klien'),
  ('ACT_EXPLAIN', 'Pengiriman Muatan Urgent / On-Time', 'Pengiriman prioritas tinggi dengan jadwal ketat')
ON CONFLICT ON CONSTRAINT uq_activity_presets_cat_name DO NOTHING;
