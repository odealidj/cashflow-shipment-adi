"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Activity, 
  Database, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Pause, 
  Server, 
  CheckCircle2, 
  FileText, 
  TrendingUp,
  Cpu,
  Layers,
  Flame,
  ArrowUpRight
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface GatewayMetrics {
  rps: number;
  error_rate_pct: number;
  p95_latency_ms: number;
  total_requests: number;
  idempotency_hits: number;
  idempotency_misses: number;
}

interface DBPoolMetrics {
  open: number;
  in_use: number;
  idle: number;
  max_open: number;
  wait_count: number;
  wait_duration_ms: number;
}

interface BusinessKPIMetrics {
  shipments_today: number;
  topups_today: number;
  invoices_created_today: number;
  invoices_paid_today: number;
}

interface SlowQueryRecord {
  repository: string;
  operation: string;
  query_preview: string;
  duration_ms: number;
  timestamp: string;
  has_error: boolean;
}

interface SystemMetricsData {
  prometheus_connected: boolean;
  gateway: GatewayMetrics;
  database_pool: DBPoolMetrics;
  business_kpi: BusinessKPIMetrics;
  slow_queries: SlowQueryRecord[];
  timestamp: string;
}

export default function SystemMetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5s default
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulatingSlow, setSimulatingSlow] = useState(false);
  const [simulateSuccessMsg, setSimulateSuccessMsg] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/metrics");
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          setMetrics(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data sistem telemetri:", err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, []);

  // Interval polling
  useEffect(() => {
    fetchMetrics();
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [fetchMetrics, refreshInterval]);

  const handleSimulateSlowQuery = async () => {
    setSimulatingSlow(true);
    setSimulateSuccessMsg(null);
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/simulate-slow-query?duration_ms=150", {
        method: "POST"
      });
      if (res.ok) {
        const json = await res.json();
        setSimulateSuccessMsg(json.message || "Simulasi query lambat (150ms) berhasil dieksekusi!");
        // Refresh immediately to show in ring-buffer
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Gagal menjalankan simulasi query:", err);
    } finally {
      setSimulatingSlow(false);
      setTimeout(() => setSimulateSuccessMsg(null), 5000);
    }
  };

  const pool = metrics?.database_pool || {
    open: 0,
    in_use: 0,
    idle: 0,
    max_open: 25,
    wait_count: 0,
    wait_duration_ms: 0
  };

  const poolUsagePct = pool.max_open > 0 ? Math.min(100, Math.round((pool.open / pool.max_open) * 100)) : 0;
  const inUsePct = pool.max_open > 0 ? Math.min(100, Math.round((pool.in_use / pool.max_open) * 100)) : 0;
  const idlePct = pool.max_open > 0 ? Math.min(100, Math.round((pool.idle / pool.max_open) * 100)) : 0;

  const getLatencyBadge = (ms: number) => {
    if (ms < 100) {
      return <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300/60">{ms.toFixed(1)} ms (Cepat)</span>;
    }
    if (ms <= 300) {
      return <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-100 text-amber-700 border border-amber-300/60">{ms.toFixed(1)} ms (Sedang)</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-rose-100 text-rose-700 border border-rose-300/60">{ms.toFixed(1)} ms (Lambat)</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <header className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#223249] text-sky-400">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Telemetri & Observabilitas Sistem
                {metrics?.prometheus_connected ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300/80 uppercase tracking-wider">
                    Prometheus Active :9090
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-sky-100 text-sky-700 border border-sky-300/80 uppercase tracking-wider">
                    Direct Telemetry
                  </span>
                )}
              </h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Monitoring real-time throughput Gateway :8080, latency P95, PostgreSQL connection pool, dan slow query inspector.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Refresh Rate, Manual Button & Test Trigger */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${refreshInterval > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
              Refresh:
            </span>
            <button
              onClick={() => setRefreshInterval(5000)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                refreshInterval === 5000 ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              5s
            </button>
            <button
              onClick={() => setRefreshInterval(15000)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                refreshInterval === 15000 ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              15s
            </button>
            <button
              onClick={() => setRefreshInterval(0)}
              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                refreshInterval === 0 ? "bg-white text-rose-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Pause auto-refresh"
            >
              {refreshInterval === 0 ? <Pause className="w-3.5 h-3.5" /> : "Pause"}
            </button>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs transition-all shadow-xs cursor-pointer"
            title="Segarkan data seketika"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleSimulateSlowQuery}
            disabled={simulatingSlow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            title="Memicu query dengan pg_sleep 150ms untuk menguji slow query inspector"
          >
            <Flame className={`w-3.5 h-3.5 ${simulatingSlow ? "animate-bounce" : ""}`} />
            <span>{simulatingSlow ? "Mengeksekusi..." : "Uji Query Lambat (150ms)"}</span>
          </button>
        </div>
      </header>

      {simulateSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{simulateSuccessMsg}</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">Tercatat di Slow Query Tracker</span>
        </div>
      )}

      {/* TOP ROW: 4 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Throughput RPS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-sky-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gateway Throughput</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.rps !== undefined ? metrics.gateway.rps.toFixed(1) : "0.0"} <span className="text-base font-bold text-slate-500">RPS</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
              <span>{metrics?.gateway.total_requests ? metrics.gateway.total_requests.toLocaleString() : "0"} Total Requests Diterima</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Edge Gateway :8080</span>
            <span className="font-bold text-sky-600">Rate (1m)</span>
          </div>
        </div>

        {/* 2. P95 Request Latency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">P95 Latency</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.p95_latency_ms !== undefined ? metrics.gateway.p95_latency_ms.toFixed(1) : "0.0"} <span className="text-base font-bold text-slate-500">ms</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              {metrics && metrics.gateway.p95_latency_ms < 50 ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sangat Responsif (&lt;50ms)
                </span>
              ) : (
                <span className="text-amber-600 font-bold">Latency Normal &amp; Terkendali</span>
              )}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">95% Request Lebih Cepat</span>
            <span className="font-bold text-emerald-600">Histogram (5m)</span>
          </div>
        </div>

        {/* 3. Error Rate % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HTTP Error Rate</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.error_rate_pct !== undefined ? metrics.gateway.error_rate_pct.toFixed(2) : "0.00"}%
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              {metrics && metrics.gateway.error_rate_pct === 0 ? (
                <span className="text-emerald-600 font-bold">Nol Error Terdeteksi (0%)</span>
              ) : (
                <span className="text-rose-600 font-bold">Error 4xx / 502 Mendeteksi Issue</span>
              )}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Status &ge; 400 + 502</span>
            <span className="font-bold text-slate-700">Edge Guard</span>
          </div>
        </div>

        {/* 4. Idempotency Protection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Idempotency Guard</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.idempotency_hits !== undefined ? metrics.gateway.idempotency_hits : 0} <span className="text-base font-bold text-slate-500">Hits</span>
            </div>
            <p className="text-[11px] font-medium text-indigo-600 mt-1 font-bold">
              Double-submit Transaksi Dicegah
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Redis Lock: 24 Jam TTL</span>
            <span className="font-bold text-indigo-600">{metrics?.gateway.idempotency_misses || 0} Request Baru</span>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: DATABASE CONNECTION POOL & BUSINESS KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Connection Pool Health */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#223249] text-sky-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Database Connection Pool</h2>
                  <p className="text-slate-500 text-xs font-medium">Kapasitas koneksi PostgreSQL 15 &amp; status pool</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                Sehat (No Bottleneck)
              </span>
            </div>

            {/* Visual Capacity Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
                <span>Penggunaan Pool: {pool.open} / {pool.max_open} Koneksi</span>
                <span className="text-slate-900 font-black">{poolUsagePct}%</span>
              </div>
              <div className="w-full h-4 rounded-full bg-slate-100 p-0.5 border border-slate-200 overflow-hidden flex">
                <div 
                  style={{ width: `${inUsePct}%` }} 
                  className="h-full bg-indigo-600 rounded-l-full transition-all duration-500" 
                  title={`In Use: ${pool.in_use}`}
                />
                <div 
                  style={{ width: `${idlePct}%` }} 
                  className="h-full bg-sky-400 rounded-r-full transition-all duration-500" 
                  title={`Idle: ${pool.idle}`}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span>In Use ({pool.in_use})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <span>Idle ({pool.idle})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                  <span>Kapasitas Tersedia ({pool.max_open - pool.open})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Pool Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Antrian (Wait Count)</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">{pool.wait_count}</p>
              <span className="text-[10px] text-emerald-600 font-semibold">0 Queue = Optimal</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Wait Duration</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">{pool.wait_duration_ms.toFixed(1)} ms</p>
              <span className="text-[10px] text-slate-500 font-medium">Waktu tunggu pool</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batas Maksimum</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">{pool.max_open}</p>
              <span className="text-[10px] text-sky-600 font-medium">Max Open Conn</span>
            </div>
          </div>
        </div>

        {/* Business Activity & Telemetry (Hari Ini) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-700 text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Business KPI Activity (Hari Ini)</h2>
                  <p className="text-slate-500 text-xs font-medium">Transaksi operasional logistik &amp; status penagihan real-time</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-sky-100 text-sky-800 border border-sky-300/80">
                Live Data
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mt-6">
              {/* Shipment Entries */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Pengiriman (Shipment)</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {metrics?.business_kpi.shipments_today ?? 0}
                </div>
                <p className="text-[11px] text-sky-700 font-bold mt-1">Transaksi Muatan Hari Ini</p>
              </div>

              {/* Top Up Entries */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Top Up Kas Masuk</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {metrics?.business_kpi.topups_today ?? 0}
                </div>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">Suntikan Kas Operasional</p>
              </div>

              {/* Invoices Created */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Invoice Diterbitkan</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {metrics?.business_kpi.invoices_created_today ?? 0}
                </div>
                <p className="text-[11px] text-indigo-700 font-bold mt-1">Tagihan Dibuat Hari Ini</p>
              </div>

              {/* Invoices Paid */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-teal-50/50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500">Invoice Lunas</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {metrics?.business_kpi.invoices_paid_today ?? 0}
                </div>
                <p className="text-[11px] text-teal-700 font-bold mt-1">Pelunasan Piutang Hari Ini</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Timestamp Server: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString("id-ID") : "-"}</span>
            <span className="text-sky-700 font-bold">Sinkronisasi Database Aktif</span>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: SLOW QUERY INSPECTOR TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Slow Query Inspector (Ambang Batas &gt; 100ms)</h2>
              <p className="text-slate-500 text-xs font-medium">
                Ring-buffer 20 query terlama terakhir yang melintasi PostgreSQL repository layer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              {metrics?.slow_queries.length || 0} Query Terdeteksi
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100 text-[10px]">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Repository</th>
                <th className="py-3 px-4">Operasi</th>
                <th className="py-3 px-4">Durasi Eksekusi</th>
                <th className="py-3 px-4">Preview Query SQL</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics?.slow_queries && metrics.slow_queries.length > 0 ? (
                metrics.slow_queries.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(q.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                        {q.repository}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {q.operation}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getLatencyBadge(q.duration_ms)}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-mono text-[11px] text-slate-600 bg-slate-50/50 rounded" title={q.query_preview}>
                      <code>{q.query_preview}</code>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {q.has_error ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-700">Error</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 text-xs">Semua Query Berjalan Cepat (&lt;100ms)</p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Tidak ada eksekusi query lambat yang terdeteksi. Anda dapat menguji fitur ini dengan tombol &quot;Uji Query Lambat (150ms)&quot; di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
