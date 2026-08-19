# Contoh Data Nyata: Skenario Bisnis Lengkap

Dokumen ini berisi contoh data nyata yang merepresentasikan alur bisnis Cashflow Shipment Control selama 2 bulan operasional (Februari–Maret 2026).

---

## Skenario

Sebuah perusahaan freight forwarding memulai operasi dengan modal awal **Rp 100 juta**. Selama 2 bulan, mereka menangani beberapa pengiriman menggunakan beberapa vendor transporter, dengan sistem pembayaran T.O.P (Terms of Payment) yang bervariasi.

---

## Data di Excel (`CASHFLOW SHIPMENT CONTROL.xlsx`)

> Baris 1–5: Header/Judul dokumen  
> Baris 6: Header kolom  
> Baris 7+: Data transaksi

| KREDIT | DEBIT | SALDO | DATE | ACT INFORMATION | ACT EXPLAINATION | VENDOR | T O P | DUE DATE | GRAND COST | GRAND SELLING | PROFIT | MARGIN % | REMARKS |
|--------|-------|-------|------|-----------------|-----------------|--------|-------|----------|------------|---------------|--------|----------|---------|
| 100,000,000 | 20,104,875 | 79,895,125 | 04/02/2026 | Tronton Tracking Cost | DPK-MDN, DELIVERY | CV AIRA | 14 HARI | 18/02/2026 | 28,150,000 | 30,000,000 | 1,850,000 | 6.17% | UNPAID |
| 79,895,125 | 7,500,000 | 72,395,125 | 22/02/2026 | Tronton Bak | CIBINONG-SBY, Delivery | PT MAJU | 3 HARI | 25/02/2026 | 7,500,000 | 8,500,000 | 1,000,000 | 11.76% | PAID |
| 122,395,125 | 18,000,000 | 104,395,125 | 10/03/2026 | Container 20ft | SBY-MDN, Export | CV LANCAR | 30 HARI | 09/04/2026 | 17,500,000 | 20,000,000 | 2,500,000 | 12.50% | UNPAID |
| 104,395,125 | 12,750,000 | 91,645,125 | 15/03/2026 | Tronton CDD | JKT-SMG, Delivery | CV AIRA | 14 HARI | 29/03/2026 | 12,000,000 | 13,500,000 | 1,500,000 | 11.11% | PENDING |
| 91,645,125 | 9,250,000 | 82,395,125 | 28/03/2026 | Pickup L300 | BDG-JKT, Express | PT CEPAT | 7 HARI | 04/04/2026 | 8,500,000 | 9,500,000 | 1,000,000 | 10.53% | UNPAID |

> **Catatan baris ke-3:** KREDIT = 122,395,125 sedangkan SALDO sebelumnya = 72,395,125  
> → Selisih = **50,000,000** → Ada **penambahan modal Rp 50 juta** di tanggal 10/03/2026

---

## Hasil Parsing Import ke Database

Dari 5 baris Excel di atas, sistem akan menghasilkan **7 entri** di database:

| Seq | Tanggal | Tipe | Kredit | Debit | Saldo | Vendor | Act Info | T.O.P | Due Date | Grand Cost | Grand Selling | Profit | Margin | Remarks |
|-----|---------|------|--------|-------|-------|--------|----------|-------|----------|-----------|--------------|--------|--------|---------|
| 1 | 04/02/2026 | TOP_UP | 100,000,000 | 0 | 100,000,000 | - | - | - | - | - | - | - | - | PAID |
| 2 | 04/02/2026 | SHIPMENT | 0 | 20,104,875 | 79,895,125 | CV AIRA | Tronton Tracking Cost | 14 | 18/02/2026 | 28,150,000 | 30,000,000 | 1,850,000 | 6.17% | UNPAID |
| 3 | 22/02/2026 | SHIPMENT | 0 | 7,500,000 | 72,395,125 | PT MAJU | Tronton Bak | 3 | 25/02/2026 | 7,500,000 | 8,500,000 | 1,000,000 | 11.76% | PAID |
| 4 | 10/03/2026 | TOP_UP | 50,000,000 | 0 | 122,395,125 | - | Penambahan modal Maret | - | - | - | - | - | - | PAID |
| 5 | 10/03/2026 | SHIPMENT | 0 | 18,000,000 | 104,395,125 | CV LANCAR | Container 20ft | 30 | 09/04/2026 | 17,500,000 | 20,000,000 | 2,500,000 | 12.50% | UNPAID |
| 6 | 15/03/2026 | SHIPMENT | 0 | 12,750,000 | 91,645,125 | CV AIRA | Tronton CDD | 14 | 29/03/2026 | 12,000,000 | 13,500,000 | 1,500,000 | 11.11% | PENDING |
| 7 | 28/03/2026 | SHIPMENT | 0 | 9,250,000 | 82,395,125 | PT CEPAT | Pickup L300 | 7 | 04/04/2026 | 8,500,000 | 9,500,000 | 1,000,000 | 10.53% | UNPAID |

---

## Summary Dashboard dari Data di Atas

```
Rolling Saldo Saat Ini : Rp  82,395,125
Total Modal Masuk      : Rp 150,000,000  (100jt + 50jt)
Total Biaya Keluar     : Rp  67,604,875  (semua debit)

Total Grand Selling    : Rp  81,500,000
Total Grand Cost       : Rp  73,650,000
Total Profit           : Rp   7,850,000
Rata-rata Margin       :         9.69%

Tagihan UNPAID         : 3 transaksi → Total Rp 47,354,875
Tagihan PENDING        : 1 transaksi → Total Rp 12,750,000
Tagihan PAID           : 1 transaksi → Total Rp  7,500,000
```

---

## Skenario: Edit Transaksi & Cascade Recalculation

**Situasi:** Ternyata biaya shipment ke CV AIRA (Seq #2) salah input. Seharusnya Debit = **22,000,000** (bukan 20,104,875).

**Sebelum edit:**
| Seq | Debit | Saldo |
|-----|-------|-------|
| 1 | 0 | 100,000,000 |
| **2** | **20,104,875** | **79,895,125** |
| 3 | 7,500,000 | 72,395,125 |
| 4 | 0 | 122,395,125 |
| ... | ... | ... |

**Proses:**
```
diff = (0 - 22,000,000) - (0 - 20,104,875) = -1,895,125
→ Semua saldo mulai seq #3 ke bawah dikurangi 1,895,125
```

**Setelah edit:**
| Seq | Debit | Saldo | Perubahan |
|-----|-------|-------|-----------|
| 1 | 0 | 100,000,000 | - |
| **2** | **22,000,000** | **78,000,000** | ✏️ Diubah |
| 3 | 7,500,000 | 70,500,000 | 🔄 Recalculated |
| 4 | 0 | 120,500,000 | 🔄 Recalculated |
| 5 | 18,000,000 | 102,500,000 | 🔄 Recalculated |
| 6 | 12,750,000 | 89,750,000 | 🔄 Recalculated |
| 7 | 9,250,000 | 80,500,000 | 🔄 Recalculated |

---

## Skenario: Update Payment Status

**Situasi:** Tagihan ke CV LANCAR (Seq #5, UNPAID) sudah dibayar. User klik tombol "Mark as PAID" di dashboard.

```
PATCH /api/v1/cashflow/5/status
Body: { "remarks": "PAID" }

→ Hanya kolom remarks yang berubah
→ Rolling saldo TIDAK berubah
→ Nilai Debit/Kredit TIDAK berubah
```

**Alur bisnis:** Perubahan status hanya sebagai **pencatatan administrasi** bahwa tagihan sudah dilunasi ke vendor. Tidak berdampak pada posisi kas karena pembayaran ke vendor sering dilakukan di luar sistem (transfer bank langsung).

---

## Referensi Format Kolom Excel

| Kolom | Tipe Data | Contoh | Catatan |
|-------|-----------|--------|---------|
| KREDIT | Angka | 100,000,000 | Bisa berisi carry-over + modal baru |
| DEBIT | Angka | 20,104,875 | Biaya riil yang keluar dari kas |
| SALDO | Angka/Formula | =A7-B7 | Dihitung di Excel, diabaikan saat import |
| DATE OF DEBIT | Tanggal | 04/02/2026 | Format DD/MM/YYYY atau otomatis Excel |
| ACT INFORMATION | Teks | Tronton Tracking Cost | Jenis/nama layanan |
| ACT EXPLAINATION | Teks | DPK-MDN, DELIVERY | Rute atau keterangan tambahan |
| VENDOR | Teks | CV AIRA | Nama vendor/transporter |
| T O P | Teks | 14 HARI | Terms of Payment dalam hari |
| DUE DATE | Tanggal | 18/02/2026 | Jatuh tempo pembayaran ke vendor |
| GRAND COST | Angka | 28,150,000 | HPP / total biaya ke vendor |
| GRAND SELLING | Angka | 30,000,000 | Harga tagih ke klien |
| PROFIT | Angka/Formula | =K7-J7 | Dihitung otomatis oleh sistem |
| MARGIN IN % | Angka/Formula | =L7/K7 | Dihitung otomatis oleh sistem |
| REMARKS | Teks | UNPAID | Status: PAID / UNPAID / PENDING |
