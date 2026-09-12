"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  Receipt,
  PieChart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Building,
  DollarSign,
  Sparkles,
  Layers
} from "lucide-react";
import { KPICards, SummaryData, InvoiceSummaryData } from "@/components/KPICards";
import { BusinessGrowthChart } from "@/components/dashboard/BusinessGrowthChart";
import { UrgentInvoicesPanel } from "@/components/dashboard/UrgentInvoicesPanel";
import { TopRoutesAnalyticsPanel } from "@/components/dashboard/TopRoutesAnalyticsPanel";
import { CashflowRunwayChart, CashflowRunwayData } from "@/components/dashboard/strategy/CashflowRunwayChart";
import { CashConversionGapCard } from "@/components/dashboard/strategy/CashConversionGapCard";
import { RouteBCGMatrixChart, RouteMatrixData } from "@/components/dashboard/strategy/RouteBCGMatrixChart";
import { VendorEfficiencyChart, VendorEfficiencyData } from "@/components/dashboard/strategy/VendorEfficiencyChart";
import { CustomerDsoDisciplineChart, CustomerDisciplineData } from "@/components/dashboard/strategy/CustomerDsoDisciplineChart";
import { CustomerParetoChart } from "@/components/dashboard/strategy/CustomerParetoChart";
import { TopUpModal } from "@/components/TopUpModal";
import { ShipmentModal } from "@/components/ShipmentModal";
import { CreateInvoiceModal } from "@/components/CreateInvoiceModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { 
  formatActivePeriod, 
  getCurrentMonthRange, 
  getMonthRange, 
  formatYMD, 
  MONTH_NAMES 
} from "@/components/FilterBar";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tab Switcher State (Alternatif A: Operasional vs Strategi)
  const [activeMainTab, setActiveMainTab] = useState<"operations" | "strategy">("operations");

  // Strategic Analytics States
  const [runwayData, setRunwayData] = useState<CashflowRunwayData | null>(null);
  const [routeMatrixData, setRouteMatrixData] = useState<RouteMatrixData | null>(null);
  const [customerDisciplineData, setCustomerDisciplineData] = useState<CustomerDisciplineData | null>(null);
  const [vendorEfficiencyData, setVendorEfficiencyData] = useState<VendorEfficiencyData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  // Period Filter States (Default: Current Month)
  const [dateFrom, setDateFrom] = useState<string>(() => getCurrentMonthRange().date_from);
  const [dateTo, setDateTo] = useState<string>(() => getCurrentMonthRange().date_to);
  const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);

  // Financial Summaries
  const [cashflowSummary, setCashflowSummary] = useState<SummaryData>({
    current_saldo: 0,
    total_kredit: 0,
    total_debit: 0,
    total_profit: 0,
    avg_margin_pct: 0,
    unpaid_count: 0,
    unpaid_amount: 0
  });

  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummaryData | null>(null);

  // Raw & Historical Data for Charts and Intelligence Panels
  const [historicalCashflow, setHistoricalCashflow] = useState<any[]>([]);
  const [historicalInvoices, setHistoricalInvoices] = useState<any[]>([]);
  const [urgentInvoices, setUrgentInvoices] = useState<any[]>([]);

  // Modal States for Quick Actions
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // 18 Month Dropdown Options (12 past, current, 5 future)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();

    for (let i = -12; i <= 5; i++) {
      const d = new Date(currentY, currentM + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const range = getMonthRange(y, m);
      const isCurrent = i === 0;
      options.push({
        ...range,
        isCurrent,
        displayLabel: isCurrent ? `${range.label} (Bulan Ini)` : range.label
      });
    }
    return options;
  }, []);

  const activePeriodLabel = useMemo(() => {
    return formatActivePeriod(dateFrom, dateTo);
  }, [dateFrom, dateTo]);

  const isCurrentMonthActive = useMemo(() => {
    const cur = getCurrentMonthRange();
    return dateFrom === cur.date_from && dateTo === cur.date_to;
  }, [dateFrom, dateTo]);

  // Stepper Handlers
  const handlePrevMonth = () => {
    if (!dateFrom) {
      const prev = getMonthRange(new Date().getFullYear(), new Date().getMonth() - 1);
      setDateFrom(prev.date_from);
      setDateTo(prev.date_to);
      return;
    }
    const parts = dateFrom.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const prev = getMonthRange(y, m - 1);
    setDateFrom(prev.date_from);
    setDateTo(prev.date_to);
  };

  const handleNextMonth = () => {
    if (!dateFrom) {
      const next = getMonthRange(new Date().getFullYear(), new Date().getMonth() + 1);
      setDateFrom(next.date_from);
      setDateTo(next.date_to);
      return;
    }
    const parts = dateFrom.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const next = getMonthRange(y, m + 1);
    setDateFrom(next.date_from);
    setDateTo(next.date_to);
  };

  const setMonthByRange = (start: string, end: string) => {
    setDateFrom(start);
    setDateTo(end);
    setIsCustomRangeOpen(false);
  };

  const setAllPeriod = () => {
    setDateFrom("");
    setDateTo("");
    setIsCustomRangeOpen(false);
  };

  // Parallel Fetching Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Build query string for period-based summaries
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const queryString = params.toString() ? `?${params.toString()}` : "";

      // 1. Fetch Cashflow Summary (Period Filtered)
      const resCashflowSummary = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow/summary${queryString}`);
      const dataCashflowSummary = await resCashflowSummary.json();
      if (dataCashflowSummary.status && dataCashflowSummary.data) {
        setCashflowSummary(dataCashflowSummary.data);
      }

      // 2. Fetch Invoices Summary (Period Filtered)
      const resInvoiceSummary = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/summary${queryString}`);
      const dataInvoiceSummary = await resInvoiceSummary.json();
      if (dataInvoiceSummary.status && dataInvoiceSummary.data) {
        setInvoiceSummary(dataInvoiceSummary.data);
      }

      // 3. Fetch Overdue & Urgent Invoices
      const resUrgent = await fetchWithAuth(`http://localhost:8080/api/v1/invoices?status=OVERDUE&limit=10`);
      const dataUrgent = await resUrgent.json();
      if (dataUrgent.status && dataUrgent.data) {
        const list = Array.isArray(dataUrgent.data) ? dataUrgent.data : (dataUrgent.data.invoices || []);
        setUrgentInvoices(list);
      }

      // 4. Fetch Historical Entries for Growth Chart & Top Routes
      const [resEntries, resAllInvoices] = await Promise.all([
        fetchWithAuth(`http://localhost:8080/api/v1/cashflow?page=1&limit=500&sort=DESC`),
        fetchWithAuth(`http://localhost:8080/api/v1/invoices?page=1&limit=500&sort_dir=DESC`)
      ]);

      const dataEntries = await resEntries.json();
      if (dataEntries.status && dataEntries.data) {
        setHistoricalCashflow(Array.isArray(dataEntries.data) ? dataEntries.data : (dataEntries.data.entries || []));
      }

      const dataAllInvoices = await resAllInvoices.json();
      if (dataAllInvoices.status && dataAllInvoices.data) {
        setHistoricalInvoices(Array.isArray(dataAllInvoices.data) ? dataAllInvoices.data : (dataAllInvoices.data.invoices || []));
      }

    } catch (err) {
      console.error("Failed to fetch dashboard executive data:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  // Fetch Strategic Analytics Data (P1 - P6)
  const fetchAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";

      const [resRunway, resRoute, resCust, resVend] = await Promise.all([
        fetchWithAuth(`http://localhost:8080/api/v1/analytics/cashflow-runway`),
        fetchWithAuth(`http://localhost:8080/api/v1/analytics/route-matrix${qs}`),
        fetchWithAuth(`http://localhost:8080/api/v1/analytics/customer-discipline-pareto${qs}`),
        fetchWithAuth(`http://localhost:8080/api/v1/analytics/vendor-efficiency${qs}`)
      ]);

      const [dataRunway, dataRoute, dataCust, dataVend] = await Promise.all([
        resRunway.json(),
        resRoute.json(),
        resCust.json(),
        resVend.json()
      ]);

      if (dataRunway.status && dataRunway.data) setRunwayData(dataRunway.data);
      if (dataRoute.status && dataRoute.data) setRouteMatrixData(dataRoute.data);
      if (dataCust.status && dataCust.data) setCustomerDisciplineData(dataCust.data);
      if (dataVend.status && dataVend.data) setVendorEfficiencyData(dataVend.data);
    } catch (err) {
      console.error("Failed to fetch strategic analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeMainTab === "strategy") {
      fetchAnalyticsData();
    }
  }, [activeMainTab, fetchAnalyticsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculations for Arus Kas Inflow vs Outflow
  const totalVolume = cashflowSummary.total_kredit + cashflowSummary.total_debit;
  const inflowRatio = totalVolume > 0 ? (cashflowSummary.total_kredit / totalVolume) * 100 : 50;
  const outflowRatio = totalVolume > 0 ? (cashflowSummary.total_debit / totalVolume) * 100 : 50;

  // Calculations for Aging Receivables
  const totalBilled = invoiceSummary?.total_amount || 0;
  const paidBilled = invoiceSummary?.paid_amount || 0;
  const overdueBilled = invoiceSummary?.overdue_amount || 0;
  const pendingBilled = Math.max(0, (invoiceSummary?.unpaid_amount || 0) - overdueBilled);

  const paidRatio = totalBilled > 0 ? (paidBilled / totalBilled) * 100 : 0;
  const pendingRatio = totalBilled > 0 ? (pendingBilled / totalBilled) * 100 : 0;
  const overdueRatio = totalBilled > 0 ? (overdueBilled / totalBilled) * 100 : 0;

  // Filter cashflow entries for TopRoutesAnalyticsPanel according to active period from toolbar
  const filteredCashflowForRoutes = useMemo(() => {
    if (!dateFrom && !dateTo) return historicalCashflow;
    return (historicalCashflow || []).filter((e) => {
      if (!e.date_of_entry) return false;
      const d = e.date_of_entry.substring(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [historicalCashflow, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {/* Header & Executive Quick Action Buttons */}
      <header className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              Executive Dashboard
            </span>
            <span className="text-xs text-slate-400 font-medium">PT Adijayantara Logistic</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview Keuangan & Bisnis</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Selamat datang kembali{user ? `, ${user.full_name}` : ""}. Ringkasan real-time arus kas, kinerja shipment, dan penagihan invoice.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTopUpOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Top Up Modal</span>
          </button>
          
          <button
            onClick={() => setIsShipmentOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Catat Pengiriman</span>
          </button>

          <button
            onClick={() => setIsInvoiceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Buat Invoice</span>
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            <span>Buku Kas</span>
          </Link>

          <Link
            href="/dashboard/invoices"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Invoices</span>
          </Link>
        </div>
      </header>

      {/* 2-Tab Executive Switcher (Alternatif A: Operasional vs Strategi) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveMainTab("operations")}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeMainTab === "operations"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Receipt className="w-4 h-4 text-sky-600" />
          <span>Operasional & Kas Berjalan</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            Daily Pulse
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab("strategy");
            if (!runwayData) fetchAnalyticsData();
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeMainTab === "strategy"
              ? "bg-slate-900 text-white shadow-xs border border-slate-800"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Intelijen Strategis & Pertumbuhan</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
            6 Grafik Eksekutif
          </span>
        </button>
      </div>

      {/* Unified Period Toolbar */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Stepper & Dropdown */}
        <div className="flex items-center gap-2">
          {/* Stepper Prev */}
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month Dropdown */}
          <select
            value={dateFrom && dateTo ? `${dateFrom}_${dateTo}` : "ALL"}
            onChange={(e) => {
              if (e.target.value === "ALL") {
                setAllPeriod();
              } else {
                const [start, end] = e.target.value.split("_");
                setMonthByRange(start, end);
              }
            }}
            className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer shadow-2xs"
          >
            {monthOptions.map((opt) => (
              <option key={opt.monthKey} value={`${opt.date_from}_${opt.date_to}`}>
                {opt.displayLabel}
              </option>
            ))}
            <option value="ALL">Semua Periode (All-Time)</option>
          </select>

          {/* Stepper Next */}
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 transition-all cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Active Period Indicator */}
        <div className="flex items-center gap-2 text-xs font-black text-slate-700">
          <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span>
            Periode Aktif:{" "}
            <span className="text-sky-800 underline decoration-sky-300 underline-offset-2">
              {activePeriodLabel}
            </span>
          </span>
          {isCurrentMonthActive && (
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Bulan Berjalan
            </span>
          )}
        </div>

        {/* Right: Quick Presets & Custom Range */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const cur = getCurrentMonthRange();
              setMonthByRange(cur.date_from, cur.date_to);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isCurrentMonthActive
                ? "bg-sky-800 text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Bulan Ini
          </button>

          <button
            onClick={() => {
              const now = new Date();
              const prev = getMonthRange(now.getFullYear(), now.getMonth() - 1);
              setMonthByRange(prev.date_from, prev.date_to);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Bulan Lalu
          </button>

          <button
            onClick={setAllPeriod}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !dateFrom && !dateTo
                ? "bg-sky-800 text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Semua
          </button>

          <button
            onClick={() => setIsCustomRangeOpen(!isCustomRangeOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isCustomRangeOpen
                ? "bg-sky-50 border-sky-300 text-sky-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Kustom</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Popover */}
      {isCustomRangeOpen && (
        <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Dari:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-medium focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Sampai:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-medium focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <button
            onClick={() => setIsCustomRangeOpen(false)}
            className="px-3.5 py-1 rounded-lg bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs cursor-pointer"
          >
            Terapkan
          </button>
        </div>
      )}

      {/* MAIN TAB CONTENT */}
      {activeMainTab === "operations" ? (
        <>
          {/* Tier 1: 5 Executive KPI Cards */}
          <KPICards 
            summary={cashflowSummary} 
            invoiceSummary={invoiceSummary}
            loading={loading}
            periodLabel={activePeriodLabel}
            isCurrentPeriod={isCurrentMonthActive}
          />

          {/* Tier 2: Interactive Business Growth Chart (Finansial, Trip, Klien) */}
          <BusinessGrowthChart
            cashflowEntries={historicalCashflow}
            invoices={historicalInvoices}
            loading={loading}
          />

          {/* Tier 3: Visual Analytics (Likuiditas Kas & Aging Piutang) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Rasio Inflow vs Outflow & Status Likuiditas Kas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Likuiditas & Arus Kas Operasional
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Perbandingan perputaran modal masuk vs pengeluaran jalan
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">
                    Volume: {formatCurrency(totalVolume)}
                  </span>
                </div>

                <div className="space-y-3.5 my-4">
                  {/* Inflow bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Pemasukan Kas (Kredit)
                      </span>
                      <span className="text-emerald-700 font-mono">
                        {formatCurrency(cashflowSummary.total_kredit)} ({inflowRatio.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${inflowRatio}%` }}
                      />
                    </div>
                  </div>

                  {/* Outflow bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-rose-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                        Pengeluaran Kas (Debit)
                      </span>
                      <span className="text-rose-700 font-mono">
                        {formatCurrency(cashflowSummary.total_debit)} ({outflowRatio.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                        style={{ width: `${outflowRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Status Likuiditas:</span>
                  <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                    cashflowSummary.current_saldo >= 0 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}>
                    {cashflowSummary.current_saldo >= 0 ? "Surplus Kas Riil" : "Defisit Kas Operasional"}
                  </span>
                </div>

                <Link
                  href="/dashboard/transactions"
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <span>Jurnal Kas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Kesehatan & Aging Piutang Customer */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Kesehatan & Aging Piutang Customer
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Tingkat ketepatan waktu penagihan invoice penjualan
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">
                    Total Tagihan: {formatCurrency(totalBilled)}
                  </span>
                </div>

                {/* Multi-segment aging bar */}
                <div className="my-4">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Komposisi Piutang</span>
                    <span className="font-mono text-slate-500">
                      {((paidRatio)).toFixed(0)}% Terkumpul
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000"
                      style={{ width: `${paidRatio}%` }}
                      title={`Lunas: ${formatCurrency(paidBilled)}`}
                    />
                    <div 
                      className="h-full bg-amber-400 transition-all duration-1000"
                      style={{ width: `${pendingRatio}%` }}
                      title={`Menunggu TOP: ${formatCurrency(pendingBilled)}`}
                    />
                    <div 
                      className="h-full bg-rose-500 transition-all duration-1000"
                      style={{ width: `${overdueRatio}%` }}
                      title={`Jatuh Tempo: ${formatCurrency(overdueBilled)}`}
                    />
                  </div>

                  {/* 3 Status mini cards */}
                  <div className="grid grid-cols-3 gap-2.5 mt-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                      <div className="text-[10px] text-emerald-800 font-bold uppercase">Lunas</div>
                      <div className="text-xs font-black text-emerald-700 font-mono mt-0.5 truncate">
                        {formatCurrency(paidBilled)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium">
                        {invoiceSummary?.paid_count || 0} Invoice
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                      <div className="text-[10px] text-amber-800 font-bold uppercase">Menunggu TOP</div>
                      <div className="text-xs font-black text-amber-700 font-mono mt-0.5 truncate">
                        {formatCurrency(pendingBilled)}
                      </div>
                      <div className="text-[10px] text-amber-600 font-medium">
                        Dalam Tempo
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/60">
                      <div className="text-[10px] text-rose-800 font-bold uppercase">Jatuh Tempo</div>
                      <div className="text-xs font-black text-rose-700 font-mono mt-0.5 truncate">
                        {formatCurrency(overdueBilled)}
                      </div>
                      <div className="text-[10px] text-rose-600 font-medium">
                        {invoiceSummary?.overdue_count || 0} Overdue
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Collection Rate: <strong className="text-slate-800">{paidRatio.toFixed(1)}%</strong>
                </span>
                <Link
                  href="/dashboard/invoices"
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                >
                  <span>Kelola Invoices</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Tier 4: Actionable Decision Intelligence Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Panel 1: Urgent Invoices (Overdue & Collection Alert) */}
            <UrgentInvoicesPanel 
              invoices={urgentInvoices} 
              loading={loading} 
            />

            {/* Panel 2: Top Routes Profitability & Shipment Performance */}
            <TopRoutesAnalyticsPanel 
              cashflowEntries={filteredCashflowForRoutes} 
              loading={loading} 
            />
          </div>
        </>
      ) : (
        /* TAB 2: INTELIJEN STRATEGIS & PERTUMBUHAN BISNIS (6 Grafik Baru P1 - P6) */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Zona 1: Likuiditas & Ketahanan Modal Kerja (P1 & P6) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-sky-600 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Zona 1: Likuiditas & Ketahanan Modal Kerja
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <CashflowRunwayChart data={runwayData} loading={analyticsLoading} />
              </div>
              <div className="lg:col-span-1">
                <CashConversionGapCard
                  avgCustomerDSO={runwayData?.avg_customer_dso || 0}
                  avgVendorDPO={runwayData?.avg_vendor_dpo || 0}
                  financingGapDays={runwayData?.financing_gap_days || 0}
                  loading={analyticsLoading}
                />
              </div>
            </div>
          </div>

          {/* Zona 2: Profitabilitas Koridor & Armada Rekanan (P2 & P4) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Zona 2: Profitabilitas Koridor & Armada Rekanan
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <RouteBCGMatrixChart data={routeMatrixData} loading={analyticsLoading} />
              <VendorEfficiencyChart data={vendorEfficiencyData} loading={analyticsLoading} />
            </div>
          </div>

          {/* Zona 3: Portofolio & Kualitas Pelanggan (P3 & P5) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 bg-indigo-600 rounded-full" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Zona 3: Portofolio & Kualitas Pelanggan
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CustomerDsoDisciplineChart data={customerDisciplineData} loading={analyticsLoading} />
              <CustomerParetoChart data={customerDisciplineData} loading={analyticsLoading} />
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Modals */}
      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={() => {
          setIsTopUpOpen(false);
          fetchDashboardData();
        }} 
      />

      <ShipmentModal 
        isOpen={isShipmentOpen} 
        onClose={() => setIsShipmentOpen(false)} 
        onSuccess={() => {
          setIsShipmentOpen(false);
          fetchDashboardData();
        }} 
      />

      <CreateInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        onSuccess={() => {
          setIsInvoiceOpen(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
