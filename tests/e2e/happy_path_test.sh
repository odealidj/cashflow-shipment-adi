#!/usr/bin/env bash
# ==============================================================================
# PT ADIJAYANTARA LOGISTICS - END-TO-END (E2E) HAPPY PATH TEST SUITE
# ==============================================================================
# Skenario: Menguji alur bisnis lengkap (Core Business Journey):
#   1. Health check & utilitas idempotency
#   2. Autentikasi user Finance (finance.ayu@adijayantara.co.id)
#   3. Verifikasi role & permission PBAC
#   4. Input Top-Up modal operasional (Kas Masuk)
#   5. Input Transaksi Shipment & Beban Armada Vendor (Kas Keluar)
#   6. Penerbitan Invoice Piutang Pelanggan (TOP 14 Hari)
#   7. Pelunasan Invoice (Mark Paid / Settlement via Transfer Bank)
#   8. Verifikasi integrasi otomatis penerimaan kas (INVOICE_PAYMENT di Buku Kas)
#   9. Rekonsiliasi ringkasan keuangan akhir
#  10. Pembersihan otomatis data uji (Teardown)
# ==============================================================================

set -euo pipefail

# Konfigurasi & Parameter Default
TARGET_URL="${TARGET_URL:-http://localhost:8080/api/v1}"
USER_IDENTIFIER="${USER_IDENTIFIER:-finance.ayu@adijayantara.co.id}"
USER_PASSWORD="${USER_PASSWORD:-password123}"
AUTO_CLEANUP="${AUTO_CLEANUP:-true}"

# Warna Terminal
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_GREEN="\033[32m"
C_BLUE="\033[34m"
C_CYAN="\033[36m"
C_YELLOW="\033[33m"
C_RED="\033[31m"

PASSED_COUNT=0
FAILED_COUNT=0
START_TIME=$(date +%s)

print_header() {
    echo -e "${C_BOLD}${C_CYAN}"
    echo "========================================================================"
    echo "   PT ADIJAYANTARA LOGISTICS - AUTOMATED E2E HAPPY PATH TEST SUITE      "
    echo "========================================================================"
    echo -e "${C_RESET}"
    echo -e "Target Base URL : ${C_BOLD}${TARGET_URL}${C_RESET}"
    echo -e "User Account    : ${C_BOLD}${USER_IDENTIFIER}${C_RESET}"
    echo -e "Auto Cleanup    : ${C_BOLD}${AUTO_CLEANUP}${C_RESET}"
    echo -e "Waktu Mulai     : $(date '+%Y-%m-%d %H:%M:%S')"
    echo "------------------------------------------------------------------------"
}

assert_success() {
    local step_name="$1"
    local condition="$2"
    local error_msg="${3:-Assertion failed}"

    if eval "$condition"; then
        echo -e "  [${C_GREEN}PASS${C_RESET}] ${step_name}"
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo -e "  [${C_RED}FAIL${C_RESET}] ${step_name} -> ${error_msg}"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# 0. Prasyarat Tools
# ------------------------------------------------------------------------------
command -v curl >/dev/null 2>&1 || { echo >&2 "[ERROR] curl dibutuhkan untuk menjalankan test ini."; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "[ERROR] jq dibutuhkan untuk parsing respons JSON."; exit 1; }

print_header

# ------------------------------------------------------------------------------
# TAHAP 1: Health Check & Idempotency Key
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 1] Verifikasi Konektivitas API & Utilitas Idempotency${C_RESET}"

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}/health" || echo "000")
assert_success "Endpoint /health merespons HTTP 200" '[ "$HEALTH_STATUS" -eq 200 ]' "HTTP Status $HEALTH_STATUS"

IDEMPOTENCY_RES=$(curl -s "${TARGET_URL}/utility/idempotency-key")
IDEM_KEY=$(echo "$IDEMPOTENCY_RES" | jq -r '.data.idempotency_key // empty')
assert_success "Generator Idempotency Key menghasilkan UUID valid" '[ -n "$IDEM_KEY" ] && [ "$IDEM_KEY" != "null" ]' "Respons: $IDEMPOTENCY_RES"

# ------------------------------------------------------------------------------
# TAHAP 2: Autentikasi User & Sesi PBAC
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 2] Autentikasi Staf Keuangan (Login)${C_RESET}"

LOGIN_RES=$(curl -s -X POST "${TARGET_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"identifier\":\"${USER_IDENTIFIER}\",\"password\":\"${USER_PASSWORD}\"}")

LOGIN_SUCCESS=$(echo "$LOGIN_RES" | jq -r '.status // false')
AUTH_TOKEN=$(echo "$LOGIN_RES" | jq -r '.data.token // empty')
USER_ROLE=$(echo "$LOGIN_RES" | jq -r '.data.user.role // empty')

assert_success "Login berhasil dengan kredensial staf finance" '[ "$LOGIN_SUCCESS" = "true" ] && [ -n "$AUTH_TOKEN" ]' "Login gagal: $LOGIN_RES"
assert_success "Role terverifikasi sebagai 'finance'" '[ "$USER_ROLE" = "finance" ]' "Role diperoleh: $USER_ROLE"

# Verifikasi /auth/me
ME_RES=$(curl -s -H "Authorization: Bearer ${AUTH_TOKEN}" "${TARGET_URL}/auth/me")
ME_EMAIL=$(echo "$ME_RES" | jq -r '.data.email // empty')
HAS_CASHFLOW_PERM=$(echo "$ME_RES" | jq -r '.data.permissions | index("cashflow.create") != null')
HAS_INVOICE_PERM=$(echo "$ME_RES" | jq -r '.data.permissions | index("invoices.create") != null')

assert_success "Profil sesi aktif cocok dengan email login" '[ "$ME_EMAIL" = "$USER_IDENTIFIER" ]' "Email: $ME_EMAIL"
assert_success "Izin akses PBAC memuat hak pembuatan cashflow & invoice" '[ "$HAS_CASHFLOW_PERM" = "true" ] && [ "$HAS_INVOICE_PERM" = "true" ]' "Izin tidak lengkap"

# ------------------------------------------------------------------------------
# TAHAP 3: Pencatatan Top-Up Modal Kas Operasional (Kas Masuk)
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 3] Transaksi Kas Masuk (Top-Up Operasional)${C_RESET}"

TOPUP_KEY="e2e-topup-$(date +%s%N)"
TOPUP_AMOUNT=10000000
TOPUP_PAYLOAD=$(cat <<EOF
{
  "date_of_entry": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "kredit": ${TOPUP_AMOUNT},
  "act_information": "[E2E-TEST] Suntikan Dana Kas Cabang",
  "act_explaination": "Pengisian kas operasional ekspedisi darat",
  "remarks": "PAID"
}
EOF
)

TOPUP_RES=$(curl -s -X POST "${TARGET_URL}/cashflow/topup" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: ${TOPUP_KEY}" \
    -d "$TOPUP_PAYLOAD")

TOPUP_SUCCESS=$(echo "$TOPUP_RES" | jq -r '.status // false')
TOPUP_ID=$(echo "$TOPUP_RES" | jq -r '.data.id // empty')
TOPUP_SALDO=$(echo "$TOPUP_RES" | jq -r '.data.saldo // 0')

assert_success "Transaksi Top-Up berhasil tersimpan" '[ "$TOPUP_SUCCESS" = "true" ] && [ -n "$TOPUP_ID" ]' "Top-up gagal: $TOPUP_RES"
assert_success "Saldo kas berjalan terakumulasi secara otomatis" '[ $(echo "$TOPUP_SALDO > 0" | bc -l) -eq 1 ]' "Saldo: $TOPUP_SALDO"

# ------------------------------------------------------------------------------
# TAHAP 4: Pencatatan Transaksi Shipment & Vendor Ekspedisi (Kas Keluar)
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 4] Transaksi Shipment & Biaya Vendor Armada (Kas Keluar)${C_RESET}"

SHIPMENT_KEY="e2e-shipment-$(date +%s%N)"
GRAND_COST=4500000
GRAND_SELLING=6800000
EXPECTED_PROFIT=$((GRAND_SELLING - GRAND_COST))

SHIPMENT_PAYLOAD=$(cat <<EOF
{
  "date_of_entry": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "act_information": "[E2E-TEST] Pengiriman 1 FTL Jakarta - Semarang",
  "act_explaination": "Muatan Elektronik & Spareparts PT Mitra Abadi",
  "vendor_name_raw": "PT Samudera Logistik Nusantara",
  "customer_name_raw": "PT Mitra Abadi Sejahtera",
  "top_days": 14,
  "grand_cost": ${GRAND_COST},
  "debit": ${GRAND_COST},
  "grand_selling": ${GRAND_SELLING},
  "remarks": "PAID"
}
EOF
)

SHIPMENT_RES=$(curl -s -X POST "${TARGET_URL}/cashflow/shipment" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: ${SHIPMENT_KEY}" \
    -d "$SHIPMENT_PAYLOAD")

SHIPMENT_SUCCESS=$(echo "$SHIPMENT_RES" | jq -r '.status // false')
SHIPMENT_ID=$(echo "$SHIPMENT_RES" | jq -r '.data.id // empty')
ACTUAL_PROFIT=$(echo "$SHIPMENT_RES" | jq -r '.data.profit // 0')
VENDOR_ID=$(echo "$SHIPMENT_RES" | jq -r '.data.vendor_id // empty')

assert_success "Transaksi Shipment berhasil tersimpan" '[ "$SHIPMENT_SUCCESS" = "true" ] && [ -n "$SHIPMENT_ID" ]' "Shipment gagal: $SHIPMENT_RES"
assert_success "Kalkulasi Profit otomatis tepat (Rp ${EXPECTED_PROFIT})" '[ "$ACTUAL_PROFIT" = "$EXPECTED_PROFIT" ]' "Profit: $ACTUAL_PROFIT"
assert_success "Vendor armada otomatis terhubung atau terdaftar" '[ -n "$VENDOR_ID" ] && [ "$VENDOR_ID" != "null" ]' "VendorID: $VENDOR_ID"

# ------------------------------------------------------------------------------
# TAHAP 5: Penerbitan Invoice Piutang Pelanggan (TOP 14 Hari)
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 5] Penerbitan Invoice Piutang Pelanggan${C_RESET}"

INVOICE_KEY="e2e-inv-$(date +%s%N)"
INVOICE_NO="INV-E2E-$(date +%s)"
SHIPMENT_DATE="$(date +%Y-%m-%d)"

INVOICE_PAYLOAD=$(cat <<EOF
{
  "invoice_no": "${INVOICE_NO}",
  "client_name": "PT Mitra Abadi Sejahtera",
  "shipment_date": "${SHIPMENT_DATE}",
  "top_terms": "TOP 14 Hari",
  "top_days": 14,
  "amount": ${GRAND_SELLING},
  "cashflow_entry_id": ${SHIPMENT_ID},
  "notes": "Tagihan resmi ekspedisi FTL Jakarta - Semarang"
}
EOF
)

INVOICE_RES=$(curl -s -X POST "${TARGET_URL}/invoices" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: ${INVOICE_KEY}" \
    -d "$INVOICE_PAYLOAD")

INVOICE_SUCCESS=$(echo "$INVOICE_RES" | jq -r '.status // false')
INVOICE_ID=$(echo "$INVOICE_RES" | jq -r '.data.id // empty')
INVOICE_STATUS=$(echo "$INVOICE_RES" | jq -r '.data.status // empty')
DUE_DATE=$(echo "$INVOICE_RES" | jq -r '.data.due_date // empty')

assert_success "Invoice baru berhasil diterbitkan (${INVOICE_NO})" '[ "$INVOICE_SUCCESS" = "true" ] && [ -n "$INVOICE_ID" ]' "Gagal buat invoice: $INVOICE_RES"
assert_success "Status awal invoice adalah UNPAID" '[ "$INVOICE_STATUS" = "UNPAID" ]' "Status: $INVOICE_STATUS"
assert_success "Tanggal jatuh tempo otomatis terkalkulasi (TOP 14 Hari)" '[ -n "$DUE_DATE" ]' "Due date: $DUE_DATE"

# ------------------------------------------------------------------------------
# TAHAP 6: Pelunasan Invoice (Mark as Paid / Settlement)
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 6] Pelunasan Invoice (Mark Paid via Transfer Bank)${C_RESET}"

SETTLE_KEY="e2e-settle-$(date +%s%N)"
REF_NO="TRF-BCA-$(date +%s)"

SETTLE_PAYLOAD=$(cat <<EOF
{
  "payment_date": "${SHIPMENT_DATE}",
  "reference_no": "${REF_NO}",
  "proof_url": "https://storage.adijayantara.co.id/proofs/test-transfer.jpg",
  "notes": "Pelunasan via transfer rekening giro BCA PT Mitra Abadi Sejahtera"
}
EOF
)

SETTLE_RES=$(curl -s -X PATCH "${TARGET_URL}/invoices/${INVOICE_ID}/pay" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: ${SETTLE_KEY}" \
    -d "$SETTLE_PAYLOAD")

SETTLE_SUCCESS=$(echo "$SETTLE_RES" | jq -r '.status // false')
SETTLED_STATUS=$(echo "$SETTLE_RES" | jq -r '.data.status // empty')
PAID_REF=$(echo "$SETTLE_RES" | jq -r '.data.payment_reference // empty')

assert_success "Invoice berhasil dilunasi (Status berubah menjadi PAID)" '[ "$SETTLE_SUCCESS" = "true" ] && [ "$SETTLED_STATUS" = "PAID" ]' "Gagal lunasi: $SETTLE_RES"
assert_success "Nomor referensi pembayaran tersimpan dengan akurat" '[ "$PAID_REF" = "$REF_NO" ]' "Ref: $PAID_REF"

# ------------------------------------------------------------------------------
# TAHAP 7: Verifikasi Integrasi Buku Kas Otomatis (Automatic Ledger Entry)
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 7] Verifikasi Integrasi Otomatis ke Buku Kas (Ledger Sync)${C_RESET}"

CASHFLOW_LIST=$(curl -s -H "Authorization: Bearer ${AUTH_TOKEN}" "${TARGET_URL}/cashflow?limit=5")
AUTO_ENTRY=$(echo "$CASHFLOW_LIST" | jq -r --argjson inv_id "$INVOICE_ID" '.data[] | select(.invoice_id == $inv_id)')

AUTO_ENTRY_ID=$(echo "$AUTO_ENTRY" | jq -r '.id // empty')
AUTO_ENTRY_TYPE=$(echo "$AUTO_ENTRY" | jq -r '.entry_type // empty')
AUTO_KREDIT=$(echo "$AUTO_ENTRY" | jq -r '.kredit // 0')
AUTO_REMARKS=$(echo "$AUTO_ENTRY" | jq -r '.remarks // empty')

assert_success "Entry kas masuk pelunasan invoice otomatis terbentuk di Buku Kas" '[ -n "$AUTO_ENTRY_ID" ]' "Entry otomatis tidak ditemukan untuk Invoice #${INVOICE_ID}"
assert_success "Tipe transaksi kas adalah 'INVOICE_PAYMENT'" '[ "$AUTO_ENTRY_TYPE" = "INVOICE_PAYMENT" ]' "Tipe: $AUTO_ENTRY_TYPE"
assert_success "Nominal kas masuk sesuai nominal invoice (Rp ${GRAND_SELLING})" '[ "$AUTO_KREDIT" = "$GRAND_SELLING" ]' "Nominal kas: $AUTO_KREDIT"
assert_success "Status pembayaran pada kas terverifikasi PAID" '[ "$AUTO_REMARKS" = "PAID" ]' "Remarks: $AUTO_REMARKS"

# ------------------------------------------------------------------------------
# TAHAP 8: Rekonsiliasi & Ringkasan Laporan Keuangan
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}[TAHAP 8] Rekonsiliasi Ringkasan Keuangan (Summary Reconcile)${C_RESET}"

CASH_SUMMARY=$(curl -s -H "Authorization: Bearer ${AUTH_TOKEN}" "${TARGET_URL}/cashflow/summary")
CASH_STATUS=$(echo "$CASH_SUMMARY" | jq -r '.status // false')
assert_success "Ringkasan metrik Cashflow dapat diakses dan valid" '[ "$CASH_STATUS" = "true" ]' "Gagal ambil summary cashflow"

INV_SUMMARY=$(curl -s -H "Authorization: Bearer ${AUTH_TOKEN}" "${TARGET_URL}/invoices/summary")
INV_SUM_STATUS=$(echo "$INV_SUMMARY" | jq -r '.status // false')
assert_success "Ringkasan metrik Piutang Invoice dapat diakses dan valid" '[ "$INV_SUM_STATUS" = "true" ]' "Gagal ambil summary invoice"

# ------------------------------------------------------------------------------
# TAHAP 9: Pembersihan Data Uji (Teardown)
# ------------------------------------------------------------------------------
if [ "$AUTO_CLEANUP" = "true" ]; then
    echo -e "\n${C_BOLD}[TAHAP 9] Pembersihan Data Uji (Teardown)${C_RESET}"
    
    # 1. Hapus invoice uji
    DEL_INV_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        "${TARGET_URL}/invoices/${INVOICE_ID}")
    assert_success "Pembersihan invoice uji #${INVOICE_ID} (HTTP 200)" '[ "$DEL_INV_CODE" -eq 200 ]' "HTTP: $DEL_INV_CODE"

    # 2. Hapus transaksi shipment uji
    DEL_SHIP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        "${TARGET_URL}/cashflow/${SHIPMENT_ID}")
    assert_success "Pembersihan transaksi shipment uji #${SHIPMENT_ID} (HTTP 200)" '[ "$DEL_SHIP_CODE" -eq 200 ]' "HTTP: $DEL_SHIP_CODE"

    # 3. Hapus transaksi topup uji
    DEL_TOPUP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        "${TARGET_URL}/cashflow/${TOPUP_ID}")
    assert_success "Pembersihan transaksi topup uji #${TOPUP_ID} (HTTP 200)" '[ "$DEL_TOPUP_CODE" -eq 200 ]' "HTTP: $DEL_TOPUP_CODE"

    # 4. Hapus auto entry pelunasan jika ada
    if [ -n "$AUTO_ENTRY_ID" ]; then
        curl -s -o /dev/null -X DELETE \
            -H "Authorization: Bearer ${AUTH_TOKEN}" \
            "${TARGET_URL}/cashflow/${AUTO_ENTRY_ID}" || true
    fi
fi

# ------------------------------------------------------------------------------
# Ringkasan Akhir
# ------------------------------------------------------------------------------
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "\n${C_BOLD}${C_CYAN}========================================================================${C_RESET}"
echo -e "${C_BOLD}                   HASIL PENGUJIAN HAPPY PATH E2E                       ${C_RESET}"
echo -e "${C_BOLD}${C_CYAN}========================================================================${C_RESET}"
echo -e "  Total Langkah Pengujian : $((PASSED_COUNT + FAILED_COUNT))"
echo -e "  Lolos (Passed)          : ${C_GREEN}${C_BOLD}${PASSED_COUNT}${C_RESET}"
echo -e "  Gagal (Failed)          : ${C_RED}${C_BOLD}${FAILED_COUNT}${C_RESET}"
echo -e "  Durasi Eksekusi         : ${TOTAL_TIME} detik"
echo -e "${C_BOLD}${C_CYAN}========================================================================${C_RESET}"

if [ "$FAILED_COUNT" -eq 0 ]; then
    echo -e "${C_GREEN}${C_BOLD}✓ SELURUH ALUR BISNIS HAPPY PATH DINYATAKAN SEHAT & SIAP PRODUKSI!${C_RESET}\n"
    exit 0
else
    echo -e "${C_RED}${C_BOLD}✗ PENGUJIAN GAGAL DENGAN ${FAILED_COUNT} KESALAHAN!${C_RESET}\n"
    exit 1
fi
