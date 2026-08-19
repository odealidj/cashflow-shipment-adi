"use client";

import { useEffect, useState } from "react";
import { CashflowTable } from "@/components/CashflowTable";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState({
    current_saldo: 0,
    total_kredit: 0,
    total_debit: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch summary
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem("token");
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
    };
    
    fetchSummary();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
  };

  return (
    <>
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Overview</h1>
        <p className="text-gray-400">Welcome back{user ? `, ${user.full_name}` : ""}. Here's your financial summary.</p>
      </header>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-green-500/20 rounded-full blur-3xl group-hover:bg-green-500/30 transition-all duration-500" />
          <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">Rolling Saldo</p>
          <h3 className="text-4xl font-bold text-white tracking-tight">{formatCurrency(summary.current_saldo)}</h3>
        </div>
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all duration-500" />
          <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">Total Top Up (Kredit)</p>
          <h3 className="text-4xl font-bold text-white tracking-tight">{formatCurrency(summary.total_kredit)}</h3>
        </div>
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-red-500/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-all duration-500" />
          <p className="text-gray-400 text-sm font-medium mb-2 uppercase tracking-wide">Total Expenses (Debit)</p>
          <h3 className="text-4xl font-bold text-white tracking-tight">{formatCurrency(summary.total_debit)}</h3>
        </div>
      </div>

      {/* Cashflow Interactive Table Component */}
      <CashflowTable />
    </>
  );
}
