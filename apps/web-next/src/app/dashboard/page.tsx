"use client";

import { useEffect, useState, useCallback } from "react";
import { CashflowTable } from "@/components/CashflowTable";
import { Wallet, ArrowDownRight, TrendingUp, AlertCircle, Percent } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState({
    current_saldo: 0,
    total_kredit: 0,
    total_debit: 0,
    total_profit: 0,
    avg_margin_pct: 0,
    unpaid_count: 0,
    unpaid_amount: 0
  });

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch("http://localhost:8080/api/v1/cashflow/summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <>
      <header className="mb-8 flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Financial Overview</h1>
          <p className="text-gray-400 text-sm">
            Welcome back{user ? `, ${user.full_name}` : ""}. Real-time tracking of rolling cashflow and shipment margins.
          </p>
        </div>
      </header>

      {/* Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Card 1: Saldo */}
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Rolling Saldo</p>
          </div>
          <h3 className="text-2xl font-bold text-white font-mono tracking-tight">{formatCurrency(summary.current_saldo)}</h3>
        </div>

        {/* Card 2: Total Profit */}
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all duration-500" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Profit</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
              {(summary.avg_margin_pct * 100).toFixed(1)}% avg
            </span>
          </div>
          <h3 className="text-2xl font-bold text-purple-300 font-mono tracking-tight">{formatCurrency(summary.total_profit)}</h3>
        </div>

        {/* Card 3: Inflow (Kredit) */}
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-500" />
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-blue-400" />
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Inflow (Kredit)</p>
          </div>
          <h3 className="text-2xl font-bold text-blue-400 font-mono tracking-tight">{formatCurrency(summary.total_kredit)}</h3>
        </div>

        {/* Card 4: Outflow (Debit) */}
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl group-hover:bg-orange-500/30 transition-all duration-500" />
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-orange-400" />
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Outflow (Debit)</p>
          </div>
          <h3 className="text-2xl font-bold text-orange-300 font-mono tracking-tight">{formatCurrency(summary.total_debit)}</h3>
        </div>

        {/* Card 5: Tagihan UNPAID */}
        <div className="glass-panel p-5 rounded-3xl relative overflow-hidden group border border-white/5 bg-gradient-to-b from-white/[0.07] to-transparent">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-all duration-500" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Tagihan UNPAID</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold">
              {summary.unpaid_count} Tx
            </span>
          </div>
          <h3 className="text-2xl font-bold text-red-400 font-mono tracking-tight">{formatCurrency(summary.unpaid_amount)}</h3>
        </div>
      </div>

      {/* Cashflow Interactive Table Component */}
      <CashflowTable onDataChange={fetchSummary} />
    </>
  );
}
