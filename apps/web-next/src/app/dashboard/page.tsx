"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Wallet, 
  Receipt,
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle2,
  PieChart
} from "lucide-react";
import { KPICards, SummaryData } from "@/components/KPICards";
import { RecentTransactions } from "@/components/RecentTransactions";
import { TopUpModal } from "@/components/TopUpModal";
import { ShipmentModal } from "@/components/ShipmentModal";

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
      const token = localStorage.getItem("token");
      if (!token) return;

      // 1. Fetch Summary KPI
      const resSummary = await fetch("http://localhost:8080/api/v1/cashflow/summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataSummary = await resSummary.json();
      if (dataSummary.status) {
        setSummary(dataSummary.data);
      }

      // 2. Fetch Recent Transactions (limit 5, sorted DESC for recent activity)
      const resEntries = await fetch("http://localhost:8080/api/v1/cashflow?page=1&limit=5&sort=DESC", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataEntries = await resEntries.json();
      if (dataEntries.status) {
        setRecentEntries(dataEntries.data.entries || []);
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
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Financial Overview</h1>
          <p className="text-gray-400 text-sm">
            Selamat datang kembali{user ? `, ${user.full_name}` : ""}. Ringkasan real-time arus kas dan performa pengiriman.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTopUpOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs transition-all border border-emerald-500/20 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Top Up Modal
          </button>
          
          <button
            onClick={() => setIsShipmentOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-all shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Catat Pengiriman
          </button>

          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs transition-all border border-white/10"
          >
            <Receipt className="w-4 h-4 text-brand-400" />
            Buka Transaksi
          </Link>
        </div>
      </header>

      {/* 5 KPI Summary Cards */}
      <KPICards summary={summary} loading={loading} />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Rasio Inflow vs Outflow */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <PieChart className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Perbandingan Arus Kas</h3>
              </div>
              <span className="text-xs text-gray-400 font-mono">Volume Total: {formatCurrency(totalVolume)}</span>
            </div>

            <div className="space-y-3 my-4">
              {/* Inflow bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400 font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Inflow (Kredit)
                  </span>
                  <span className="text-white font-mono">{inflowRatio.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500" 
                    style={{ width: `${inflowRatio}%` }}
                  />
                </div>
              </div>

              {/* Outflow bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-orange-400 font-medium flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> Outflow (Debit)
                  </span>
                  <span className="text-white font-mono">{outflowRatio.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" 
                    style={{ width: `${outflowRatio}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Net Surplus / Posisi Kas:</span>
            <span className={`font-mono font-bold ${summary.current_saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(summary.current_saldo)}
            </span>
          </div>
        </div>

        {/* Card 2: Performa Margin & Profitabilitas */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Performa Profitabilitas</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-bold">
                {((summary.avg_margin_pct || 0) * 100).toFixed(2)}% Avg
              </span>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Total keuntungan kotor dari seluruh operasional shipment yang telah dicatat pada sistem.
            </p>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Akumulasi Profit:</span>
                <span className="text-purple-300 font-mono font-bold text-sm">{formatCurrency(summary.total_profit)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Rata-rata Margin per Shipment:</span>
                <span className="text-white font-mono font-semibold">{((summary.avg_margin_pct || 0) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-gray-400">Status Margin:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Positif & Terkontrol
            </span>
          </div>
        </div>

        {/* Card 3: Status Kewajiban Tagihan Vendor */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kewajiban Tagihan</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-mono font-bold">
                {summary.unpaid_count} Belum Lunas
              </span>
            </div>

            <p className="text-gray-400 text-xs leading-relaxed mb-4">
              Kewajiban pembayaran ke vendor pengiriman berdasarkan Terms of Payment (T.O.P).
            </p>

            <div className="p-4 rounded-2xl bg-red-500/[0.05] border border-red-500/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Nominal UNPAID:</span>
                <span className="text-red-400 font-mono font-bold text-sm">{formatCurrency(summary.unpaid_amount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Jumlah Transaksi:</span>
                <span className="text-white font-mono font-semibold">{summary.unpaid_count} Tagihan</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <Link
              href="/dashboard/transactions"
              className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center justify-between group"
            >
              <span>Kelola & update status pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <RecentTransactions
        entries={recentEntries}
        loading={loading}
        onRefresh={fetchDashboardData}
      />

      {/* Modals for Quick Actions */}
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
