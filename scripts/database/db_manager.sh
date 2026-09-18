#!/usr/bin/env bash
# ==============================================================================
# PT ADIJAYANTARA LOGISTICS INDONESIA
# DATABASE & DEMO DATA MANAGEMENT AUTOMATION
# ==============================================================================
# Script ini mengelola siklus hidup database (migrasi, seeding data demo,
# pembersihan data transaksi, reset skema, dan status kesehatan data).
# Kompatibel dengan docker-compose dan podman-compose.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MIGRATIONS_DIR="${ROOT_DIR}/services/core-go/migrations"
SEED_SQL="${SCRIPT_DIR}/seed_demo_data.sql"
SEED_SQL_2026="${SCRIPT_DIR}/seed_demo_2026_jan_sep.sql"

DB_USER="${POSTGRES_USER:-cashflow_user}"
DB_NAME="${POSTGRES_DB:-cashflow_db}"

# Visual colors
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_CYAN='\033[36m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_PURPLE='\033[35m'

log_info() {
    echo -e "${C_CYAN}${C_BOLD}[INFO]${C_RESET} $1"
}

log_success() {
    echo -e "${C_GREEN}${C_BOLD}[SUCCESS]${C_RESET} $1"
}

log_warn() {
    echo -e "${C_YELLOW}${C_BOLD}[WARNING]${C_RESET} $1"
}

log_error() {
    echo -e "${C_RED}${C_BOLD}[ERROR]${C_RESET} $1"
}

log_step() {
    echo -e "${C_PURPLE}${C_BOLD}==>${C_RESET} ${C_BOLD}$1${C_RESET}"
}

# -----------------------------------------------------------------------------
# Helper: Pastikan service PostgreSQL & Redis berjalan dan siap koneksi
# -----------------------------------------------------------------------------
ensure_db_ready() {
    log_info "Memeriksa kesiapan PostgreSQL..."
    if ! docker-compose exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log_warn "PostgreSQL belum siap. Menjalankan infrastruktur database..."
        docker-compose up -d postgres redis
    fi

    local retries=15
    local count=0
    until docker-compose exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
        count=$((count + 1))
        if [ "$count" -ge "$retries" ]; then
            log_error "PostgreSQL tidak siap menerima koneksi setelah ${retries} detik."
            exit 1
        fi
        sleep 1
    done
    log_success "PostgreSQL (${DB_NAME}) aktif dan siap menerima query."
}

# -----------------------------------------------------------------------------
# 1. MIGRASI DATABASE (Menjalankan seluruh file *.up.sql secara berurutan)
# -----------------------------------------------------------------------------
run_migrations() {
    ensure_db_ready
    log_step "Menjalankan migrasi SQL skema database..."
    
    local migration_files=($(ls -1 "${MIGRATIONS_DIR}"/*.up.sql | sort))
    local total="${#migration_files[@]}"

    if [ "$total" -eq 0 ]; then
        log_warn "Tidak ditemukan file migrasi di ${MIGRATIONS_DIR}"
        return 0
    fi

    log_info "Ditemukan ${total} file migrasi. Menjalankan secara berurutan..."
    local idx=1
    for file in "${migration_files[@]}"; do
        local filename="$(basename "${file}")"
        echo -e "  [${idx}/${total}] Menjalankan ${C_BOLD}${filename}${C_RESET}..."
        docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${file}" > /dev/null
        idx=$((idx + 1))
    done

    log_success "Seluruh ${total} file migrasi berhasil diaplikasikan ke database!"
}

# -----------------------------------------------------------------------------
# 2. SEEDING DATA DEMO EKSEKUTIF
# -----------------------------------------------------------------------------
run_seed() {
    ensure_db_ready
    log_step "Memuat data demo eksekutif PT Adijayantara..."
    
    if [ ! -f "${SEED_SQL}" ]; then
        log_error "File seeder tidak ditemukan di ${SEED_SQL}"
        exit 1
    fi

    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SEED_SQL}" > /dev/null
    flush_redis
    log_success "Data demo eksekutif berhasil dimuat secara penuh!"
    show_status
}

# -----------------------------------------------------------------------------
# 2b. SEEDING DATA DEMO EKSEKUTIF 9 BULAN (JANUARI - SEPTEMBER 2026)
# -----------------------------------------------------------------------------
run_seed_2026() {
    ensure_db_ready
    log_step "Memuat data demo eksekutif 9 bulan (Januari - September 2026)..."
    
    if [ ! -f "${SEED_SQL_2026}" ]; then
        log_error "File seeder 2026 tidak ditemukan di ${SEED_SQL_2026}"
        exit 1
    fi

    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SEED_SQL_2026}" > /dev/null
    flush_redis
    log_success "Data demo eksekutif 9 bulan (Jan - Sep 2026) berhasil dimuat!"
    show_status
}

# -----------------------------------------------------------------------------
# 3. PEMBERSIHAN DATA TRANSAKSI (SOFT RESET / KEEP MASTER DATA)
# -----------------------------------------------------------------------------
run_clean() {
    ensure_db_ready
    log_step "Membersihkan data transaksi (buku kas, invoices, notifikasi)..."
    log_info "Master data (users, roles, permissions, customers, vendors, presets) tetap dipertahankan."

    local truncate_sql="
    DO \$\$ 
    BEGIN
        TRUNCATE TABLE 
            invoice_payment_history, 
            invoice_due_date_history, 
            notifications, 
            invoices, 
            cashflow_entries 
        RESTART IDENTITY CASCADE;

        IF to_regclass('public.cashflow_entries_history') IS NOT NULL THEN
            EXECUTE 'TRUNCATE TABLE cashflow_entries_history RESTART IDENTITY CASCADE;';
        END IF;
    END \$\$;
    "

    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "${truncate_sql}" > /dev/null
    flush_redis
    log_success "Seluruh data transaksi dan history berhasil dikosongkan!"
    show_status
}

# -----------------------------------------------------------------------------
# 4. RESET SKEMA TOTAL (EMPTY SCHEMA RESET)
# -----------------------------------------------------------------------------
run_reset() {
    ensure_db_ready
    log_step "Mereset seluruh skema database (Drop & Recreate Schema public)..."
    
    local reset_sql="
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO ${DB_USER};
    GRANT ALL ON SCHEMA public TO public;
    "

    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "${reset_sql}" > /dev/null
    log_info "Skema public berhasil di-drop dan dibuat baru."
    
    run_migrations
    flush_redis
    log_success "Reset skema database selesai (kondisi bersih / migrasi tereksekusi)!"
}

# -----------------------------------------------------------------------------
# 5. FRESH SETUP TOTAL (RESET + MIGRATE + SEED + FLUSH REDIS)
# -----------------------------------------------------------------------------
run_fresh() {
    ensure_db_ready
    log_step "Menjalankan Fresh Setup Database (Reset Skema -> Migrasi -> Seed Demo -> Flush Redis)..."
    
    local reset_sql="
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO ${DB_USER};
    GRANT ALL ON SCHEMA public TO public;
    "
    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "${reset_sql}" > /dev/null
    log_info "1/4 Skema public berhasil diinisialisasi ulang."
    
    # 2. Migrasi
    run_migrations
    
    # 3. Seed
    log_step "3/4 Memuat data demo eksekutif..."
    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SEED_SQL}" > /dev/null
    log_success "Data demo eksekutif berhasil dimuat!"
    
    # 4. Flush Redis
    flush_redis
    
    log_success "FRESH SETUP LENGKAP SELESAI!"
    echo ""
    show_status
}

# -----------------------------------------------------------------------------
# 5b. FRESH SETUP 9 BULAN (RESET + MIGRATE + SEED 2026 + FLUSH REDIS)
# -----------------------------------------------------------------------------
run_fresh_2026() {
    ensure_db_ready
    log_step "Menjalankan Fresh Setup Database 9 Bulan (Reset Skema -> Migrasi -> Seed Jan-Sep 2026 -> Flush Redis)..."
    
    local reset_sql="
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO ${DB_USER};
    GRANT ALL ON SCHEMA public TO public;
    "
    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "${reset_sql}" > /dev/null
    log_info "1/4 Skema public berhasil diinisialisasi ulang."
    
    # 2. Migrasi
    run_migrations
    
    # 3. Seed 2026
    log_step "3/4 Memuat data demo eksekutif 9 bulan (Januari - September 2026)..."
    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SEED_SQL_2026}" > /dev/null
    log_success "Data demo eksekutif 9 bulan berhasil dimuat!"
    
    # 4. Flush Redis
    flush_redis
    
    log_success "FRESH SETUP 9 BULAN LENGKAP SELESAI!"
    echo ""
    show_status
}

# -----------------------------------------------------------------------------
# 6. STATUS & STATISTIK JUMLAH DATA TABEL
# -----------------------------------------------------------------------------
show_status() {
    ensure_db_ready
    echo ""
    echo -e "${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
    echo -e "${C_BOLD}   RINGKASAN STATISTIK BASIS DATA - PT ADIJAYANTARA LOGISTICS INDONESIA       ${C_RESET}"
    echo -e "${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"

    local query="
    SELECT 
        r.tablename AS \"Tabel Database\",
        r.row_count AS \"Jumlah Baris\",
        r.category  AS \"Kategori Data\"
    FROM (
        SELECT 'users' as tablename, count(*)::text as row_count, 'Master & RBAC' as category FROM users
        UNION ALL SELECT 'roles', count(*)::text, 'Master & RBAC' FROM roles
        UNION ALL SELECT 'permissions', count(*)::text, 'Master & RBAC' FROM permissions
        UNION ALL SELECT 'role_permissions', count(*)::text, 'Master & RBAC' FROM role_permissions
        UNION ALL SELECT 'customers', count(*)::text, 'Master Operasional' FROM customers
        UNION ALL SELECT 'vendors', count(*)::text, 'Master Operasional' FROM vendors
        UNION ALL SELECT 'activity_presets', count(*)::text, 'Master Operasional' FROM activity_presets
        UNION ALL SELECT 'invoices', count(*)::text, 'Transaksi Piutang' FROM invoices
        UNION ALL SELECT 'invoice_payment_history', count(*)::text, 'Histori Pelunasan' FROM invoice_payment_history
        UNION ALL SELECT 'invoice_due_date_history', count(*)::text, 'Histori Reschedule' FROM invoice_due_date_history
        UNION ALL SELECT 'cashflow_entries', count(*)::text, 'Transaksi Kas & Shipment' FROM cashflow_entries
        UNION ALL SELECT 'notifications', count(*)::text, 'Pusat Notifikasi' FROM notifications
    ) r
    ORDER BY r.category, r.tablename;
    "

    docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -c "${query}"
    
    # Saldo kas riil saat ini
    local saldo_query="SELECT concat('Rp ', to_char(saldo, 'FM999,999,999,999')) FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1;"
    local latest_saldo=$(docker-compose exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "${saldo_query}" 2>/dev/null || echo "")
    if [ -z "$latest_saldo" ]; then
        latest_saldo="Rp 0 (Belum ada transaksi)"
    fi
    echo -e "${C_BOLD}Saldo Buku Kas Berjalan Saat Ini: ${C_GREEN}${latest_saldo}${C_RESET}"
    echo -e "${C_BOLD}${C_CYAN}==============================================================================${C_RESET}"
    echo ""
}

# -----------------------------------------------------------------------------
# 7. FLUSH CACHE REDIS
# -----------------------------------------------------------------------------
flush_redis() {
    log_step "Mengosongkan cache Redis (Session, Cache Query & Metrik)..."
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        docker-compose exec -T redis redis-cli flushall > /dev/null 2>&1 || true
        log_success "Cache Redis berhasil dikosongkan (FLUSHALL OK)."
    else
        log_warn "Container Redis tidak aktif atau belum siap. Melewati flush Redis."
    fi
}

# -----------------------------------------------------------------------------
# CLI Entry Point
# -----------------------------------------------------------------------------
case "$1" in
    migrate)
        run_migrations
        ;;
    seed)
        run_seed
        ;;
    seed-2026)
        run_seed_2026
        ;;
    clean)
        run_clean
        ;;
    reset)
        run_reset
        ;;
    fresh)
        run_fresh
        ;;
    fresh-2026)
        run_fresh_2026
        ;;
    status)
        show_status
        ;;
    redis-flush)
        flush_redis
        ;;
    *)
        echo "Penggunaan: $0 {migrate|seed|seed-2026|clean|reset|fresh|fresh-2026|status|redis-flush}"
        exit 1
        ;;
esac
