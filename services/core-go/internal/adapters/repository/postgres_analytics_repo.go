package repository

import (
	"context"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/cashflow-shipment-app/backend/internal/infrastructure/telemetry"
	"github.com/jmoiron/sqlx"
)

type PostgresAnalyticsRepo struct {
	db *sqlx.DB
}

func NewPostgresAnalyticsRepo(db *sqlx.DB) *PostgresAnalyticsRepo {
	return &PostgresAnalyticsRepo{db: db}
}

// ---------------------------------------------------------------------
// 1. Proyeksi Arus Kas Runway (P1) & Siklus Konversi Kas CCC (P6)
// ---------------------------------------------------------------------

type RunwayBucket struct {
	Date          string  `json:"date"`
	WeekLabel     string  `json:"week_label"`
	DayOffset     int     `json:"day_offset"`
	InflowAmount  float64 `json:"inflow_amount"`
	OutflowAmount float64 `json:"outflow_amount"`
	NetChange     float64 `json:"net_change"`
	ProjectedCash float64 `json:"projected_cash"`
	IsInDanger    bool    `json:"is_in_danger"`
}

type CashflowRunwayResponse struct {
	CurrentCashBalance float64        `json:"current_cash_balance"`
	MinimumCashBuffer  float64        `json:"minimum_cash_buffer"`
	TotalPendingInflow float64        `json:"total_pending_inflow"`
	TotalPendingOutflow float64       `json:"total_pending_outflow"`
	NetProjected60Days float64        `json:"net_projected_60_days"`
	LowestPointDate    string         `json:"lowest_point_date"`
	LowestPointBalance float64        `json:"lowest_point_balance"`
	RunwayDays         int            `json:"runway_days"`
	Buckets            []RunwayBucket `json:"buckets"`
	AvgCustomerDSO     float64        `json:"avg_customer_dso"`
	AvgVendorDPO       float64        `json:"avg_vendor_dpo"`
	FinancingGapDays   float64        `json:"financing_gap_days"`
}

func (r *PostgresAnalyticsRepo) GetCashflowRunway(ctx context.Context, days int) (res CashflowRunwayResponse, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("analytics_repo", "GetCashflowRunway", "SELECT runway & CCC metrics", start, err)
	}()

	if days <= 0 || days > 90 {
		days = 60
	}

	res.MinimumCashBuffer = 25000000.0 // Default ambang aman kas Rp 25 Jt
	res.RunwayDays = days

	// 1. Dapatkan saldo kas riil saat ini (terbaru)
	err = r.db.QueryRowContext(ctx, `SELECT COALESCE((SELECT saldo FROM cashflow_entries ORDER BY sequence_no DESC LIMIT 1), 0)`).Scan(&res.CurrentCashBalance)
	if err != nil {
		return res, fmt.Errorf("failed to fetch current cash balance: %w", err)
	}

	today := time.Now().Truncate(24 * time.Hour)
	endDate := today.AddDate(0, 0, days)

	// 2. Query Piutang Invoice belum dibayar (UNPAID/OVERDUE) berdasarkan tanggal jatuh tempo
	type DueEntry struct {
		DueDate time.Time `db:"due_date"`
		Amount  float64   `db:"amount"`
	}

	queryInflows := `
		SELECT due_date, SUM(amount) as amount
		FROM invoices
		WHERE deleted_at IS NULL AND status != 'PAID'
		GROUP BY due_date
		ORDER BY due_date ASC
	`
	var inflows []DueEntry
	if err := r.db.SelectContext(ctx, &inflows, queryInflows); err != nil {
		return res, fmt.Errorf("failed to query invoice inflows: %w", err)
	}

	// 3. Query Kewajiban Vendor belum dibayar (UNPAID) berdasarkan tanggal jatuh tempo vendor
	queryOutflows := `
		SELECT COALESCE(due_date, date_of_entry) as due_date, SUM(grand_cost) as amount
		FROM cashflow_entries
		WHERE remarks = 'UNPAID' AND entry_type = 'SHIPMENT'
		GROUP BY COALESCE(due_date, date_of_entry)
		ORDER BY due_date ASC
	`
	var outflows []DueEntry
	if err := r.db.SelectContext(ctx, &outflows, queryOutflows); err != nil {
		return res, fmt.Errorf("failed to query vendor outflows: %w", err)
	}

	// 4. Query Rata-rata Customer DSO vs Vendor DPO (P6 CCC Gap)
	var avgCustDSO, avgVendDPO float64
	queryCCC := `
		SELECT 
			COALESCE(AVG(CASE 
				WHEN status = 'PAID' AND paid_at IS NOT NULL THEN (paid_at::date - shipment_date)
				ELSE top_days 
			END), 30) as avg_cust_dso
		FROM invoices
		WHERE deleted_at IS NULL
	`
	_ = r.db.QueryRowContext(ctx, queryCCC).Scan(&avgCustDSO)

	queryVendorDPO := `
		SELECT COALESCE(AVG(top_days), 14) as avg_vend_dpo
		FROM cashflow_entries
		WHERE entry_type = 'SHIPMENT' AND top_days > 0
	`
	_ = r.db.QueryRowContext(ctx, queryVendorDPO).Scan(&avgVendDPO)

	res.AvgCustomerDSO = math.Round(avgCustDSO*10) / 10
	res.AvgVendorDPO = math.Round(avgVendDPO*10) / 10
	res.FinancingGapDays = math.Round((avgCustDSO-avgVendDPO)*10) / 10

	// Petakan ke map per tanggal
	inflowMap := make(map[string]float64)
	for _, inf := range inflows {
		res.TotalPendingInflow += inf.Amount
		dStr := inf.DueDate.Format("2006-01-02")
		// Jika invoice overdue (due date < today), kita asumsikan jatuh tempo follow up di minggu pertama (today)
		if inf.DueDate.Before(today) {
			dStr = today.Format("2006-01-02")
		}
		inflowMap[dStr] += inf.Amount
	}

	outflowMap := make(map[string]float64)
	for _, out := range outflows {
		res.TotalPendingOutflow += out.Amount
		dStr := out.DueDate.Format("2006-01-02")
		if out.DueDate.Before(today) {
			dStr = today.Format("2006-01-02")
		}
		outflowMap[dStr] += out.Amount
	}

	// 5. Bangun proyeksi bergulir 8-9 minggu (interval 7 hari atau per tanggal signifikan)
	runningCash := res.CurrentCashBalance
	lowestPoint := runningCash
	lowestDate := today.Format("2006-01-02")

	// Kelompokkan per minggu (8 interval)
	var buckets []RunwayBucket
	currentBucketDate := today

	for i := 0; i <= days; i += 7 {
		nextBucketDate := currentBucketDate.AddDate(0, 0, 7)
		if nextBucketDate.After(endDate) {
			nextBucketDate = endDate
		}

		var weekInflow, weekOutflow float64
		// Akumulasikan seluruh transaksi dalam rentang minggu ini
		for d := currentBucketDate; d.Before(nextBucketDate) || d.Equal(nextBucketDate); d = d.AddDate(0, 0, 1) {
			dKey := d.Format("2006-01-02")
			weekInflow += inflowMap[dKey]
			weekOutflow += outflowMap[dKey]
		}

		net := weekInflow - weekOutflow
		runningCash += net

		if runningCash < lowestPoint {
			lowestPoint = runningCash
			lowestDate = nextBucketDate.Format("2006-01-02")
		}

		weekIdx := (i / 7) + 1
		weekLabel := fmt.Sprintf("Mgg %d", weekIdx)
		if i == 0 {
			weekLabel = "Hari Ini"
		}

		buckets = append(buckets, RunwayBucket{
			Date:          nextBucketDate.Format("2006-01-02"),
			WeekLabel:     weekLabel,
			DayOffset:     i + 7,
			InflowAmount:  weekInflow,
			OutflowAmount: weekOutflow,
			NetChange:     net,
			ProjectedCash: runningCash,
			IsInDanger:    runningCash < res.MinimumCashBuffer,
		})

		currentBucketDate = nextBucketDate.AddDate(0, 0, 1)
		if currentBucketDate.After(endDate) {
			break
		}
	}

	res.Buckets = buckets
	res.NetProjected60Days = runningCash - res.CurrentCashBalance
	res.LowestPointDate = lowestDate
	res.LowestPointBalance = lowestPoint

	return res, nil
}

// ---------------------------------------------------------------------
// 2. Matriks Kuadran Profitabilitas Rute BCG (P2)
// ---------------------------------------------------------------------

type RouteMatrixItem struct {
	RouteName    string  `json:"route_name"`
	TripCount    int     `json:"trip_count"`
	TotalRevenue float64 `json:"total_revenue"`
	TotalCost    float64 `json:"total_cost"`
	TotalProfit  float64 `json:"total_profit"`
	AvgMarginPct float64 `json:"avg_margin_pct"`
	Quadrant     string  `json:"quadrant"` // STAR, OPPORTUNITY, CASH_COW, EVALUATE
	QuadrantName string  `json:"quadrant_name"`
}

type RouteMatrixResponse struct {
	TotalRoutes      int               `json:"total_routes"`
	AvgTripThreshold float64           `json:"avg_trip_threshold"`
	AvgMarginThreshold float64         `json:"avg_margin_threshold"`
	Routes           []RouteMatrixItem `json:"routes"`
}

func (r *PostgresAnalyticsRepo) GetRouteMatrix(ctx context.Context, filter ports.ListFilter) (res RouteMatrixResponse, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("analytics_repo", "GetRouteMatrix", "SELECT BCG route matrix", start, err)
	}()

	wherePeriodic := "WHERE entry_type = 'SHIPMENT'"
	args := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry >= $%d", argIdx)
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry <= $%d", argIdx)
		args = append(args, *filter.DateTo)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE(NULLIF(TRIM(act_explaination), ''), NULLIF(TRIM(act_information), ''), 'Rute Operasional') as route_name,
			COUNT(*) as trip_count,
			COALESCE(SUM(grand_selling), 0) as total_revenue,
			COALESCE(SUM(grand_cost), 0) as total_cost,
			COALESCE(SUM(profit), 0) as total_profit,
			COALESCE(AVG(CASE WHEN grand_selling > 0 THEN margin_pct * 100 ELSE 0 END), 0) as avg_margin_pct
		FROM cashflow_entries
		%s
		GROUP BY route_name
		ORDER BY total_profit DESC
	`, wherePeriodic)

	type rawRoute struct {
		RouteName    string  `db:"route_name"`
		TripCount    int     `db:"trip_count"`
		TotalRevenue float64 `db:"total_revenue"`
		TotalCost    float64 `db:"total_cost"`
		TotalProfit  float64 `db:"total_profit"`
		AvgMarginPct float64 `db:"avg_margin_pct"`
	}

	var rawList []rawRoute
	if err := r.db.SelectContext(ctx, &rawList, query, args...); err != nil {
		return res, fmt.Errorf("failed to query route matrix: %w", err)
	}

	if len(rawList) == 0 {
		return res, nil
	}

	// Hitung ambang batas (Threshold)
	var sumTrips int
	var sumMargin float64
	for _, r := range rawList {
		sumTrips += r.TripCount
		sumMargin += r.AvgMarginPct
	}

	avgTrip := float64(sumTrips) / float64(len(rawList))
	avgMargin := float64(sumMargin) / float64(len(rawList))
	if avgMargin < 12.0 {
		avgMargin = 12.0 // Standar margin sehat ekspedisi minimal 12%
	}

	res.TotalRoutes = len(rawList)
	res.AvgTripThreshold = math.Round(avgTrip*10) / 10
	res.AvgMarginThreshold = math.Round(avgMargin*10) / 10

	for _, item := range rawList {
		var quad, quadName string
		isHighTrip := float64(item.TripCount) >= avgTrip
		isHighMargin := item.AvgMarginPct >= avgMargin

		if isHighTrip && isHighMargin {
			quad = "STAR"
			quadName = "Kuadran I: Bintang (High Volume, High Margin)"
		} else if !isHighTrip && isHighMargin {
			quad = "OPPORTUNITY"
			quadName = "Kuadran II: Potensial (Low Volume, High Margin)"
		} else if isHighTrip && !isHighMargin {
			quad = "CASH_COW"
			quadName = "Kuadran III: Sapi Perah (High Volume, Low Margin)"
		} else {
			quad = "EVALUATE"
			quadName = "Kuadran IV: Evaluasi Kritis (Low Volume, Low Margin)"
		}

		res.Routes = append(res.Routes, RouteMatrixItem{
			RouteName:    item.RouteName,
			TripCount:    item.TripCount,
			TotalRevenue: item.TotalRevenue,
			TotalCost:    item.TotalCost,
			TotalProfit:  item.TotalProfit,
			AvgMarginPct: math.Round(item.AvgMarginPct*10) / 10,
			Quadrant:     quad,
			QuadrantName: quadName,
		})
	}

	return res, nil
}

// ---------------------------------------------------------------------
// 3. Kepatuhan DSO Customer (P3) & Konsentrasi Pareto 80/20 (P5)
// ---------------------------------------------------------------------

type CustomerDisciplineItem struct {
	ClientName         string  `json:"client_name"`
	TotalInvoices      int     `json:"total_invoices"`
	TotalBilled        float64 `json:"total_billed"`
	AvgTopDays         int     `json:"avg_top_days"`
	AvgActualDSO       float64 `json:"avg_actual_dso"`
	OverdueCount       int     `json:"overdue_count"`
	RescheduleCount    int     `json:"reschedule_count"`
	DisciplineStatus   string  `json:"discipline_status"` // PRIME, MODERATE, HIGH_RISK
	ParetoPercent      float64 `json:"pareto_percent"`
	CumulativePercent  float64 `json:"cumulative_percent"`
	RecentTripsCount   int     `json:"recent_trips_count"`
	PreviousTripsCount int     `json:"previous_trips_count"`
	TripChangePct      float64 `json:"trip_change_pct"`
	IsChurnWarning     bool    `json:"is_churn_warning"`
}

type CustomerDisciplineAndParetoResponse struct {
	TotalClients        int                      `json:"total_clients"`
	TotalRevenue        float64                  `json:"total_revenue"`
	Top80PercentCount   int                      `json:"top_80_percent_count"`
	Customers           []CustomerDisciplineItem `json:"customers"`
	OverallAvgDSO       float64                  `json:"overall_avg_dso"`
	HighRiskClientCount int                      `json:"high_risk_client_count"`
	ChurnAlertCount     int                      `json:"churn_alert_count"`
}

func (r *PostgresAnalyticsRepo) GetCustomerDisciplineAndPareto(ctx context.Context, filter ports.ListFilter) (res CustomerDisciplineAndParetoResponse, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("analytics_repo", "GetCustomerDisciplineAndPareto", "SELECT customer discipline and pareto", start, err)
	}()

	query := `
		SELECT 
			i.client_name,
			COUNT(DISTINCT i.id) as total_invoices,
			COALESCE(SUM(i.amount), 0) as total_billed,
			COALESCE(AVG(i.top_days), 30)::int as avg_top_days,
			COALESCE(AVG(CASE 
				WHEN i.status = 'PAID' AND i.paid_at IS NOT NULL THEN (i.paid_at::date - i.shipment_date)
				WHEN i.status = 'OVERDUE' THEN i.top_days + (CURRENT_DATE - i.due_date)
				ELSE i.top_days 
			END), 30) as avg_actual_dso,
			COUNT(DISTINCT CASE WHEN i.status = 'OVERDUE' THEN i.id END) as overdue_count,
			COALESCE(COUNT(DISTINCT h.id), 0) as reschedule_count
		FROM invoices i
		LEFT JOIN invoice_due_date_history h ON i.id = h.invoice_id
		WHERE i.deleted_at IS NULL
		GROUP BY i.client_name
		ORDER BY total_billed DESC
	`

	type rawCust struct {
		ClientName      string  `db:"client_name"`
		TotalInvoices   int     `db:"total_invoices"`
		TotalBilled     float64 `db:"total_billed"`
		AvgTopDays      int     `db:"avg_top_days"`
		AvgActualDSO    float64 `db:"avg_actual_dso"`
		OverdueCount    int     `db:"overdue_count"`
		RescheduleCount int     `db:"reschedule_count"`
	}

	var rawList []rawCust
	if err := r.db.SelectContext(ctx, &rawList, query); err != nil {
		return res, fmt.Errorf("failed to query customer discipline: %w", err)
	}

	// Ambil frekuensi trip pelanggan dalam 30 hari terakhir vs 30 hari sebelumnya untuk churn warning
	type tripHistory struct {
		ClientName string `db:"client_name"`
		Recent     int    `db:"recent_trips"`
		Previous   int    `db:"prev_trips"`
	}
	queryTrips := `
		SELECT 
			act_information as client_name,
			COUNT(CASE WHEN date_of_entry >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_trips,
			COUNT(CASE WHEN date_of_entry >= CURRENT_DATE - INTERVAL '60 days' AND date_of_entry < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as prev_trips
		FROM cashflow_entries
		WHERE entry_type = 'SHIPMENT' AND act_information IS NOT NULL AND TRIM(act_information) != ''
		GROUP BY act_information
	`
	var tripList []tripHistory
	_ = r.db.SelectContext(ctx, &tripList, queryTrips)

	tripMap := make(map[string]tripHistory)
	for _, t := range tripList {
		tripMap[t.ClientName] = t
	}

	var totalRevenue float64
	for _, c := range rawList {
		totalRevenue += c.TotalBilled
	}

	res.TotalClients = len(rawList)
	res.TotalRevenue = totalRevenue

	var cumulative float64
	var totalDSO float64
	top80Count := 0

	for _, c := range rawList {
		pct := 0.0
		if totalRevenue > 0 {
			pct = (c.TotalBilled / totalRevenue) * 100
		}
		cumulative += pct
		totalDSO += c.AvgActualDSO

		if cumulative <= 85.0 && top80Count == 0 {
			// menandai batas 80%
		}
		if cumulative <= 80.0 {
			top80Count++
		}

		// Kategori Kepatuhan (Prime, Moderate, High Risk)
		var status string
		if c.OverdueCount > 0 || c.RescheduleCount >= 2 || c.AvgActualDSO > float64(c.AvgTopDays+10) {
			status = "HIGH_RISK"
			res.HighRiskClientCount++
		} else if c.AvgActualDSO > float64(c.AvgTopDays) {
			status = "MODERATE"
		} else {
			status = "PRIME"
		}

		// Churn Analysis
		th := tripMap[c.ClientName]
		var changePct float64
		isChurn := false
		if th.Previous > 0 {
			changePct = ((float64(th.Recent) - float64(th.Previous)) / float64(th.Previous)) * 100
			if changePct <= -40.0 {
				isChurn = true
				res.ChurnAlertCount++
			}
		}

		res.Customers = append(res.Customers, CustomerDisciplineItem{
			ClientName:         c.ClientName,
			TotalInvoices:      c.TotalInvoices,
			TotalBilled:        c.TotalBilled,
			AvgTopDays:         c.AvgTopDays,
			AvgActualDSO:       math.Round(c.AvgActualDSO*10) / 10,
			OverdueCount:       c.OverdueCount,
			RescheduleCount:    c.RescheduleCount,
			DisciplineStatus:   status,
			ParetoPercent:      math.Round(pct*10) / 10,
			CumulativePercent:  math.Round(cumulative*10) / 10,
			RecentTripsCount:   th.Recent,
			PreviousTripsCount: th.Previous,
			TripChangePct:      math.Round(changePct*10) / 10,
			IsChurnWarning:     isChurn,
		})
	}

	if len(rawList) > 0 {
		res.OverallAvgDSO = math.Round((totalDSO/float64(len(rawList)))*10) / 10
	}
	res.Top80PercentCount = top80Count
	if res.Top80PercentCount == 0 && len(rawList) > 0 {
		res.Top80PercentCount = 1
	}

	return res, nil
}

// ---------------------------------------------------------------------
// 4. Analisis Efisiensi & Ketergantungan Rekanan Vendor (P4)
// ---------------------------------------------------------------------

type VendorEfficiencyItem struct {
	VendorName         string  `json:"vendor_name"`
	TripCount          int     `json:"trip_count"`
	TotalCost          float64 `json:"total_cost"`
	TotalSelling       float64 `json:"total_selling"`
	TotalProfit        float64 `json:"total_profit"`
	AvgMarginPct       float64 `json:"avg_margin_pct"`
	ConcentrationRatio float64 `json:"concentration_ratio"`
	IsDominant         bool    `json:"is_dominant"` // true jika > 35%
}

type VendorEfficiencyResponse struct {
	TotalVendors       int                    `json:"total_vendors"`
	TotalCostAll       float64                `json:"total_cost_all"`
	TotalTripsAll      int                    `json:"total_trips_all"`
	TopVendorName      string                 `json:"top_vendor_name"`
	TopConcentrationPct float64               `json:"top_concentration_pct"`
	HighestMarginVendor string                `json:"highest_margin_vendor"`
	HighestMarginPct   float64                `json:"highest_margin_pct"`
	Vendors            []VendorEfficiencyItem `json:"vendors"`
}

func (r *PostgresAnalyticsRepo) GetVendorEfficiency(ctx context.Context, filter ports.ListFilter) (res VendorEfficiencyResponse, err error) {
	start := time.Now()
	defer func() {
		telemetry.TrackQuery("analytics_repo", "GetVendorEfficiency", "SELECT vendor efficiency and concentration", start, err)
	}()

	wherePeriodic := "WHERE entry_type = 'SHIPMENT'"
	args := []interface{}{}
	argIdx := 1

	if filter.DateFrom != nil && *filter.DateFrom != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry >= $%d", argIdx)
		args = append(args, *filter.DateFrom)
		argIdx++
	}
	if filter.DateTo != nil && *filter.DateTo != "" {
		wherePeriodic += fmt.Sprintf(" AND date_of_entry <= $%d", argIdx)
		args = append(args, *filter.DateTo)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE(NULLIF(TRIM(vendor_name_raw), ''), 'Vendor Rekanan Operasional') as vendor_name,
			COUNT(*) as trip_count,
			COALESCE(SUM(grand_cost), 0) as total_cost,
			COALESCE(SUM(grand_selling), 0) as total_selling,
			COALESCE(SUM(profit), 0) as total_profit,
			COALESCE(AVG(CASE WHEN grand_selling > 0 THEN margin_pct * 100 ELSE 0 END), 0) as avg_margin_pct
		FROM cashflow_entries
		%s
		GROUP BY vendor_name
		ORDER BY total_cost DESC
	`, wherePeriodic)

	type rawVend struct {
		VendorName   string  `db:"vendor_name"`
		TripCount    int     `db:"trip_count"`
		TotalCost    float64 `db:"total_cost"`
		TotalSelling float64 `db:"total_selling"`
		TotalProfit  float64 `db:"total_profit"`
		AvgMarginPct float64 `db:"avg_margin_pct"`
	}

	var rawList []rawVend
	if err := r.db.SelectContext(ctx, &rawList, query, args...); err != nil {
		return res, fmt.Errorf("failed to query vendor efficiency: %w", err)
	}

	var totalTrips int
	var totalCost float64
	var maxMargin float64
	var bestMarginVendor string

	for _, v := range rawList {
		totalTrips += v.TripCount
		totalCost += v.TotalCost
		if v.AvgMarginPct > maxMargin && v.TripCount >= 2 {
			maxMargin = v.AvgMarginPct
			bestMarginVendor = v.VendorName
		}
	}

	res.TotalVendors = len(rawList)
	res.TotalTripsAll = totalTrips
	res.TotalCostAll = totalCost
	res.HighestMarginVendor = bestMarginVendor
	res.HighestMarginPct = math.Round(maxMargin*10) / 10

	for idx, v := range rawList {
		ratio := 0.0
		if totalTrips > 0 {
			ratio = (float64(v.TripCount) / float64(totalTrips)) * 100
		}

		if idx == 0 {
			res.TopVendorName = v.VendorName
			res.TopConcentrationPct = math.Round(ratio*10) / 10
		}

		res.Vendors = append(res.Vendors, VendorEfficiencyItem{
			VendorName:         v.VendorName,
			TripCount:          v.TripCount,
			TotalCost:          v.TotalCost,
			TotalSelling:       v.TotalSelling,
			TotalProfit:        v.TotalProfit,
			AvgMarginPct:       math.Round(v.AvgMarginPct*10) / 10,
			ConcentrationRatio: math.Round(ratio*10) / 10,
			IsDominant:         ratio >= 35.0,
		})
	}

	// Urutkan vendor: bisa berdasarkan biaya atau ritase
	sort.Slice(res.Vendors, func(i, j int) bool {
		return res.Vendors[i].TotalCost > res.Vendors[j].TotalCost
	})

	return res, nil
}
