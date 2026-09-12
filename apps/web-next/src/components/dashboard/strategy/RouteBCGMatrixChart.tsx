"use client";

import React, { useState } from "react";
import { Award, Compass, Table, LayoutGrid, ArrowUpRight, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

export interface RouteMatrixItem {
  route_name: string;
  trip_count: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_margin_pct: number;
  quadrant: "STAR" | "OPPORTUNITY" | "CASH_COW" | "EVALUATE";
  quadrant_name: string;
}

export interface RouteMatrixData {
  total_routes: number;
  avg_trip_threshold: number;
  avg_margin_threshold: number;
  routes: RouteMatrixItem[];
}

interface RouteBCGMatrixChartProps {
  data: RouteMatrixData | null;
  loading?: boolean;
}

export function RouteBCGMatrixChart({ data, loading = false }: RouteBCGMatrixChartProps) {
  const [viewMode, setViewMode] = useState<"quadrant" | "table">("quadrant");
  const [hoveredRoute, setHoveredRoute] = useState<RouteMatrixItem | null>(null);

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
        <div className="h-64 bg-slate-100 rounded-xl mb-4" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!data || !data.routes || data.routes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center py-12">
        <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada data rute pengiriman.</p>
      </div>
    );
  }

  const routes = data.routes;
  const stars = routes.filter((r) => r.quadrant === "STAR");
  const opportunities = routes.filter((r) => r.quadrant === "OPPORTUNITY");
  const cashCows = routes.filter((r) => r.quadrant === "CASH_COW");
  const evaluates = routes.filter((r) => r.quadrant === "EVALUATE");

  // Narrative generation
  let narrativeText = "";
  if (stars.length > 0) {
    const topStar = stars[0];
    narrativeText = `Rute Bintang Unggulan: ${topStar.route_name} menyumbang laba tertinggi (${formatCurrency(topStar.total_profit)}) dengan margin prima (${topStar.avg_margin_pct}%). `;
  } else {
    narrativeText = `Belum ada rute di kuadran Bintang. `;
  }

  if (evaluates.length > 0) {
    narrativeText += `Perhatian: Rute ${evaluates[0].route_name} berada di kuadran evaluasi kritis karena margin laba rendah (${evaluates[0].avg_margin_pct}%) dan volume belum menutup beban. Pertimbangkan evaluasi tarif.`;
  } else if (cashCows.length > 0) {
    narrativeText += `Rute ${cashCows[0].route_name} bertindak sebagai sapi perah penopang volume arus kas (menghasilkan ${cashCows[0].trip_count} ritase).`;
  }

  // SVG Chart Coordinate calculations
  const svgWidth = 600;
  const svgHeight = 280;
  const pad = 40;

  const maxTrips = Math.max(5, ...routes.map((r) => r.trip_count)) * 1.15;
  const maxMargin = Math.max(25, ...routes.map((r) => r.avg_margin_pct)) * 1.15;

  const getX = (trips: number) => pad + (trips / maxTrips) * (svgWidth - pad * 2);
  const getY = (margin: number) => svgHeight - pad - (margin / maxMargin) * (svgHeight - pad * 2);

  const splitX = getX(data.avg_trip_threshold);
  const splitY = getY(data.avg_margin_threshold);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              Prioritas 2 (P2)
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {data.total_routes} Rute Terpetakan
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Matriks Kuadran Profitabilitas Rute (Logistics BCG Matrix)
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Klasifikasi koridor ekspedisi berdasarkan volume ritase (Sumbu X) dan persentase margin keuntungan (Sumbu Y)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle View */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("quadrant")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "quadrant"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Matriks Kuadran"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Kuadran</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Tabel Rincian"
            >
              <Table className="w-3 h-3" />
              <span>Tabel</span>
            </button>
          </div>

          <ChartInfoPopover
            title="Matriks Kuadran Profitabilitas Rute (Logistics BCG Matrix)"
            purpose="Memetakan seluruh rute operasional pengiriman ke dalam 4 kuadran performa berdasarkan frekuensi pengiriman (ritase) dan persentase margin laba bersih yang dihasilkan."
            benefits={[
              "Mengidentifikasi rute 'Bintang' tambang emas yang wajib diprioritaskan armada terbaiknya.",
              "Menemukan rute 'Potensial' yang ber-margin tinggi untuk digenjot penjualannya oleh tim sales.",
              "Mendeteksi rute 'Evaluasi Kritis' yang membakar biaya tanpa menghasilkan margin sehat."
            ]}
            formula="Kuadran I (Bintang): Trip >= Rata-rata & Margin >= 12% | Kuadran II (Potensial): Trip < Rata-rata & Margin >= 12% | Kuadran III (Sapi Perah): Trip >= Rata-rata & Margin < 12% | Kuadran IV (Evaluasi): Trip < Rata-rata & Margin < 12%"
          />
        </div>
      </div>

      {/* 4 Quadrant Summary Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
            <span>🌟 I. Bintang (Stars)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-mono ml-auto">
              {stars.length}
            </span>
          </div>
          <div className="text-[11px] text-emerald-900 font-bold mt-1 truncate">
            {stars[0]?.route_name || "Belum ada rute"}
          </div>
          <div className="text-[10px] text-emerald-700">Volume Tinggi, Margin Tebal</div>
        </div>

        <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200">
          <div className="text-[10px] font-black text-sky-800 uppercase flex items-center gap-1">
            <span>💡 II. Potensial (Opp.)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-200 text-sky-900 font-mono ml-auto">
              {opportunities.length}
            </span>
          </div>
          <div className="text-[11px] text-sky-900 font-bold mt-1 truncate">
            {opportunities[0]?.route_name || "Belum ada rute"}
          </div>
          <div className="text-[10px] text-sky-700">Volume Rendah, Margin Tebal</div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1">
            <span>🐄 III. Sapi Perah (Cows)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono ml-auto">
              {cashCows.length}
            </span>
          </div>
          <div className="text-[11px] text-amber-900 font-bold mt-1 truncate">
            {cashCows[0]?.route_name || "Belum ada rute"}
          </div>
          <div className="text-[10px] text-amber-700">Volume Tinggi, Margin Tipis</div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
          <div className="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
            <span>⚠️ IV. Evaluasi (Dogs)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 font-mono ml-auto">
              {evaluates.length}
            </span>
          </div>
          <div className="text-[11px] text-rose-900 font-bold mt-1 truncate">
            {evaluates[0]?.route_name || "Semua rute aman"}
          </div>
          <div className="text-[10px] text-rose-700">Volume Rendah, Margin Tipis</div>
        </div>
      </div>

      {/* Main Content: Quadrant Scatter Chart or Detailed Table */}
      {viewMode === "quadrant" ? (
        <div className="relative border border-slate-100 rounded-xl p-3 bg-gradient-to-b from-slate-50/60 to-white overflow-hidden">
          <div className="w-full overflow-x-auto soft-scrollbar">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 select-none">
              {/* Quadrant Background Tints */}
              {/* Kuadran II: Potensial (Top-Left) */}
              <rect x={pad} y={pad} width={splitX - pad} height={splitY - pad} fill="#0284c7" fillOpacity="0.04" />
              {/* Kuadran I: Bintang (Top-Right) */}
              <rect x={splitX} y={pad} width={svgWidth - pad - splitX} height={splitY - pad} fill="#10b981" fillOpacity="0.06" />
              {/* Kuadran IV: Evaluasi (Bottom-Left) */}
              <rect x={pad} y={splitY} width={splitX - pad} height={svgHeight - pad - splitY} fill="#f43f5e" fillOpacity="0.04" />
              {/* Kuadran III: Sapi Perah (Bottom-Right) */}
              <rect x={splitX} y={splitY} width={svgWidth - pad - splitX} height={svgHeight - pad - splitY} fill="#f59e0b" fillOpacity="0.04" />

              {/* Threshold Divider Lines */}
              <line x1={splitX} y1={pad} x2={splitX} y2={svgHeight - pad} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
              <line x1={pad} y1={splitY} x2={svgWidth - pad} y2={splitY} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />

              {/* Axis Border Lines */}
              <line x1={pad} y1={svgHeight - pad} x2={svgWidth - pad} y2={svgHeight - pad} stroke="#64748b" strokeWidth="1.5" />
              <line x1={pad} y1={pad} x2={pad} y2={svgHeight - pad} stroke="#64748b" strokeWidth="1.5" />

              {/* Axis Labels */}
              <text x={svgWidth - pad} y={svgHeight - pad + 20} textAnchor="end" fill="#475569" fontSize="10" fontWeight="bold">
                Volume Ritase (Trip) →
              </text>
              <text x={pad} y={pad - 12} textAnchor="start" fill="#475569" fontSize="10" fontWeight="bold">
                ↑ Margin Laba (%)
              </text>

              {/* Quadrant Watermark Labels */}
              <text x={svgWidth - pad - 10} y={pad + 16} textAnchor="end" fill="#059669" fontSize="10" fontWeight="bold" opacity="0.6">
                🌟 KUADRAN I: BINTANG
              </text>
              <text x={pad + 10} y={pad + 16} textAnchor="start" fill="#0284c7" fontSize="10" fontWeight="bold" opacity="0.6">
                💡 KUADRAN II: POTENSIAL
              </text>
              <text x={svgWidth - pad - 10} y={svgHeight - pad - 10} textAnchor="end" fill="#d97706" fontSize="10" fontWeight="bold" opacity="0.6">
                🐄 KUADRAN III: SAPI PERAH
              </text>
              <text x={pad + 10} y={svgHeight - pad - 10} textAnchor="start" fill="#e11d48" fontSize="10" fontWeight="bold" opacity="0.6">
                ⚠️ KUADRAN IV: EVALUASI
              </text>

              {/* Route Bubbles */}
              {routes.map((r, idx) => {
                const cx = getX(r.trip_count);
                const cy = getY(r.avg_margin_pct);
                const radius = Math.min(22, Math.max(7, Math.sqrt(r.total_revenue / 5000000) * 4));
                const isHovered = hoveredRoute?.route_name === r.route_name;

                let bubbleColor = "#10b981"; // Star
                if (r.quadrant === "OPPORTUNITY") bubbleColor = "#0284c7";
                if (r.quadrant === "CASH_COW") bubbleColor = "#f59e0b";
                if (r.quadrant === "EVALUATE") bubbleColor = "#f43f5e";

                return (
                  <g key={idx} className="cursor-pointer transition-all duration-200">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? radius + 3 : radius}
                      fill={bubbleColor}
                      fillOpacity={isHovered ? "0.9" : "0.75"}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      onMouseEnter={() => setHoveredRoute(r)}
                      onMouseLeave={() => setHoveredRoute(null)}
                    />
                    <text
                      x={cx}
                      y={cy - radius - 3}
                      textAnchor="middle"
                      fill="#1e293b"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {r.route_name.length > 18 ? `${r.route_name.substring(0, 16)}...` : r.route_name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Hovered route detail card */}
          {hoveredRoute && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <span className="font-black text-sky-400">{hoveredRoute.route_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                  {hoveredRoute.quadrant_name}
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span>{hoveredRoute.trip_count} Ritase</span>
                <span>Margin: <strong className="text-emerald-400">{hoveredRoute.avg_margin_pct}%</strong></span>
                <span>Laba: <strong>{formatCurrency(hoveredRoute.total_profit)}</strong></span>
                <span>Omset: {formatCurrency(hoveredRoute.total_revenue)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto soft-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-black border-b border-slate-200">
                  <th className="p-3">Nama Rute Operasional</th>
                  <th className="p-3 text-center">Kuadran</th>
                  <th className="p-3 text-right">Ritase</th>
                  <th className="p-3 text-right">Margin %</th>
                  <th className="p-3 text-right">Total Laba</th>
                  <th className="p-3 text-right">Total Omset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.map((r, idx) => {
                  let badge = "bg-emerald-100 text-emerald-800";
                  if (r.quadrant === "OPPORTUNITY") badge = "bg-sky-100 text-sky-800";
                  if (r.quadrant === "CASH_COW") badge = "bg-amber-100 text-amber-800";
                  if (r.quadrant === "EVALUATE") badge = "bg-rose-100 text-rose-800";

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{r.route_name}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badge}`}>
                          {r.quadrant}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700">{r.trip_count}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{r.avg_margin_pct}%</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatCurrency(r.total_profit)}</td>
                      <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(r.total_revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smart Narrative */}
      <SmartNarrativeBox
        status="info"
        title="Insight Portofolio Rute"
        narrative={narrativeText}
        badges={[
          { label: `${stars.length} Rute Bintang`, variant: "success" },
          { label: `${evaluates.length} Rute Evaluasi`, variant: evaluates.length > 0 ? "warning" : "default" }
        ]}
      />
    </div>
  );
}
