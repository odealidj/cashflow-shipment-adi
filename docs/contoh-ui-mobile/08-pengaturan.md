# 08 — Pengaturan (Settings)

> Referensi: `contoh-ui/4.Pengaturan/Pengaturan1.png` s/d `Pengaturan3.png`
> **1 halaman yang dapat di-scroll secara vertikal** (3 screenshot = 3 potongan viewport dari halaman yang sama)

---

## 8.1 Urutan Konten (Top → Bottom)

```
┌─────────────────────────────────────────────┐  VIEWPORT 1 (Pengaturan1.png)
│                                             │
│  Pengaturan                                 │  ← Page title
│  Kelola profil, data, dan preferensi        │  ← Subtitle
│                                             │
│  Profil                                     │  ← Group label (abu)
│  ┌──────────────────────────────────────┐   │
│  │ [👤] Nama Pengguna        User   ✏️  │   │
│  ├──────────────────────────────────────┤   │
│  │ [🔒] Ubah PIN                      >│   │
│  │       Ubah PIN keamanan aplikasi    │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Manajemen Data                             │  ← Group label (abu)
│  ┌──────────────────────────────────────┐   │
│  │ [△] Manajemen Kategori             > │   │
│  │      Kelola kategori pemasukan &    │   │
│  │      pengeluaran                    │   │
│  ├──────────────────────────────────────┤   │
│  │ [🚚] Manajemen Vendor              > │   │
│  │       Kelola daftar vendor dan kontak│   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Penyimpanan                                │  ← Group label (abu)
│  ┌──────────────────────────────────────┐   │
│  │ [≡] Penggunaan Penyimpanan           │   │
│  │      5.4 KB terpakai          [...]  │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤  VIEWPORT 2 (Pengaturan2.png)
│                                             │
│  [Penyimpanan - lanjutan]                   │  ← Group Penyimpanan berlanjut
│  ┌──────────────────────────────────────┐   │
│  │ [≡] Penggunaan Penyimpanan           │   │
│  │      5.4 KB terpakai                 │   │
│  │      ────────────────────────── 0.0% │   │  ← progress bar tipis
│  ├──────────────────────────────────────┤   │
│  │ [↓] Ekspor Data (Excel)            > │   │  ← ikon hijau
│  │      Unduh semua transaksi ke .xlsx  │   │
│  ├──────────────────────────────────────┤   │
│  │ [↑] Impor Data (Excel)             > │   │  ← ikon oranye
│  │      Impor transaksi dari file .xlsx │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Laporan & Export PDF                       │  ← Group label (abu)
│  ┌──────────────────────────────────────┐   │
│  │ [PDF] Laporan Laba Rugi (PDF)      > │   │  ← ikon merah muda
│  │        Export laporan periode ini   │   │
│  ├──────────────────────────────────────┤   │
│  │ [📁] Ringkasan per Vendor (PDF)    > │   │  ← ikon biru
│  │       Export ringkasan per vendor   │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤  VIEWPORT 3 (Pengaturan3.png)
│                                             │
│  [Laporan & Export PDF - lanjutan]          │  ← (masih terlihat di atas)
│  ┌──────────────────────────────────────┐   │
│  │ [PDF] Laporan Laba Rugi (PDF)      > │   │
│  │ [📁]  Ringkasan per Vendor (PDF)   > │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Penyimpanan & Backup                       │  ← Group label (abu)
│  ┌──────────────────────────────────────┐   │
│  │ [🗑️] Sembunyikan Semua Data        > │   │  ← TEKS MERAH (destructive)
│  │       Soft-delete + backup otomatis  │   │
│  │       (bisa di-restore)              │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │           Transio v1.0.3             │   │  ← App info (center)
│  │          Developer: Gani             │   │
│  │       team@greyscope.xyz             │   │
│  │  © 2026 Greyscope Labs. All rights   │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 8.2 Komponen Detail

### Page Header
```
Pengaturan
Kelola profil, data, dan preferensi aplikasi
```
- Judul: Bold, 24sp, hitam, rata kiri
- Subtitle: Regular, 14sp, abu

### Group Label
- Teks kecil abu (`neutral-500`), uppercase atau regular
- Contoh: "Profil", "Manajemen Data", "Penyimpanan"
- Jarak 16px di atas label

### Settings Item Design

```
┌───────────────────────────────────────────────────┐
│  ┌──────────┐                                     │
│  │  [icon]  │  Judul Item                  [>]   │
│  └──────────┘  Deskripsi singkat item             │
└───────────────────────────────────────────────────┘
```

| Elemen | Detail |
|---|---|
| **Icon Box** | Rounded-xl (~10px), ukuran ~40dp, background warna pastel |
| **Ikon** | Ikon sesuai fungsi, warna sesuai kategori |
| **Judul** | Bold, 15sp, hitam |
| **Deskripsi** | Regular, 13sp, abu (`neutral-500`) |
| **Chevron** | `>` abu, di kanan — navigable item |
| **Separator** | Garis tipis abu di antara item dalam grup yang sama |

### Item yang Dapat Diedit Inline

**Nama Pengguna:**
```
│ [👤]  Nama Pengguna          User   ✏️  │
```
- Tampilkan nilai saat ini (`User`)
- Ikon ✏️ di kanan — tap untuk edit inline atau bottom sheet

---

## 8.3 Daftar Menu Lengkap

### Grup: Profil

| Item | Ikon (warna box) | Aksi | Navigasi |
|---|---|---|---|
| Nama Pengguna | 👤 Biru muda | Edit nama user | Edit inline / bottom sheet |
| Ubah PIN | 🔒 Abu | Ganti PIN | Push screen PIN editor |

### Grup: Manajemen Data

| Item | Ikon (warna box) | Aksi | Navigasi |
|---|---|---|---|
| Manajemen Kategori | △ Hijau muda | CRUD kategori transaksi | Push screen list kategori |
| Manajemen Vendor | 🚚 Abu/biru | CRUD vendor/kontak | Push screen list vendor |

### Grup: Penyimpanan

| Item | Ikon (warna box) | Aksi |
|---|---|---|
| Penggunaan Penyimpanan | ≡ Biru muda | Informasi saja + progress bar |
| Ekspor Data (Excel) | ↓ **Hijau** | Download `.xlsx` semua transaksi |
| Impor Data (Excel) | ↑ **Oranye** | Upload `.xlsx` untuk import transaksi |

**Penggunaan Penyimpanan:**
```
Penggunaan Penyimpanan
5.4 KB terpakai
──────────────────────────── 0.0%   ← progress bar tipis
```

### Grup: Laporan & Export PDF

| Item | Ikon (warna box) | Aksi |
|---|---|---|
| Laporan Laba Rugi (PDF) | PDF **Merah muda** | Generate & download PDF laporan laba rugi bulan ini |
| Ringkasan per Vendor (PDF) | 📁 **Biru** | Generate & download PDF ringkasan performa per vendor |

### Grup: Penyimpanan & Backup

| Item | Ikon (warna box) | Style | Aksi |
|---|---|---|---|
| Sembunyikan Semua Data | 🗑️ **Merah** | **Teks merah (destructive)** | Soft-delete semua data + auto-backup (bisa di-restore) |

> ⚠️ **Pattern Destructive**: Item ini menggunakan **teks merah** sebagai visual warning, bukan button. Ini memberikan sinyal bahaya tanpa memblokir akses. Konfirmasi dialog **wajib** sebelum eksekusi.

### App Info (Footer)

```
             Transio v1.0.3
           Developer: Gani
        team@greyscope.xyz
  © 2026 Greyscope Labs. All rights reserved.
```

- Centered, teks abu kecil
- Link email clickable (mailto:)
- Tidak interaktif selain link

---

## 8.4 Icon Box Color Mapping

| Fungsi | Warna Box Background | Ikon Warna |
|---|---|---|
| Profil / User | Biru muda (`#DBEAFE`) | Biru |
| Keamanan / PIN | Abu muda (`#F3F4F6`) | Abu gelap |
| Kategori | Hijau muda (`#DCFCE7`) | Hijau |
| Vendor / Logistik | Abu-biru muda | Biru |
| Penyimpanan/Storage | Biru muda (`#DBEAFE`) | Biru |
| Ekspor (Excel) | Hijau muda (`#DCFCE7`) | Hijau |
| Impor (Excel) | Oranye muda (`#FED7AA`) | Oranye |
| Laporan PDF (Laba Rugi) | Merah muda (`#FEE2E2`) | Merah |
| Ringkasan PDF (Vendor) | Biru (`#DBEAFE`) | Biru |
| Hapus / Destructive | Merah (`#FEE2E2`) | Merah |

---

## 8.5 Data & API yang Dibutuhkan

| Fitur | Endpoint / Mekanisme |
|---|---|
| Nama Pengguna (baca) | Local storage / profil lokal |
| Nama Pengguna (ubah) | Local storage update |
| Ubah PIN | Local storage (encrypted) |
| Manajemen Kategori | `GET/POST/PUT/DELETE /api/categories` |
| Manajemen Vendor | `GET/POST/PUT/DELETE /api/vendors` |
| Penggunaan Penyimpanan | Hitung ukuran local DB / API response |
| Ekspor Excel | `GET /api/cashflow/export` → download file |
| Impor Excel | `POST /api/cashflow/import` → upload file |
| Laporan Laba Rugi (PDF) | `GET /api/cashflow/export-pdf?type=laba-rugi` |
| Ringkasan Vendor (PDF) | `GET /api/cashflow/export-pdf?type=vendor-summary` |
| Sembunyikan Semua Data | `POST /api/cashflow/soft-delete-all` + local backup |

---

*Lanjut: [09-fitur-dan-backend-mapping.md](./09-fitur-dan-backend-mapping.md)*
