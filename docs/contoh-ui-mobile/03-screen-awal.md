# 03 — Screen Awal (Splash & PIN Lock)

> Referensi: `contoh-ui/0. screen-awal/` | Aset gabungan: [`assets/00-screen-awal.png`](./assets/00-screen-awal.png)
> **Catatan**: Folder ini berisi **2 halaman yang berbeda secara sekuensial** (Splash Screen muncul lebih dulu, lalu berpindah ke PIN Lock Screen).

---

## 3.1 Preview Visual Kedua Screen (Step 1 → Step 2)

![Preview Screen Awal](./assets/00-screen-awal.png)

---

## 3.2 Splash Screen (`1.page-1.png` — Step 1)

### Layout
```
┌─────────────────────────────────┐
│                                 │  ← Background: #1C2B4A (Dark Blue)
│                                 │
│         ╔══════════╗            │
│         ║  [LOGO]  ║            │  ← Logo "T" geometris, centered
│         ╚══════════╝            │
│           TRANSIO               │  ← Wordmark putih
│      SHIPMENT CONTROL           │  ← Tagline biru muda (letter-spacing)
│                                 │
│                                 │
└─────────────────────────────────┘
```

### Spesifikasi
| Elemen | Detail |
|---|---|
| **Background** | `#1C2B4A` — biru gelap solid |
| **Logo** | Monogram "T" geometris/abstrak (biru terang gradien ke ungu/cyan) |
| **Ukuran Logo** | Centered vertikal (~40–50% layar) |
| **Wordmark** | "TRANSIO" — Bold, putih, uppercase |
| **Tagline** | "SHIPMENT CONTROL" — Regular, biru muda, uppercase, **letter-spacing lebar** |
| **Status Bar** | Transparan (ikon putih) |
| **Behavior** | Auto-navigate ke PIN Lock Screen setelah **~2 detik** |

---

## 3.3 PIN Lock Screen (`2.page-2.png` — Step 2)

### Layout
```
┌─────────────────────────────────┐
│                                 │  ← Background: #1C2B4A (Dark Blue)
│         ╔═════════╗             │
│         ║ [logo]  ║             │  ← Logo kecil, centered
│         ╚═════════╝             │
│          TRANSIO                │
│                                 │
│   Masukkan PIN untuk membuka    │  ← Label instruksi
│                                 │
│     ○  ○  ○  ○  ○  ○           │  ← 6 dot indicator
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
│   │ 🔄🔒 │  │  0  │  │  ⌫  │   │  ← Reset PIN | 0 | Backspace
│   └─────┘  └─────┘  └─────┘   │
└─────────────────────────────────┘
```

### Spesifikasi Numpad & Kontrol
| Elemen | Detail |
|---|---|
| **Background** | `#1C2B4A` — sama dengan Splash Screen |
| **Instruksi** | "Masukkan PIN untuk membuka" — teks abu-abu muda |
| **PIN Indicator** | 6 lingkaran (○) → terisi (●) saat angka diketik |
| **Panjang PIN** | **6 digit** |
| **Tombol Angka (1–9, 0)** | Lingkaran abu-abu semi-transparan (`rgba(255,255,255,0.1)`) |
| **Tombol Kiri Bawah** | **Ikon Gembok dengan Panah Melingkar (🔄🔒)** — Aksi: Reset PIN / Buka Kunci Ulang |
| **Tombol Kanan Bawah** | **Ikon Backspace (⌫)** — Hapus digit terakhir |

### Logika & Keamanan
```
Input digit       → Dot indicator terisi (●)
Lengkap 6 digit   → Validasi otomatis PIN dengan local secure storage
PIN benar         → Masuk ke Beranda (replace route)
PIN salah         → Animasi getar (shake) + dot kembali kosong
Tap Reset PIN     → Dialog verifikasi / reset keamanan
(Opsional OS)     → Dapat dipadukan dengan Biometrik (Fingerprint/FaceID via local_auth)
```

---

*Lanjut: [04-beranda.md](./04-beranda.md)*
