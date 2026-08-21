# 06 — Tambah Transaksi (Form FAB)

> Referensi: `contoh-ui/5.Tambah-Transaksi/Tambah-Transaksi1.png` s/d `Tambah-Transaksi-4.png`
> **1 halaman scrollable dengan 4 seksi** (4 screenshot = 4 potongan viewport dari satu form panjang)
> Diakses via tombol **FAB [+]** di tengah bottom navigation bar.

---

## 6.1 AppBar

```
← Tambah Transaksi                              ✓
```

| Elemen | Detail |
|---|---|
| **Background** | `#1C2B4A` biru gelap (sama dengan Splash & PIN) |
| **Teks judul** | "Tambah Transaksi" — putih, bold, centered |
| **Tombol Kiri** | ← (back arrow) — putih — kembali tanpa simpan |
| **Tombol Kanan** | ✓ (checkmark) — putih — shortcut simpan transaksi |
| **Bottom Nav** | **Disembunyikan** (push screen, bukan tab) |

---

## 6.2 Sticky Submit Button

```
┌──────────────────────────────────────────────┐
│          ✓  Simpan Transaksi                 │
└──────────────────────────────────────────────┘
```

- **Posisi**: Floating di atas konten, sticky di bagian bawah (di atas keyboard)
- **Style**: Pill biru solid (`primary`), teks putih bold
- **Selalu visible** saat scroll — user tidak perlu scroll ke bawah untuk submit

---

## 6.3 Struktur Form (4 Seksi Berurutan)

```
┌──────────────────────────────────────────────┐  VIEWPORT 1
│                                              │  (Tambah-Transaksi1.png)
│  📋 Informasi Dasar                          │  ← Section Header
│  ┌──────────────────────────────────────┐   │
│  │ Tanggal Debit                        │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 📅  2026-08-22                   │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Kredit Awal                          │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 💳  Rp 1.000.000                 │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Debit Keluar                         │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 💸  Rp 0                         │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Saldo Akhir (otomatis)               │   │
│  │ ┌──────────────────────────────────┐ │   │  ← bg biru muda
│  │ │     Rp 1.000.000                 │ │   │
│  │ └──────────────────────────────────┘ │   │
│  └──────────────────────────────────────┘   │
├──────────────────────────────────────────────┤  VIEWPORT 2
│                                              │  (Tambah-Transaksi2.png)
│  🚚 Aktivitas                                │  ← Section Header
│  ┌──────────────────────────────────────┐   │
│  │ Informasi Aktivitas                  │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 📄  Deskripsi aktivitas          │ │   │  ← single line
│  │ └──────────────────────────────────┘ │   │
│  │ Detail Aktivitas                     │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ Keterangan tambahan              │ │   │  ← textarea (multi-line)
│  │ │ ≡                                │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Vendor                               │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 🏢  Pilih Vendor              ⇅  │ │   │  ← dropdown
│  │ └──────────────────────────────────┘ │   │
│  │ Kategori                             │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 🏷️  Pilih Kategori            ⇅  │ │   │  ← dropdown
│  │ └──────────────────────────────────┘ │   │
│  └──────────────────────────────────────┘   │
├──────────────────────────────────────────────┤  VIEWPORT 3
│                                              │  (Tambah-Transaksi-3.png)
│  $ Keuangan                                  │  ← Section Header
│  ┌──────────────────────────────────────┐   │
│  │ Grand Cost                           │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 📉  Rp 0                         │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Grand Selling                        │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 📈  Rp 0                         │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ % Profit (otomatis)                  │   │
│  │ ┌──────────────────────────────────┐ │   │  ← bg hijau muda
│  │ │ 📈  Rp 0                         │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ % Margin (otomatis)                  │   │
│  │ ┌──────────────────────────────────┐ │   │  ← bg biru muda
│  │ │    0.0%                          │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ T.O.P (Nilai)       Satuan           │   │
│  │ ┌───────────────┐  ┌──────────────┐ │   │
│  │ │ 🕐  0         │  │ HARI       ▼ │ │   │
│  │ └───────────────┘  └──────────────┘ │   │
│  │ Due Date (auto dari T.O.P)          │   │
│  │ ┌──────────────────────────────────┐ │   │  ← bg oranye muda
│  │ │ 📅  -                        ✏️  │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Status Pembayaran                    │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 🕐  Belum Lunas (UNPAID)      ▼  │ │   │
│  │ └──────────────────────────────────┘ │   │
│  └──────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐│
│  │        ✓  Simpan Transaksi             ││  ← Sticky button (floating)
│  └─────────────────────────────────────────┘│
├──────────────────────────────────────────────┤  VIEWPORT 4
│                                              │  (Tambah-Transaksi-4.png)
│  📋 Detail Tambahan                          │  ← Section Header
│  ┌──────────────────────────────────────┐   │
│  │ Nomor Invoice                        │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 🧾  Nomor faktur (opsional)       │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Nomor Kendaraan                      │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 🚌  Plat polisi (opsional)        │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Rute Asal-Tujuan                     │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ ⑂   Mis. DPK-MDN (opsional)     │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Nomor PO                             │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 📋  Purchase Order (opsional)     │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ PIC                                  │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 👤  Person in charge (opsional)   │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Tanggal Pembayaran                   │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │ 💳  Belum ada (opsional)      📅 │ │   │
│  │ └──────────────────────────────────┘ │   │
│  │ Metode Pembayaran                    │   │
│  │ ┌──────────────────────────────────┐ │   │
│  │ │     Pilih metode (opsional)    ▼  │ │   │
│  │ └──────────────────────────────────┘ │   │
│  └──────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐│
│  │        ✓  Simpan Transaksi             ││  ← Sticky button
│  └─────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## 6.4 Tabel Field Lengkap

### Seksi 1: 📋 Informasi Dasar

| Field | Tipe Input | Required | Default | Keterangan |
|---|---|---|---|---|
| Tanggal Debit | Date Picker | ✅ Ya | Hari ini | Ikon kalender biru |
| Kredit Awal | Currency | ✅ Ya | — | Ikon dompet/kartu biru |
| Debit Keluar | Currency | ✅ Ya | Rp 0 | Ikon debit biru |
| Saldo Akhir | Read-only (auto) | — | Auto | = Kredit - Debit; bg biru muda |

### Seksi 2: 🚚 Aktivitas

| Field | Tipe Input | Required | Keterangan |
|---|---|---|---|
| Informasi Aktivitas | Text (single line) | ✅ Ya | "Deskripsi aktivitas", ikon dokumen |
| Detail Aktivitas | Textarea (multi-line) | ❌ Tidak | "Keterangan tambahan", ikon menu |
| Vendor | Dropdown/Picker | ✅ Ya | "Pilih Vendor", dari master data |
| Kategori | Dropdown/Picker | ✅ Ya | "Pilih Kategori", dari master data |

### Seksi 3: 💵 Keuangan

| Field | Tipe Input | Required | Default | Keterangan |
|---|---|---|---|---|
| Grand Cost | Currency | ✅ Ya | Rp 0 | Ikon tren turun (merah/biru) |
| Grand Selling | Currency | ✅ Ya | Rp 0 | Ikon tren naik (biru) |
| Profit | Read-only (auto) | — | Rp 0 | = Grand Selling - Grand Cost; bg **hijau muda** |
| Margin % | Read-only (auto) | — | 0.0% | = (Profit / Grand Cost) × 100; bg **biru muda** |
| T.O.P Nilai | Number | ❌ Tidak | 0 | Terms of Payment angka |
| T.O.P Satuan | Dropdown | ❌ Tidak | HARI | HARI / MINGGU / BULAN |
| Due Date | Date (auto + editable) | — | Auto | = Tgl Debit + TOP; bg **oranye muda**; tap untuk override |
| Status Pembayaran | Dropdown | ✅ Ya | Belum Lunas | PAID / UNPAID / PARTIAL |

### Seksi 4: 📊 Detail Tambahan (Semua Opsional)

| Field | Tipe Input | Placeholder | Ikon |
|---|---|---|---|
| Nomor Invoice | Text | "Nomor faktur (opsional)" | 🧾 Dokumen |
| Nomor Kendaraan | Text | "Plat polisi (opsional)" | 🚌 Bus |
| Rute Asal-Tujuan | Text | "Mis. DPK-MDN (opsional)" | ⑂ Fork/Route |
| Nomor PO | Text | "Purchase Order (opsional)" | 📋 Clipboard |
| PIC | Text | "Person in charge (opsional)" | 👤 User |
| Tanggal Pembayaran | Date Picker | "Belum ada (opsional)" | 💳 + 📅 |
| Metode Pembayaran | Dropdown | "Pilih metode (opsional)" | — |

---

## 6.5 Auto-Calculate Logic

| Field | Formula | Trigger |
|---|---|---|
| **Saldo Akhir** | `Kredit Awal − Debit Keluar` | Saat Kredit atau Debit berubah |
| **Profit** | `Grand Selling − Grand Cost` | Saat Grand Selling atau Cost berubah |
| **Margin %** | `(Profit / Grand Cost) × 100` | Saat Profit atau Grand Cost berubah |
| **Due Date** | `Tanggal Debit + T.O.P (dalam satuan)` | Saat T.O.P Nilai atau Satuan berubah |

### Visual Feedback untuk Field Auto
| Field | Background Color | Token Warna |
|---|---|---|
| Saldo Akhir | Biru muda | `info-bg` (`#EFF6FF`) |
| Profit | Hijau muda | `success-bg` (`#F0FDF4`) |
| Margin % | Biru muda | `info-bg` (`#EFF6FF`) |
| Due Date | Oranye muda | `warning-bg` (`#FFF7ED`) |

---

## 6.6 Field-to-API Mapping

| Field UI | Field Backend / DB Column | Tipe |
|---|---|---|
| Tanggal Debit | `tanggal_debit` | `DATE` |
| Kredit Awal | `kredit_awal` | `NUMERIC` |
| Debit Keluar | `debit_keluar` | `NUMERIC` |
| Saldo Akhir | `saldo_akhir` | `NUMERIC` (calculated, dikirim) |
| Informasi Aktivitas | `aktivitas` | `VARCHAR` |
| Detail Aktivitas | `keterangan` | `TEXT` |
| Vendor | `vendor_id` → `nama_vendor` | `FK / VARCHAR` |
| Kategori | `kategori` | `VARCHAR` |
| Grand Cost | `grand_cost` | `NUMERIC` |
| Grand Selling | `grand_selling` | `NUMERIC` |
| Profit | `profit` | `NUMERIC` (calculated, dikirim) |
| Margin % | `margin_persen` | `NUMERIC` (calculated, dikirim) |
| T.O.P Nilai | `top_nilai` | `INTEGER` |
| T.O.P Satuan | `top_satuan` | `ENUM(HARI, MINGGU, BULAN)` |
| Due Date | `due_date` | `DATE` |
| Status Pembayaran | `payment_status` | `ENUM(PAID, UNPAID, PARTIAL)` |
| Nomor Invoice | `nomor_invoice` | `VARCHAR` nullable |
| Nomor Kendaraan | `nomor_kendaraan` | `VARCHAR` nullable |
| Rute Asal-Tujuan | `rute` | `VARCHAR` nullable |
| Nomor PO | `nomor_po` | `VARCHAR` nullable |
| PIC | `pic` | `VARCHAR` nullable |
| Tanggal Pembayaran | `tanggal_pembayaran` | `DATE` nullable |
| Metode Pembayaran | `metode_pembayaran` | `VARCHAR` nullable |

---

*Lanjut: [07-tagihan.md](./07-tagihan.md)*
