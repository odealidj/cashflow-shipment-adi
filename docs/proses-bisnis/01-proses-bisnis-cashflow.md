# Proses Bisnis: Cashflow Shipment Control

Dokumen ini menjelaskan seluruh alur proses bisnis aplikasi **Cashflow Shipment Control** — mulai dari konsep dasar, logika perhitungan, hingga contoh data nyata.

---

## Daftar Isi

1. [Konsep Dasar](#konsep-dasar)
2. [Tipe Transaksi](#tipe-transaksi)
3. [Logika Rolling Saldo](#logika-rolling-saldo)
4. [Logika Profit & Margin](#logika-profit--margin)
5. [Alur Import dari Excel](#alur-import-dari-excel)
6. [Contoh Skenario Lengkap](#contoh-skenario-lengkap)
7. [Export Excel](#export-excel)
8. [Status Pembayaran (Remarks)](#status-pembayaran-remarks)

---

## Konsep Dasar

Aplikasi ini berfungsi sebagai **buku kas berjalan (rolling cashbook)** untuk bisnis logistik/trucking. Setiap transaksi keluar (biaya pengiriman) dicatat lengkap dengan informasi vendor, rute, HPP, harga jual, dan status pembayaran.

**Prinsip utama:**
- Saldo bersifat **rolling** — setiap transaksi baru memperbarui saldo dari saldo sebelumnya.
- Saldo tidak pernah di-reset; bersifat akumulatif sepanjang waktu.
- Modal baru (Top-Up) **menambah** saldo. Biaya shipment **mengurangi** saldo.

---

## Tipe Transaksi

### 1. TOP_UP — Penambahan Modal

Terjadi ketika ada **uang baru masuk** ke kas operasional, misalnya:
- Injeksi modal dari pemilik/investor
- Penerimaan pembayaran dari klien
- Transfer dana dari rekening lain

**Ciri-ciri:**
- Mengisi kolom **KREDIT** (penambah saldo)
- Tidak ada kolom DEBIT
- Tidak terkait vendor/shipment

**Rumus:**
```
Saldo Baru = Saldo Sebelumnya + Kredit
```

---

### 2. SHIPMENT — Biaya Pengiriman

Terjadi ketika ada **pembayaran biaya operasional** ke vendor/transporter, misalnya:
- Sewa tronton
- Biaya pengiriman barang
- Ongkos vendor logistik

**Ciri-ciri:**
- Mengisi kolom **DEBIT** (pengurang saldo)
- Terkait dengan satu vendor
- Memiliki informasi rute, HPP, harga jual, T.O.P, due date

**Rumus:**
```
Saldo Baru = Saldo Sebelumnya - Debit
```

---

## Logika Rolling Saldo

Saldo dihitung secara berurutan dari transaksi pertama hingga terakhir:

```
Saldo[n] = Saldo[n-1] + Kredit[n] - Debit[n]
```

**Contoh:**

| No | Tipe | Kredit | Debit | Saldo |
|----|------|--------|-------|-------|
| 1 | TOP_UP | 100,000,000 | 0 | **100,000,000** |
| 2 | SHIPMENT | 0 | 20,104,875 | **79,895,125** |
| 3 | SHIPMENT | 0 | 7,500,000 | **72,395,125** |
| 4 | TOP_UP | 50,000,000 | 0 | **122,395,125** |
| 5 | SHIPMENT | 0 | 15,000,000 | **107,395,125** |

> ⚠️ **Penting:** Jika sebuah transaksi di-edit atau dihapus, **semua saldo setelahnya harus dihitung ulang** secara otomatis (cascade recalculation).

---

## Logika Profit & Margin

Hanya berlaku untuk transaksi **SHIPMENT**:

```
Profit      = Grand Selling - Grand Cost
Margin (%)  = Profit / Grand Selling × 100
```

**Contoh:**
```
Grand Cost    = Rp 28,150,000  (HPP / biaya vendor)
Grand Selling = Rp 30,000,000  (harga yang ditagihkan ke klien)

Profit        = 30,000,000 - 28,150,000 = Rp 1,850,000
Margin        = 1,850,000 / 30,000,000  = 6.17%
```

**Catatan:**
- `Grand Cost` adalah total biaya yang dibayar ke vendor/transporter.
- `Grand Selling` adalah total yang ditagihkan ke klien/shipper.
- `Debit` adalah uang yang **benar-benar keluar dari kas** pada saat itu. Bisa berbeda dari Grand Cost jika pembayaran ke vendor belum lunas (UNPAID/PENDING).

---

## Alur Import dari Excel

Format dokumen Excel `CASHFLOW SHIPMENT CONTROL.xlsx` memiliki struktur khusus di mana kolom **KREDIT** bukan selalu "uang baru masuk", melainkan bisa berupa **saldo carry-over** dari transaksi sebelumnya.

### Struktur Header Excel (Baris ke-6)

| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J | Col K | Col L | Col M | Col N |
|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| KREDIT | DEBIT | SALDO | DATE OF DEBIT | ACT INFORMATION | ACT EXPLAINATION | VENDOR | T O P | DUE DATE | GRAND COST | GRAND SELLING | PROFIT | MARGIN IN % | REMARKS |

> Data dimulai dari **baris ke-7** (baris ke-1 s/d 5 adalah header/judul dokumen).

---

### Aturan Parsing Import

#### Baris Pertama Data (Baris ke-7):
```
Jika KREDIT > 0:
  → Buat entri TOP_UP sebesar KREDIT
  → Ini adalah modal awal / opening balance

Jika DEBIT > 0:
  → Buat entri SHIPMENT sebesar DEBIT
  → Beserta semua detail: vendor, rute, HPP, selling, T.O.P, due date, dll.
```

#### Baris Berikutnya (Baris ke-8 dst):
```
Hitung: selisih = KREDIT[baris ini] - SALDO[baris sebelumnya]

Jika selisih > 0:
  → Ada modal baru masuk sebesar [selisih]
  → Buat entri TOP_UP sebesar selisih tersebut
  → (KREDIT bukan carry-over murni, ada tambahan modal)

Jika selisih = 0 atau selisih < 0:
  → Ini adalah carry-over biasa (KREDIT = SALDO sebelumnya)
  → SKIP, tidak perlu buat entri TOP_UP

Kemudian:
Jika DEBIT > 0:
  → Buat entri SHIPMENT sebesar DEBIT
```

#### Baris Kosong / Tidak Valid:
```
Jika KREDIT = 0 DAN DEBIT = 0 DAN VENDOR kosong:
  → SKIP (baris kosong/placeholder)
```

---

### Contoh Parsing Import

**Data Excel:**

| Baris | KREDIT | DEBIT | SALDO | DATE | VENDOR |
|-------|--------|-------|-------|------|--------|
| 7 | 100,000,000 | 20,104,875 | 79,895,125 | 04/02/2026 | CV AIRA |
| 8 | 79,895,125 | 7,500,000 | 72,395,125 | 22/02/2026 | - |
| 9 | 122,395,125 | 15,000,000 | 107,395,125 | 10/03/2026 | CV XYZ |

**Hasil parsing:**

```
--- Baris 7 (Pertama) ---
KREDIT = 100,000,000 → Buat TOP_UP Rp 100,000,000 (modal awal)
DEBIT  = 20,104,875  → Buat SHIPMENT Rp 20,104,875 ke CV AIRA
                        Rolling saldo = 100,000,000 - 20,104,875 = 79,895,125

--- Baris 8 ---
Selisih = KREDIT[79,895,125] - Saldo_Sebelumnya[79,895,125] = 0
→ Carry-over biasa, SKIP top-up
DEBIT   = 7,500,000  → Buat SHIPMENT Rp 7,500,000
                        Rolling saldo = 79,895,125 - 7,500,000 = 72,395,125

--- Baris 9 ---
Selisih = KREDIT[122,395,125] - Saldo_Sebelumnya[72,395,125] = 50,000,000
→ Ada modal baru! Buat TOP_UP Rp 50,000,000
DEBIT   = 15,000,000 → Buat SHIPMENT Rp 15,000,000 ke CV XYZ
                        Rolling saldo = (72,395,125 + 50,000,000) - 15,000,000 = 107,395,125
```

**Database akhir (5 entri dari 3 baris Excel):**

| Seq | Tipe | Kredit | Debit | Saldo | Tanggal | Vendor |
|-----|------|--------|-------|-------|---------|--------|
| 1 | TOP_UP | 100,000,000 | 0 | 100,000,000 | 04/02/2026 | - |
| 2 | SHIPMENT | 0 | 20,104,875 | 79,895,125 | 04/02/2026 | CV AIRA |
| 3 | SHIPMENT | 0 | 7,500,000 | 72,395,125 | 22/02/2026 | - |
| 4 | TOP_UP | 50,000,000 | 0 | 122,395,125 | 10/03/2026 | - |
| 5 | SHIPMENT | 0 | 15,000,000 | 107,395,125 | 10/03/2026 | CV XYZ |

---

## Contoh Skenario Lengkap

### Skenario: Bulan Februari–Maret 2026

**Peristiwa:**
1. **04/02/2026** — Modal awal masuk Rp 100 juta
2. **04/02/2026** — Bayar tronton ke CV AIRA Rp 20 juta (DPK-MDN, 14 hari T.O.P)
3. **22/02/2026** — Bayar tronton bak Cibinong–SBY Rp 7,5 juta (3 hari T.O.P)
4. **10/03/2026** — Tambahan modal masuk Rp 50 juta
5. **10/03/2026** — Bayar pengiriman ke CV XYZ Rp 15 juta

**Hasil di Aplikasi:**

| No | Tanggal | Tipe | Kredit | Debit | Saldo | Vendor | T.O.P | Due Date | Remarks |
|----|---------|------|--------|-------|-------|--------|-------|----------|---------|
| 1 | 04/02/2026 | TOP_UP | 100,000,000 | - | 100,000,000 | - | - | - | PAID |
| 2 | 04/02/2026 | SHIPMENT | - | 20,104,875 | 79,895,125 | CV AIRA | 14 hari | 18/02/2026 | UNPAID |
| 3 | 22/02/2026 | SHIPMENT | - | 7,500,000 | 72,395,125 | - | 3 hari | 25/02/2026 | UNPAID |
| 4 | 10/03/2026 | TOP_UP | 50,000,000 | - | 122,395,125 | - | - | - | PAID |
| 5 | 10/03/2026 | SHIPMENT | - | 15,000,000 | 107,395,125 | CV XYZ | - | - | PENDING |

**Summary Dashboard:**
```
Rolling Saldo  : Rp 107,395,125
Total Kredit   : Rp 150,000,000  (Top-Up 100jt + 50jt)
Total Debit    : Rp   42,604,875  (semua biaya shipment)
Total Profit   : (tergantung Grand Selling yang diisi)
Tagihan UNPAID : 2 transaksi
```

---

## Export Excel

Aplikasi menyediakan fitur export data cashflow ke file Excel (`Cashflow_Export.xlsx`) melalui endpoint:

```
GET /api/v1/cashflow/export
```

### Cara Kerja — Filter-Aware Export

Export **mengikuti filter yang sedang aktif** di tampilan tabel. Artinya, jika user sedang menyaring data dengan filter tertentu, file Excel yang didownload hanya berisi data yang terfilter tersebut — bukan seluruh data.

```
# Contoh: Export hanya tagihan UNPAID bulan Maret
GET /api/v1/cashflow/export?entry_type=SHIPMENT&remarks=UNPAID&date_from=2026-03-01&date_to=2026-03-31

# Contoh: Export semua data (tanpa filter)
GET /api/v1/cashflow/export
```

### Format Kolom Output Excel

| Kolom | Header | Isi |
|-------|--------|-----|
| A | Tanggal | `date_of_entry` format `YYYY-MM-DD` |
| B | No | `sequence_no` |
| C | Information | `act_information` |
| D | Description | `act_explaination` |
| E | Vendor | `vendor_name_raw` |
| F | T.O.P | `top_days` (angka hari) |
| G | Due Date | `due_date` format `YYYY-MM-DD` |
| H | HPP | `grand_cost` |
| I | Selling | `grand_selling` |
| J | Kredit | `kredit` |
| K | Debit | `debit` |
| L | Saldo | `saldo` |
| M | Profit | `profit` |
| N | Margin % | `margin_pct` dalam format `"6.17%"` |
| O | Remarks | `remarks` (`PAID`/`UNPAID`/`PENDING`) |

> 💡 **Catatan:** Format header output berbeda dari format Excel input (`CASHFLOW SHIPMENT CONTROL.xlsx`). Output export adalah format standar sistem, bukan format asli Excel yang diimport.

---

## Status Pembayaran (Remarks)

Setiap transaksi Shipment memiliki status pembayaran ke vendor:

| Status | Arti | Warna UI |
|--------|------|----------|
| `UNPAID` | Tagihan belum dibayar ke vendor | 🔴 Merah |
| `PENDING` | Sedang dalam proses pembayaran | 🟡 Kuning |
| `PAID` | Tagihan sudah lunas dibayar | 🟢 Hijau |

**Alur status normal:**
```
UNPAID → (proses pembayaran) → PENDING → (konfirmasi lunas) → PAID
```

**Aturan:**
- Status dapat diubah secara manual oleh user dari tabel dashboard.
- Perubahan status **tidak mempengaruhi** nilai DEBIT atau rolling SALDO.
- Transaksi TOP_UP secara default selalu berstatus `PAID`.
