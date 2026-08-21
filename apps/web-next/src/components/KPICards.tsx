"use client";

import { Wallet, ArrowDownRight, TrendingUp, AlertCircle, Percent } from "lucide-react";

export interface SummaryData {
  current_saldo: number;
  total_kredit: number;
  total_debit: number;
  total_profit: number;
  avg_margin_pct: number;
  unpaid_count: number;
  unpaid_amount: number;
}

interface KPICardsProps {
  summary: SummaryData;
  loading?: boolean;
}

export function KPICards({ summary, loading = false }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: Saldo */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-emerald-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Rolling Saldo</p>
        </div>
        <h3 className="text-2xl font-bold text-white font-mono tracking-tight">
          {loading ? "..." : formatCurrency(summary.current_saldo)}
        </h3>
      </div>

      {/* Card 2: Total Profit */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-purple-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all duration-500" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Profit</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            {((summary.avg_margin_pct || 0) * 100).toFixed(1)}% avg
          </span>
        </div>
        <h3 className="text-2xl font-bold text-purple-300 font-mono tracking-tight">
          {loading ? "..." : formatCurrency(summary.total_profit)}
        </h3>
      </div>

      {/* Card 3: Inflow (Kredit) */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-blue-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-500" />
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Percent className="w-4 h-4" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Inflow (Kredit)</p>
        </div>
        <h3 className="text-2xl font-bold text-blue-400 font-mono tracking-tight">
          {loading ? "..." : formatCurrency(summary.total_kredit)}
        </h3>
      </div>

      {/* Card 4: Outflow (Debit) */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-orange-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl group-hover:bg-orange-500/30 transition-all duration-500" />
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Outflow (Debit)</p>
        </div>
        <h3 className="text-2xl font-bold text-orange-300 font-mono tracking-tight">
          {loading ? "..." : formatCurrency(summary.total_debit)}
        </h3>
      </div>

      {/* Card 5: Tagihan UNPAID */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-red-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-all duration-500" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Tagihan UNPAID</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
            {summary.unpaid_count} Tx
          </span>
        </div>
        <h3 className="text-2xl font-bold text-red-400 font-mono tracking-tight">
          {loading ? "..." : formatCurrency(summary.unpaid_amount)}
        </h3>
      </div>
    </div>
  );
}
