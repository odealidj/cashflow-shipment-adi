# 01 — Identitas & Design System

> Referensi: Seluruh screenshot di folder `contoh-ui/`

---

## 1.1 Identitas Aplikasi

| Atribut | Detail |
|---|---|
| **Nama Aplikasi** | Transio |
| **Tagline** | Shipment Control |
| **Versi** | v1.0.3 |
| **Developer** | Gani / Greyscope Labs |
| **Kontak** | team@greyscope.xyz |
| **Konteks** | Aplikasi keuangan & pengiriman untuk bisnis logistik/ekspedisi |
| **Platform** | Mobile Android (status bar & 3-button navigation) |

---

## 1.2 Palet Warna

| Token | Hex (Estimasi) | Penggunaan |
|---|---|---|
| `primary` | `#2563EB` / `#3B5CF6` | CTA button, tab aktif, ikon form, badge |
| `primary-dark` | `#1E3A8A` | AppBar gelap (form Tambah Transaksi) |
| `primary-gradient` | `#1E40AF → #3B5CF6` | Splash screen background, hero banner |
| `success` | `#22C55E` | Status "Lunas", profit positif, bar chart, btn "Bayar", btn "Simpan" |
| `success-bg` | `#F0FDF4` | Background field Profit (read-only, hijau muda) |
| `warning` | `#F59E0B` | Status "Belum Lunas", overdue warning text |
| `warning-bg` | `#FFF7ED` | Background field Due Date (oranye muda) |
| `danger` | `#EF4444` | Status "Jatuh Tempo", profit negatif, left border card overdue |
| `danger-bg` | `#FEF2F2` | Background card tagihan overdue (merah muda) |
| `neutral-900` | `#111827` | Heading utama, judul halaman |
| `neutral-700` | `#374151` | Status badge "Sebagian" (gelap) |
| `neutral-500` | `#6B7280` | Subtext, label sekunder, caption |
| `neutral-200` | `#E5E7EB` | Border input, garis divider |
| `neutral-100` | `#F3F4F6` | Background chip filter non-aktif |
| `surface` | `#FFFFFF` | Background card, input field |
| `background` | `#F8FAFC` | Background halaman utama (abu sangat muda) |
| `background-dark` | `#1C2B4A` | Splash screen & PIN screen (biru gelap) |
| `info-bg` | `#EFF6FF` | Background field Margin/Saldo (biru muda) |

---

## 1.3 Tipografi

| Level | Weight | Ukuran Est. | Contoh Penggunaan |
|---|---|---|---|
| **AppBar Title** | Bold | 18sp | "Tambah Transaksi" |
| **Page Title** | Bold | 24sp | "Laporan Transaksi", "Pengaturan" |
| **Section Header** | SemiBold | 16sp | "Informasi Dasar", "Laba Bulanan" |
| **Card Title** | SemiBold | 15sp | Nama vendor pada card transaksi |
| **Body / Label** | Regular | 14sp | Label field form, deskripsi item |
| **Amount** | Bold | 16–18sp | Nominal Rupiah (menonjol) |
| **Caption** | Regular | 12sp | Tanggal, hint text, info sekunder |
| **Badge Label** | SemiBold | 11–12sp | Pill status (Lunas, Belum Lunas) |

> **Font yang digunakan**: Kemungkinan besar **Inter** atau **Poppins** — sans-serif modern, clean, tinggi readability.

---

## 1.4 Komponen Dasar (Design Tokens)

### Border Radius
| Elemen | Radius |
|---|---|
| Card | 12–16px |
| Button (CTA/primary) | 9999px (pill penuh) |
| Input field | 10–12px |
| Badge/Chip | 9999px (pill penuh) |
| Icon box (settings) | 10–12px (rounded-xl) |
| FAB | 50% (circular) |

### Elevasi & Shadow
| Elemen | Shadow |
|---|---|
| Card | `0 1px 4px rgba(0,0,0,0.08)` |
| FAB | Elevated, lebih kuat |
| AppBar | Tidak ada shadow (flat) |

### Spacing
- **Base grid**: 8pt
- **Card padding**: 16px horizontal, 14–16px vertikal
- **Section padding**: 16px horizontal (konten halaman)
- **Jarak antar item list**: 8–12px

### Input Field Style
```
┌──────────────────────────────────────────────┐
│  [Ikon Biru]  Placeholder / Value             │
└──────────────────────────────────────────────┘
Height: ~52dp | Border: abu tipis | Radius: 12px
Icon warna: primary (#2563EB)
```

### FAB (Floating Action Button)
- **Ukuran**: 56dp × 56dp
- **Warna**: `primary` biru solid
- **Ikon**: Plus (+) putih
- **Posisi**: Center di atas bottom navigation bar
- **Elevasi**: Tinggi (shadow kuat)

---

## 1.5 Status Badge System

| Status | Background | Teks | Penggunaan |
|---|---|---|---|
| **Lunas** | `#22C55E` hijau | Putih | Transaksi sudah terbayar penuh |
| **Sebagian** | `#374151` abu gelap | Putih | Terbayar sebagian |
| **Belum Lunas** | `#F59E0B` oranye | Putih | Belum ada pembayaran |
| **LEWAT X HARI** | `#EF4444` merah | Putih | Overdue (lewat jatuh tempo) |

### Left Border Card (Status Visual)
| Kondisi | Warna Border Kiri |
|---|---|
| Overdue / Jatuh Tempo | `#EF4444` merah, 4px |
| Normal | Tidak ada border |

### Icon Badge Notifikasi
- Lingkaran merah kecil di sudut kanan atas ikon lonceng
- Berisi angka count notifikasi yang belum dibaca

---

## 1.6 AppBar Variants

| Variant | Background | Teks/Ikon | Digunakan Pada |
|---|---|---|---|
| **Dark** | `#1C2B4A` biru gelap | Putih | Splash, PIN screen, form Tambah Transaksi |
| **Light** | `#FFFFFF` putih | Hitam | Beranda (AppBar tipis + logo) |
| **Transparent / Page Title** | Tidak ada AppBar sticky | Judul di body | Laporan, Tagihan, Pengaturan |

---

*Lanjut: [02-peta-navigasi.md](./02-peta-navigasi.md)*
