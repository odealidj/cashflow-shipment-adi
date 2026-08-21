# Dokumentasi Contoh UI Mobile — Transio

Folder ini berisi dokumen analisis mendalam terhadap referensi desain UI aplikasi mobile **Transio** yang terdapat di folder `contoh-ui/`. Analisis ini menjadi acuan utama dalam pembangunan aplikasi mobile cashflow-shipment.

## Daftar Dokumen

| Dokumen | Deskripsi |
|---|---|
| [01-identitas-dan-design-system.md](./01-identitas-dan-design-system.md) | Identitas aplikasi, palet warna, tipografi, dan komponen dasar |
| [02-peta-navigasi.md](./02-peta-navigasi.md) | Struktur navigasi lengkap (6 screen + bottom nav) |
| [03-screen-awal.md](./03-screen-awal.md) | Splash screen & PIN lock screen |
| [04-beranda.md](./04-beranda.md) | Halaman dashboard utama (scrollable, 4 viewport) |
| [05-laporan.md](./05-laporan.md) | Halaman laporan transaksi dengan filter & vendor performance |
| [06-tambah-transaksi.md](./06-tambah-transaksi.md) | Form tambah transaksi (4 seksi, 15+ field) |
| [07-tagihan.md](./07-tagihan.md) | Halaman manajemen tagihan & overdue |
| [08-pengaturan.md](./08-pengaturan.md) | Halaman pengaturan, ekspor, dan backup |
| [09-fitur-dan-backend-mapping.md](./09-fitur-dan-backend-mapping.md) | Inventory fitur, mapping ke backend, dan gap API |
| [10-rekomendasi-teknologi.md](./10-rekomendasi-teknologi.md) | Rekomendasi stack mobile & prioritas implementasi |

## Referensi Gambar

Semua screenshot referensi tersimpan di folder:
```
contoh-ui/
├── 0. screen-awal/     → 2 halaman BERBEDA (splash + PIN)
├── 1.Beranda/          → 1 halaman scrollable (4 screenshot)
├── 2.Laporan/          → 1 halaman scrollable (2 screenshot)
├── 3.Tagihan/          → 1 halaman scrollable (1 screenshot)
├── 4.Pengaturan/       → 1 halaman scrollable (3 screenshot)
└── 5.Tambah-Transaksi/ → 1 halaman scrollable (4 screenshot)
```

> **Catatan Penting**: Setiap folder (kecuali `0. screen-awal`) merepresentasikan **1 halaman** yang dapat di-scroll secara vertikal. Beberapa screenshot per folder hanyalah potongan dari satu halaman yang sama.

---

*Dibuat: 2026-08-22 | Versi Analisis: v2*
