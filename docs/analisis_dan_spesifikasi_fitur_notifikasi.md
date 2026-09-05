# Spesifikasi & Analisis Sistem Notifikasi Terarah (Actionable Notifications)
## PT. Adijayantara Logistics Indonesia — Cashflow, Shipment & Invoice System

Dokumen ini memuat analisis mendalam, pemetaan peran (*role-based targeting*), kesiapan pendataan email, integrasi **Firebase Cloud Messaging (FCM)** untuk Web & Mobile PWA, rancangan arsitektur teknis, dan peta jalan (*roadmap*) implementasi fitur notifikasi pada aplikasi kas operasional dan logistik pengiriman PT. Adijayantara Logistics Indonesia.

---

## 1. Latar Belakang & Urgensi Bisnis

Dalam industri logistik dan transportasi darat (*freight forwarding/trucking*), perputaran arus kas (*cashflow velocity*) adalah penentu kelangsungan hidup operasional:
1. **Keterlambatan Piutang Invoice**: Invoice ke klien memiliki jangka waktu pembayaran bervariasi (*Terms of Payment* / TOP: COD, Net 14, Net 30, Net 45, Net 60). Keterlambatan penagihan berdampak langsung pada defisit kas perusahaan.
2. **Kesiapan Uang Jalan Armada**: Biaya bahan bakar (solar), tol, uang makan supir, dan biaya bongkar muat bersifat tunai harian. Menipisnya saldo kas operasional kantor tanpa disadari dapat menghentikan keberangkatan armada secara tiba-tiba.
3. **Kepatuhan Pembayaran Vendor Truk**: Keterlambatan pembayaran ke rekanan vendor truk eksternal dapat merusak hubungan kemitraan dan menyebabkan vendor menolak order pengiriman berikutnya.
4. **Kebocoran Margin & Transaksi Rugi**: Kenaikan biaya operasional tak terduga yang mengakibatkan nilai jual lebih rendah dari biaya riil (*negative margin*) harus segera diketahui oleh pengambil keputusan.

Sistem notifikasi ini dirancang agar **bersifat proaktif**, **tepat sasaran ke role yang berkepentingan**, dan **mencegah *notification fatigue* (kebanjiran notifikasi tak penting yang akhirnya diabaikan staf)**.

---

## 2. Prinsip Utama Desain Notifikasi

1. **Role-Targeted (Berbasis Peran)**: Setiap pengguna hanya menerima notifikasi yang relevan dengan tugas dan wewenang tanggung jawabnya. Finance tidak terbebani notifikasi teknis server, dan Direktur tidak dibanjiri notifikasi operasional minor.
2. **Actionable (Dapat Ditindaklanjuti Langsung)**: Setiap notifikasi harus menyediakan *deep link / action URL* menuju dokumen atau halaman terkait (misal: langsung membuka invoice tertunggak atau form transaksi kas).
3. **Multi-Level Severity (Tingkat Kritis Terukur)**:
   * 🔴 **CRITICAL**: Membutuhkan tindakan segera karena berisiko kerugian finansial atau hambatan operasional armada.
   * 🟡 **WARNING / ACTION REQUIRED**: Pengingat berkala sebelum masalah timbul (contoh: H-3 jatuh tempo).
   * 🔵 **INFO**: Pembaruan status administratif positif (contoh: pelunasan invoice, top-up modal tercatat).
4. **Instant Real-Time via FCM**: Mengirimkan peringatan darurat langsung ke layar *smartphone* (Mobile PWA) atau layar laptop pengguna meskipun browser/aplikasi sedang ditutup.
5. **Formal Audit Trail via Email**: Untuk penagihan eksternal ke klien dan laporan resmi eksekutif, notifikasi memiliki rekam jejak formal (*verifiable record*) lengkap dengan lampiran PDF/Excel.
6. **Anti-Fatigue Policy**: Penggabungan notifikasi sejenis (*grouped/digest notification*) daripada mengirim peringatan per satuan data secara berulang.

---

## 3. Analisis Kesiapan Pendataan Email (*Data Readiness Analysis*)

### 3.1 Status Data Email Eksisting di Database
1. **Pengguna Internal Sistem (`users.email`) — SUDAH TERSEDIA 100%**:
   * Pada skema database tabel `users`, kolom `email VARCHAR UNIQUE NOT NULL` sudah wajib diisi sejak awal saat proses *signup* maupun saat Super Admin membuat akun staf baru (`/dashboard/users`).
   * *Kesimpulan:* Notifikasi email untuk seluruh aktor internal (Finance, Direktur, Owner, Admin) **dapat langsung digunakan tanpa perlu migrasi tabel user**.
2. **Rekanan Pelanggan / Klien (`customers.email`) — SUDAH TERSEDIA**:
   * Pada skema database tabel `customers` (migrasi 000005), kolom `email VARCHAR` dan `pic_name VARCHAR` sudah tersedia dan telah terisi pada data seed (contoh: `finance@suryamandiri.co.id`, `billing@berkahjayalog.com`).
3. **Rekanan Vendor Truk (`vendors.email`) — SUDAH TERSEDIA**:
   * Pada skema database tabel `vendors` (migrasi 000001), kolom `email VARCHAR` sudah tersedia.

### 3.2 Rekomendasi Penyempurnaan Fitur Pendataan Email
Secara struktur dasar **tidak perlu membuat tabel baru untuk email**, namun **disarankan 3 penyempurnaan fitur pendataan berikut**:

1. **Penegasan Validasi Email Billing pada Form Master Customer:**
   * Pada form tambah/edit customer (`/dashboard/customers`), tambahkan validasi wajib atau penanda khusus: **"Email Bagian Keuangan / Billing Klien"**. Hal ini krusial agar pengiriman faktur otomatis dan reminder jatuh tempo H-3 tidak mengalami kegagalan (*bounce*).
2. **Fitur Pengaturan Email Distribusi Perusahaan (*Company Distribution List*):**
   * Sediakan menu kecil di **Pengaturan Sistem**: *Alamat Email Penerima Laporan Mingguan & Alert Saldo Kritis* jika pimpinan ingin rekapitulasi dikirim ke email kantor bersama (misal: `direksi@adijayantara.co.id`).
3. **Preferensi Notifikasi per User (*User Notification Preferences*):**
   * Menyediakan pengaturan centang (*toggle*) bagi setiap pengguna untuk memilih saluran (In-App, Email, FCM) dan jenis notifikasi yang ingin diterima.

---

## 4. Matriks Kebutuhan Notifikasi Berdasarkan Peran (Aktor)

```
+-----------------------------------------------------------------------------+
|               DISTRIBUSI NOTIFIKASI BERDASARKAN ROLE PENGGUNA               |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [FINANCE & AKUNTANSI]                                                      |
|   ├── In-App, Email & FCM: Invoice Jatuh Tempo (H-3, Hari H, Overdue)       |
|   ├── In-App, Email & FCM: Saldo Kas Operasional Menipis (Low Balance Alert)|
|   └── In-App: Jatuh Tempo Pembayaran Rekanan/Vendor (TOP)                   |
|                                                                             |
|  [DIREKTUR]                                                                 |
|   ├── In-App, Email & FCM: Transaksi Margin Negatif / Anomali Rugi (< 5%)   |
|   ├── In-App, Email & FCM: Piutang Kritis Menunggak (> 14 Hari & Nominal)   |
|   └── Email Khusus: Ringkasan Eksekutif Finansial Mingguan (Senin Pagi)     |
|                                                                             |
|  [OWNER / PEMILIK MODAL]                                                    |
|   ├── In-App, Email & FCM: Lonjakan Pengeluaran Kas Jumbo (> Threshold)     |
|   ├── In-App, Email & FCM: Saldo Kas Kritis Butuh Injeksi Modal (Top-Up)   |
|   └── Email Khusus: Laporan Akhir Bulan Dividen & Pertumbuhan Kas           |
|                                                                             |
|  [ADMIN OPERASIONAL]                                                        |
|   ├── In-App: Pengiriman Selesai tapi Belum Ditagihkan (Un-invoiced > 3 Hr) |
|   └── In-App: Data Rekanan / Vendor Truk Baru Divalidasi                    |
|                                                                             |
|  [PELANGGAN / KLIEN B2B (EKSTERNAL)]                                        |
|   └── Email Resmi: Surat Pengingat Tagihan Faktur (H-3, Hari H, & Overdue)  |
|                                                                             |
|  [IT SUPER ADMIN]                                                           |
|   ├── In-App & Email: Perubahan Hak Akses Role Sensitif (RBAC Audit)        |
|   └── In-App & Email: Gagal Login Berulang (Brute-Force Detection)          |
+-----------------------------------------------------------------------------+
```

### Tabel Rincian Peran & Tanggung Jawab Notifikasi:

| Role Pengguna | Kategori Notifikasi | Event Pemicu (*Trigger*) | Saluran Pengiriman | Level | Tindakan Lanjutan (*Action*) |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Finance & Akuntansi** | Invoices (AR) | Invoice masuk H-3 dari `due_date` | In-App + Email | 🟡 WARNING | Siapkan rekap invoice & kirim penagihan ke klien |
| **Finance & Akuntansi** | Invoices (AR) | Invoice mencapai tanggal jatuh tempo (Hari H) | In-App + Email + FCM | 🟡 WARNING | Follow-up penagihan langsung ke finance klien |
| **Finance & Akuntansi** | Invoices (AR) | Invoice melewati `due_date` status `OVERDUE` | In-App + Email + FCM | 🔴 CRITICAL | Terbitkan surat teguran / hold pengiriman baru |
| **Finance & Akuntansi** | Arus Kas | Saldo berjalan &lt; Batas Minimum (misal: Rp 15 Jt) | In-App + Email + FCM | 🔴 CRITICAL | Ajukan pengisian kas (*Top-Up*) ke Direktur/Owner |
| **Finance & Akuntansi** | Hutang Vendor (AP) | TOP Vendor mendekati jatuh tempo (H-2) | In-App | 🟡 WARNING | Jadwalkan pembayaran transfer ke vendor truk |
| **Klien / Customer (B2B)**| Penagihan Resmi | Tagihan invoice H-3, Hari H, dan Overdue | **Email Resmi** | 🟡 WARNING | Pembayaran transfer ke rekening PT. Adijayantara |
| **Direktur** | Margin Bisnis | Transaksi baru dengan margin profit negatif / &lt; 5% | In-App + Email + FCM | 🔴 CRITICAL | Evaluasi biaya rute dan negosiasi ulang harga |
| **Direktur** | Piutang Kritis | Invoice macet &gt; 14 hari dengan nominal &gt; Rp 20 Jt | In-App + Email + FCM | 🔴 CRITICAL | Hubungi pimpinan klien / tinjau kelayakan kredit |
| **Direktur & Owner** | Ringkasan Eksekutif | Rekapitulasi mingguan performa kas & piutang | **Email Digest** | 🔵 INFO | Tinjau laporan kesehatan finansial (Senin Pagi) |
| **Owner** | Keamanan Kas | Pengeluaran kas tunggal bernilai besar (&gt; Rp 50 Jt) | In-App + Email + FCM | 🟡 WARNING | Verifikasi otorisasi pengeluaran dana modal |
| **Owner** | Injeksi Modal | Kas operasional kantor mendekati Rp 0 | In-App + Email + FCM | 🔴 CRITICAL | Keputusan pencairan injeksi kas top-up |
| **Admin Operasional** | Dokumen Trip | Pengiriman selesai &gt; 3 hari tanpa nomor invoice | In-App | 🟡 WARNING | Terbitkan draft invoice dari surat jalan terkait |
| **Admin Operasional** | Operasional | Transaksi kas ditandai lunas (`PAID`) | In-App | 🔵 INFO | Verifikasi dokumen tanda terima surat jalan |
| **IT Super Admin** | Audit Keamanan | Perubahan permission pada role admin/finance | In-App + Email | 🟡 WARNING | Audit log keamanan & pencegahan akses ilegal |
| **IT Super Admin** | Sistem | Percobaan login gagal berulang kali (&gt; 5x) | In-App + Email | 🔴 CRITICAL | Investigasi potensi serangan brute force |

---

## 5. Analisis Mendalam Saluran Pengiriman (*Delivery Channels*)

### Kanal 1: In-App Notification Center (Wajib & Utama di Web)
Antarmuka internal aplikasi yang selalu terlihat saat staf membuka web di browser:
* **Ikon Lonceng di Navbar Atas**: Terletak di samping nama dan foto profil pengguna.
* **Badge Jumlah Belum Dibaca (*Unread Counter*)**: Menampilkan angka merah menyala jika ada notifikasi baru.
* **Dropdown Popover Cepat**: Menampilkan 5 notifikasi terbaru saat lonceng diklik, dengan opsi "Tandai Sudah Dibaca" dan "Lihat Semua".
* **Halaman Penuh Notifikasi (`/dashboard/notifications`)**: Halaman filter khusus berdasarkan kategori (*Semua, Invoices, Kas, Keamanan*) dan status baca.

---

### Kanal 2: Firebase Cloud Messaging (FCM) Web & Mobile Push Notification (Real-Time & Rp 0)

FCM adalah solusi terbaik untuk mengirimkan notifikasi instan langsung ke perangkat pengguna:
1. **Keunggulan Bisnis Utama**:
   * **Menembus Layar Kunci Smartphone / Desktop**: Notifikasi pop-up muncul di HP (PWA Android dan iOS 16.4+) maupun laptop pengguna **meskipun browser atau aplikasi sedang ditutup**.
   * **100% Gratis Tanpa Batas Kuota**: Berbeda dengan WhatsApp Gateway yang mengenakan biaya per pesan (Rp 300 - Rp 500/pesan), FCM disediakan Google secara gratis tanpa batas kuota.
   * **Multi-Device Sync**: Satu pengguna (misal Direktur) yang login di PC kantor dan HP pribadi akan menerima notifikasi di kedua perangkat secara bersamaan.
2. **Kasus Penggunaan Paling Krusial untuk FCM**:
   * Peringatan darurat: Saldo kas operasional kantor menipis (< Rp 15 Juta).
   * Deteksi transaksi rugi: Margin minus (< 0%) yang diinput staf langsung membunyikan HP Direktur.
   * Invoice nominal besar yang jatuh tempo pada hari tersebut.
3. **Pengalaman Pengguna (*Opt-In Flow*)**:
   * Menggunakan banner permintaan izin elegan (*soft-ask modal*) di awal login: *"Izinkan PT. Adijayantara mengirimkan pemberitahuan penting terkait jatuh tempo invoice dan kondisi kas darurat?"*
   * Jika pengguna mengklik *"Izinkan"*, token FCM unik perangkat akan disimpan ke database backend.

---

### Kanal 3: Email Notification System (Resmi, Berkas Lampiran, & Penagihan Eksternal)

Email memegang peran formal B2B yang tidak bisa digantikan oleh kanal lain:
1. **Penagihan B2B Otomatis ke Klien (*Automated Client Invoicing Reminder*):**
   * Sistem otomatis mengirimkan email resmi atas nama PT. Adijayantara Logistics Indonesia ke email finance klien saat H-3, Hari H, dan Overdue.
   * Dilengkapi rincian nomor invoice, nominal, tanggal jatuh tempo, rekening bank resmi, dan **lampiran dokumen PDF invoice**.
2. **Executive Weekly & Monthly Digest (Direktur & Owner):**
   * Dikirim otomatis setiap **Senin pukul 07:00 WIB** atau **Tanggal 1 setiap bulan**.
   * Menampilkan infografis HTML ringkas: total revenue, biaya vendor, laba bersih, piutang tertagih, dan **lampiran file Excel laporan kas berjalan (.xlsx)**.
3. **Peringatan Tingkat Tinggi & Audit Keamanan**:
   * Backup arsip resmi saat ada pengeluaran kas bernilai jumbo (> Rp 50 Juta) atau perubahan hak akses pengguna.

---

### Kanal 4: Daily Scheduled Digest (Otomatisasi Latar Belakang)
* Scheduler / Cron Job di sisi backend Go yang berjalan otomatis setiap hari kerja pukul **08:00 WIB** (sebelum jam operasional armada aktif).
* Mengagregasi seluruh invoice yang jatuh tempo pada hari tersebut dan menyusun ringkasan ke dalam *feed* notifikasi In-App dan Email ringkasan pagi.

---

### Kanal 5: WhatsApp / Telegram Bot Gateway (Opsional Masa Depan)
* Ditujukan spesifik untuk operasional supir di lapangan yang tidak memiliki akses email formal, untuk konfirmasi uang jalan atau update status bongkar muat.

---

### Matriks Perbandingan 4 Saluran Notifikasi Utama:

| Kriteria | 1. In-App (Lonceng Web) | 2. FCM Web Push Notification | 3. Email Notification | 4. WhatsApp Gateway |
| :--- | :--- | :--- | :--- | :--- |
| **Kecepatan Respon** | Saat membuka web | **Seketika (< 3 detik)** | 10 – 30 Menit | Seketika (*Instant*) |
| **Tembus Layar Tutup** | ❌ Tidak | ✅ **Ya (Layar Kunci HP & Desktop)** | ⚠️ Tergantung notif email | ✅ Ya (WhatsApp chat) |
| **Sifat Pesan** | Ringkas, internal | Cepat, ringkas, *clickable* | Formal, legal, lampiran file | Cepat, informal |
| **Audiens Utama** | Admin & Finance di kantor | **Direktur, Owner, Finance** | Finance, Direktur, **dan Klien Luar**| Supir Lapangan, Rekanan |
| **Kapasitas Lampiran** | ❌ Tidak | ❌ Tidak (Hanya teks & ikon) | ✅ **Ya (PDF Invoice & Excel)** | ⚠️ Gambar/Dokumen terbatas |
| **Biaya Operasional** | **Gratis** | **Gratis (Google FCM)** | **Gratis / Murah (SMTP)** | Berbayar per pesan (Meta API) |
| **Kasus Terbaik** | Checklist kerja harian | **Peringatan Saldo Kritis & Margin Rugi** | **Penagihan Klien & Laporan Mingguan**| Operasional supir jalan |

---

## 6. Rancangan Model Data & Arsitektur Teknis

### 6.1 Skema Tabel Notifikasi Internal (`notifications`)

```sql
CREATE TYPE notification_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
CREATE TYPE notification_category AS ENUM ('INVOICE', 'CASHFLOW', 'VENDOR', 'SHIPMENT', 'SYSTEM');

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Jika ditargetkan ke spesifik user (NULL = broadcast per role)
  target_role VARCHAR(50),                             -- Contoh: 'finance', 'direktur', 'owner', 'admin'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category notification_category NOT NULL DEFAULT 'SYSTEM',
  severity notification_severity NOT NULL DEFAULT 'INFO',
  action_url VARCHAR(255),                             -- Deep link, misal: '/dashboard/invoices?search=INV/2026/08/001'
  metadata JSONB,                                      -- Metadata tambahan { invoice_id: 12, amount: 45000000 }
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_role ON notifications(target_role, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### 6.2 Skema Tabel Token Perangkat FCM (`user_fcm_tokens`)

Satu akun pengguna (`users`) dapat memiliki banyak perangkat (PC kantor, HP pribadi Android, Tablet iPad). Tabel ini mengelola token perangkat aktif:

```sql
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT UNIQUE NOT NULL,
  device_type VARCHAR(50),       -- 'web_desktop', 'mobile_pwa_android', 'mobile_pwa_ios'
  device_name VARCHAR(150),      -- Contoh: 'Chrome on Windows', 'Samsung S23 Mobile PWA'
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fcm_tokens_user ON user_fcm_tokens(user_id, is_active);
CREATE INDEX idx_fcm_tokens_token ON user_fcm_tokens(fcm_token);
```

### 6.3 Skema Tabel Log Pengiriman Email (`email_notification_logs`)

```sql
CREATE TYPE email_status AS ENUM ('QUEUED', 'SENT', 'FAILED');

CREATE TABLE IF NOT EXISTS email_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(150),
  subject VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'INVOICE_REMINDER', 'WEEKLY_DIGEST', 'LOW_BALANCE_ALERT'
  reference_id VARCHAR(100),       -- Nomor invoice atau ID transaksi kas
  status email_status NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_recipient ON email_notification_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_notification_logs(status);
```

---

### 6.4 Arsitektur Teknis Integrasi FCM

#### A. Sisi Frontend (Next.js 16 + PWA `/m`)
1. **Firebase Configuration**:
   Konfigurasi credentials Firebase Client di `.env.local`:
   * `NEXT_PUBLIC_FIREBASE_API_KEY`
   * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   * `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   * `NEXT_PUBLIC_FIREBASE_APP_ID`
   * `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
2. **Background Service Worker (`public/firebase-messaging-sw.js`)**:
   Berjalan di thread background browser untuk menangkap pesan push saat aplikasi tidak dibuka:
   ```javascript
   importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
   importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

   firebase.initializeApp({ /* config */ });
   const messaging = firebase.messaging();

   messaging.onBackgroundMessage((payload) => {
     const title = payload.notification.title || 'PT. Adijayantara Logistics';
     const options = {
       body: payload.notification.body,
       icon: '/logo.png',
       badge: '/icons/badge.png',
       data: { url: payload.data.action_url || '/dashboard' }
     };
     self.registration.showNotification(title, options);
   });

   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     event.waitUntil(clients.openWindow(event.notification.data.url));
   });
   ```
3. **Custom React Hook (`useFCM.ts`)**:
   Menangani permintaan izin `Notification.requestPermission()`, pengambilan token registrasi perangkat, dan pengiriman token ke backend API (`POST /api/v1/notifications/fcm-token`).

#### B. Sisi Backend (Golang `services/core-go`)
1. **Official Firebase Admin SDK**:
   Menggunakan paket resmi Google Go: `firebase.google.com/go/v4` dan `firebase.google.com/go/v4/messaging`.
2. **Service Layer (`FCMService`)**:
   * `SendToUser(ctx, userID, title, body, actionURL, data)`: Mengambil seluruh token aktif milik user dari `user_fcm_tokens` dan mengirimkan pesan.
   * `SendToRole(ctx, roleCode, title, body, actionURL, data)`: Mengirimkan pesan *multicast* ke seluruh perangkat staf dalam role tertentu (contoh: seluruh staf `finance` atau seluruh `direktur`).
3. **Pembersihan Token Basi (*Stale Token Cleanup*)**:
   Jika FCM mengembalikan error `messaging.IsUnregistered(err)` atau token tidak lagi valid, backend Go secara otomatis menandai `is_active = false` pada tabel `user_fcm_tokens` agar tidak membebani pengiriman berikutnya.
4. **Eksekusi Asinkron Non-blocking**:
   Seluruh pemanggilan FCM dan pengiriman email dijalankan di dalam *Goroutine* / *background worker* Go, sehingga performa API transaksi kas atau invoice tetap di bawah 50ms tanpa terhambat antrean jaringan.

---

### 6.5 Desain Endpoint REST API Lengkap

| Method | Endpoint | Fungsi | Akses Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications` | Mengambil daftar notifikasi pengguna (filter unread, pagination) | Semua yang login |
| `GET` | `/api/v1/notifications/unread-count` | Mengambil jumlah notifikasi belum dibaca (*counter badge*) | Semua yang login |
| `PATCH` | `/api/v1/notifications/:id/read` | Menandai satu notifikasi telah dibaca | Pemilik notifikasi |
| `POST` | `/api/v1/notifications/read-all` | Menandai seluruh notifikasi telah dibaca | Pemilik notifikasi |
| `POST` | `/api/v1/notifications/fcm-token` | Mendaftarkan token FCM perangkat baru milik pengguna | Semua yang login |
| `DELETE`| `/api/v1/notifications/fcm-token` | Menghapus token FCM perangkat saat pengguna logout | Semua yang login |
| `POST` | `/api/v1/invoices/:id/send-reminder-email` | Memicu pengiriman email penagihan manual ke klien | Finance & Admin |

---

## 7. Peta Jalan Implementasi Bertahap (*Phased Roadmap*)

```
+-----------------------------------------------------------------------------+
|                     PETA JALAN IMPLEMENTASI NOTIFIKASI                      |
+-----------------------------------------------------------------------------+
|                                                                             |
|  FASE 1: Fondasi In-App & Notifikasi Finansial Kritis (Prioritas Utama)     |
|   ├── Pembuatan tabel notifications & API dasar (Get, Read, Count)          |
|   ├── Komponen Ikon Lonceng + Dropdown di Navbar Web Next.js                |
|   ├── Trigger Otomatis: Invoice Jatuh Tempo (H-3, Hari H, Overdue)          |
|   ├── Trigger Otomatis: Peringatan Saldo Kas Menipis (< Ambang Batas)       |
|   └── Penegasan input wajib email billing pada Form Master Customer         |
|                                                                             |
|  FASE 2: Layanan Email Formal & Kontrol Operasional                         |
|   ├── Setup modul pengiriman Email SMTP di Go (Background Worker)           |
|   ├── Template Email Pengingat Tagihan Klien + Lampiran Dokumen Invoice PDF |
|   ├── Alert Margin Negatif / Laba Rendah (< 5%)                             |
|   ├── Alert Pengiriman Selesai Belum Ter-Invoice (> 3 Hari)                 |
|   ├── Halaman Riwayat Notifikasi Lengkap (/dashboard/notifications)         |
|   └── Background Cron Job Pukul 08:00 WIB untuk Pengecekan Harian           |
|                                                                             |
|  FASE 3: FCM Web & Mobile Push Notification (Real-Time Darurat)             |
|   ├── Setup Firebase Project & Service Account Key di Backend Go            |
|   ├── Pembuatan tabel user_fcm_tokens & Endpoint Registrasi Token           |
|   ├── Implementasi Service Worker di Next.js (Desktop & Mobile PWA /m)      |
|   ├── Pop-up Notifikasi Layar Kunci HP untuk Saldo Kritis & Margin Rugi     |
|   ├── Weekly Executive Digest Email ke Direktur & Owner (Senin Pagi)        |
|   └── Halaman Pengaturan Preferensi Notifikasi per Pengguna                 |
+-----------------------------------------------------------------------------+
```

---

## 8. Ringkasan & Kesimpulan

Dengan menggabungkan **In-App Notification**, **FCM Web Push**, dan **Email System**:

1. **In-App (Lonceng Web)**: Menjadi panduan kerja harian staf internal saat aktif di depan komputer.
2. **FCM Web Push**: Menjadi **alarm seketika (real-time)** di layar kunci HP Direktur, Owner, dan Finance saat ada kejadian darurat (saldo kas kritis, margin transaksi rugi, invoice jatuh tempo hari ini) — **100% gratis tanpa biaya per pesan**.
3. **Email**: Menjadi jalur **formal B2B**, alat penagihan otomatis ke klien dengan **lampiran PDF invoice asli**, serta laporan rekapitulasi eksekutif mingguan/bulanan dengan **lampiran Excel**.

Dokumen ini merupakan spesifikasi lengkap dan acuan resmi bagi tim pengembang saat pengembangan modul notifikasi dimulai di masa depan.
