CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'operator', 'viewer');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE payment_status AS ENUM ('PAID', 'UNPAID', 'PENDING');
CREATE TYPE entry_type AS ENUM ('SHIPMENT', 'TOP_UP');

CREATE TABLE cashflow_entries (
  id SERIAL PRIMARY KEY,
  sequence_no SERIAL, 
  entry_type entry_type DEFAULT 'SHIPMENT',
  kredit DECIMAL(15,2) NOT NULL DEFAULT 0,
  debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo DECIMAL(15,2) NOT NULL DEFAULT 0,
  date_of_entry DATE NOT NULL,
  act_information VARCHAR,
  act_explaination VARCHAR,
  vendor_id INT REFERENCES vendors(id),
  vendor_name_raw VARCHAR,
  top_days INT DEFAULT 0,
  due_date DATE,
  grand_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  grand_selling DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  margin_pct DECIMAL(5,4) NOT NULL DEFAULT 0,
  remarks payment_status DEFAULT 'UNPAID',
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
