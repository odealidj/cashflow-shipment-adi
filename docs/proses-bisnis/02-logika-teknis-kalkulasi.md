# Logika Teknis: Kalkulasi Rolling Saldo

Dokumen teknis ini menjelaskan implementasi detail kalkulasi rolling saldo, cascade recalculation, serta pseudocode logika import Excel di backend `core-go`.

---

## 1. Rolling Saldo saat CREATE

```
Fungsi: RecordTopUp(entry) / RecordShipment(entry)

1. BEGIN TRANSACTION (dengan row lock)
2. Ambil saldo terakhir:
   SELECT saldo FROM cashflow_entries
   ORDER BY sequence_no DESC
   LIMIT 1
   FOR UPDATE  ← lock untuk mencegah race condition

3. Hitung saldo baru:
   entry.Saldo = lastSaldo + entry.Kredit - entry.Debit

4. Jika SHIPMENT:
   entry.Profit    = entry.GrandSelling - entry.GrandCost
   entry.MarginPct = entry.Profit / entry.GrandSelling  (jika GrandSelling > 0)

5. INSERT entry ke database
   RETURNING id, sequence_no, created_at

6. COMMIT
```

---

## 2. Cascade Recalculation saat EDIT

Ketika sebuah transaksi diubah (nilai kredit/debit berubah), semua saldo setelahnya harus diperbarui.

```
Fungsi: UpdateEntry(id, newEntry)

1. GET entry lama berdasarkan id
   oldEntry = GetByID(id)

2. Hitung selisih perubahan:
   diff = (newEntry.Kredit - newEntry.Debit)
        - (oldEntry.Kredit - oldEntry.Debit)
   
   Contoh:
   - Debit lama = 20,000,000, Debit baru = 25,000,000
   - diff = (0 - 25,000,000) - (0 - 20,000,000) = -5,000,000
   → Semua saldo setelahnya berkurang 5 juta

3. Update baris itu sendiri:
   UPDATE cashflow_entries SET ... WHERE id = $1
   (saldo baris ini = saldo baris sebelumnya + kredit_baru - debit_baru)

4. Cascade update semua baris setelahnya:
   UPDATE cashflow_entries
   SET saldo = saldo + $diff
   WHERE sequence_no > oldEntry.sequence_no

5. Hitung ulang profit & margin jika SHIPMENT
```

---

## 3. Cascade Recalculation saat DELETE

```
Fungsi: DeleteEntry(id)

1. GET entry yang akan dihapus
   entry = GetByID(id)

2. Hitung dampak penghapusan:
   diff = -(entry.Kredit - entry.Debit)
   
   Contoh:
   - Entry yang dihapus: Kredit=0, Debit=20,000,000
   - diff = -(0 - 20,000,000) = +20,000,000
   → Semua saldo setelahnya naik 20 juta (karena debit ini dihapus)

3. DELETE baris:
   DELETE FROM cashflow_entries WHERE id = $1

4. Cascade update semua baris setelahnya:
   UPDATE cashflow_entries
   SET saldo = saldo + $diff
   WHERE sequence_no > entry.sequence_no
```

---

## 4. Logika Import Excel — Pseudocode

```
Fungsi: ProcessExcelImport(file, userID)

1. Buka file Excel
2. Ambil sheet pertama
3. Baca semua baris mulai dari baris ke-7 (index 6)
4. Inisialisasi: previousSaldo = 0, isFirstRow = true

UNTUK setiap baris (mulai baris ke-7):
  
  a. Baca nilai:
     kredit     = Col A (KREDIT)
     debit      = Col B (DEBIT)
     tanggal    = Col D (DATE OF DEBIT)
     actInfo    = Col E (ACT INFORMATION)
     actExp     = Col F (ACT EXPLAINATION)
     vendor     = Col G (VENDOR)
     top        = Col H (T O P) → parse "14 HARI" → 14
     dueDate    = Col I (DUE DATE)
     grandCost  = Col J (GRAND COST)
     grandSell  = Col K (GRAND SELLING)
     remarks    = Col N (REMARKS) → parse "UNPAID"/"PAID"/"PENDING"

  b. Validasi: Jika kredit=0 DAN debit=0 DAN vendor="" → SKIP

  c. Deteksi modal baru:
  
     JIKA isFirstRow:
       JIKA kredit > 0:
         Buat TOP_UP(kredit, tanggal, userID)
         previousSaldo = kredit
       isFirstRow = false
     
     SELAIN ITU (bukan baris pertama):
       selisih = kredit - previousSaldo
       JIKA selisih > 0:
         Buat TOP_UP(selisih, tanggal, userID)
         previousSaldo = previousSaldo + selisih

  d. Proses DEBIT (Shipment):
     JIKA debit > 0:
       Buat SHIPMENT(
         debit, tanggal, actInfo, actExp, vendor,
         top, dueDate, grandCost, grandSell, remarks, userID
       )
       previousSaldo = previousSaldo - debit

SELESAI
```

---

## 5. Filter & Query API

Endpoint `GET /api/v1/cashflow` mendukung parameter query untuk filtering dan sorting dinamis.

### Query Parameters

| Parameter | Tipe | Default | Keterangan |
|-----------|------|---------|------------|
| `sort` | `ASC` \| `DESC` | `ASC` | Arah urutan berdasarkan `sequence_no` |
| `date_from` | `YYYY-MM-DD` | *(kosong)* | Batas awal tanggal transaksi |
| `date_to` | `YYYY-MM-DD` | *(kosong)* | Batas akhir tanggal transaksi |
| `entry_type` | `SHIPMENT` \| `TOP_UP` | *(semua)* | Filter berdasarkan tipe transaksi |
| `remarks` | `PAID` \| `UNPAID` \| `PENDING` | *(semua)* | Filter berdasarkan status pembayaran |
| `vendor_name` | string | *(kosong)* | Pencarian ILIKE pada nama vendor |
| `page` | integer | `1` | Halaman data (pagination) |
| `limit` | integer | `50` | Jumlah data per halaman |

### Contoh Request

```
# Tampilkan shipment UNPAID bulan Maret 2026, terbaru dulu
GET /api/v1/cashflow?entry_type=SHIPMENT&remarks=UNPAID&date_from=2026-03-01&date_to=2026-03-31&sort=DESC

# Cari semua transaksi vendor "CV AIRA"
GET /api/v1/cashflow?vendor_name=CV+AIRA&sort=ASC
```

### Pseudocode Filter di Repository

```
Fungsi: ListAll(filter)

1. Bangun klausa WHERE secara dinamis:
   kondisi = []

   JIKA filter.DateFrom ada:
     kondisi += "date_of_entry >= $N"

   JIKA filter.DateTo ada:
     kondisi += "date_of_entry <= $N"

   JIKA filter.EntryType ada:
     kondisi += "entry_type = $N"

   JIKA filter.Remarks ada:
     kondisi += "remarks = $N"

   JIKA filter.VendorName ada:
     kondisi += "vendor_name_raw ILIKE '%$N%'"

2. Eksekusi query:
   SELECT * FROM cashflow_entries
   WHERE [kondisi]
   ORDER BY sequence_no [ASC|DESC]
   LIMIT $limit OFFSET $offset

3. COUNT(*) terpisah untuk total pagination
```

> ⚠️ **Catatan:** Filter berlaku juga pada endpoint `GET /api/v1/cashflow/export` — file Excel yang didownload akan mengikuti filter yang aktif.

---

## 6. Audit History (Backup Otomatis)

Setiap kali transaksi **diedit** atau **dihapus**, sistem secara otomatis menyimpan snapshot data lama ke tabel `cashflow_entries_history` sebelum perubahan dilakukan.

### Tujuan

- **Audit trail** — siapa mengubah apa dan kapan
- **Recovery** — bisa restore ke nilai sebelumnya jika terjadi kesalahan input
- **Compliance** — jejak perubahan data keuangan

### Alur Pengarsipan

```
Fungsi: UpdateEntry(id, newEntry, userID)

1. GET entry lama dari DB              ← oldEntry
2. ArchiveEntry(oldEntry, userID, "manual_edit")
   → INSERT INTO cashflow_entries_history (semua kolom + metadata)
3. Hitung diff & update entry
4. CASCADE UpdateBalancesAfter

---

Fungsi: DeleteEntry(id, userID)

1. GET entry yang akan dihapus        ← entry
2. ArchiveEntry(entry, userID, "manual_delete")
   → INSERT INTO cashflow_entries_history (semua kolom + metadata)
3. DELETE FROM cashflow_entries
4. CASCADE UpdateBalancesAfter
```

### Skema Tabel `cashflow_entries_history`

```sql
CREATE TABLE cashflow_entries_history (
  history_id          SERIAL PRIMARY KEY,
  entry_id            INT NOT NULL,         -- ID asli dari cashflow_entries
  sequence_no         INT,
  entry_type          entry_type,
  kredit              DECIMAL(15,2),
  debit               DECIMAL(15,2),
  saldo               DECIMAL(15,2),
  date_of_entry       DATE,
  act_information     VARCHAR,
  act_explaination    VARCHAR,
  vendor_id           INT,
  vendor_name_raw     VARCHAR,
  top_days            INT,
  due_date            DATE,
  grand_cost          DECIMAL(15,2),
  grand_selling       DECIMAL(15,2),
  profit              DECIMAL(15,2),
  margin_pct          DECIMAL(5,4),
  remarks             payment_status,
  created_by          UUID,
  updated_by          UUID,
  original_created_at TIMESTAMP,
  original_updated_at TIMESTAMP,
  -- Metadata arsip
  archived_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_by         UUID REFERENCES users(id),  -- user yang melakukan perubahan
  archive_reason      VARCHAR   -- 'manual_edit' | 'manual_delete' | 'import_upsert'
);
```

### Nilai `archive_reason`

| Nilai | Kapan Digunakan |
|-------|----------------|
| `manual_edit` | User melakukan edit transaksi via UI |
| `manual_delete` | User menghapus transaksi via UI |
| `import_upsert` | Import Excel menimpa data yang sudah ada |

> 💡 **Catatan:** Tabel history hanya untuk read/audit. Tidak ada endpoint API untuk restore otomatis — restore dilakukan secara manual oleh admin jika diperlukan.

---

## 7. Contoh Trace Lengkap Import

**Input Excel (3 baris data):**

```
Baris 7: kredit=100_000_000  debit=20_104_875  vendor="CV AIRA"  date=04/02
Baris 8: kredit= 79_895_125  debit= 7_500_000  vendor=""         date=22/02
Baris 9: kredit=122_395_125  debit=15_000_000  vendor="CV XYZ"   date=10/03
```

**Trace eksekusi:**

```
previousSaldo = 0, isFirstRow = true

=== BARIS 7 ===
isFirstRow = true
  kredit = 100_000_000 > 0
  → Buat TOP_UP(100_000_000)     [DB saldo: 100_000_000]
  previousSaldo = 100_000_000
  isFirstRow = false

debit = 20_104_875 > 0
  → Buat SHIPMENT(20_104_875)    [DB saldo: 79_895_125]
  previousSaldo = 100_000_000 - 20_104_875 = 79_895_125

=== BARIS 8 ===
isFirstRow = false
  selisih = 79_895_125 - 79_895_125 = 0
  → Tidak ada modal baru, SKIP top-up

debit = 7_500_000 > 0
  → Buat SHIPMENT(7_500_000)     [DB saldo: 72_395_125]
  previousSaldo = 79_895_125 - 7_500_000 = 72_395_125

=== BARIS 9 ===
isFirstRow = false
  selisih = 122_395_125 - 72_395_125 = 50_000_000
  → Ada modal baru!
  → Buat TOP_UP(50_000_000)      [DB saldo: 122_395_125]
  previousSaldo = 72_395_125 + 50_000_000 = 122_395_125

debit = 15_000_000 > 0
  → Buat SHIPMENT(15_000_000)    [DB saldo: 107_395_125]
  previousSaldo = 122_395_125 - 15_000_000 = 107_395_125

=== SELESAI ===
Total entri dibuat: 5
  - TOP_UP   × 2  (modal awal + penambahan modal)
  - SHIPMENT × 3
```

---

## 8. Edge Cases

| Kasus | Penanganan |
|-------|-----------|
| Baris dengan kredit=0 dan debit=0 | SKIP (baris placeholder Excel) |
| Baris kosong total (semua null) | SKIP |
| kredit < saldo sebelumnya | Tidak buat TOP_UP (saldo berkurang normal karena debit sebelumnya) |
| debit > saldo saat ini | Tetap diproses, saldo bisa negatif |
| Tanggal tidak valid / kosong | Gunakan tanggal hari ini sebagai fallback |
| Vendor kosong | Entri shipment tetap dibuat tanpa vendor_id |
| Nilai dengan format "Rp 1.500.000" | Strip "Rp", ".", "," sebelum parse float |
| T.O.P dengan format "14 HARI" | Strip " HARI", parse integer |
| REMARKS tidak dikenali | Default ke PENDING |
