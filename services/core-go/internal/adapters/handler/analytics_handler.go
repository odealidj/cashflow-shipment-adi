package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/cashflow-shipment-app/backend/internal/adapters/repository"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/pkg/response"
)

type AnalyticsHandler struct {
	analyticsRepo *repository.PostgresAnalyticsRepo
}

func NewAnalyticsHandler(analyticsRepo *repository.PostgresAnalyticsRepo) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsRepo: analyticsRepo}
}

// GetCashflowRunway godoc
// @Summary      Proyeksi Arus Kas 30-60 Hari (P1) & CCC Gap (P6)
// @Description  Menghitung proyeksi saldo kas harian/mingguan berdasarkan invoice jatuh tempo vs hutang vendor
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Param        days query int false "Jumlah hari proyeksi ke depan (default 60)"
// @Success      200 {object} response.APIResponse
// @Router       /analytics/cashflow-runway [get]
func (h *AnalyticsHandler) GetCashflowRunway(w http.ResponseWriter, r *http.Request) {
	days := 60
	if dStr := r.URL.Query().Get("days"); dStr != "" {
		if d, err := strconv.Atoi(dStr); err == nil && d > 0 {
			days = d
		}
	}

	data, err := h.analyticsRepo.GetCashflowRunway(r.Context(), days)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, "Gagal mengambil data proyeksi arus kas: "+err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, "Berhasil mengambil data proyeksi arus kas runway", data)
}

// GetRouteMatrix godoc
// @Summary      Matriks Kuadran Profitabilitas Rute BCG (P2)
// @Description  Memetakan performa rute ke dalam 4 kuadran: Bintang, Potensial, Sapi Perah, dan Evaluasi
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Param        date_from query string false "Filter tanggal mulai (YYYY-MM-DD)"
// @Param        date_to query string false "Filter tanggal selesai (YYYY-MM-DD)"
// @Success      200 {object} response.APIResponse
// @Router       /analytics/route-matrix [get]
func (h *AnalyticsHandler) GetRouteMatrix(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ports.ListFilter{}
	if df := strings.TrimSpace(q.Get("date_from")); df != "" {
		filter.DateFrom = &df
	}
	if dt := strings.TrimSpace(q.Get("date_to")); dt != "" {
		filter.DateTo = &dt
	}

	data, err := h.analyticsRepo.GetRouteMatrix(r.Context(), filter)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, "Gagal mengambil matriks kuadran rute: "+err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, "Berhasil mengambil matriks kuadran profitabilitas rute BCG", data)
}

// GetCustomerDisciplineAndPareto godoc
// @Summary      Skor Kepatuhan DSO Customer (P3) & Analisis Pareto Omset 80/20 (P5)
// @Description  Menghitung realisasi pembayaran customer vs janji TOP, reschedule count, dan kurva Pareto omset
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Success      200 {object} response.APIResponse
// @Router       /analytics/customer-discipline-pareto [get]
func (h *AnalyticsHandler) GetCustomerDisciplineAndPareto(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ports.ListFilter{}
	if df := strings.TrimSpace(q.Get("date_from")); df != "" {
		filter.DateFrom = &df
	}
	if dt := strings.TrimSpace(q.Get("date_to")); dt != "" {
		filter.DateTo = &dt
	}

	data, err := h.analyticsRepo.GetCustomerDisciplineAndPareto(r.Context(), filter)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, "Gagal mengambil data kepatuhan pelanggan: "+err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, "Berhasil mengambil data kepatuhan pelanggan dan analisis pareto", data)
}

// GetVendorEfficiency godoc
// @Summary      Analisis Efisiensi & Ketergantungan Rekanan Vendor (P4)
// @Description  Menghitung rasio konsentrasi armada vendor, total biaya pokok, dan rata-rata margin keuntungan
// @Tags         Analytics
// @Produce      json
// @Security     BearerAuth
// @Param        date_from query string false "Filter tanggal mulai (YYYY-MM-DD)"
// @Param        date_to query string false "Filter tanggal selesai (YYYY-MM-DD)"
// @Success      200 {object} response.APIResponse
// @Router       /analytics/vendor-efficiency [get]
func (h *AnalyticsHandler) GetVendorEfficiency(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := ports.ListFilter{}
	if df := strings.TrimSpace(q.Get("date_from")); df != "" {
		filter.DateFrom = &df
	}
	if dt := strings.TrimSpace(q.Get("date_to")); dt != "" {
		filter.DateTo = &dt
	}

	data, err := h.analyticsRepo.GetVendorEfficiency(r.Context(), filter)
	if err != nil {
		response.JSON(w, http.StatusInternalServerError, "Gagal mengambil data efisiensi vendor: "+err.Error(), nil)
		return
	}

	response.JSON(w, http.StatusOK, "Berhasil mengambil analisis efisiensi dan konsentrasi vendor", data)
}
