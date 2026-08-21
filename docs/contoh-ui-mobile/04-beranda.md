# 04 — Beranda (Dashboard Utama)

> Referensi: `contoh-ui/1.Beranda/Beranda1.png` s/d `Beranda4.png`
> **1 halaman yang dapat di-scroll secara vertikal** (4 screenshot = 4 potongan viewport dari halaman yang sama)

---

## 4.1 Urutan Konten (Top → Bottom)

```
┌─────────────────────────────────────────────┐  ← VIEWPORT 1 (Beranda1.png)
│  AppBar: [Logo] Transio          [🔔¹]      │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │  Hero Banner (Biru Gradien)          │   │
│  │  TRACKING PENGIRIMAN                 │   │
│  │  [Coming Soon]  🚚  📍              │   │
│  │  Pantau status pengiriman real-time  │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ⏳ Masa uji coba: 17 hari tersisa   │   │  ← Trial banner
│  │    Total uji coba 30 hari            │   │
│  └──────────────────────────────────────┘   │
│  Selamat Pagi, User 👋                      │  ← Greeting
│  Sabtu, 22 Agustus 2026                     │  ← Tanggal dinamis
│                                             │
│  ┌──────────────┐   ┌──────────────┐       │  ← KPI Grid 2x2
│  │ Total Saldo  │   │ Total Profit │       │
│  │ Rp 4.500.000 │   │ Rp 16.500.000│       │
│  └──────────────┘   └──────────────┘       │
│  ┌──────────────┐   ┌──────────────┐       │
│  │ Total Revenue│   │ Tagihan Belu.│       │
│  │ Rp 46.000.000│   │ 1 Menunggu  │       │
│  └──────────────┘   └──────────────┘       │
├─────────────────────────────────────────────┤  ← VIEWPORT 2 (Beranda2.png)
│  Laba Bulanan                               │
│  ┌──────────────────────────────────────┐   │
│  │  [Bar Chart Hijau - per bulan]       │   │
│  └──────────────────────────────────────┘   │
│  Tren Saldo                                 │
│  ┌──────────────────────────────────────┐   │
│  │  [Line Chart Biru Area - tren]       │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤  ← VIEWPORT 3 (Beranda3.png)
│  ┌──────────────────────────────────────┐   │
│  │ 📅 Ringkasan Hari Ini    0 transaksi │   │
│  │  ↓ Pemasukan  ↑ Pengeluaran  💼 Saldo│   │
│  │  Rp 0         Rp 0           Rp 0    │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ 🚚 Pantau Pengiriman   [Coming Soon] │   │  ← Feature promo card
│  │    Informasi status pengiriman...  > │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤  ← VIEWPORT 4 (Beranda4.png)
│  Transaksi Terakhir              Lihat Semua│
│  ┌──────────────────────────────────────┐   │
│  │ ║ CV. Mitra Peng... [Lunas]  Rp 4jt │   │
│  │ ║ Beli Solar  📅 09 Agu  Profit 50% │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ ║ PT. Armada...   [Sebagian] Rp 15jt│   │
│  └──────────────────────────────────────┘   │
│  ... (list transaksi lanjutan)              │
└─────────────────────────────────────────────┘
```

---

## 4.2 Komponen Detail

### AppBar
- Logo Transio kecil + label "Transio" di kiri
- Ikon notifikasi lonceng di kanan dengan **badge merah** berisi angka count
- Background putih atau transparan saat scroll

### Hero Banner
| Elemen | Detail |
|---|---|
| Background | Gradien biru `#1E40AF → #3B5CF6` |
| Judul | "TRACKING PENGIRIMAN" — Bold putih uppercase |
| Badge | `[COMING SOON]` — pill ungu/lavender |
| Subtitle | "Pantau status pengiriman barang real-time" — putih kecil |
| Ilustrasi | Truck + pin lokasi (hijau, ungu, biru) di sisi kanan |
| Border Radius | 16px |
| Padding | 20px |

### Trial Banner
- Background putih, border abu tipis, atau background biru sangat muda
- Ikon hourglass biru di kiri
- Teks: "Masa uji coba: **X hari tersisa**" (bold) + "Total uji coba 30 hari" (abu)

### Greeting Section
```
Selamat [Pagi/Siang/Sore/Malam], [Nama User] 👋    ← dinamis
[Nama Hari], [Tanggal Bulan Tahun]                  ← format Indonesia
```
- **Waktu sapaan** dinamis berdasarkan jam device
- **Nama user** dari profil/storage lokal
- **Tanggal** format: "Sabtu, 22 Agustus 2026"

### KPI Cards (Grid 2×2)

```
┌────────────────────────────────────┐
│ ▌ Label                [icon bg]  │
│ ▌                                 │  ← left border 4px berwarna
│ ▌ Rp X.XXX.XXX                   │  ← nilai, warna sesuai
│ ▌ Subtitle kecil (abu)            │
└────────────────────────────────────┘
```

| Card | Left Border | Nilai Color | Label | Subtitle |
|---|---|---|---|---|
| Total Saldo Aktif | Biru | Biru | Total Saldo A... | Kredit - Debit |
| Total Profit | Hijau | Hijau | Total Profit | Margin positif |
| Total Revenue | Biru | Biru | Total Revenue | Pemasukan keseluru... |
| Tagihan Belum Bayar | Merah | Merah | Tagihan Belu... | Menunggu pembaya... |

### Charts

**Laba Bulanan (Bar Chart)**
- Tipe: Bar chart vertikal
- Warna bar: `#22C55E` hijau solid
- Label sumbu X: nama bulan singkat (Agu, Sep, ...)
- Label sumbu Y: nilai dalam format "Xjt" (juta)
- Background chart: putih card dengan radius 12px

**Tren Saldo (Line Chart)**
- Tipe: Line chart dengan area fill
- Warna garis: `#2563EB` biru
- Area fill: biru muda semi-transparan
- Titik data: lingkaran biru solid di ujung
- Label: "start", "Agu"

### Ringkasan Hari Ini
| Elemen | Warna Ikon | Label |
|---|---|---|
| Pemasukan ↓ | Hijau | Rp 0 |
| Pengeluaran ↑ | Merah | Rp 0 |
| Saldo 💼 | Biru | Rp 0 |

Header card: "📅 Ringkasan Hari Ini" + badge count "0 transaksi"

### Pantau Pengiriman (Feature Promo)
- Background ungu sangat muda (`#F5F3FF`)
- Ikon truck dalam box biru muda
- Label "Coming Soon" — pill ungu/abu
- Chevron `>` di kanan — navigable (meskipun belum aktif)
- Teks: "Informasi status pengiriman barang real-time dengan AI agents"

### Transaksi Terakhir
- Section title "Transaksi Terakhir" + link "**Lihat Semua**" (biru, kanan)
- List card transaksi (sama persis dengan design di halaman Laporan)
- Menampilkan ~5 transaksi terbaru

---

## 4.3 Data yang Dibutuhkan dari API

| Komponen | Endpoint | Field |
|---|---|---|
| KPI Total Saldo | `GET /api/cashflow/summary` | `total_saldo_aktif` |
| KPI Total Profit | `GET /api/cashflow/summary` | `total_profit` |
| KPI Total Revenue | `GET /api/cashflow/summary` | `total_revenue` |
| KPI Tagihan | `GET /api/cashflow/summary` | `tagihan_belum_bayar_count` |
| Bar Chart Laba | `GET /api/cashflow/monthly-chart` | `[{bulan, laba}]` |
| Line Chart Saldo | `GET /api/cashflow/saldo-trend` | `[{periode, saldo}]` |
| Ringkasan Hari Ini | `GET /api/cashflow/today-summary` | `pemasukan, pengeluaran, saldo` |
| Transaksi Terakhir | `GET /api/cashflow?limit=5&sort=terbaru` | list transaksi |
| Greeting — nama | Local storage / profil user | `nama_pengguna` |

---

*Lanjut: [05-laporan.md](./05-laporan.md)*
