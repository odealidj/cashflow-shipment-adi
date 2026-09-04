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
  ArrowUpRight,
  Download,
  Zap,
  AlertOctagon,
  StopCircle,
  BarChart3,
  History,
  Check,
  X,
  Info,
  Gauge
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

interface PostgresContainerMetrics {
  cpu_percent: string;
  mem_usage_mb: string;
  pids: string;
}

interface DBPoolMetrics {
  open: number;
  in_use: number;
  idle: number;
  max_open: number;
  wait_count: number;
  wait_duration_ms: number;
  postgres?: PostgresContainerMetrics;
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

interface RuntimeMetrics {
  go_version: string;
  num_goroutine: number;
  alloc_mb: number;
  sys_mb: number;
  num_gc: number;
  uptime_seconds: number;
  redis_status: string;
  redis_ping_ms: number;
}

interface SystemMetricsData {
  prometheus_connected: boolean;
  runtime?: RuntimeMetrics;
  gateway: GatewayMetrics;
  database_pool: DBPoolMetrics;
  business_kpi: BusinessKPIMetrics;
  slow_queries: SlowQueryRecord[];
  timestamp: string;
}

// k6 Types
interface BenchmarkCheck {
  name: string;
  passes: number;
  fails: number;
  success: boolean;
}

interface ExecutiveSummary {
  verdict_status: "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL";
  verdict_title: string;
  key_findings: string[];
  recommendations: string[];
}

interface DatabaseBenchmarkAnalysis {
  pool_max_open: number;
  peak_in_use: number;
  peak_utilization_pct: number;
  wait_count_delta: number;
  wait_duration_ms: number;
  slow_queries_count: number;
  db_verdict: "SEHAT" | "WASPADA" | "BOTTLENECK" | string;
  db_recommendation: string;
}

interface BenchmarkReport {
  job_id: string;
  scenario: string;
  scenario_label: string;
  timestamp: string;
  vus: number;
  duration: string;
  total_requests: number;
  rps: number;
  success_rate_pct: number;
  failed_requests: number;
  latency_min_ms: number;
  latency_med_ms: number;
  latency_avg_ms: number;
  latency_p90_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  latency_max_ms: number;
  data_received_kb: number;
  data_sent_kb: number;
  checks: BenchmarkCheck[];
  database_analysis?: DatabaseBenchmarkAnalysis;
  summary: ExecutiveSummary;
}

interface BenchmarkJobStatus {
  job_id: string;
  scenario: string;
  scenario_label: string;
  status: "IDLE" | "RUNNING" | "COMPLETED" | "ABORTED" | "FAILED";
  started_at: string;
  estimated_duration_sec: number;
  elapsed_sec: number;
  progress_pct: number;
  error_message?: string;
  latest_result?: BenchmarkReport;
}

interface StrictModalTarget {
  id: string;
  label: string;
  vus: number;
  duration: string;
  target: string;
  warningNote: string;
}

export default function SystemMetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5s default
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [simulatingSlow, setSimulatingSlow] = useState(false);
  const [simulateSuccessMsg, setSimulateSuccessMsg] = useState<string | null>(null);

  // k6 State
  const [benchmarkStatus, setBenchmarkStatus] = useState<BenchmarkJobStatus | null>(null);
  const [selectedReport, setSelectedReport] = useState<BenchmarkReport | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<BenchmarkReport[]>([]);
  const [strictModalScenario, setStrictModalScenario] = useState<StrictModalTarget | null>(null);
  const [strictAgreed, setStrictAgreed] = useState(false);
  const [isStartingBenchmark, setIsStartingBenchmark] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

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

  const fetchBenchmarkStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/benchmark/status");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const newStatus: BenchmarkJobStatus = json.data;
          setBenchmarkStatus(prev => {
            // Jika transisi dari RUNNING ke COMPLETED, otomatis buka popup hasil
            if (prev?.status === "RUNNING" && newStatus.status === "COMPLETED" && newStatus.latest_result) {
              setSelectedReport(newStatus.latest_result);
              setShowResultModal(true);
            }
            return newStatus;
          });
        }
      }
    } catch (err) {
      console.error("Gagal mengambil status benchmark:", err);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/benchmark/history");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setHistoryList(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat benchmark:", err);
    }
  }, []);

  // Interval polling metrics umum
  useEffect(() => {
    fetchMetrics();
    fetchBenchmarkStatus();
    if (refreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [fetchMetrics, fetchBenchmarkStatus, refreshInterval]);

  // Interval polling aktif khusus saat k6 RUNNING (setiap 1.2 detik)
  useEffect(() => {
    if (benchmarkStatus?.status !== "RUNNING") return;

    const timer = setInterval(() => {
      fetchBenchmarkStatus();
      // Segarkan juga metrik Prometheus agar angka di kartu atas bergerak real-time
      fetchMetrics();
    }, 1200);

    return () => clearInterval(timer);
  }, [benchmarkStatus?.status, fetchBenchmarkStatus, fetchMetrics]);

  const handleStartBenchmark = async (scenario: string) => {
    setIsStartingBenchmark(true);
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/benchmark/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      if (res.status === 202) {
        const json = await res.json();
        if (json.data) {
          setBenchmarkStatus(json.data);
        }
      } else if (res.status === 409) {
        alert("Pengujian beban sedang berlangsung! Harap tunggu hingga selesai atau batalkan secara darurat.");
      }
    } catch (err) {
      console.error("Gagal memulai benchmark:", err);
    } finally {
      setIsStartingBenchmark(false);
      setStrictModalScenario(null);
      setStrictAgreed(false);
    }
  };

  const handleAbortBenchmark = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengujian beban ini secara darurat?")) return;
    setIsAborting(true);
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/system/benchmark/abort", {
        method: "POST",
      });
      if (res.ok) {
        fetchBenchmarkStatus();
      }
    } catch (err) {
      console.error("Gagal menghentikan benchmark:", err);
    } finally {
      setIsAborting(false);
    }
  };

  const handleDownloadReport = async (report: BenchmarkReport) => {
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/system/benchmark/download?id=${report.job_id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `laporan_k6_${report.scenario}_${report.job_id}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Gagal mengunduh laporan:", err);
    }
  };

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
        await fetchMetrics();
      }
    } catch (err) {
      console.error("Gagal menjalankan simulasi query:", err);
    } finally {
      setSimulatingSlow(false);
      setTimeout(() => setSimulateSuccessMsg(null), 5000);
    }
  };

  // Helper formatting badges
  const getLatencyBadge = (latency: number) => {
    if (latency < 100) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          {latency.toFixed(1)} ms
        </span>
      );
    } else if (latency < 300) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          {latency.toFixed(1)} ms
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
        {latency.toFixed(1)} ms
      </span>
    );
  };

  const getVerdictBadge = (status: string) => {
    switch (status) {
      case "EXCELLENT":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">🟢 EXCELLENT</span>;
      case "GOOD":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">🔵 GOOD (PRIMA)</span>;
      case "WARNING":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">🟡 WARNING (PERHATIAN)</span>;
      case "CRITICAL":
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">🔴 CRITICAL (BOTTLENECK)</span>;
      default:
        return null;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
          <p className="text-slate-500 font-medium text-sm">Menghubungkan ke Prometheus &amp; Gateway Telemetri...</p>
        </div>
      </div>
    );
  }

  const poolTotal = metrics?.database_pool.max_open || 25;
  const poolInUse = metrics?.database_pool.in_use || 0;
  const poolIdle = metrics?.database_pool.idle || 0;
  const inUsePercent = Math.min(100, Math.round((poolInUse / poolTotal) * 100));
  const idlePercent = Math.min(100 - inUsePercent, Math.round((poolIdle / poolTotal) * 100));

  const isRunningBenchmark = benchmarkStatus?.status === "RUNNING";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Telemetri &amp; Observabilitas Sistem</h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Pemantauan real-time Golden Signals, Database Connection Pool, Runtime Go, dan Uji Beban k6
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Connection Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full ${metrics?.prometheus_connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            <span>{metrics?.prometheus_connected ? "Prometheus: Terhubung (:9090)" : "Prometheus: Terputus"}</span>
          </div>

          {/* Horizontal Segmented Refresh Bar */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${refreshInterval > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              Refresh:
            </span>
            <button
              type="button"
              onClick={() => setRefreshInterval(5000)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                refreshInterval === 5000 ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              5s
            </button>
            <button
              type="button"
              onClick={() => setRefreshInterval(10000)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                refreshInterval === 10000 ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              10s
            </button>
            <button
              type="button"
              onClick={() => setRefreshInterval(20000)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                refreshInterval === 20000 ? "bg-white text-sky-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              20s
            </button>
            <button
              type="button"
              onClick={() => setRefreshInterval(prev => prev === 0 ? 5000 : 0)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                refreshInterval === 0 ? "bg-white text-rose-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title={refreshInterval === 0 ? "Lanjutkan Pembaruan Otomatis" : "Jeda Pembaruan Otomatis"}
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </button>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS (GATEWAY EDGE METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Throughput RPS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gateway Throughput</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.rps.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs font-bold text-slate-500">Req / Detik</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Terlayani</span>
            <span className="font-mono font-bold text-slate-700">{metrics?.gateway.total_requests.toLocaleString() || 0} req</span>
          </div>
        </div>

        {/* Card 2: Latency P95 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">P95 Request Latency</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.p95_latency_ms.toFixed(1) || "0.0"}
            </span>
            <span className="text-xs font-bold text-slate-500">ms</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">Batas Normal SLO</span>
            <span className="font-bold text-emerald-600">&lt; 100 ms</span>
          </div>
        </div>

        {/* Card 3: Error Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">HTTP Error Rate</span>
            <div className={`p-2 rounded-xl ${metrics && metrics.gateway.error_rate_pct > 2 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              {metrics && metrics.gateway.error_rate_pct > 2 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.error_rate_pct.toFixed(2) || "0.00"}%
            </span>
            <span className="text-xs font-bold text-slate-500">Gagal</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">Toleransi</span>
            <span className={`font-bold ${metrics && metrics.gateway.error_rate_pct > 2 ? "text-rose-600" : "text-emerald-600"}`}>
              {metrics && metrics.gateway.error_rate_pct > 2 ? "Melebihi Ambang" : "Sehat (0%)"}
            </span>
          </div>
        </div>

        {/* Card 4: Idempotency Guard */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Idempotency Guard</span>
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics?.gateway.idempotency_hits || 0}
            </span>
            <span className="text-xs font-bold text-slate-500">Double-Submit Ditangkis</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500">Transaksi Lolos</span>
            <span className="font-mono font-bold text-slate-700">{metrics?.gateway.idempotency_misses || 0} req</span>
          </div>
        </div>
      </div>

      {/* SECOND ROW: DATABASE CONNECTION POOL & BUSINESS KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DB Connection Pool Health */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Database Connection Pool (PostgreSQL 15)</h2>
                <p className="text-slate-500 text-xs font-medium">Kapasitas pool koneksi aktif (*sqlx.DB) dan antrian query</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                Maks {poolTotal} Koneksi
              </span>
            </div>
          </div>

          {/* Progress Bar Kapasitas Pool */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">Utilisasi Pool: {inUsePercent}% In-Use</span>
              <span className="text-slate-500 font-mono">
                {poolInUse} aktif / {poolIdle} idle / {poolTotal} max koneksi
              </span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-slate-100 p-0.5 overflow-hidden flex gap-0.5 border border-slate-200/80">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                style={{ width: `${inUsePercent}%` }} 
                title={`Koneksi In Use: ${poolInUse}`}
              />
              <div 
                className="h-full bg-sky-400 rounded-full transition-all duration-500" 
                style={{ width: `${idlePercent}%` }} 
                title={`Koneksi Idle: ${poolIdle}`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 font-medium">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>In Use ({poolInUse})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Idle / Siap Pakai ({poolIdle})</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Pool Limit: {poolTotal}</span>
            </div>
          </div>

          {/* Wait Count, Wait Duration, Postgres CPU & RAM */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 pt-3 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Wait Count</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {metrics?.database_pool.wait_count || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {metrics?.database_pool.wait_count === 0 ? "Tanpa antrean" : "Bottleneck!"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Wait Duration</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {metrics?.database_pool.wait_duration_ms.toFixed(1) || "0.0"} ms
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Latensi antrean
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Postgres CPU</span>
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-lg font-black text-indigo-700 mt-0.5">
                {metrics?.database_pool.postgres?.cpu_percent || "0.0%"}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Beban container DB
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Postgres RAM</span>
                <Server className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {metrics?.database_pool.postgres?.mem_usage_mb || "0 MB"}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                {metrics?.database_pool.postgres?.pids ? `${metrics.database_pool.postgres.pids} threads` : "Memory usage"}
              </span>
            </div>
          </div>
        </div>

        {/* Business KPI Metrics Activity (2 Columns Grid) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Business KPI Activity</h2>
                  <p className="text-slate-500 text-xs font-medium">Denyut transaksi operasional hari ini</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3.5">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-bold text-slate-500 block">Pengiriman</span>
                <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                  {metrics?.business_kpi.shipments_today || 0}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Shipment</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-bold text-slate-500 block">Top Up Kas</span>
                <div className="text-xl font-black text-sky-700 font-mono mt-0.5">
                  {metrics?.business_kpi.topups_today || 0}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kas Masuk</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-bold text-slate-500 block">Invoice Dibuat</span>
                <div className="text-xl font-black text-amber-700 font-mono mt-0.5">
                  {metrics?.business_kpi.invoices_created_today || 0}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Tagihan Baru</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                <span className="text-[11px] font-bold text-slate-500 block">Invoice Lunas</span>
                <div className="text-xl font-black text-indigo-700 font-mono mt-0.5">
                  {metrics?.business_kpi.invoices_paid_today || 0}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Terbayar</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Zona Waktu: WIB (Asia/Jakarta)</span>
            <span className="font-semibold text-slate-600">Hari Ini</span>
          </div>
        </div>
      </div>

      {/* THIRD ROW: RUNTIME INFRASTRUCTURE & CACHE HEALTH */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Host Runtime &amp; Cache Infrastructure</h2>
              <p className="text-slate-500 text-xs font-medium">Kesehatan memori Go backend, thread concurrency, dan koneksi Redis cache</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              Go Engine: {metrics?.runtime?.go_version || "go1.23"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heap Memory</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {metrics?.runtime?.alloc_mb !== undefined ? `${metrics.runtime.alloc_mb.toFixed(1)} MB` : "-"}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              OS Sys: {metrics?.runtime?.sys_mb !== undefined ? `${metrics.runtime.sys_mb.toFixed(1)} MB` : "-"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Goroutines</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {metrics?.runtime?.num_goroutine ?? "-"}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">Concurrency Terkendali</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GC Runs (Total)</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {metrics?.runtime?.num_gc ?? "-"}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Garbage Collector</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Uptime</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {(() => {
                const s = metrics?.runtime?.uptime_seconds;
                if (!s || s <= 0) return "< 1 mnt";
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;
                if (h > 0) return `${h}j ${m}m`;
                if (m > 0) return `${m}m ${sec}s`;
                return `${sec}s`;
              })()}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">Proses Aktif</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Redis Cache Status</span>
            <p className="text-lg font-black text-emerald-700 mt-0.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {metrics?.runtime?.redis_status || "CONNECTED"}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Idempotency &amp; Session</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Redis Ping Latency</span>
            <p className="text-lg font-black text-slate-800 mt-0.5">
              {metrics?.runtime?.redis_ping_ms !== undefined ? `${metrics.runtime.redis_ping_ms.toFixed(2)} ms` : "< 1ms"}
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">&lt; 1ms Ultra Fast</span>
          </div>
        </div>
      </div>

      {/* FOURTH ROW: k6 PERFORMANCE & LOAD BENCHMARK CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        {/* Header Benchmark */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-xs">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">k6 Performance &amp; Load Benchmark Engine</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-200">
                  k6 v2.2.0
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-50 text-sky-700 border border-sky-200">
                  Async Background
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Uji beban mandiri sintetis untuk mengukur throughput, degradasi latency, dan breaking point kapasitas server
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {benchmarkStatus?.latest_result && (
              <button
                onClick={() => {
                  setSelectedReport(benchmarkStatus.latest_result!);
                  setShowResultModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Hasil Terakhir</span>
              </button>
            )}
            <button
              onClick={() => {
                fetchHistory();
                setShowHistoryModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat (10)</span>
            </button>
          </div>
        </div>

        {/* ACTIVE RUNNING BANNER & EMERGENCY ABORT */}
        {isRunningBenchmark && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-2 border-amber-400 shadow-sm animate-pulse space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Sedang Mengeksekusi: {benchmarkStatus.scenario_label}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Server sedang menerima tembakan beban k6 secara riil. Pantau Throughput RPS dan DB Pool di atas!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-1 rounded-lg border border-amber-300">
                  {benchmarkStatus.elapsed_sec}s / ~{benchmarkStatus.estimated_duration_sec}s ({benchmarkStatus.progress_pct}%)
                </span>
                <button
                  onClick={handleAbortBenchmark}
                  disabled={isAborting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  title="Hentikan pengujian beban ini seketika jika server terlalu berat"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>{isAborting ? "Menghentikan..." : "Hentikan Darurat (Abort)"}</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${benchmarkStatus.progress_pct}%` }}
              />
            </div>
          </div>
        )}

        {/* DUA ZONA PENGUJIAN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ZONA A: PENGUJIAN RUTIN & AMAN */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Zona A: Pengujian Rutin &amp; Aman (Low-Impact)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Aman Kapan Saja
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Beban terkendali untuk verifikasi konektivitas rute, idempotency guard, dan pembacaan kas normal.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Button Smoke */}
              <button
                onClick={() => handleStartBenchmark("smoke")}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-emerald-700">Smoke Test</span>
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">5 VUs • 5s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rute gateway &amp; DB siap</p>
              </button>

              {/* Button Load */}
              <button
                onClick={() => handleStartBenchmark("load")}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-emerald-700">Average Load</span>
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">50 VUs • 20s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Simulasi jam kerja normal</p>
              </button>

              {/* Button Idempotency */}
              <button
                onClick={() => handleStartBenchmark("idempotency")}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-emerald-700">Idempotency</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">30 VUs • 3s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Uji submit ganda serentak</p>
              </button>
            </div>
          </div>

          {/* ZONA B: PENGUJIAN BEBAN BERAT & STRES (STRICT WARNING) */}
          <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <h3 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1">
                  <span>Zona B: Beban Berat &amp; Stres (High-Impact)</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Konfirmasi Ketat
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Beban puncak ekstrem untuk mencari breaking point. Wajib konfirmasi risiko sebelum dieksekusi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Button Stress */}
              <button
                onClick={() => setStrictModalScenario({
                  id: "stress",
                  label: "Heavy Stress Test",
                  vus: 200,
                  duration: "35 detik",
                  target: "GET /api/v1/cashflow & GET /api/v1/invoices",
                  warningNote: "Mencari breaking point Connection Pool Postgres. Utilisasi DB Pool bisa mencapai 100% dan latency pengguna lain berpotensi naik."
                })}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-rose-700">Stress Test</span>
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <p className="text-[10px] font-bold text-rose-600 mt-1">200 VUs • 35s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Uji titik jenuh pool</p>
              </button>

              {/* Button Spike */}
              <button
                onClick={() => setStrictModalScenario({
                  id: "spike",
                  label: "Instant Spike Test",
                  vus: 160,
                  duration: "12 detik (Flash 2s)",
                  target: "GET /api/v1/auth/me & GET /api/v1/health",
                  warningNote: "Mensimulasikan lonjakan instan (flash crowd pergantian shift armada). Menguji kecepatan sistem dalam memulihkan diri (auto-recovery)."
                })}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-rose-700">Spike Test</span>
                  <Zap className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <p className="text-[10px] font-bold text-rose-600 mt-1">160 VUs • 12s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Uji lonjakan seketika</p>
              </button>

              {/* Button Soak */}
              <button
                onClick={() => setStrictModalScenario({
                  id: "soak",
                  label: "Soak / Endurance Test",
                  vus: 30,
                  duration: "60 detik konstan",
                  target: "GET /api/v1/cashflow & GET /api/v1/system/ping",
                  warningNote: "Menguji ketahanan beban konstan 1 menit untuk mendeteksi kebocoran memori (memory leak), goroutine leak, atau pool leak."
                })}
                disabled={isRunningBenchmark || isStartingBenchmark}
                className="p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs text-left transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 group-hover:text-rose-700">Soak Test</span>
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <p className="text-[10px] font-bold text-rose-600 mt-1">30 VUs • 60s</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Deteksi kebocoran memori</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONAL RUNBOOK & SLO THRESHOLD GUIDE FOR IT ADMIN */}
      <div className="bg-gradient-to-br from-slate-900 via-[#1E293B] to-[#0F172A] text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Panduan Ambang Batas SLO &amp; Tindakan Admin IT</h3>
              <p className="text-slate-400 text-xs font-medium">Standar operasional penilaian kesehatan metrik dan langkah mitigasi saat anomali</p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-950 text-sky-300 border border-sky-500/30">
            Standard Operating Procedure (SOP)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* SLO 1: P95 LATENCY */}
          {(() => {
            const p95 = metrics?.gateway.p95_latency_ms || 0;
            let statusBadge = { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", label: `Saat ini: ${p95.toFixed(1)} ms (Normal)` };
            let cardBorder = "border-white/10 bg-white/5";
            if (p95 >= 300) {
              statusBadge = { color: "bg-rose-500/30 text-rose-200 border-rose-500/40", dot: "bg-rose-400 animate-ping", label: `Saat ini: ${p95.toFixed(1)} ms (Kritis)` };
              cardBorder = "border-rose-500/50 bg-rose-500/10";
            } else if (p95 >= 100) {
              statusBadge = { color: "bg-amber-500/30 text-amber-200 border-amber-500/40", dot: "bg-amber-400", label: `Saat ini: ${p95.toFixed(1)} ms (Waspada)` };
              cardBorder = "border-amber-500/40 bg-amber-500/10";
            }

            return (
              <div className={`p-4 rounded-xl border transition-all duration-300 ${cardBorder}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-sky-300">1. P95 Request Latency</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 shrink-0 ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>
                <div className="mt-2.5 p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Ambang Batas Patokan (SLO):</span>
                  <p><strong>Target</strong>: &lt; 100 ms • <strong>Waspada</strong>: 100-300 ms • <strong>Kritis</strong>: &gt; 500 ms</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Tindakan Jika Kritis:</strong> Cek query lambat di tabel bawah, periksa koneksi internet upstream &amp; indexing database.
                </div>
              </div>
            );
          })()}

          {/* SLO 2: ERROR RATE */}
          {(() => {
            const errRate = metrics?.gateway.error_rate_pct || 0;
            let statusBadge = { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", label: `Saat ini: ${errRate.toFixed(2)}% (Sehat)` };
            let cardBorder = "border-white/10 bg-white/5";
            if (errRate >= 2.0) {
              statusBadge = { color: "bg-rose-500/30 text-rose-200 border-rose-500/40", dot: "bg-rose-400 animate-ping", label: `Saat ini: ${errRate.toFixed(2)}% (Kritis)` };
              cardBorder = "border-rose-500/50 bg-rose-500/10";
            } else if (errRate > 0) {
              statusBadge = { color: "bg-amber-500/30 text-amber-200 border-amber-500/40", dot: "bg-amber-400", label: `Saat ini: ${errRate.toFixed(2)}% (Waspada)` };
              cardBorder = "border-amber-500/40 bg-amber-500/10";
            }

            return (
              <div className={`p-4 rounded-xl border transition-all duration-300 ${cardBorder}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-sky-300">2. HTTP Error Rate</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 shrink-0 ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>
                <div className="mt-2.5 p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Ambang Batas Patokan (SLO):</span>
                  <p><strong>Target</strong>: 0.00% • <strong>Waspada</strong>: 0.5 - 2.0% • <strong>Kritis</strong>: &gt; 5.0% / 502</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Tindakan Jika Kritis:</strong> Periksa log Core Go (:8081). Pastikan service tidak crash atau restart mendadak.
                </div>
              </div>
            );
          })()}

          {/* SLO 3: DB CONNECTION POOL */}
          {(() => {
            const wait = metrics?.database_pool.wait_count || 0;
            const inUse = metrics?.database_pool.in_use || 0;
            const maxOpen = metrics?.database_pool.max_open || 25;
            const pct = Math.round((inUse / maxOpen) * 100);

            let statusBadge = { color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", label: `Saat ini: ${pct}% In-Use (Wait: ${wait})` };
            let cardBorder = "border-white/10 bg-white/5";
            if (wait > 0 || pct >= 85) {
              statusBadge = { color: "bg-rose-500/30 text-rose-200 border-rose-500/40", dot: "bg-rose-400 animate-ping", label: `Saat ini: ${pct}% In-Use (Wait: ${wait})` };
              cardBorder = "border-rose-500/50 bg-rose-500/10";
            } else if (pct >= 70) {
              statusBadge = { color: "bg-amber-500/30 text-amber-200 border-amber-500/40", dot: "bg-amber-400", label: `Saat ini: ${pct}% In-Use (Mendekati Batas)` };
              cardBorder = "border-amber-500/40 bg-amber-500/10";
            }

            return (
              <div className={`p-4 rounded-xl border transition-all duration-300 ${cardBorder}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-sky-300">3. DB Connection Pool</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 shrink-0 ${statusBadge.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    <span>{statusBadge.label}</span>
                  </span>
                </div>
                <div className="mt-2.5 p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Ambang Batas Patokan (SLO):</span>
                  <p><strong>Target</strong>: &lt; 70% &amp; Wait=0 • <strong>Waspada</strong>: 70-85% • <strong>Kritis</strong>: &gt; 85% / Wait &gt; 0</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Tindakan Jika Kritis:</strong> Cek unclosed connection di kode repo atau naikkan batas `max_open` di `NewDBPool`.
                </div>
              </div>
            );
          })()}

          {/* SLO 4: IDEMPOTENCY SHIELD */}
          {(() => {
            const hits = metrics?.gateway.idempotency_hits || 0;
            const misses = metrics?.gateway.idempotency_misses || 0;

            return (
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 transition-all duration-300">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-sky-300">4. Idempotency Guard</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span>Ditangkis: {hits} req</span>
                  </span>
                </div>
                <div className="mt-2.5 p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Ambang Batas Patokan (SLO):</span>
                  <p><strong>Target</strong>: Shield On • <strong>Normal</strong>: Fluktuasi Wajar (&lt; 50/m) • <strong>Waspada</strong>: Ratusan/menit</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Tindakan Jika Waspada:</strong> Cek form submit di web frontend apakah ada tombol yang tidak di-disable saat diklik.
                </div>
              </div>
            );
          })()}
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
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              {metrics?.slow_queries.length || 0} Query Terdeteksi
            </span>
            <button
              onClick={handleSimulateSlowQuery}
              disabled={simulatingSlow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Memicu query simulasi SELECT pg_sleep(0.150) untuk menguji ring-buffer dan Prometheus alert"
            >
              <Flame className={`w-3.5 h-3.5 ${simulatingSlow ? "animate-bounce" : ""}`} />
              <span>{simulatingSlow ? "Mengeksekusi..." : "Uji Slow Query (150ms)"}</span>
            </button>
          </div>
        </div>

        {simulateSuccessMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{simulateSuccessMsg}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">Tercatat di Slow Query Ring Buffer</span>
          </div>
        )}

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
                        Tidak ada eksekusi query lambat yang terdeteksi. Anda dapat menguji fitur ini dengan tombol &quot;Uji Slow Query (150ms)&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={handleSimulateSlowQuery}
                        disabled={simulatingSlow}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Flame className={`w-3.5 h-3.5 ${simulatingSlow ? "animate-bounce" : ""}`} />
                        <span>{simulatingSlow ? "Mengeksekusi..." : "Uji Sekarang (150ms)"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STRICT SAFETY CONFIRMATION (ZONA B) */}
      {strictModalScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="text-base font-black tracking-tight">Peringatan Pengujian Beban Berat</h3>
                  <p className="text-xs text-rose-100 font-medium">Konfirmasi Ketat Diperlukan (Strict Safety Guard)</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setStrictModalScenario(null);
                  setStrictAgreed(false);
                }}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Skenario: {strictModalScenario.label}</span>
                </p>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  {strictModalScenario.warningNote}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Beban Puncak (VUs)</span>
                  <span className="text-base font-black text-slate-800">{strictModalScenario.vus} Pengguna Serentak</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block text-[10px] uppercase">Estimasi Durasi</span>
                  <span className="text-base font-black text-slate-800">{strictModalScenario.duration}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                <p className="font-bold text-slate-800">Dampak Langsung pada Server:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>Connection Pool Database PostgreSQL akan terpakai secara agresif.</li>
                  <li>Pengguna atau admin lain yang sedang membuka sistem mungkin mengalami peningkatan latency sesaat.</li>
                  <li>Disediakan tombol <strong>Emergency Abort</strong> jika Anda ingin menghentikan pengujian sebelum durasi selesai.</li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={strictAgreed}
                    onChange={(e) => setStrictAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-700 leading-tight">
                    Saya memahami risiko performa pada server dan bertanggung jawab penuh atas pengujian beban tinggi ini.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setStrictModalScenario(null);
                    setStrictAgreed(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  disabled={!strictAgreed || isStartingBenchmark}
                  onClick={() => handleStartBenchmark(strictModalScenario.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Flame className="w-4 h-4" />
                  <span>{isStartingBenchmark ? "Menyiapkan..." : "Mulai Pengujian Beban Berat"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BENCHMARK RESULT & EXECUTIVE VERDICT MODAL */}
      {showResultModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Laporan Hasil Pengujian Beban k6</h3>
                    {getVerdictBadge(selectedReport.summary.verdict_status)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedReport.scenario_label} • {selectedReport.timestamp}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowResultModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Simpulan Eksekutif Otomatis</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                    Job: {selectedReport.job_id}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">
                  {selectedReport.summary.verdict_title}
                </h4>

                {/* Key Findings */}
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">Temuan Utama:</p>
                  <ul className="space-y-1">
                    {selectedReport.summary.key_findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="pt-2 border-t border-white/10 space-y-1 text-xs text-slate-300">
                  <p className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">Rekomendasi Tindakan Admin IT:</p>
                  <ul className="space-y-1">
                    {selectedReport.summary.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-amber-400 font-bold">→</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* KPI Scorecard Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Throughput Puncak</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{selectedReport.rps.toFixed(1)} RPS</p>
                  <span className="text-[10px] text-slate-500">Total {selectedReport.total_requests} req</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Latency P95</span>
                  <p className="text-lg font-black text-indigo-700 mt-0.5">{selectedReport.latency_p95_ms.toFixed(1)} ms</p>
                  <span className="text-[10px] text-slate-500">Rata-rata {selectedReport.latency_avg_ms.toFixed(1)} ms</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tingkat Berhasil</span>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{selectedReport.success_rate_pct.toFixed(2)}%</p>
                  <span className="text-[10px] text-slate-500">Gagal: {selectedReport.failed_requests} req</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Transfer Data</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">{selectedReport.data_received_kb.toFixed(1)} KB</p>
                  <span className="text-[10px] text-slate-500">Terkirim: {selectedReport.data_sent_kb.toFixed(1)} KB</span>
                </div>
              </div>

              {/* Analisis Dampak Database PostgreSQL Selama Uji Beban */}
              {selectedReport.database_analysis && (
                <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100/60">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900">
                          Analisis Dampak Database PostgreSQL Selama Uji Beban
                        </h5>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Observasi pool koneksi, waktu tunggu antrian, dan performa database
                        </p>
                      </div>
                    </div>
                    <div>
                      {selectedReport.database_analysis.db_verdict === "SEHAT" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🟢 SEHAT
                        </span>
                      )}
                      {selectedReport.database_analysis.db_verdict === "WASPADA" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          🟡 WASPADA
                        </span>
                      )}
                      {selectedReport.database_analysis.db_verdict === "BOTTLENECK" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          🔴 BOTTLENECK
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Puncak Koneksi Digunakan</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {selectedReport.database_analysis.peak_in_use} / {selectedReport.database_analysis.pool_max_open}
                        <span className="text-xs font-bold text-indigo-600 ml-1">
                          ({selectedReport.database_analysis.peak_utilization_pct.toFixed(0)}%)
                        </span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">Beban puncak aktif</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Antrian Koneksi Terjadi</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        +{selectedReport.database_analysis.wait_count_delta} <span className="text-xs font-medium text-slate-500">request</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {selectedReport.database_analysis.wait_count_delta === 0 ? "Tanpa antrian tertahan" : "Mengantre slot pool"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Waktu Tunggu Antrian</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {selectedReport.database_analysis.wait_duration_ms.toFixed(1)} <span className="text-xs font-medium text-slate-500">ms</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">Akumulasi latensi antrean</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Slow Query Terdeteksi</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {selectedReport.database_analysis.slow_queries_count} <span className="text-xs font-medium text-slate-500">query</span>
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium">Ambang batas &gt; 100ms</span>
                    </div>
                  </div>

                  {/* Rekomendasi Database Otomatis */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-100 flex items-start gap-2 text-xs">
                    <span className="text-indigo-600 font-bold text-sm leading-none shrink-0 mt-0.5">💡</span>
                    <div>
                      <span className="font-bold text-indigo-950 text-[11px] block">Rekomendasi Kapasitas DB:</span>
                      <span className="text-indigo-900 text-[11px] leading-relaxed">
                        {selectedReport.database_analysis.db_recommendation}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Latency Quantiles Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-700 text-xs flex items-center justify-between">
                  <span>Distribusi Latensi Respons (Quantiles)</span>
                  <span className="text-[10px] text-slate-500">Milidetik (ms)</span>
                </div>
                <div className="grid grid-cols-7 divide-x divide-slate-100 text-center text-xs py-2.5 bg-white">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Min</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_min_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">P50 (Med)</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_med_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Avg</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_avg_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">P90</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_p90_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase">P95</span>
                    <span className="font-bold text-indigo-700">{selectedReport.latency_p95_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">P99</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_p99_ms.toFixed(1)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Max</span>
                    <span className="font-bold text-slate-700">{selectedReport.latency_max_ms.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* k6 Checks List */}
              {selectedReport.checks && selectedReport.checks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Status Validasi k6 (Assertions):</span>
                  <div className="space-y-1.5">
                    {selectedReport.checks.map((chk, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          {chk.success ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span className="font-medium text-slate-800">{chk.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono">
                          <span className="text-emerald-700 font-bold">{chk.passes} lolos</span>
                          {chk.fails > 0 && <span className="text-rose-600 font-bold">{chk.fails} gagal</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Download Button */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Laporan otomatis tersimpan di Rolling History (10 riwayat)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadReport(selectedReport)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Laporan Lengkap (.md)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BENCHMARK HISTORY DRAWER / MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-800 text-white">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Riwayat Pengujian Beban k6</h3>
                  <p className="text-xs text-slate-500 font-medium">Maksimal 10 laporan terakhir tersimpan dalam cache rolling buffer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {historyList && historyList.length > 0 ? (
                <div className="space-y-2.5">
                  {historyList.map((rep, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60 transition-all flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{rep.scenario_label}</span>
                          {getVerdictBadge(rep.summary.verdict_status)}
                          {rep.database_analysis && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              rep.database_analysis.db_verdict === 'SEHAT' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              rep.database_analysis.db_verdict === 'WASPADA' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              DB: {rep.database_analysis.db_verdict} ({rep.database_analysis.peak_in_use}/{rep.database_analysis.pool_max_open})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {rep.timestamp} • {rep.vus} VUs • {rep.duration} • Total {rep.total_requests} req
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-800 block">{rep.rps.toFixed(1)} RPS</span>
                          <span className="text-[10px] text-indigo-600 font-semibold block">P95: {rep.latency_p95_ms.toFixed(1)} ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReport(rep);
                              setShowHistoryModal(false);
                              setShowResultModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors"
                          >
                            Lihat Hasil
                          </button>
                          <button
                            onClick={() => handleDownloadReport(rep)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Download Laporan Markdown"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="font-bold text-slate-600 text-xs">Belum Ada Riwayat Pengujian</p>
                  <p className="text-[11px] text-slate-400 mt-1">Jalankan salah satu tombol benchmark di atas untuk melihat hasilnya di sini.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
