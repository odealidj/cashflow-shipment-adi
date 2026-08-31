"use client";

import { Wallet, TrendingUp, AlertCircle, Percent, DollarSign } from "lucide-react";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* Card 1: Saldo */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 border-l-[5px] border-l-blue-600 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Rolling Saldo</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black text-blue-600 tracking-tight">
            {loading ? "..." : formatCurrency(summary.current_saldo)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Saldo kas aktif</p>
        </div>
      </div>

      {/* Card 2: Total Profit */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 border-l-[5px] border-l-emerald-500 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Profit</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black text-emerald-600 tracking-tight">
            {loading ? "..." : formatCurrency(summary.total_profit)}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Keuntungan operasional</p>
        </div>
      </div>

      {/* Card 3: Avg Margin */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 border-l-[5px] border-l-indigo-500 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Rata-rata Margin</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black text-indigo-600 tracking-tight">
            {loading ? "..." : `${((summary.avg_margin_pct || 0) * 100).toFixed(1)}%`}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Rasio profitabilitas</p>
        </div>
      </div>

      {/* Card 4: Total Pengeluaran (Debit) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 border-l-[5px] border-l-rose-500 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Total Biaya (Debit)</span>
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-black text-rose-600 tracking-tight">
            {loading ? "..." : formatCurrency(summary.total_debit)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Biaya kas operasional</p>
        </div>
      </div>

      {/* Card 5: Tagihan Belum Lunas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 border-l-[5px] border-l-amber-500 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Tagihan Tertunda</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-xl font-black text-amber-600 tracking-tight">
              {loading ? "..." : summary.unpaid_count}
            </h3>
            <span className="text-xs text-slate-500 font-medium">Tagihan</span>
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-0.5 truncate">
            {loading ? "..." : formatCurrency(summary.unpaid_amount)}
          </p>
        </div>
      </div>
    </div>
  );
}
