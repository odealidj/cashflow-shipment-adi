"use client";

import React from "react";
import { 
  ShieldAlert, 
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingDown, 
  FileCheck2 
} from "lucide-react";
import { AuditSummaryKPI } from "@/lib/api/audit";

interface AuditKPISummaryProps {
  summary: AuditSummaryKPI | null;
  loading?: boolean;
}

export const AuditKPISummary: React.FC<AuditKPISummaryProps> = ({ summary, loading }) => {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* 1. Radar Anomali / Aksi Kritis */}
      <div className="bg-gradient-to-br from-rose-50 to-white rounded-2xl p-4 border border-rose-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">
            Radar Anomali
          </span>
          <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
            {summary.total_anomalies_count}
          </span>
          <span className="text-[10px] font-bold text-rose-600">insiden</span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">
          {summary.total_critical} Kritis &middot; {summary.total_warning} Waspada
        </div>
      </div>

      {/* 2. Total Input Terlambat */}
      <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-4 border border-amber-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
            Input Terlambat
          </span>
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
            {summary.total_late_inputs}
          </span>
          <span className="text-[10px] font-bold text-amber-600">transaksi</span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">
          Jeda &gt; 1 hari setelah kejadian
        </div>
      </div>

      {/* 3. Rata-rata Input Lag Kas */}
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-4 border border-indigo-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
            Lag Input Kas
          </span>
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
            {summary.avg_cashflow_lag_days.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold text-indigo-600">hari rata-rata</span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">
          Truk berangkat vs input buku kas
        </div>
      </div>

      {/* 4. Rata-rata Billing Lag Invoice */}
      <div className="bg-gradient-to-br from-sky-50 to-white rounded-2xl p-4 border border-sky-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-700">
            Billing Lag Invoice
          </span>
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600 group-hover:scale-110 transition-transform">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-sky-950 tracking-tight">
            {summary.avg_invoice_lag_days.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold text-sky-600">hari rata-rata</span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">
          Kirim barang vs invoice terbit
        </div>
      </div>

      {/* 5. Total Staf Terpantau */}
      <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-4 border border-emerald-200 shadow-xs relative overflow-hidden group col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
            Kepatuhan Staf
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
            {summary.total_staff_monitored}
          </span>
          <span className="text-[10px] font-bold text-emerald-600">operator aktif</span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">
          Monitoring SLA 100% aktif
        </div>
      </div>
    </div>
  );
};
