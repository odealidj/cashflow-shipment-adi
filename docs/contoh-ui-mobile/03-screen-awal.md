# 03 — Screen Awal (Splash & PIN Lock)

> Referensi: `contoh-ui/0. screen-awal/`
> **Catatan**: Folder ini berisi **2 halaman yang berbeda** (bukan 1 halaman scrollable).

---

## 3.1 Splash Screen (`1.page-1.png`)

![Referensi: contoh-ui/0. screen-awal/1.page-1.png](../../contoh-ui/0.%20screen-awal/1.page-1.png)

### Layout
```
┌─────────────────────────────────┐
│                                 │  ← Background: #1C2B4A biru gelap
│                                 │
│                                 │
│         ╔══════════╗            │
│         ║  [LOGO]  ║            │  ← Logo besar, centered
│         ╚══════════╝            │
│           TRANSIO               │  ← Wordmark
│      SHIPMENT CONTROL           │  ← Tagline (letter-spacing lebar)
│                                 │
│                                 │
└─────────────────────────────────┘
```

### Spesifikasi
| Elemen | Detail |
|---|---|
| **Background** | `#1C2B4A` — biru gelap solid |
| **Logo** | Monogram "T" geometris/abstrak, warna biru terang + ungu/lavender |
| **Ukuran Logo** | Besar, centered vertikal ~40–50% layar |
| **Wordmark** | "TRANSIO" — Bold, putih, uppercase, tracking normal |
| **Tagline** | "SHIPMENT CONTROL" — Regular/Light, biru muda, uppercase, **letter-spacing lebar** |
| **Jarak logo ke teks** | ~24–32dp |
| **Status Bar** | Transparan (ikon putih) |
| **Bottom Nav Bar** | Tidak ada (full screen) |

### Behavior
- Auto-navigate ke PIN Lock Screen setelah **~2 detik**
- Atau langsung ke Beranda jika sesi masih aktif (opsional — sesuai implementasi)
- Tidak ada interaksi user (non-interactive)

---

## 3.2 PIN Lock Screen (`2.page-2.png`)

![Referensi: contoh-ui/0. screen-awal/2.page-2.png](../../contoh-ui/0.%20screen-awal/2.page-2.png)

### Layout
```
┌─────────────────────────────────┐
│                                 │  ← Background: #1C2B4A biru gelap
│         ╔═════════╗             │
│         ║ [logo]  ║             │  ← Logo kecil, centered
│         ╚═════════╝             │
│          TRANSIO                │
│                                 │
│   Masukkan PIN untuk membuka    │  ← Label instruksi (putih/abu)
│                                 │
│     ○  ○  ○  ○  ○  ○           │  ← 6 dot indicator
│                                 │
│                                 │
│   ┌─────┐  ┌─────┐  ┌─────┐   │
│   │  1  │  │  2  │  │  3  │   │
│   └─────┘  └─────┘  └─────┘   │
│   ┌─────┐  ┌─────┐  ┌─────┐   │
│   │  4  │  │  5  │  │  6  │   │
│   └─────┘  └─────┘  └─────┘   │
│   ┌─────┐  ┌─────┐  ┌─────┐   │  ← Numpad 3x4
│   │  7  │  │  8  │  │  9  │   │
│   └─────┘  └─────┘  └─────┘   │
│   ┌─────┐  ┌─────┐  ┌─────┐   │
│   │ 🔑  │  │  0  │  │ ⌫  │   │  ← fingerprint | 0 | backspace
│   └─────┘  └─────┘  └─────┘   │
└─────────────────────────────────┘
```

### Spesifikasi
| Elemen | Detail |
|---|---|
| **Background** | `#1C2B4A` — sama dengan Splash |
| **Logo** | Lebih kecil dari Splash, tetap centered |
| **Instruksi** | "Masukkan PIN untuk membuka" — teks abu/putih muda |
| **PIN Indicator** | 6 lingkaran kosong (○) → terisi (●) saat digit diinput |
| **PIN Length** | **6 digit** |
| **Numpad Style** | Tombol lingkaran abu-abu gelap semi-transparan |
| **Tombol Fingerprint** | Ikon sidik jari (kiri bawah numpad) — biometrik |
| **Tombol Backspace** | Ikon ⌫ (kanan bawah numpad) |
| **Status Bar** | Transparan (ikon putih) |

### Behavior & Logic
```
User input digit  → Dot indicator terisi (● dari kiri)
Input 6 digit     → Auto-validate PIN
PIN benar         → Navigate ke Beranda (replace)
PIN salah         → Shake animation + dot reset
Tap fingerprint   → Trigger biometric dialog sistem
Biometrik sukses  → Navigate ke Beranda (replace)
```

### Keamanan
- **PIN 6 digit** — lebih aman dibanding 4 digit
- **PIN disimpan secara lokal** di device (encrypted storage)
- **Biometrik** sebagai alternatif (fingerprint; bisa extend ke Face ID)
- Tidak ada "lupa PIN" yang terlihat di UI — perlu implementasi flow tersendiri

---

*Lanjut: [04-beranda.md](./04-beranda.md)*
