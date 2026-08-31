-- Create Customers Table with Soft Delete support
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  pic_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

-- Seed Initial Customers from Dokumen PT Adijayantara Logistic Indonesia
INSERT INTO customers (name, pic_name, email, phone, address, notes)
VALUES
  ('PT Surya Mandiri Abadi', 'Bpk. Hendra Wijaya', 'finance@suryamandiri.co.id', '0812-3456-7890', 'Kawasan Industri MM2100, Cikarang Barat, Bekasi', 'Klien pengiriman rutin spareparts manufaktur'),
  ('CV Berkah Jaya Sentosa', 'Ibu Ratna Sari', 'billing@berkahjayalog.com', '0813-9876-5432', 'Jl. Raya Narogong Km. 14, Bantar Gebang, Bekasi', 'Distribusi consumer goods'),
  ('PT Nusantara Digital Kreatif', 'Bpk. Dimas Pratama', 'contact@nusantaradigital.id', '0857-1122-3344', 'Gedung Menara Cyber Lt. 8, Jl. Kuningan Barat, Jakarta Selatan', 'Pengiriman perangkat IT & server'),
  ('PT Global Niaga Sejahtera', 'Bpk. Anton Subagyo', 'logistics@globalniaga.co.id', '0811-2233-4455', 'Kawasan Pergudangan Marunda Center, Bekasi', 'Kargo impor & distribusi logistik'),
  ('PT Sumber Rejeki Makmur', 'Ibu Maya Anggraini', 'finance@sumberrejeki.com', '0821-4455-6677', 'Kawasan Industri Jababeka 1, Cikarang', 'Bahan baku industri makanan'),
  ('CV Mitra Sarana Prima', 'Bpk. Budi Santoso', 'mitrasarana.adm@gmail.com', '0818-7788-9900', 'Jl. Daan Mogot Km. 19, Tangerang', 'Proyek pengiriman material konstruksi'),
  ('PT Integra Multi Solusi', 'Ibu Diana Kusuma', 'accounting@integramulti.co.id', '0878-5566-7788', 'TB Simatupang Office Park Tower B, Jakarta Selatan', 'Peralatan telekomunikasi & otomasi'),
  ('PT Cahaya Utama Perkasa', 'Bpk. Faisal Rahman', 'purchasing@cahayautama.com', '0812-9988-7766', 'Kawasan Industri KIIC, Karawang Barat', 'Ekspor impor komponen otomotif')
ON CONFLICT (name) DO NOTHING;
