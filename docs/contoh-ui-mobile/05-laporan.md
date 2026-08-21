# 05 — Laporan (Transaction Report)

> Referensi: `contoh-ui/2.Laporan/Laporan1.png` dan `Laporan2.png`
> **1 halaman yang dapat di-scroll secara vertikal** (2 screenshot = 2 potongan viewport dari halaman yang sama)

---

## 5.1 Urutan Konten (Top → Bottom)

```
┌─────────────────────────────────────────────┐  ← VIEWPORT 1 (Laporan1.png)
│              Laporan Transaksi              │  ← Page title (centered, bold)
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 🔍  Cari vendor atau aktivitas...    │   │  ← Search bar (rounded full)
│  └──────────────────────────────────────┘   │
│                                             │
│  [Semua●] [Belum Lunas○] [Lunas○] [Sebc→]  │  ← Filter chips (horizontal scroll)
│                                             │
│  [📅 Rentang Tanggal]  [🏪 Vendor]          │  ← Advanced filter row
│                                             │
│  Menampilkan 5 transaksi     ↕ Urutkan      │  ← Result count + sort
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │ 📊 Performa Vendor                   │   │
│  │  ┌──────────────┐ ┌──────────────┐   │   │
│  │  │🏆 Vendor     │ │⚠️ Perlu       │   │   │
│  │  │   Terbaik    │ │  Perhatian   │   │   │
│  │  │PT.Adijay...  │ │PT.Armada...  │   │   │
│  │  │Rp 6.500.000  │ │-Rp 1.000.000│   │   │
│  │  └──────────────┘ └──────────────┘   │   │
│  │  PT.Adijayan... ████████████  6.5jt  │   │
│  │  PT.Logistik .. ██████████    6.0jt  │   │
│  │  PT.Armada  ... █████         4.0jt  │   │
│  │  CV.Mitra Pe... █             1.0jt  │   │
│  │  PT.Armada  ... ▌            -1.0jt  │   │  ← bar merah = rugi
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─ Transaction Card (pertama) ──────────┐  │
│  │ ║ CV. Mitra Peng...  [Lunas]  Rp 4jt │  │
│  │ ║ Beli Solar                          │  │
│  │ ║ 📅 09 Agu 2026  Profit: Rp 1jt 50%│  │
│  └─────────────────────────────────────────┘  │
├─────────────────────────────────────────────┤  ← VIEWPORT 2 (Laporan2.png)
│  ┌─ Transaction Card (lanjutan list) ────┐  │
│  │ ║ CV. Mitra Peng...  [Lunas]  Rp 4jt │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ PT. Armada...   [Sebagian]    Rp 15jt  │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ PT. Adijay...   [Belum Lunas] Rp 3.5jt │  │
│  │ ⏰ Lewat 11 hari                        │  │
│  └─────────────────────────────────────────┘  │
│  ... (list berlanjut ke bawah)               │
└─────────────────────────────────────────────┘
```

---

## 5.2 Komponen Detail

### Page Title
- Teks: "Laporan Transaksi"
- Style: Bold, 24sp, hitam
- Alignment: **Centered** (tengah)
- Tidak menggunakan AppBar sticky — judul ada di dalam body halaman

### Search Bar
```
┌──────────────────────────────────────────────┐
│  🔍  Cari vendor atau aktivitas...           │
└──────────────────────────────────────────────┘
```
- Full width (dengan padding horizontal 16px)
- Border radius: penuh (rounded-full)
- Background: abu sangat muda atau putih dengan border
- Ikon search abu di kiri dalam field
- Placeholder: "Cari vendor atau aktivitas..."

### Status Filter Chips (Horizontal Scroll)
| Chip | State Aktif | State Tidak Aktif |
|---|---|---|
| **Semua** | Background biru solid, teks putih | — |
| **Belum Lunas** | Background biru solid, teks putih | Border abu, teks abu, bg putih |
| **Lunas** | Background biru solid, teks putih | Border abu, teks abu, bg putih |
| **Sebagian** | Background biru solid, teks putih | Border abu, teks abu, bg putih |

- Horizontal scroll (bisa geser ke kanan jika banyak)
- Hanya **1 chip aktif** pada satu waktu (single select)
- Border radius: pill (rounded-full)

### Advanced Filter Row
```
[📅 Rentang Tanggal]    [🏪 Vendor]
```
- Tombol outline kecil (tidak filled)
- Ikon + label teks
- Border abu, background putih
- Border radius: ~8px
- Tap → buka bottom sheet / date picker / dropdown

### Result Info + Sort
```
Menampilkan 5 transaksi              ↕ Urutkan
```
- Kiri: count hasil filter (abu)
- Kanan: tombol sort dengan ikon ↕ dan teks "Urutkan"

### Vendor Performance Card

Ditampilkan **secara kondisional** (mungkin hanya tampil saat ada cukup data atau filter "Semua"):

```
┌────────────────────────────────────────────────┐
│  📊 Performa Vendor                            │
│  ┌────────────────────┐  ┌───────────────────┐ │
│  │ 🏆 Vendor Terbaik  │  │ ⚠️ Perlu Perhatian│ │
│  │ PT. Adijayanta...  │  │ PT. Armadaya...   │ │
│  │ Rp 6.500.000       │  │ -Rp 1.000.000     │ │
│  │ (green bg)         │  │ (red bg)           │ │
│  └────────────────────┘  └───────────────────┘ │
│                                                │
│  PT.Adijayan... ████████████████  Rp 6.500.0  │
│  PT.Logistik .. ██████████████    Rp 6.000.0  │
│  PT.Armada  ... ████████          Rp 4.000.0  │
│  CV.Mitra Pe... ██                Rp 1.000.0  │
│  PT.Armada  ... █ (merah)        -Rp 1.000.0  │
└────────────────────────────────────────────────┘
```

- Header dengan ikon chart
- **2 kolom highlight**: Vendor Terbaik (background hijau muda) + Perlu Perhatian (background merah muda)
- **Horizontal bar chart** per vendor: panjang bar proporsional terhadap profit
- Bar hijau = profit positif, bar merah = profit negatif
- Nilai ditampilkan di kanan bar

### Transaction Card

```
┌──────────────────────────────────────────────────────┐
│ ║  Nama Vendor...              [Status Badge Pill]   │
│ ║  Deskripsi aktivitas                 Rp X.XXX.XXX │
│ ║  📅 DD Mon YYYY  Profit: Rp X  [XX.X%]  [L/B]    │
│ ║  ⏰ Lewat X hari   ← hanya jika overdue            │
└──────────────────────────────────────────────────────┘
```

| Elemen | Detail |
|---|---|
| **Left border** | 4px merah jika overdue, tidak ada jika normal |
| **Nama Vendor** | Terpotong dengan "..." jika terlalu panjang |
| **Status Badge** | Pill berwarna (lihat tabel di bawah) |
| **Nominal** | Bold, rata kanan, warna merah (nilai debit/biaya) |
| **Profit** | Hijau jika positif, merah jika negatif |
| **Margin %** | Badge abu muda, kecil |
| **Status Bayar** | "Lunas" / "Belum" teks kecil abu |
| **Overdue label** | "⏰ Lewat X hari" — teks oranye |

**Status Badge Detail:**

| Status | BG Color | Teks |
|---|---|---|
| Lunas | `#22C55E` hijau | Putih |
| Sebagian | `#374151` abu gelap | Putih |
| Belum Lunas | `#F59E0B` oranye | Putih |
| LEWAT X HARI | `#EF4444` merah | Putih |

---

## 5.3 Logika Filter & Sort

| Filter | Tipe | Nilai |
|---|---|---|
| Status | Single select chip | Semua / Belum Lunas / Lunas / Sebagian |
| Tanggal | Date range picker | from_date, to_date |
| Vendor | Dropdown/picker | vendor_id atau nama |
| Search | Free text | dicocokkan ke vendor + aktivitas |
| Sort | Dropdown | Terbaru / Terlama / Nilai Tertinggi / Nilai Terendah |

---

## 5.4 Data yang Dibutuhkan dari API

| Komponen | Endpoint | Parameter |
|---|---|---|
| List Transaksi | `GET /api/cashflow` | `status`, `date_from`, `date_to`, `vendor_id`, `q` (search), `sort` |
| Vendor Performance | `GET /api/cashflow/vendor-performance` | `date_from`, `date_to` |
| Result Count | Dari response API | `total` atau `count` |

---

*Lanjut: [06-tambah-transaksi.md](./06-tambah-transaksi.md)*
