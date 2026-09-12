"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, AlertCircle, ShieldCheck, Wallet, ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

export interface RunwayBucket {
  date: string;
  week_label: string;
  day_offset: number;
  inflow_amount: number;
  outflow_amount: number;
  net_change: number;
  projected_cash: number;
  is_in_danger: boolean;
}

export interface CashflowRunwayData {
  current_cash_balance: number;
  minimum_cash_buffer: number;
  total_pending_inflow: number;
  total_pending_outflow: number;
  net_projected_60_days: number;
  lowest_point_date: string;
  lowest_point_balance: number;
  runway_days: number;
  buckets: RunwayBucket[];
  avg_customer_dso: number;
  avg_vendor_dpo: number;
  financing_gap_days: number;
}

interface CashflowRunwayChartProps {
  data: CashflowRunwayData | null;
  loading?: boolean;
}

export function CashflowRunwayChart({ data, loading = false }: CashflowRunwayChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse">
        <div className="h-6 w-64 bg-slate-200 rounded-md mb-4" />
        <div className="h-56 bg-slate-100 rounded-xl mb-4" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!data || !data.buckets || data.buckets.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center py-12">
        <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada data proyeksi kas.</p>
      </div>
    );
  }

  // Calculate coordinates for SVG area chart
  const buckets = data.buckets;
  const values = buckets.map((b) => b.projected_cash);
  const minVal = Math.min(0, ...values, data.minimum_cash_buffer);
  const maxVal = Math.max(...values, data.current_cash_balance) * 1.15;
  const valRange = maxVal - minVal || 1;

  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 25;

  const getX = (idx: number) => {
    if (buckets.length <= 1) return svgWidth / 2;
    return paddingX + (idx / (buckets.length - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (val: number) => {
    const norm = (val - minVal) / valRange;
    return svgHeight - paddingY - norm * (svgHeight - paddingY * 2);
  };

  // SVG path points
  const points = buckets.map((b, idx) => ({
    x: getX(idx),
    y: getY(b.projected_cash)
  }));

  const linePath = points.map((p, idx) => (idx === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`;
  const bufferY = getY(data.minimum_cash_buffer);

  // Smart narrative generator
  const isDanger = data.lowest_point_balance < data.minimum_cash_buffer;
  const narrativeStatus = isDanger ? "danger" : data.net_projected_60_days < 0 ? "warning" : "success";
  
  let narrativeText = "";
  if (isDanger) {
    narrativeText = `Peringatan Likuiditas: Kas diproyeksikan menyentuh titik kritis di bawah ambang batas aman (Rp ${formatCurrency(data.lowest_point_balance)}) sekitar ${formatDate(data.lowest_point_date)}. Segera lakukan percepatan penagihan invoice atau jadwal ulang pelunasan vendor.`;
  } else if (data.net_projected_60_days < 0) {
    narrativeText = `Posisi kas terjaga aman namun terjadi penurunan neto sebesar ${formatCurrency(Math.abs(data.net_projected_60_days))} dalam 60 hari ke depan. Titik terendah kas diproyeksikan pada ${formatDate(data.lowest_point_date)} sebesar ${formatCurrency(data.lowest_point_balance)}.`;
  } else {
    narrativeText = `Kondisi kas sangat likuid. Saldo diproyeksikan bertambah neto ${formatCurrency(data.net_projected_60_days)} dalam 60 hari ke depan, dengan sisa buffer kas terendah tetap terjaga tinggi (${formatCurrency(data.lowest_point_balance)}).`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header with Title and Info Popover */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              Prioritas 1 (P1)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isDanger 
                ? "bg-rose-100 text-rose-800 border-rose-200" 
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {isDanger ? "● Resiko Defisit" : "● Kas Aman"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Proyeksi Arus Kas 30–60 Hari ke Depan (Cashflow Runway)
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Peta perkiraan saldo kas dari piutang customer jatuh tempo dikurangi beban vendor rekanan
          </p>
        </div>

        <ChartInfoPopover
          title="Proyeksi Arus Kas 30–60 Hari ke Depan (Cashflow Runway)"
          purpose="Memetakan perkiraan posisi saldo kas perusahaan setiap minggu selama 1-2 bulan ke depan berdasarkan jadwal jatuh tempo invoice yang akan cair dikurangi tagihan rekanan vendor yang harus dibayar."
          benefits={[
            "Memberikan peringatan dini (early warning) sebelum kas perusahaan jatuh ke zona defisit.",
            "Menentukan tanggal aman untuk melunasi tagihan vendor besar tanpa mengganggu operasional.",
            "Memberikan aba-aba bagi tim finance kapan harus menagih piutang secara agresif jika buffer kas menipis."
          ]}
          formula="Saldo Hari-t = Saldo Kas Riil + Akumulasi Piutang Jatuh Tempo (Inflow) - Akumulasi Hutang Vendor Jatuh Tempo (Outflow)"
        />
      </div>

      {/* 4 Summary Stat Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100">
          <div className="text-[10px] text-sky-800 font-bold uppercase tracking-wider">Saldo Kas Riil Saat Ini</div>
          <div className="text-sm font-black text-sky-950 font-mono mt-0.5 truncate">
            {formatCurrency(data.current_cash_balance)}
          </div>
          <div className="text-[10px] text-sky-700 font-medium">Titik awal modal berjalan</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
            <span>Piutang Akan Cair (+)</span>
          </div>
          <div className="text-sm font-black text-emerald-700 font-mono mt-0.5 truncate">
            {formatCurrency(data.total_pending_inflow)}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">Dari invoice jatuh tempo</div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100">
          <div className="text-[10px] text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-rose-600" />
            <span>Kewajiban Vendor (-)</span>
          </div>
          <div className="text-sm font-black text-rose-700 font-mono mt-0.5 truncate">
            {formatCurrency(data.total_pending_outflow)}
          </div>
          <div className="text-[10px] text-rose-600 font-medium">Beban rekanan belum bayar</div>
        </div>

        <div className={`p-3 rounded-xl border ${isDanger ? "bg-rose-50 border-rose-200" : "bg-teal-50/60 border-teal-100"}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
            <span className={isDanger ? "text-rose-800" : "text-teal-800"}>Titik Saldo Terendah</span>
            <span className="text-[9px] font-mono text-slate-500">{formatDate(data.lowest_point_date)}</span>
          </div>
          <div className={`text-sm font-black font-mono mt-0.5 truncate ${isDanger ? "text-rose-700" : "text-teal-900"}`}>
            {formatCurrency(data.lowest_point_balance)}
          </div>
          <div className="text-[10px] font-medium text-slate-500">
            Buffer aman: {formatCurrency(data.minimum_cash_buffer)}
          </div>
        </div>
      </div>

      {/* Interactive SVG Chart Area */}
      <div className="relative border border-slate-100 rounded-xl p-3 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1 px-2">
          <span>Proyeksi Saldo Bergulir 8 Minggu</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-sky-600 inline-block" />
              <span>Saldo Kas</span>
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="w-2.5 h-0.5 bg-rose-400 border-b border-dashed inline-block" />
              <span>Ambang Batas Aman</span>
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto soft-scrollbar">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-48 select-none">
            <defs>
              <linearGradient id="runwayGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal lines */}
            <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="#e2e8f0" strokeDasharray="3,3" />
            <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#cbd5e1" />

            {/* Minimum Buffer Line */}
            {bufferY >= paddingY && bufferY <= svgHeight - paddingY && (
              <g>
                <line x1={paddingX} y1={bufferY} x2={svgWidth - paddingX} y2={bufferY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,4" />
                <text x={svgWidth - paddingX - 5} y={bufferY - 4} textAnchor="end" fill="#f43f5e" fontSize="9" fontWeight="bold">
                  Batas Buffer: {formatCurrency(data.minimum_cash_buffer)}
                </text>
              </g>
            )}

            {/* Area & Line */}
            <path d={areaPath} fill="url(#runwayGradient)" />
            <path d={linePath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data point circles & vertical lines */}
            {points.map((p, idx) => {
              const isHovered = hoveredIdx === idx;
              const bucket = buckets[idx];
              return (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : 4}
                    fill={bucket.is_in_danger ? "#f43f5e" : "#0284c7"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                  <text
                    x={p.x}
                    y={svgHeight - paddingY + 14}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                    fontWeight={isHovered ? "bold" : "normal"}
                  >
                    {bucket.week_label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover details badge */}
        {hoveredIdx !== null && (
          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-400">{buckets[hoveredIdx].week_label}</span>
              <span className="text-slate-400">({formatDate(buckets[hoveredIdx].date)})</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span className="text-emerald-400">Inflow: +{formatCurrency(buckets[hoveredIdx].inflow_amount)}</span>
              <span className="text-rose-400">Outflow: -{formatCurrency(buckets[hoveredIdx].outflow_amount)}</span>
              <span className="font-black text-white bg-slate-800 px-2 py-0.5 rounded-md">
                Saldo: {formatCurrency(buckets[hoveredIdx].projected_cash)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Smart Narrative Footer */}
      <SmartNarrativeBox
        status={narrativeStatus}
        title="Insight Likuiditas Eksekutif"
        narrative={narrativeText}
        badges={[
          { label: isDanger ? "Resiko Kas Kritis" : "Likuiditas Aman", variant: isDanger ? "danger" : "success" },
          { label: `Neto 60 Hari: ${formatCurrency(data.net_projected_60_days)}`, variant: "default" }
        ]}
      />
    </div>
  );
}
