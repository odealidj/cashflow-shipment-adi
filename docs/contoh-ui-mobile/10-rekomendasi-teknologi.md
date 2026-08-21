# 10 — Rekomendasi Teknologi & Prioritas Implementasi

> Berdasarkan analisis mendalam terhadap seluruh screen di `contoh-ui/`, dokumen ini merekomendasikan stack teknologi dan urutan pembangunan aplikasi mobile Transio.

---

## 10.1 Rekomendasi Stack: Flutter ✅

### Pertimbangan Utama

| Aspek | Flutter | React Native |
|---|---|---|
| **Performance** | Near-native (Skia/Impeller renderer) | JS bridge overhead |
| **Custom UI** | Widget system sangat fleksibel — cocok dengan design Transio | StyleSheet lebih terbatas |
| **Charts** | `fl_chart` — bar & line chart built-in, highly customizable | `victory-native` — kurang mature |
| **Form** | Built-in `TextFormField`, `DropdownButtonFormField`, controller pattern | Butuh library tambahan |
| **PIN & Biometrik** | `pin_code_fields` + `local_auth` — mature & well-supported | Ada tapi fragmentasi library |
| **Bottom Nav + FAB** | `BottomNavigationBar` + `FloatingActionButton` built-in | `react-navigation` (external) |
| **Sticky Button** | `Stack` widget sederhana | Butuh workaround |
| **Dark AppBar** | Mudah dengan `AppBar(backgroundColor: Color(0xFF1C2B4A))` | Mudah juga |
| **Auto-calculate** | State management (Riverpod/BLoC) sangat clean | useState/Redux memadai |
| **Codebase sharing** | Dart (baru) | JS/TS (shared dengan web-next) |

**Keputusan**: **Flutter** direkomendasikan karena design Transio sangat bergantung pada **custom widgets, charts, dan styled components** yang lebih mudah diimplementasikan dengan ekosistem Flutter.

---

## 10.2 Tech Stack Flutter (Recommended)

### Core
| Kebutuhan | Package | Versi |
|---|---|---|
| Framework | `flutter` | latest stable |
| HTTP Client | `dio` atau `http` | latest |
| State Management | `flutter_riverpod` | latest |
| Routing | `go_router` | latest |

### UI & Styling
| Kebutuhan | Package |
|---|---|
| Google Fonts (Inter/Poppins) | `google_fonts` |
| Charts (bar + line) | `fl_chart` |
| Shimmer loading | `shimmer` |
| Pull to refresh | built-in (`RefreshIndicator`) |

### Auth & Security
| Kebutuhan | Package |
|---|---|
| PIN 6-digit UI | `pin_code_fields` |
| Biometrik / Fingerprint | `local_auth` |
| Secure storage (PIN) | `flutter_secure_storage` |
| Shared preferences | `shared_preferences` |

### File & Export
| Kebutuhan | Package |
|---|---|
| Download file | `dio` (download) + `path_provider` |
| Open file | `open_filex` |
| File picker (import) | `file_picker` |

### Utils
| Kebutuhan | Package |
|---|---|
| Format Rupiah | `intl` |
| Date picker | `flutter_datetime_picker_plus` atau built-in |
| HTTP response caching | `dio_cache_interceptor` |

---

## 10.3 Arsitektur Folder (Flutter)

```
lib/
├── core/
│   ├── constants/       ← warna, ukuran, string constants
│   │   ├── app_colors.dart
│   │   ├── app_typography.dart
│   │   └── app_strings.dart
│   ├── network/         ← Dio client, interceptors
│   └── utils/           ← formatters (Rupiah, tanggal), helpers
│
├── features/
│   ├── auth/            ← splash, pin_lock, biometric
│   ├── beranda/         ← dashboard, KPI, charts
│   ├── laporan/         ← list transaksi, filter, vendor performance
│   ├── tambah/          ← form tambah transaksi (4 seksi)
│   ├── tagihan/         ← bills, alert, quick pay
│   └── pengaturan/      ← settings, vendor CRUD, kategori CRUD
│
├── shared/
│   ├── widgets/         ← komponen reusable
│   │   ├── kpi_card.dart
│   │   ├── transaction_card.dart
│   │   ├── status_badge.dart
│   │   ├── filter_chip_row.dart
│   │   ├── settings_item.dart
│   │   └── currency_input.dart
│   └── providers/       ← shared Riverpod providers
│
└── main.dart
```

---

## 10.4 Design Token Implementation (Flutter)

```dart
// lib/core/constants/app_colors.dart

class AppColors {
  // Primary
  static const primary = Color(0xFF2563EB);
  static const primaryDark = Color(0xFF1E3A8A);
  
  // Status
  static const success = Color(0xFF22C55E);
  static const successBg = Color(0xFFF0FDF4);
  static const warning = Color(0xFFF59E0B);
  static const warningBg = Color(0xFFFFF7ED);
  static const danger = Color(0xFFEF4444);
  static const dangerBg = Color(0xFFFEF2F2);
  
  // Neutrals
  static const neutral900 = Color(0xFF111827);
  static const neutral700 = Color(0xFF374151);
  static const neutral500 = Color(0xFF6B7280);
  static const neutral200 = Color(0xFFE5E7EB);
  
  // Surfaces
  static const surface = Color(0xFFFFFFFF);
  static const background = Color(0xFFF8FAFC);
  static const backgroundDark = Color(0xFF1C2B4A);
  static const infoBg = Color(0xFFEFF6FF);
}
```

---

## 10.5 Prioritas Implementasi

### Fase 0 — Foundation (Wajib Sebelum Semua)
```
[ ] Setup project Flutter
[ ] Implementasi design system (AppColors, AppTypography, AppTheme)
[ ] Shared widgets dasar (KPICard, TransactionCard, StatusBadge)
[ ] HTTP client (Dio + interceptor untuk base URL + auth header)
[ ] Riverpod provider setup
[ ] go_router navigation setup
```

### Fase 1 — Core Auth & Dashboard

| Screen | Komponen | Estimasi |
|---|---|---|
| **Splash Screen** | Full-screen branding, auto-navigate | 1 hari |
| **PIN Lock** | 6-dot indicator + numpad + biometrik | 2 hari |
| **Beranda (atas)** | AppBar, KPI cards 2x2, greeting | 2 hari |
| **Beranda (charts)** | Bar chart + Line chart (fl_chart) | 2 hari |
| **Beranda (bawah)** | Ringkasan hari ini + Transaksi terakhir | 1 hari |

### Fase 2 — Core Feature

| Screen | Komponen | Estimasi |
|---|---|---|
| **Form Tambah Transaksi** | 4 seksi, semua field, auto-calculate | 4 hari |
| **Laporan (filter)** | Search bar, filter chips, advanced filter | 2 hari |
| **Laporan (list)** | Transaction card list, scroll | 1 hari |
| **Tagihan** | Summary, alert banner, list card, Quick Pay | 2 hari |

### Fase 3 — Secondary Features

| Screen | Komponen | Estimasi |
|---|---|---|
| **Laporan (vendor perf)** | Vendor performance card + horizontal bar | 2 hari |
| **Pengaturan** | Grouped list, semua menu | 2 hari |
| **Ekspor Excel** | Download trigger + file save | 1 hari |
| **Ekspor PDF** | Download trigger + file save | 1 hari |
| **Impor Excel** | File picker + upload | 1 hari |

### Fase 4 — Master Data & Polish

| Fitur | Estimasi |
|---|---|
| Manajemen Vendor (CRUD screen) | 2 hari |
| Manajemen Kategori (CRUD screen) | 2 hari |
| Pull to refresh semua halaman | 0.5 hari |
| Loading shimmer semua state | 0.5 hari |
| Error state & empty state | 1 hari |

### Fase 5 — Coming Soon (Roadmap)

| Fitur | Status |
|---|---|
| Tracking Pengiriman Real-time | Coming Soon — backend belum ada |
| AI Agents Pantau Pengiriman | Coming Soon — perlu AI service |

---

## 10.6 Backend Gap Summary (Yang Harus Dibangun Sebelum Mobile)

Sebelum fase mobile berjalan penuh, backend `core-go` perlu endpoint berikut:

| Priority | Endpoint | Dibutuhkan Untuk |
|---|---|---|
| **P0** | Verifikasi semua query params (`status`, `date_from`, `date_to`) | Laporan filter |
| **P1** | `GET /api/cashflow/today-summary` | Beranda ringkasan hari ini |
| **P1** | `GET /api/cashflow/monthly-chart` | Beranda bar chart |
| **P1** | `GET /api/cashflow/saldo-trend` | Beranda line chart |
| **P1** | `GET /api/cashflow/vendor-performance` | Laporan vendor performance |
| **P2** | `GET/POST/PUT/DELETE /api/vendors` | Form + Pengaturan |
| **P2** | `GET/POST/PUT/DELETE /api/categories` | Form + Pengaturan |
| **P2** | `GET /api/cashflow/export-pdf` | Pengaturan ekspor PDF |
| **P3** | `POST /api/cashflow/import` | Pengaturan impor Excel |

---

*Dokumen ini adalah bagian dari seri analisis contoh-ui-mobile. Lihat [README.md](./README.md) untuk daftar lengkap dokumen.*
