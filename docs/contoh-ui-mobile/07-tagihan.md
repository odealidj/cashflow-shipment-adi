# 07 — Tagihan (Bills & Invoice Management)

> Referensi: `contoh-ui/3.Tagihan/Tagihan.png`
> **1 halaman** (screenshot tunggal mencakup keseluruhan konten)

---

## 7.1 Urutan Konten (Top → Bottom)

```
┌─────────────────────────────────────────────┐
│                                             │
│  Tagihan                                    │  ← Page title (bold, kiri)
│  Kelola tagihan yang belum dibayar          │  ← Subtitle (abu)
│                                             │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │ 🕐 Belum Dibayar│  │ ⚠️ Jatuh Tempo   │  │  ← Summary 2 kolom
│  │       1        │  │        1         │  │
│  └────────────────┘  └──────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ ⚠️ 1 tagihan perlu perhatian         │   │  ← Alert banner
│  │   Jatuh Tempo (1)                   │   │
│  │   Bayar Notaris                     │   │
│  │   Rp 1.500.000    Terlambat 10 hari │   │
│  │                           [Lunas]   │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [Semua●]  [Belum Bayar○]  [Jatuh Tempo○]  │  ← Tab filter 3 pilihan
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  PT. Adijayantara Logis...           │   │  ← Tagihan card (overdue)
│  │  [LEWAT 11 HARI]                    │   │
│  │  Bayar Notaris                       │   │
│  │  Rp 10.000.000            [✓ Bayar]│   │
│  │  ⚠️ Jatuh tempo: 11 Agu 2026        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ... (card lanjutan jika ada)               │
│                                             │
│         [  +  ] ← FAB tetap tampil          │
│  [🏠][📊][  ●  ][🔔●][⚙️] ← Bottom nav     │
└─────────────────────────────────────────────┘
```

---

## 7.2 Komponen Detail

### Page Header
```
Tagihan
Kelola tagihan yang belum dibayar
```
- **Judul**: Bold, 24sp, hitam, rata kiri
- **Subtitle**: Regular, 14sp, abu (`neutral-500`)
- Tidak ada AppBar sticky — judul ada di body

### Summary Row (2 Kolom)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ 🕐 Belum Dibayar        │  │ ⚠️ Jatuh Tempo           │
│                         │  │                         │
│           1             │  │           1             │
└─────────────────────────┘  └─────────────────────────┘
```

| Kolom | Border Kiri | Ikon | Warna Count |
|---|---|---|---|
| Belum Dibayar | `#2563EB` biru, 4px | 🕐 Clock abu | Hitam/biru |
| Jatuh Tempo | `#EF4444` merah, 4px | ⚠️ Warning abu | Merah |

- Background card putih
- Count: angka besar (28–32sp), bold

### Alert Banner

> Ditampilkan hanya jika ada tagihan yang perlu perhatian (jatuh tempo atau overdue)

```
┌──────────────────────────────────────────────┐
│  ⚠️  1 tagihan perlu perhatian               │  ← teks merah/oranye
│                                              │
│  Jatuh Tempo (1)                             │  ← sub-header
│  Bayar Notaris                   [Lunas]     │  ← nama + tombol quick action
│  Rp 1.500.000   Terlambat 10 hari            │  ← nilai + status terlambat
└──────────────────────────────────────────────┘
```

| Elemen | Detail |
|---|---|
| **Background** | Merah muda (`#FEF2F2`) |
| **Ikon + Header** | "⚠️ X tagihan perlu perhatian" — teks `#EF4444` |
| **Sub-header** | "Jatuh Tempo (X)" — label kategori |
| **Item** | Nama aktivitas + tombol "Lunas" (hijau pill) |
| **Info** | Nominal + "Terlambat X hari" (teks merah/oranye) |

### Tab Filter

```
[Semua●]    [Belum Bayar○]    [Jatuh Tempo○]
```

- 3 tab, full-width, pill/rounded
- **Semua**: Default aktif
- Style sama dengan filter chip di halaman Laporan
- Single select

### Tagihan Card (Overdue)

```
┌──────────────────────────────────────────────────┐
│  Nama Vendor...                  [LEWAT X HARI]  │
│  Nama Aktivitas                                  │
│  Rp XX.XXX.XXX                       [✓ Bayar]  │
│  ⚠️ Jatuh tempo: DD Mon YYYY                     │
└──────────────────────────────────────────────────┘
```

| Elemen | Detail |
|---|---|
| **Background** | `#FEF2F2` merah sangat muda |
| **Border** | Tidak ada left border (berbeda dari card di Laporan) |
| **Badge LEWAT X HARI** | Background `#EF4444`, teks putih, pill |
| **Nama Vendor** | Bold, hitam, bisa terpotong "..." |
| **Nama Aktivitas** | Regular, abu |
| **Nominal** | Bold, hitam, besar |
| **Tombol Bayar** | `[✓ Bayar]` — pill hijau (`#22C55E`), teks putih, di kanan |
| **Info Jatuh Tempo** | "⚠️ Jatuh tempo: DD Mon YYYY" — teks oranye (`#F59E0B`) |

### Tombol Bayar — Quick Action

Tap tombol **"✓ Bayar"** pada card → mengubah `payment_status` dari `UNPAID`/`PARTIAL` menjadi `PAID`.

**Flow:**
```
Tap [✓ Bayar] → Konfirmasi dialog? (atau langsung) → PATCH /api/cashflow/:id
              → Update status → Card hilang dari list → Refresh count
```

---

## 7.3 State Kosong (Empty State)

Jika tidak ada tagihan:
- Tampilkan ilustrasi atau ikon + teks "Tidak ada tagihan yang perlu perhatian"
- Summary card tetap tampil dengan count = 0

---

## 7.4 Data yang Dibutuhkan dari API

| Komponen | Endpoint | Parameter |
|---|---|---|
| Count Summary | `GET /api/cashflow/summary` | `tagihan_belum_bayar`, `tagihan_jatuh_tempo` |
| Alert Banner | `GET /api/cashflow?payment_status=overdue&limit=3` | — |
| List Tagihan | `GET /api/cashflow?payment_status=unpaid,partial` | `status` filter |
| Filter Jatuh Tempo | `GET /api/cashflow?payment_status=overdue` | — |
| Quick Pay | `PATCH /api/cashflow/:id` | `{ payment_status: "PAID" }` |

---

*Lanjut: [08-pengaturan.md](./08-pengaturan.md)*
