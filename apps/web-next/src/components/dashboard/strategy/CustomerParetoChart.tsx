"use client";

import React, { useState } from "react";
import { PieChart, TrendingDown, Users, AlertTriangle, ShieldCheck, Sparkles, ArrowDownRight } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";
import { CustomerDisciplineData, CustomerDisciplineItem } from "./CustomerDsoDisciplineChart";

interface CustomerParetoChartProps {
  data: CustomerDisciplineData | null;
  loading?: boolean;
}

export function CustomerParetoChart({ data, loading = false }: CustomerParetoChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse">
        <div className="h-6 w-60 bg-slate-200 rounded-md mb-4" />
        <div className="h-56 bg-slate-100 rounded-xl mb-4" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!data || !data.customers || data.customers.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center py-12">
        <PieChart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada data distribusi omset pelanggan.</p>
      </div>
    );
  }

  const customers = data.customers;
  const churnList = customers.filter((c) => c.is_churn_warning);
  const top80Clients = customers.slice(0, data.top_80_percent_count || 1);

  // Narrative generation
  let narrativeText = `Hukum Pareto 80/20: Sebanyak 80% omset perusahaan dihasilkan oleh ${data.top_80_percent_count || 1} klien teratas (${top80Clients.map((c) => c.client_name).join(", ")}). `;
  if (churnList.length > 0) {
    narrativeText += `Perhatian Dini (Churn Warning): ${churnList.length} klien (${churnList.map((c) => c.client_name).join(", ")}) mengalami penurunan frekuensi order lebih dari 40% dalam 30 hari terakhir. Disarankan tim sales segera melakukan kunjungan langsung.`;
  } else {
    narrativeText += `Aktivitas order seluruh klien utama terpantau stabil tanpa indikasi penurunan muatan yang mencolok.`;
  }

  // SVG dimensions for Pareto combo chart (Bar + Cumulative Line)
  const svgWidth = 650;
  const svgHeight = 220;
  const padX = 45;
  const padY = 25;

  const maxBilled = Math.max(...customers.map((c) => c.total_billed)) || 1;
  const barWidth = Math.min(36, Math.max(16, (svgWidth - padX * 2) / (customers.length * 1.6)));

  const getX = (idx: number) => {
    if (customers.length <= 1) return svgWidth / 2;
    return padX + (idx / (customers.length - 1)) * (svgWidth - padX * 2);
  };

  const getBarHeight = (amount: number) => {
    return (amount / maxBilled) * (svgHeight - padY * 2);
  };

  const getYLine = (cumulativePct: number) => {
    return svgHeight - padY - (cumulativePct / 100) * (svgHeight - padY * 2);
  };

  const linePoints = customers.map((c, idx) => ({
    x: getX(idx),
    y: getYLine(c.cumulative_percent)
  }));

  const linePath = linePoints.map((p, idx) => (idx === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
  const line80Y = getYLine(80);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              Prioritas 5 (P5)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              churnList.length > 0
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {churnList.length > 0 ? `● ${churnList.length} Potensi Churn` : "● Retensi Klien Stabil"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Konsentrasi Portofolio Pelanggan (Pareto 80/20 & Churn Warning)
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Sebaran akumulasi omset per customer dan deteksi dini penurunan frekuensi muatan
          </p>
        </div>

        <ChartInfoPopover
          title="Konsentrasi Portofolio Pelanggan (Pareto 80/20 & Churn Early Warning)"
          purpose="Menunjukkan sebaran kontribusi pendapatan dari para pelanggan korporat dan mendeteksi apakah kelangsungan hidup perusahaan terlalu bertumpu pada segelintir pelanggan saja, sekaligus memantau keaktifan order mereka."
          benefits={[
            "Menyadarkan manajemen jika portofolio bisnis rapuh (ketergantungan berlebih pada 1-2 klien besar).",
            "Mendorong diversifikasi penjualan ke sektor industri lain agar fondasi bisnis kokoh.",
            "Memberikan peringatan dini bagi account manager sebelum klien berpindah ke ekspedisi kompetitor."
          ]}
          formula="Akumulasi % = (SUM Kumulatif Omset Klien / Total Omset) * 100% | Churn Alert = Trip Bulan Ini turun > 40% vs 30 hari sebelumnya"
        />
      </div>

      {/* 3 Summary Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
          <div className="text-[10px] text-purple-800 font-bold uppercase">Konsentrasi Pareto 80/20</div>
          <div className="text-lg font-black text-purple-950 font-mono mt-0.5">
            {data.top_80_percent_count} <span className="text-xs font-bold text-slate-500">dari {data.total_clients} Klien</span>
          </div>
          <div className="text-[10px] text-purple-700">Menyumbang 80% total omset</div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Total Nilai Tagihan Portofolio</div>
          <div className="text-base font-black text-slate-900 font-mono mt-0.5 truncate">
            {formatCurrency(data.total_revenue)}
          </div>
          <div className="text-[10px] text-slate-500">Akumulasi seluruh faktur</div>
        </div>

        <div className={`p-3 rounded-xl border ${churnList.length > 0 ? "bg-amber-50/80 border-amber-200" : "bg-emerald-50/70 border-emerald-200"}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
            <span>Sinyal Dini Churn</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-bold">
              {churnList.length} Klien
            </span>
          </div>
          <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
            {churnList[0]?.client_name || "Tidak ada penurunan drastis"}
          </div>
          <div className="text-[10px] text-slate-500">
            Order turun &gt; 40% dalam 30 hari
          </div>
        </div>
      </div>

      {/* SVG Pareto Combo Chart */}
      <div className="relative border border-slate-100 rounded-xl p-3 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1 px-2">
          <span>Kurva Akumulasi Pareto (Garis) vs Nilai Omset (Batang)</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2 bg-indigo-500 rounded-xs inline-block" />
              <span>Omset Klien</span>
            </span>
            <span className="flex items-center gap-1 text-purple-700">
              <span className="w-2.5 h-0.5 bg-purple-600 inline-block" />
              <span>Akumulasi %</span>
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-0.5 bg-amber-500 border-b border-dashed inline-block" />
              <span>Batas 80%</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto soft-scrollbar">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-52 select-none">
            {/* Horizontal Grid & 80% Pareto Line */}
            <line x1={padX} y1={padY} x2={svgWidth - padX} y2={padY} stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1={padX} y1={svgHeight - padY} x2={svgWidth - padX} y2={svgHeight - padY} stroke="#cbd5e1" />
            
            {/* 80% Threshold Line */}
            <line x1={padX} y1={line80Y} x2={svgWidth - padX} y2={line80Y} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
            <text x={svgWidth - padX - 5} y={line80Y - 4} textAnchor="end" fill="#f59e0b" fontSize="9" fontWeight="bold">
              Ambang Batas 80%
            </text>

            {/* Bars for individual revenue */}
            {customers.map((c, idx) => {
              const cx = getX(idx);
              const bHeight = getBarHeight(c.total_billed);
              const isHovered = hoveredIdx === idx;

              return (
                <g key={idx}>
                  <rect
                    x={cx - barWidth / 2}
                    y={svgHeight - padY - bHeight}
                    width={barWidth}
                    height={bHeight}
                    fill={isHovered ? "#4f46e5" : "#6366f1"}
                    fillOpacity={isHovered ? "1" : "0.75"}
                    rx="3"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  <text
                    x={cx}
                    y={svgHeight - padY + 12}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8"
                    fontWeight={isHovered ? "bold" : "normal"}
                  >
                    #{idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Cumulative Percentage Line */}
            <path d={linePath} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Line data points */}
            {linePoints.map((p, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3}
                  fill="#7c3aed"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* Hover detail box */}
        {hoveredIdx !== null && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-black text-purple-400">{customers[hoveredIdx].client_name}</span>
              {customers[hoveredIdx].is_churn_warning && (
                <span className="text-[10px] px-2 py-0.2 rounded-md bg-amber-900 text-amber-300 font-bold border border-amber-600">
                  Potensi Churn ({customers[hoveredIdx].trip_change_pct}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>Omset: <strong>{formatCurrency(customers[hoveredIdx].total_billed)}</strong></span>
              <span>Pangsa: <strong>{customers[hoveredIdx].pareto_percent}%</strong></span>
              <span className="text-purple-300">Akumulasi: <strong>{customers[hoveredIdx].cumulative_percent}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Smart Narrative */}
      <SmartNarrativeBox
        status={churnList.length > 0 ? "warning" : "info"}
        title="Insight Portofolio Pelanggan"
        narrative={narrativeText}
        badges={[
          { label: `80% Omset: ${data.top_80_percent_count} Klien`, variant: "default" },
          { label: `${churnList.length} Sinyal Churn`, variant: churnList.length > 0 ? "warning" : "success" }
        ]}
      />
    </div>
  );
}
