# Docs: Proses Bisnis Cashflow Shipment

Folder ini berisi dokumentasi lengkap proses bisnis, logika kalkulasi, dan contoh data untuk aplikasi **Cashflow Shipment Control**.

## Daftar Dokumen

| File | Isi |
|------|-----|
| [01-proses-bisnis-cashflow.md](./01-proses-bisnis-cashflow.md) | Konsep dasar, tipe transaksi, alur import Excel, dan status pembayaran |
| [02-logika-teknis-kalkulasi.md](./02-logika-teknis-kalkulasi.md) | Pseudocode rolling saldo, cascade recalculation, dan logika import Excel |
| [03-contoh-data-skenario.md](./03-contoh-data-skenario.md) | Contoh data nyata 2 bulan operasional, trace import, skenario edit & update status |

## Ringkasan Konsep Kunci

### Rolling Saldo
```
Saldo[n] = Saldo[n-1] + Kredit[n] - Debit[n]
```

### Deteksi Modal Baru saat Import Excel
```
selisih = KREDIT[baris_ini] - SALDO[baris_sebelumnya]
Jika selisih > 0 → Ada top-up sebesar selisih
Jika selisih ≤ 0 → Carry-over biasa, tidak buat top-up
```

### Profit & Margin
```
Profit    = Grand Selling - Grand Cost
Margin %  = Profit / Grand Selling × 100
```
