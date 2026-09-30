#!/usr/bin/env bash
# ==============================================================================
# PT ADIJAYANTARA LOGISTICS INDONESIA
# LOCAL SERVICES & INFRASTRUCTURE ORCHESTRATION SCRIPT
# ==============================================================================
# Mengelola siklus hidup servis backend Go di host OS lokal bersama
# infrastruktur kontainer pendukung (PostgreSQL, Redis, Prometheus, k6).
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PID_DIR="${ROOT_DIR}/.run"
LOG_DIR="${ROOT_DIR}/.logs"
CORE_DIR="${ROOT_DIR}/services/core-go"
GATEWAY_DIR="${ROOT_DIR}/services/gateway-go"

# Deteksi perintah docker compose / podman compose
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1 && docker-compose --version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
elif command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(podman-compose)
else
    COMPOSE_CMD=(docker compose)
fi

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
# 1. Start Infrastructure (PostgreSQL, Redis, Prometheus, k6)
# -----------------------------------------------------------------------------
start_infra() {
    log_step "[1/2] Menjalankan infrastruktur kontainer (PostgreSQL, Redis, Prometheus)..."
    "${COMPOSE_CMD[@]}" up -d postgres redis prometheus k6

    log_info "Menunggu kesiapan PostgreSQL & Redis..."
    local retries=15
    local count=0
    until "${COMPOSE_CMD[@]}" exec -T postgres pg_isready -U cashflow_user -d cashflow_db > /dev/null 2>&1; do
        count=$((count + 1))
        if [ "$count" -ge "$retries" ]; then
            log_error "PostgreSQL tidak siap setelah ${retries} detik."
            exit 1
        fi
        sleep 1
    done

    until "${COMPOSE_CMD[@]}" exec -T redis redis-cli ping > /dev/null 2>&1; do
        sleep 1
    done
    log_success "Infrastruktur database & cache aktif dan siap koneksi."
}

# -----------------------------------------------------------------------------
# 2. Stop Local Host Go Processes
# -----------------------------------------------------------------------------
stop_local_processes() {
    log_info "Menghentikan proses servis Go lokal..."

    # 1. Hentikan via port fuser terlebih dahulu
    fuser -k -TERM 8080/tcp 2>/dev/null || true
    fuser -k -TERM 8081/tcp 2>/dev/null || true
    sleep 0.5

    # 2. Hentikan via PID file jika masih ada
    if [ -f "${PID_DIR}/gateway-go.pid" ]; then
        local gw_pid
        gw_pid=$(cat "${PID_DIR}/gateway-go.pid" 2>/dev/null || true)
        if [ -n "$gw_pid" ] && kill -0 "$gw_pid" 2>/dev/null; then
            pkill -P "$gw_pid" 2>/dev/null || true
            kill -TERM "$gw_pid" 2>/dev/null || true
        fi
        rm -f "${PID_DIR}/gateway-go.pid"
    fi

    if [ -f "${PID_DIR}/core-go.pid" ]; then
        local core_pid
        core_pid=$(cat "${PID_DIR}/core-go.pid" 2>/dev/null || true)
        if [ -n "$core_pid" ] && kill -0 "$core_pid" 2>/dev/null; then
            pkill -P "$core_pid" 2>/dev/null || true
            kill -TERM "$core_pid" 2>/dev/null || true
        fi
        rm -f "${PID_DIR}/core-go.pid"
    fi

    # 3. Pastikan port 8080 dan 8081 bebas dari proses yang tertinggal
    fuser -k -9 8080/tcp 2>/dev/null || true
    fuser -k -9 8081/tcp 2>/dev/null || true

    rm -rf "${PID_DIR}"
    log_success "Seluruh proses servis Go lokal telah dihentikan."
}

# -----------------------------------------------------------------------------
# 3. Start Local Host Go Services (Core Go :8081 & API Gateway :8080)
# -----------------------------------------------------------------------------
start_local_services() {
    log_step "[2/2] Menjalankan servis Go di Host OS lokal..."

    # Bersihkan instans lama jika ada port yang masih terpakai
    stop_local_processes

    mkdir -p "${PID_DIR}" "${LOG_DIR}"

    # 1. Jalankan Core Go di latar belakang (:8081)
    log_info "Memulai Core Go API (:8081)..."
    nohup bash -c '
        cd "'"${CORE_DIR}"'"
        export PORT=8081
        export DATABASE_URL="'"${DATABASE_URL:-postgres://cashflow_user:cashflow_password@localhost:5432/cashflow_db?sslmode=disable}"'"
        export REDIS_URL="'"${REDIS_URL:-localhost:6379}"'"
        exec go run cmd/api/main.go
    ' >> "${LOG_DIR}/core-go.log" 2>&1 &
    local core_pid=$!
    disown "$core_pid" 2>/dev/null || true
    echo "$core_pid" > "${PID_DIR}/core-go.pid"

    # 2. Jalankan API Gateway di latar belakang (:8080)
    log_info "Memulai API Gateway (:8080 -> proxy ke :8081)..."
    nohup bash -c '
        cd "'"${GATEWAY_DIR}"'"
        export PORT=8080
        export CORE_SERVICE_URL="http://localhost:8081"
        export REDIS_ADDR="localhost:6379"
        exec go run cmd/gateway/main.go
    ' >> "${LOG_DIR}/gateway-go.log" 2>&1 &
    local gw_pid=$!
    disown "$gw_pid" 2>/dev/null || true
    echo "$gw_pid" > "${PID_DIR}/gateway-go.pid"

    # 3. Verifikasi Health Endpoint
    log_info "Menunggu verifikasi health endpoint Core Go (:8081) & Gateway (:8080)..."
    local max_wait=20
    local wait_count=0
    local core_ready=false
    local gw_ready=false

    while [ "$wait_count" -lt "$max_wait" ]; do
        if [ "$core_ready" = false ] && (curl -sf http://localhost:8081/health >/dev/null 2>&1 || curl -sf http://localhost:8081/api/v1/health >/dev/null 2>&1); then
            core_ready=true
        fi
        if [ "$gw_ready" = false ] && curl -sf http://localhost:8080/health >/dev/null 2>&1; then
            gw_ready=true
        fi

        if [ "$core_ready" = true ] && [ "$gw_ready" = true ]; then
            break
        fi

        sleep 1
        wait_count=$((wait_count + 1))
    done

    if [ "$core_ready" = false ] || [ "$gw_ready" = false ]; then
        log_warn "Health check belum merespons penuh setelah ${max_wait} detik."
        log_warn "Periksa file log: ${LOG_DIR}/core-go.log dan ${LOG_DIR}/gateway-go.log"
    else
        log_success "Semua servis Go lokal dan API Gateway berhasil aktif dan sehat!"
    fi

    # Tampilkan Ringkasan Dashboard Servis
    echo ""
    echo -e "${C_BOLD}========================================================================${C_RESET}"
    echo -e "${C_BOLD}${C_GREEN} PT ADIJAYANTARA LOGISTICS - LOCAL HOST SERVICES & INFRASTRUCTURE READY ${C_RESET}"
    echo -e "${C_BOLD}========================================================================${C_RESET}"
    echo -e "  [OK] PostgreSQL 15   : ${C_CYAN}localhost:5432${C_RESET} (Database operasional)"
    echo -e "  [OK] Redis 7         : ${C_CYAN}localhost:6379${C_RESET} (Cache & Token Session)"
    echo -e "  [OK] Prometheus      : ${C_CYAN}http://localhost:9090${C_RESET} (Observabilitas & Metrik)"
    echo -e "  [OK] Core Go Service : ${C_CYAN}http://localhost:8081${C_RESET} (PID: ${core_pid})"
    echo -e "  [OK] API Gateway     : ${C_CYAN}http://localhost:8080${C_RESET} (PID: ${gw_pid}, Public Facade)"
    echo -e "------------------------------------------------------------------------"
    echo -e "  -> ${C_BOLD}Frontend Dev Server${C_RESET} : Jalankan terpisah dengan: ${C_YELLOW}make run-local-web-next${C_RESET}"
    echo -e "  -> ${C_BOLD}Pantau Log Servis${C_RESET}   : ${C_YELLOW}make logs-local${C_RESET} atau tail -f .logs/*.log"
    echo -e "  -> ${C_BOLD}Cek Status Servis${C_RESET}   : ${C_YELLOW}make status-local${C_RESET}"
    echo -e "  -> ${C_BOLD}Matikan Semuanya${C_RESET}    : ${C_YELLOW}make down-local${C_RESET}"
    echo -e "${C_BOLD}========================================================================${C_RESET}"
    echo ""
}

# -----------------------------------------------------------------------------
# 4. Status Check
# -----------------------------------------------------------------------------
status() {
    echo -e "${C_BOLD}=== STATUS INFRASTRUKTUR KONTAINER (DOCKER) ===${C_RESET}"
    "${COMPOSE_CMD[@]}" ps

    echo ""
    echo -e "${C_BOLD}=== STATUS SERVIS GO LOCAL HOST ===${C_RESET}"
    local core_running="TIDAK AKTIF"
    local gw_running="TIDAK AKTIF"

    if curl -sf http://localhost:8081/health >/dev/null 2>&1 || curl -sf http://localhost:8081/api/v1/health >/dev/null 2>&1; then
        core_running="${C_GREEN}AKTIF (HEALTHY)${C_RESET}"
    fi

    if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
        gw_running="${C_GREEN}AKTIF (HEALTHY)${C_RESET}"
    fi

    echo -e "  -> Core Go    (:8081): ${core_running}"
    echo -e "  -> API Gateway(:8080): ${gw_running}"

    if [ -d "${PID_DIR}" ]; then
        echo ""
        echo "PID Files:"
        ls -la "${PID_DIR}" 2>/dev/null || true
    fi
}

# -----------------------------------------------------------------------------
# 5. Logs Viewer
# -----------------------------------------------------------------------------
logs() {
    log_info "Menampilkan streaming log Core Go dan API Gateway (Ctrl+C untuk keluar)..."
    mkdir -p "${LOG_DIR}"
    touch "${LOG_DIR}/core-go.log" "${LOG_DIR}/gateway-go.log"
    tail -f "${LOG_DIR}/core-go.log" "${LOG_DIR}/gateway-go.log"
}

# -----------------------------------------------------------------------------
# Command Dispatcher
# -----------------------------------------------------------------------------
case "${1:-}" in
    up)
        start_infra
        start_local_services
        ;;
    down)
        log_step "Mematikan servis lokal host dan infrastruktur kontainer..."
        stop_local_processes
        log_step "Menghentikan infrastruktur kontainer Docker..."
        "${COMPOSE_CMD[@]}" down
        log_success "Seluruh servis lokal host dan infrastruktur berhasil dimatikan."
        ;;
    stop-services)
        stop_local_processes
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        echo "Penggunaan: $0 {up|down|status|logs|stop-services}"
        exit 1
        ;;
esac
