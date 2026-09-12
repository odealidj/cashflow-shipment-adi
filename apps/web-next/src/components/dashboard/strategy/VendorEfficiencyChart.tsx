"use client";

import React from "react";
import { Truck, ShieldAlert, Percent, DollarSign, Award, ArrowUpRight, TrendingUp } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

export interface VendorEfficiencyItem {
  vendor_name: string;
  trip_count: number;
  total_cost: number;
  total_selling: number;
  total_profit: number;
  avg_margin_pct: number;
  concentration_ratio: number;
  is_dominant: boolean;
}

export interface VendorEfficiencyData {
  total_vendors: number;
  total_cost_all: number;
  total_trips_all: number;
  top_vendor_name: string;
  top_concentration_pct: number;
  highest_margin_vendor: string;
  highest_margin_pct: number;
  vendors: VendorEfficiencyItem[];
}

interface VendorEfficiencyChartProps {
  data: VendorEfficiencyData | null;
  loading?: boolean;
}

export function VendorEfficiencyChart({ data, loading = false }: VendorEfficiencyChartProps) {
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

  if (!data || !data.vendors || data.vendors.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center py-12">
        <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada data transaksi rekanan vendor.</p>
      </div>
    );
  }

  const vendors = data.vendors;
  const isConcentrationRisk = data.top_concentration_pct >= 40.0;

  // Narrative generation
  let narrativeText = "";
  if (isConcentrationRisk) {
    narrativeText = `Peringatan Ketergantungan: Vendor ${data.top_vendor_name} menyerap ${data.top_concentration_pct}% dari total seluruh ritase pengiriman. Disarankan mendistribusikan muatan ke vendor alternatif guna mengurangi risiko monopoli armada. `;
  } else {
    narrativeText = `Distribusi rekanan armada berada pada batas sehat (konsentrasi vendor tertinggi ${data.top_concentration_pct}% oleh ${data.top_vendor_name}). `;
  }

  if (data.highest_margin_vendor) {
    narrativeText += `Mitra dengan kontribusi margin profit tertinggi adalah ${data.highest_margin_vendor} (rata-rata margin ${data.highest_margin_pct}%).`;
  }

  const maxCost = Math.max(...vendors.map((v) => v.total_cost)) || 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
              Prioritas 4 (P4)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isConcentrationRisk
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {isConcentrationRisk ? "● Konsentrasi Tinggi" : "● Vendor Terdiversifikasi"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Analisis Efisiensi & Ketergantungan Rekanan Vendor
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Evaluasi beban pokok sewa armada rekanan vs kontribusi margin keuntungan dan rasio ketergantungan
          </p>
        </div>

        <ChartInfoPopover
          title="Analisis Efisiensi & Ketergantungan Rekanan Vendor"
          purpose="Mengukur seberapa besar biaya pengeluaran yang kita bayarkan ke masing-masing rekanan vendor armada, berapa margin laba yang dihasilkan, serta mengukur risiko jika operasional terlalu bertumpu pada satu vendor tertentu."
          benefits={[
            "Menjadi alat tawar (bargaining power) kuat untuk negosiasi diskon harga sewa armada pada vendor bervolume tinggi.",
            "Mengidentifikasi vendor 'emas' yang konsisten memberikan margin profit tinggi (>15%) sebagai rekanan prioritas.",
            "Mencegah risiko kelumpuhan armada jika salah satu vendor monopoli (>35%) mendadak mengalami masalah internal."
          ]}
          formula="Rasio Ketergantungan = (Ritase Vendor / Total Ritase Perusahaan) * 100% | Rata-rata Margin = AVG(profit / grand_selling * 100%)"
        />
      </div>

      {/* 3 Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Total Rekanan Vendor</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
            {data.total_vendors} <span className="text-xs font-bold text-slate-400">Mitra</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Total biaya: {formatCurrency(data.total_cost_all)}
          </div>
        </div>

        <div className={`p-3 rounded-xl border ${isConcentrationRisk ? "bg-amber-50/70 border-amber-200" : "bg-sky-50/70 border-sky-200"}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Vendor Terbesar (Pangsa Armada)
          </div>
          <div className="text-sm font-black text-slate-900 mt-0.5 truncate">
            {data.top_vendor_name}
          </div>
          <div className="text-[10px] font-mono font-bold text-sky-800">
            {data.top_concentration_pct}% dari seluruh order
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="text-[10px] text-emerald-800 font-bold uppercase">Mitra Margin Tertinggi</div>
          <div className="text-sm font-black text-emerald-950 mt-0.5 truncate">
            {data.highest_margin_vendor || "-"}
          </div>
          <div className="text-[10px] font-mono font-bold text-emerald-700">
            Rerata Margin: {data.highest_margin_pct}%
          </div>
        </div>
      </div>

      {/* Vendor List Bars */}
      <div className="space-y-3 border border-slate-100 rounded-xl p-3 bg-slate-50/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
          <span>Daftar Rekanan Vendor & Kontribusi Beban HPP</span>
          <span>Rasio Pangsa & Margin %</span>
        </div>

        <div className="space-y-2.5">
          {vendors.map((v, idx) => {
            const costBarPct = Math.min(100, Math.max(8, (v.total_cost / maxCost) * 100));

            return (
              <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-black text-slate-900">{v.vendor_name}</span>
                    {v.is_dominant && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                        Dominan ({v.concentration_ratio}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-600 font-medium">
                      {v.trip_count} Trip ({v.concentration_ratio}%)
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Margin: {v.avg_margin_pct}%
                    </span>
                    <span className="font-black text-slate-900">{formatCurrency(v.total_cost)}</span>
                  </div>
                </div>

                {/* Progress bar visualizing cost proportion */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-600 to-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${costBarPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Narrative */}
      <SmartNarrativeBox
        status={isConcentrationRisk ? "warning" : "success"}
        title="Insight Rekanan Vendor"
        narrative={narrativeText}
        badges={[
          { label: `${vendors.length} Rekanan Terdaftar`, variant: "default" },
          { label: `Konsentrasi Max: ${data.top_concentration_pct}%`, variant: isConcentrationRisk ? "warning" : "success" }
        ]}
      />
    </div>
  );
}
