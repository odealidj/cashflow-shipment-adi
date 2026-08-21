# 02 — Peta Navigasi

> Referensi: Seluruh screenshot di folder `contoh-ui/`

---

## 2.1 Alur Navigasi Utama

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP LAUNCH                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │    Splash Screen (0a)   │  ← Background biru gelap
              │    Logo + "TRANSIO"     │  ← Auto-navigate ~2 detik
              │    "SHIPMENT CONTROL"   │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   PIN Lock Screen (0b)  │  ← Background biru gelap
              │   6-dot indicator       │  ← Input PIN 6 digit
              │   Numpad 3x4            │  ← + opsi biometrik
              └────────────┬────────────┘
                           │ [PIN Benar]
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     MAIN APP (Bottom Navigation)                 │
│                                                                  │
│  ┌──────────┬──────────┬────────┬──────────┬───────────────┐   │
│  │ Beranda  │ Laporan  │  [+]   │ Tagihan  │ Pengaturan    │   │
│  │  (Tab1)  │  (Tab2)  │ (FAB)  │  (Tab3)  │   (Tab4)      │   │
│  └──────────┴──────────┴────────┴──────────┴───────────────┘   │
│       │           │        │         │             │             │
│       ▼           ▼        ▼         ▼             ▼             │
│   Beranda     Laporan  Tambah    Tagihan      Pengaturan         │
│   (scroll)   (scroll) Transaksi  (scroll)      (scroll)          │
│                        (push)                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2.2 Bottom Navigation Bar

```
┌─────────────────────────────────────────────────────────────┐
│  [🏠]       [📊]       [  ●  ]      [🔔]       [⚙️]        │
│ Beranda   Laporan     (FAB +)    Tagihan    Pengaturan      │
└─────────────────────────────────────────────────────────────┘
```

| Tab | Ikon | Label | Tipe |
|---|---|---|---|
| 1 | House | **Beranda** | Standard tab |
| 2 | Bar chart | **Laporan** | Standard tab |
| — | Plus (biru besar) | *(FAB)* | Floating Action Button |
| 3 | Bell | **Tagihan** | Standard tab |
| 4 | Gear | **Pengaturan** | Standard tab |

**FAB (Floating Action Button):**
- Posisi: Tepat di **tengah** bottom navigation bar
- Ukuran: Lebih besar dari tab ikon biasa (~56dp)
- Warna: `primary` biru solid, elevated
- Aksi: **Push screen** "Tambah Transaksi" (bukan tab — ada back arrow)

**Tab Aktif State:**
- Ikon berubah warna ke `primary` biru
- Label berubah ke `primary` biru, lebih tebal
- Tab non-aktif: abu netral

---

## 2.3 Tipe Navigasi

| Navigasi | Tipe | Contoh |
|---|---|---|
| **Tab switching** | Replace (tanpa history) | Beranda ↔ Laporan ↔ Tagihan ↔ Pengaturan |
| **FAB → Tambah Transaksi** | Push (ada back arrow ←) | Bottom nav menghilang, AppBar dark |
| **Settings item →** | Push | Manajemen Vendor, Manajemen Kategori, Ubah PIN |
| **"Lihat Semua" link** | Push | Beranda → Laporan (atau halaman list penuh) |
| **App launch** | Replace | Splash → PIN → Beranda |

---

## 2.4 Inventaris Screen

| ID | Nama Screen | Folder Referensi | Jumlah Screenshot | Jumlah Halaman |
|---|---|---|---|---|
| S0a | Splash Screen | `0. screen-awal/1.page-1.png` | 1 | 1 halaman |
| S0b | PIN Lock Screen | `0. screen-awal/2.page-2.png` | 1 | 1 halaman |
| S1 | Beranda | `1.Beranda/Beranda1–4.png` | 4 | **1 halaman scrollable** |
| S2 | Laporan | `2.Laporan/Laporan1–2.png` | 2 | **1 halaman scrollable** |
| S3 | Tagihan | `3.Tagihan/Tagihan.png` | 1 | **1 halaman scrollable** |
| S4 | Pengaturan | `4.Pengaturan/Pengaturan1–3.png` | 3 | **1 halaman scrollable** |
| S5 | Tambah Transaksi | `5.Tambah-Transaksi/Tambah*.png` | 4 | **1 halaman scrollable** |

> **Catatan penting**: Setiap folder (kecuali `0. screen-awal`) merepresentasikan **satu halaman yang dapat di-scroll**. Multiple screenshot per folder hanyalah potongan viewport dari satu halaman yang sama.

---

*Lanjut: [03-screen-awal.md](./03-screen-awal.md)*
