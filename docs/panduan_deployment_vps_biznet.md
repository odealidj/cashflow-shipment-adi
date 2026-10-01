# Panduan Deployment VPS Biznet GIO (Ubuntu 22.04 LTS)
## PT. Adijayantara Logistics Indonesia — Cashflow, Shipment & Invoice System

Dokumen ini merupakan panduan komprehensif (*step-by-step production runbook*) untuk melakukan setup, konfigurasi, instalasi dependensi, hingga *go-live* sistem aplikasi **PT. Adijayantara Logistics Indonesia** pada server Virtual Private Server (VPS) **Biznet GIO / Biznet Cloud**.

---

## 🖥️ Spesifikasi Server & Analisis Kapasitas

| Parameter | Spesifikasi VPS Biznet | Status Kecukupan Sistem |
| :--- | :--- | :--- |
| **Paket Layanan** | **Biznet GIO MS.4.2** | Sangat Ideal untuk Arsitektur *Modular Monolith* |
| **Sistem Operasi** | **Ubuntu 22.04 LTS (Jammy Jellyfish)** | Tier-1 Didukung Penuh (Kernel 5.15+ LTS) |
| **Processor** | **2 vCPU** | Cukup untuk kompilasi Go & pemrosesan kueri database |
| **Memori (RAM)** | **4 GB RAM Fisik** | Ideal (Konsumsi sistem operasional ~800 MB – 1.2 GB) |
| **Penyimpanan** | **60 GB SSD / NVMe Storage** | Sangat Luas (Aplikasi + DB ~3–5 GB, sisa >50 GB) |
| **Alamat IP** | **103.94.238.109 (IP Publik Statis)** | Siap untuk Domain / A-Record DNS & SSL Let's Encrypt |

### Estimasi Alokasi Konsumsi RAM (Budget 4 GB):
```
┌────────────────────────────────────────────────────────┐
│  Ubuntu 22.04 Base System         : ~180 MB            │
│  PostgreSQL 15 (Docker)           : ~180 MB - 250 MB   │
│  Redis 7 In-Memory Cache (Docker) : ~30 MB - 50 MB     │
│  Core Go API Service (Native)     : ~35 MB - 60 MB     │
│  Next.js 16 Web & PWA (PM2 Node)  : ~150 MB - 220 MB   │
│  Nginx Reverse Proxy              : ~25 MB             │
├────────────────────────────────────────────────────────┤
│  TOTAL AKTIF (IDLE / OPERASIONAL) : ~600 MB - 800 MB   │
│  SISA MEMORI BEBAS (BUFFER/CACHE) : ~3.2 GB (LUAS!)    │
└────────────────────────────────────────────────────────┘
```
> [!NOTE]
> Meskipun kapasitas RAM 4 GB sangat lapang untuk operasional harian, proses kompilasi awal (*build*) Next.js dapat memicu lonjakan memori sesaat (*spike*) hingga 1.5–2 GB. Oleh karena itu, **pembuatan 4 GB SWAP Memory** pada panduan ini **wajib dilakukan** guna menjamin stabilitas 100% tanpa risiko *Out of Memory (OOM)*.

---

## 🏗️ Topologi Arsitektur Deployment di VPS

```mermaid
flowchart TD
    Client["Pengguna (Browser Desktop / HP Android)"] -->|Port 80 / 443 HTTPS| Nginx["Nginx Reverse Proxy (Port 80 & 443 SSL)"]
    
    subgraph VPS["VPS Biznet GIO (MS.4.2 — Ubuntu 22.04)"]
        Nginx -->|Reverse Proxy /| NextJS["Frontend: Next.js 16 (PM2)<br/>Port 3000 (Internal)"]
        Nginx -->|Reverse Proxy /api/| GoAPI["Backend: Core Go API (Systemd)<br/>Port 8080 (Internal)"]
        
        GoAPI -->|TCP Pool :5432| Postgres["PostgreSQL 15 Container<br/>(Docker: cashflow_db)"]
        GoAPI -->|TCP Cache :6379| Redis["Redis 7 In-Memory Container<br/>(Docker: cashflow_redis)"]
    end
```

---

## 📦 Daftar Paket & Tools yang Mesti Di-install

Berikut adalah ringkasan seluruh perangkat lunak yang wajib dipasang di VPS beserta fungsinya:

| No | Nama Software / Tools | Versi Rekomendasi | Peran dalam Sistem |
| :-: | :--- | :---: | :--- |
| 1 | **Docker Engine & Compose** | `24.x+` / Compose v2 | Menjalankan kontainer PostgreSQL 15 & Redis 7 |
| 2 | **Golang Compiler** | `1.26.3` (Sesuai `go.mod`) | Mengompilasi dan mengeksekusi Core Go API |
| 3 | **Node.js & npm** | `v20 LTS` (Iron) | Lingkungan runtime frontend Next.js 16 |
| 4 | **PM2 Process Manager** | `Latest` | Menjaga Next.js hidup 24/7 di background & auto-start saat reboot |
| 5 | **Nginx Web Server** | `1.18+` (Ubuntu Repo) | Reverse Proxy port 80/443, SSL termination, kompresi Gzip |
| 6 | **Certbot (Let's Encrypt)**| `Latest` | Menerbitkan dan memperpanjang sertifikat SSL (HTTPS) gratis |
| 7 | **Git & Build Essentials** | `Ubuntu Native` | Mengambil kode repositori & utilitas kompilasi `make` |
| 8 | **UFW (Uncomplicated Firewall)**| `Ubuntu Native` | Mengamankan port server (hanya buka SSH, HTTP, HTTPS) |

---

## 🚀 Panduan Langkah demi Langkah (Step-by-Step)

### FASE 1: Akses Server, Update & Setup Keamanan Dasar

#### 1. Login ke VPS via SSH
Gunakan terminal komputer Anda (Terminal Linux/macOS atau PowerShell/Git Bash di Windows):

Pastikan berkas kunci privat SSH (`adijayantara-ssh.pem`) memiliki hak akses aman (hanya dapat dibaca oleh pemilik):
```bash
chmod 400 adijayantara-ssh.pem
```

Jalankan perintah koneksi SSH:
```bash
ssh -i adijayantara-ssh.pem adminadi@103.94.238.109
```

> [!TIP]
> Karena login menggunakan pengguna administrator non-root (`adminadi`), Anda dapat beralih langsung ke sesi root penuh agar tidak perlu mengetikkan `sudo` pada setiap instruksi instalasi selanjutnya:
> ```bash
> sudo -i
> ```

#### 2. Update Paket Sistem Operasi
```bash
apt update && apt upgrade -y
apt install -y curl wget git make build-essential htop software-properties-common ufw ca-certificates gnupg lsb-release
```

#### 3. Atur Zona Waktu ke Waktu Indonesia Barat (WIB)
Penting agar pencatatan audit log, transaksi kas, dan jatuh tempo invoice akurat sesuai waktu operasional kantor:
```bash
timedatectl set-timezone Asia/Jakarta
timedatectl status
```

#### 4. Wajib: Konfigurasi 4 GB SWAP Memory
Perintah ini mengalokasikan memori cadangan pada SSD agar server tidak kehabisan RAM saat mengeksekusi `npm run build`:
```bash
# 1. Alokasikan file swap 4 GB
fallocate -l 4G /swapfile
chmod 600 /swapfile

# 2. Format dan aktifkan swap
mkswap /swapfile
swapon /swapfile

# 3. Permanenkan di /etc/fstab agar tetap aktif saat server reboot
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 4. Optimalkan swappiness (nilai 10 ideal untuk server database & aplikasi)
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf

# 5. Verifikasi swap aktif
free -h
```
*(Pastikan pada baris `Swap:` tertera total ~`4.0Gi`).*

#### 5. Konfigurasi Firewall UFW
Tutup seluruh akses port berbahaya dari luar. Buka hanya SSH, HTTP, dan HTTPS:
```bash
ufw default deny incoming
ufw default allow outgoing

# Buka akses esensial
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Aktifkan firewall
ufw --force enable
ufw status verbose
```
> [!CAUTION]
> **JANGAN PERNAH** membuka port `5432` (PostgreSQL) atau `6379` (Redis) ke publik (`ufw allow 5432`). Kedua port ini cukup diakses secara lokal di dalam VPS oleh backend Golang.

---

### FASE 2: Instalasi Semua Perangkat Lunak Utama

#### 1. Pasang Docker Engine & Docker Compose Plugin
```bash
# 1. Tambahkan GPG key resmi Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 2. Daftarkan repositori Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Pasang Docker Engine & Compose
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Verifikasi instalasi Docker
docker --version
docker compose version
systemctl enable --now docker
```

#### 2. Pasang Golang 1.26+ (Sesuai go.mod Proyek)
> [!IMPORTANT]
> Proyek Core Go API kita menggunakan deklarasi `go 1.26.3` pada file `services/core-go/go.mod`. Oleh karena itu, kita wajib memasang Golang versi 1.26.3 agar proses kompilasi binary berjalan lancar tanpa konflik versi toolchain.

```bash
# Unduh binary resmi Golang 1.26.3
wget https://go.dev/dl/go1.26.3.linux-amd64.tar.gz

# Hapus instalasi lama jika ada, lalu ekstrak ke /usr/local
rm -rf /usr/local/go && tar -C /usr/local -xzf go1.26.3.linux-amd64.tar.gz

# Tambahkan Go ke Environment PATH sistem
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Bersihkan installer & verifikasi
rm -f go1.26.3.linux-amd64.tar.gz
go version
```
*(Pastikan terminal menampilkan `go version go1.26.3 linux/amd64`).*

#### 3. Pasang Node.js 20 LTS & PM2
```bash
# Pasang NodeSource repository untuk Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verifikasi Node & NPM
node -v
npm -v

# Pasang PM2 secara global
npm install -g pm2
pm2 -v
```

#### 4. Pasang Nginx Web Server & Certbot SSL
```bash
apt install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
nginx -v
```

---

### FASE 3: Unduh Repositori Proyek ke VPS

Kita letakkan source code aplikasi di direktori standar `/var/www/cashflow-shipment-app`:

```bash
# 1. Masuk ke direktori web
cd /var/www

# 2. Clone repositori aplikasi dari GitHub langsung ke folder /var/www/cashflow-shipment-app:
git clone -b feature/swagger-openapi-update https://github.com/odealidj/cashflow-shipment-adi.git /var/www/cashflow-shipment-app

# 3. Masuk ke direktori project
cd /var/www/cashflow-shipment-app
```

---

### FASE 4: Menyalakan Basis Data & Injeksi Data Awal

Di VPS, kita gunakan Docker Compose untuk menjalankan PostgreSQL 15 dan Redis 7:

#### 1. Jalankan Kontainer Database & Redis
```bash
cd /var/www/cashflow-shipment-app

# Nyalakan kontainer PostgreSQL & Redis
make infra-up
```
Verifikasi bahwa kedua kontainer telah berstatus `Up`:
```bash
docker compose ps
```

#### 2. Jalankan Migrasi Skema & Injeksi Data Demo Eksekutif 9 Bulan
Eksekusi perintah otomasi berikut untuk membuat tabel dan memuat data lengkap Januari s.d. September 2026:
```bash
make db-fresh-2026
```

#### 3. Periksa Kesiapan Data
```bash
make db-status
```
*Pastikan seluruh tabel terisi dan saldo kas berjalan akhir menunjukkan angka ~Rp 712.450.000.*

---

### FASE 5: Setup & Daemonisasi Backend Core Go (Systemd)

Menjalankan backend Go secara native (*compiled binary*) via **Systemd** memberikan performa tercepat dengan konsumsi RAM terendah (~40 MB).

#### 1. Siapkan File Konfigurasi `.env` Backend
```bash
cd /var/www/cashflow-shipment-app/services/core-go
cp .env.example .env
```
Edit file `.env`:
```bash
nano .env
```
Pastikan nilainya sesuai:
```env
PORT=8080
DATABASE_URL=postgres://cashflow_user:cashflow_password@localhost:5432/cashflow_db?sslmode=disable
REDIS_URL=localhost:6379

SUPERADMIN_EMAIL=odealidj.go@gmail.com
SUPERADMIN_PASSWORD=password123
SUPERADMIN_NAME=IT Super Admin
SUPERADMIN_PHONE=082111391380
```
*(Simpan dengan menekan `Ctrl + O`, `Enter`, lalu keluar dengan `Ctrl + X`).*

#### 2. Kompilasi Binary Go
```bash
cd /var/www/cashflow-shipment-app/services/core-go
mkdir -p bin
go build -ldflags="-s -w" -o bin/cashflow-core ./cmd/api
chmod +x bin/cashflow-core
```

#### 3. Buat Systemd Service Unit untuk Backend
Buat file service di `/etc/systemd/system/cashflow-backend.service`:
```bash
cat << 'EOF' > /etc/systemd/system/cashflow-backend.service
[Unit]
Description=Adijayantara Cashflow & Shipment Core Go API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/cashflow-shipment-app/services/core-go
ExecStart=/var/www/cashflow-shipment-app/services/core-go/bin/cashflow-core
Restart=always
RestartSec=5s
EnvironmentFile=/var/www/cashflow-shipment-app/services/core-go/.env

# Proteksi resource limit
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

#### 4. Aktifkan & Jalankan Service Backend
```bash
systemctl daemon-reload
systemctl enable --now cashflow-backend
systemctl status cashflow-backend
```
Uji respon endpoint lokal:
```bash
curl -i http://localhost:8080/api/v1/health
```
*(Jika muncul status `200 OK` dan JSON status kesehatan sistem, backend Go telah berjalan sempurna).*

---

### FASE 6: Setup & Daemonisasi Frontend Next.js (PM2)

> [!IMPORTANT]
> **Poin Kritis Konfigurasi API pada Frontend:**  
> Ketika pengguna membuka website dari laptop/HP, panggilan API dilakukan oleh browser pengguna. Agar browser tidak mencari `http://localhost:8080` di komputer pengguna sendiri, panggilan API harus menggunakan path relatif `/api/v1` yang akan diteruskan oleh Nginx ke Backend Go di port 8080.

#### 1. Sesuaikan `API_BASE_URL` di Frontend
Buka file `apiClient.ts`:
```bash
cd /var/www/cashflow-shipment-app/apps/web-next
```
Pastikan `API_BASE_URL` mengarah ke path relatif `/api/v1` atau URL domain Anda:
```bash
sed -i 's|http://localhost:8080/api/v1|/api/v1|g' src/lib/apiClient.ts
```
*(Atau jika ada komponen yang memanggil `http://localhost:8080/api/v1`, Anda dapat menggantinya menjadi relative path `/api/v1` dengan perintah cepat berikut):*
```bash
grep -rl "http://localhost:8080/api/v1" src/ | xargs sed -i 's|http://localhost:8080/api/v1|/api/v1|g'
```

#### 2. Install Dependensi & Build Next.js
```bash
cd /var/www/cashflow-shipment-app/apps/web-next

# Pasang packages
npm install

# Kompilasi aplikasi produksi
npm run build
```
*(Proses build akan selesai dalam 1–2 menit memanfaatkan Swap 4 GB yang telah kita siapkan).*

#### 3. Jalankan Next.js via PM2 Process Manager
```bash
cd /var/www/cashflow-shipment-app/apps/web-next

# Jalankan server produksi Next.js di background
pm2 start npm --name "cashflow-frontend" -- start

# Simpan state PM2 agar otomatis hidup saat VPS reboot
pm2 startup
# (Salin & jalankan perintah 'sudo env PATH=...' yang dimunculkan oleh pm2 startup jika ada)
pm2 save
```
Periksa status PM2:
```bash
pm2 status
```

---

### FASE 7: Konfigurasi Nginx Reverse Proxy & SSL HTTPS

Nginx bertindak sebagai gerbang terdepan yang menerima request publik pada port 80/443, lalu meneruskannya secara cerdas:
- Path `/api/` ➡️ Diteruskan ke Backend Go (`http://127.0.0.1:8080/api/`)
- Seluruh path lainnya (`/`) ➡️ Diteruskan ke Next.js (`http://127.0.0.1:3000/`)

#### 1. Buat File Konfigurasi Nginx
Buat file `/etc/nginx/sites-available/cashflow`:
```bash
nano /etc/nginx/sites-available/cashflow
```
Salin konfigurasi berikut (ganti `domainanda.com` dengan domain Anda, atau gunakan IP publik VPS jika belum ada domain):

```nginx
server {
    listen 80;
    # Jika belum memiliki domain, cukup gunakan IP VPS:
    server_name 103.94.238.109;
    # (Jika nantinya sudah membeli domain, ganti menjadi: server_name namadomain.com www.namadomain.com 103.94.238.109;)

    # Ukuran maksimum upload file (Excel Import s.d. 50MB)
    client_max_body_size 50M;

    # Gzip Compression untuk mempercepat loading
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 1. Routing API ke Backend Golang
    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Mendukung HttpOnly Cookie & Credentials
        proxy_pass_header Set-Cookie;

        # Timeout untuk proses kueri analitik & export excel besar
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # 2. Routing Web & PWA ke Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 2. Aktifkan Konfigurasi & Reload Nginx
```bash
# Aktifkan site
ln -s /etc/nginx/sites-available/cashflow /etc/nginx/sites-enabled/

# Hapus konfigurasi default Nginx
rm -f /etc/nginx/sites-enabled/default

# Tes sintaks Nginx
nginx -t

# Muat ulang Nginx
systemctl reload nginx
```

#### 3. Pasang Sertifikat SSL Gratis (Let's Encrypt HTTPS)
*Syarat: Pastikan Domain Anda sudah diarahkan (DNS A-Record) ke IP Publik VPS Biznet.*
```bash
certbot --nginx -d domainanda.com -d www.domainanda.com
```
*(Ikuti petunjuk di layar: masukkan email Anda dan pilih opsi redirect otomatis ke HTTPS).*  
Certbot akan otomatis memperbarui konfigurasi Nginx dan menjadwalkan perpanjangan otomatis (*auto-renewal*).

---

## ✅ FASE 8: Verifikasi & Uji Kelayakan Sistem Live

Buka browser dari laptop atau smartphone Anda:
1. **Desktop Dashboard**: `https://domainanda.com/dashboard` (atau `http://103.94.238.109/dashboard`)
2. **Mobile PWA**: `https://domainanda.com/m` (atau `http://103.94.238.109/m`)
3. **Login dengan Akun Demo**:
   - Email: `direktur.wildan@adijayantara.co.id` (Direktur)
   - Password: `password123`
4. **Verifikasi Fitur**:
   - Tab 1: Ringkasan Saldo Kas Berjalan & Kas Fisik vs Bank.
   - Tab 2: Tren Makro Eksekutif 9 Bulan & Modal Detail Angka.
   - Tab 3: Intelijen Strategis Eksekutif (6 Matriks Prediktif, Mode Rapat, Maximize Card).
   - Menu Invoices & Export Laporan Excel.

---

## 🛠️ FASE 9: Pemeliharaan & Prosedur Update Aplikasi

### 1. Otomasi Backup Basis Data Harian (Cronjob)
Sangat penting untuk menjaga keamanan data finansial. Buat folder backup dan cronjob otomatis setiap jam 02:00 dini hari:

```bash
mkdir -p /var/backups/cashflow_db

# Buat script backup
cat << 'EOF' > /usr/local/bin/backup-cashflow.sh
#!/bin/bash
BACKUP_DIR="/var/backups/cashflow_db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="$BACKUP_DIR/cashflow_db_$TIMESTAMP.sql.gz"

# Jalankan pg_dump via docker container
docker exec -t cashflow_db pg_dump -U cashflow_user cashflow_db | gzip > $FILENAME

# Hapus backup yang lebih lama dari 30 hari
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-cashflow.sh
```

Daftarkan ke cronjob:
```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-cashflow.sh") | crontab -
```

---

### 2. Prosedur Update Aplikasi (Ketika Ada Kode Baru di Git)
Jika tim developer melakukan commit perubahan baru ke repositori:

```bash
cd /var/www/cashflow-shipment-app

# 1. Ambil update terbaru dari GitHub
git pull origin main

# 2. Jika ada perubahan Backend Go:
cd services/core-go
go build -ldflags="-s -w" -o bin/cashflow-core ./cmd/api
systemctl restart cashflow-backend

# 3. Jika ada migrasi database baru:
cd /var/www/cashflow-shipment-app
make db-migrate

# 4. Jika ada perubahan Frontend Next.js:
cd /var/www/cashflow-shipment-app/apps/web-next
npm install
npm run build
pm2 restart cashflow-frontend

# 5. Selesai! Cek status
pm2 status
systemctl status cashflow-backend
```

---

## 🔍 Ringkasan Perintah Penting (Cheat Sheet Operasional)

| Aksi | Perintah Terminal |
| :--- | :--- |
| **Cek Penggunaan RAM & CPU** | `htop` atau `free -h` |
| **Cek Status Kontainer DB & Redis** | `docker compose ps` |
| **Lihat Log Backend Go** | `journalctl -u cashflow-backend -f -n 50` |
| **Lihat Log Frontend Next.js** | `pm2 logs cashflow-frontend` |
| **Restart Backend Go** | `systemctl restart cashflow-backend` |
| **Restart Frontend Next.js** | `pm2 restart cashflow-frontend` |
| **Bersihkan Cache Redis** | `make redis-flush` |
| **Cek Error Log Nginx** | `tail -f /var/log/nginx/error.log` |

---

*Dokumen panduan ini disiapkan khusus untuk infrastruktur Biznet GIO PT Adijayantara Logistics Indonesia.*
