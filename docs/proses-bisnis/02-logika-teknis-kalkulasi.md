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

## 5. Contoh Trace Lengkap Import

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

## 6. Edge Cases

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
