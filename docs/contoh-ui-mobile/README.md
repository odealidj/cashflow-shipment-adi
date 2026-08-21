# Dokumentasi Contoh UI Mobile — Transio

Folder ini berisi dokumen analisis mendalam terhadap referensi desain UI aplikasi mobile **Transio** yang terdapat di folder `contoh-ui/`. Analisis ini menjadi acuan utama dalam pembangunan aplikasi mobile cashflow-shipment.

## Daftar Dokumen & Aset Visual

| Dokumen | Aset Full-Page Tergabung | Deskripsi |
|---|---|---|
| [01-identitas-dan-design-system.md](./01-identitas-dan-design-system.md) | — | Identitas aplikasi, palet warna, tipografi, dan komponen dasar |
| [02-peta-navigasi.md](./02-peta-navigasi.md) | [00-screen-awal.png](./assets/00-screen-awal.png) | Struktur navigasi lengkap (6 screen + bottom nav) |
| [03-screen-awal.md](./03-screen-awal.md) | [00-screen-awal.png](./assets/00-screen-awal.png) | Splash screen & PIN lock screen (2 page sequential) |
| [04-beranda.md](./04-beranda.md) | [01-beranda-fullpage.png](./assets/01-beranda-fullpage.png) | Halaman dashboard utama (1 page scrollable utuh) |
| [05-laporan.md](./05-laporan.md) | [02-laporan-fullpage.png](./assets/02-laporan-fullpage.png) | Halaman laporan transaksi, filter, dan vendor performance |
| [06-tambah-transaksi.md](./06-tambah-transaksi.md) | [05-tambah-transaksi-fullpage.png](./assets/05-tambah-transaksi-fullpage.png) | Form tambah transaksi (1 form panjang, 4 seksi) |
| [07-tagihan.md](./07-tagihan.md) | [03-tagihan-fullpage.png](./assets/03-tagihan-fullpage.png) | Halaman manajemen tagihan & overdue |
| [08-pengaturan.md](./08-pengaturan.md) | [04-pengaturan-fullpage.png](./assets/04-pengaturan-fullpage.png) | Halaman pengaturan, ekspor, dan backup |
| [09-fitur-dan-backend-mapping.md](./09-fitur-dan-backend-mapping.md) | — | Inventory fitur, mapping ke backend, dan gap API |
| [10-rekomendasi-teknologi.md](./10-rekomendasi-teknologi.md) | — | Rekomendasi stack mobile & prioritas implementasi |

## Referensi Sumber vs Aset Tergabung

```
contoh-ui/ (Sumber Gambar Mentah)      docs/contoh-ui-mobile/assets/ (Aset Dokumen Utuh)
├── 0. screen-awal/ (2 image)     ───► 00-screen-awal.png (Side-by-side Step 1 & 2)
├── 1.Beranda/ (4 image)          ───► 01-beranda-fullpage.png (1 Page Full Scroll)
├── 2.Laporan/ (2 image)          ───► 02-laporan-fullpage.png (1 Page Full Scroll)
├── 3.Tagihan/ (1 image)          ───► 03-tagihan-fullpage.png (1 Page Full)
├── 4.Pengaturan/ (3 image)       ───► 04-pengaturan-fullpage.png (1 Page Full Scroll)
└── 5.Tambah-Transaksi/ (4 image) ───► 05-tambah-transaksi-fullpage.png (1 Form Full Scroll)
```

> **Catatan Penting**: Setiap folder di `contoh-ui/` (kecuali `0. screen-awal`) merepresentasikan **1 halaman tunggal** yang di-scroll secara vertikal. Aset di folder `assets/` telah digabungkan dengan presisi tinggi untuk memudahkan pembacaan dan implementasi.
>
> Script generator aset: [`scripts/generate_mobile_ui_assets.py`](file:///home/aliube/Workspace/Adi/cashflow-shipment-app/scripts/generate_mobile_ui_assets.py)

---

*Dibuat: 2026-08-22 | Versi Analisis: v2 (Aset Terkonsolidasi)*
