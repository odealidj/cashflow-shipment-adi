"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Plus, 
  Receipt,
  PieChart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { KPICards, SummaryData } from "@/components/KPICards";
import { RecentTransactions } from "@/components/RecentTransactions";
import { TopUpModal } from "@/components/TopUpModal";
import { ShipmentModal } from "@/components/ShipmentModal";
import { fetchWithAuth } from "@/lib/apiClient";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData>({
    current_saldo: 0,
    total_kredit: 0,
    total_debit: 0,
    total_profit: 0,
    avg_margin_pct: 0,
    unpaid_count: 0,
    unpaid_amount: 0
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // Modal States for Quick Actions
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary KPI
      const resSummary = await fetchWithAuth("http://localhost:8080/api/v1/cashflow/summary");
      const dataSummary = await resSummary.json();
      if (dataSummary.status) {
        setSummary(dataSummary.data);
      }

      // 2. Fetch Recent Transactions (limit 5, sorted DESC for recent activity)
      const resEntries = await fetchWithAuth("http://localhost:8080/api/v1/cashflow?page=1&limit=5&sort=DESC");
      const dataEntries = await resEntries.json();
      if (dataEntries.status && dataEntries.data) {
        setRecentEntries(Array.isArray(dataEntries.data) ? dataEntries.data : (dataEntries.data.entries || []));
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculations for visual analytics
  const totalVolume = summary.total_kredit + summary.total_debit;
  const inflowRatio = totalVolume > 0 ? (summary.total_kredit / totalVolume) * 100 : 50;
  const outflowRatio = totalVolume > 0 ? (summary.total_debit / totalVolume) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <header className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview Keuangan & Shipment</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Selamat datang kembali{user ? `, ${user.full_name}` : ""}. Ringkasan real-time arus kas rolling dan status vendor.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            <span>Buku Kas</span>
          </Link>
        </div>
      </header>

      {/* 5 KPI Summary Cards */}
      <KPICards summary={summary} loading={loading} />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Rasio Inflow vs Outflow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <PieChart className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Perbandingan Arus Kas</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Volume: {formatCurrency(totalVolume)}</span>
            </div>

            <div className="space-y-3 my-4">
              {/* Inflow bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Pemasukan (Kredit)
                  </span>
                  <span className="text-emerald-700">{formatCurrency(summary.total_kredit)} ({inflowRatio.toFixed(0)}%)</span>
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
                  <span className="text-rose-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                    Pengeluaran (Debit)
                  </span>
                  <span className="text-rose-700">{formatCurrency(summary.total_debit)} ({outflowRatio.toFixed(0)}%)</span>
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
            <span>Status Kas:</span>
            <span className={`font-bold px-2 py-0.5 rounded-full ${summary.current_saldo >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {summary.current_saldo >= 0 ? "Surplus Kas" : "Defisit Kas"}
            </span>
          </div>
        </div>

        {/* Card 2: Status Pembayaran Vendor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status Pembayaran Vendor</h3>
              </div>
              <span className="text-[11px] text-amber-600 font-bold">{summary.unpaid_count} Menunggu</span>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Belum Lunas
                </div>
                <div className="text-xl font-black text-amber-700 font-mono">
                  {summary.unpaid_count}
                </div>
                <p className="text-[10px] text-amber-700 font-medium truncate mt-0.5">
                  {formatCurrency(summary.unpaid_amount)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Telah Lunas
                </div>
                <div className="text-xl font-black text-emerald-700 font-mono">
                  Aktif
                </div>
                <p className="text-[10px] text-emerald-700 font-medium truncate mt-0.5">
                  Sesuai T.O.P
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link 
              href="/dashboard/transactions"
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center justify-between"
            >
              <span>Filter transaksi belum lunas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Banner Sistem & AI Promo */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3 h-3" />
              <span>Adijayantara Control</span>
            </div>
            <h3 className="text-base font-black text-white leading-tight mb-1">
              Multi-Platform Real-time Sync
            </h3>
            <p className="text-xs text-blue-100 font-medium leading-relaxed">
              Semua data kas dan shipment terhubung langsung antara Desktop Back-Office dan Mobile PWA.
            </p>
          </div>

          <div className="relative z-10 pt-3 mt-2 border-t border-white/15 flex items-center justify-between">
            <span className="text-[11px] text-blue-200 font-semibold">Versi 1.0.3</span>
            <Link
              href="/m"
              className="px-3 py-1 bg-white text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-50 transition-colors"
            >
              Buka PWA
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table Component */}
      <RecentTransactions 
        entries={recentEntries} 
        loading={loading} 
        onRefresh={fetchDashboardData} 
      />

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
    </div>
  );
}
