"use client";

import React from "react";
import { Users, Clock, AlertTriangle, ShieldCheck, CheckCircle2, RotateCcw } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

export interface CustomerDisciplineItem {
  client_name: string;
  total_invoices: number;
  total_billed: number;
  avg_top_days: number;
  avg_actual_dso: number;
  overdue_count: number;
  reschedule_count: number;
  discipline_status: "PRIME" | "MODERATE" | "HIGH_RISK";
  pareto_percent: number;
  cumulative_percent: number;
  recent_trips_count: number;
  previous_trips_count: number;
  trip_change_pct: number;
  is_churn_warning: boolean;
}

export interface CustomerDisciplineData {
  total_clients: number;
  total_revenue: number;
  top_80_percent_count: number;
  customers: CustomerDisciplineItem[];
  overall_avg_dso: number;
  high_risk_client_count: number;
  churn_alert_count: number;
}

interface CustomerDsoDisciplineChartProps {
  data: CustomerDisciplineData | null;
  loading?: boolean;
}

export function CustomerDsoDisciplineChart({ data, loading = false }: CustomerDsoDisciplineChartProps) {
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
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-600">Belum ada data pelanggan tercatat.</p>
      </div>
    );
  }

  const customers = data.customers;
  const highRiskList = customers.filter((c) => c.discipline_status === "HIGH_RISK");
  const primeList = customers.filter((c) => c.discipline_status === "PRIME");

  // Narrative generation
  let narrativeText = `Rata-rata waktu pelunasan seluruh customer adalah ${data.overall_avg_dso.toFixed(1)} hari. `;
  if (highRiskList.length > 0) {
    narrativeText += `Perhatian: Terdapat ${highRiskList.length} pelanggan kategori High Risk (${highRiskList.map((c) => c.client_name).slice(0, 2).join(", ")}) yang memiliki riwayat keterlambatan atau perpanjangan jatuh tempo. Disarankan menerapkan syarat DP atau Cash Before Delivery (CBD).`;
  } else {
    narrativeText += `Seluruh pelanggan memiliki kepatuhan pembayaran prima dan moderat tanpa ada piutang kritis.`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
              Prioritas 3 (P3)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              highRiskList.length > 0
                ? "bg-rose-100 text-rose-800 border-rose-200"
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {highRiskList.length > 0 ? `● ${highRiskList.length} Klien High Risk` : "● Pembayaran Disiplin"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Skor Kepatuhan Tempo & DSO per Customer
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Evaluasi perbandingan janji tempo invoice (TOP) vs realisasi waktu pelunasan riil (DSO) dan frekuensi reschedule
          </p>
        </div>

        <ChartInfoPopover
          title="Skor Kepatuhan Tempo & DSO per Customer"
          purpose="Membandingkan janji tempo pembayaran invoice (TOP) masing-masing pelanggan korporat dengan kenyataan berapa hari pelanggan tersebut benar-benar melunasi tagihannya (DSO)."
          benefits={[
            "Menentukan batas kredit (credit limit) dan kelayakan perpanjangan kontrak bagi tiap customer.",
            "Memberikan syarat Cash Before Delivery (CBD) atau uang muka (DP) bagi pelanggan berstatus High Risk.",
            "Mencegah akumulasi piutang macet yang membebani kas perusahaan."
          ]}
          formula="DSO Riil = paid_at - shipment_date | Kategori: Prime (DSO <= TOP), Moderate (DSO <= TOP+10), High Risk (DSO > TOP+10 atau Reschedule >= 2)"
        />
      </div>

      {/* 3 Summary Pills */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="text-[10px] font-bold text-emerald-800 uppercase">🟢 Prime (Tertib)</div>
          <div className="text-lg font-black text-emerald-950 font-mono mt-0.5">
            {primeList.length} <span className="text-xs font-bold text-slate-500">Klien</span>
          </div>
          <div className="text-[10px] text-emerald-700">Bayar tepat waktu</div>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="text-[10px] font-bold text-amber-800 uppercase">🟡 Moderate (Wajar)</div>
          <div className="text-lg font-black text-amber-950 font-mono mt-0.5">
            {customers.filter((c) => c.discipline_status === "MODERATE").length} <span className="text-xs font-bold text-slate-500">Klien</span>
          </div>
          <div className="text-[10px] text-amber-700">Terlambat &lt; 10 hari</div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
          <div className="text-[10px] font-bold text-rose-800 uppercase">🔴 High Risk (Kritis)</div>
          <div className="text-lg font-black text-rose-950 font-mono mt-0.5">
            {highRiskList.length} <span className="text-xs font-bold text-slate-500">Klien</span>
          </div>
          <div className="text-[10px] text-rose-700">Reschedule / Overdue</div>
        </div>
      </div>

      {/* Customer DSO List */}
      <div className="space-y-2.5 border border-slate-100 rounded-xl p-3 bg-slate-50/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
          <span>Nama Klien & Nilai Tagihan</span>
          <span>Janji TOP vs Realisasi DSO</span>
        </div>

        <div className="space-y-2">
          {customers.map((c, idx) => {
            let statusBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
            let statusLabel = "Prime";
            if (c.discipline_status === "MODERATE") {
              statusBadge = "bg-amber-100 text-amber-800 border-amber-200";
              statusLabel = "Moderate";
            }
            if (c.discipline_status === "HIGH_RISK") {
              statusBadge = "bg-rose-100 text-rose-800 border-rose-200";
              statusLabel = "High Risk";
            }

            const maxDays = Math.max(60, c.avg_actual_dso * 1.2, c.avg_top_days * 1.2);
            const topPct = (c.avg_top_days / maxDays) * 100;
            const dsoPct = (c.avg_actual_dso / maxDays) * 100;

            return (
              <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${statusBadge}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs font-black text-slate-900">{c.client_name}</span>
                    {c.reschedule_count > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>{c.reschedule_count}x Reschedule</span>
                      </span>
                    )}
                    {c.overdue_count > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                        {c.overdue_count} Overdue
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono font-bold text-slate-800">
                    {formatCurrency(c.total_billed)} ({c.total_invoices} Inv)
                  </div>
                </div>

                {/* Double Bar Comparison: TOP vs DSO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Janji TOP: {c.avg_top_days} hari</span>
                    <span className={`font-mono ${c.avg_actual_dso > c.avg_top_days ? "text-rose-600 font-black" : "text-emerald-700"}`}>
                      Realisasi DSO: {c.avg_actual_dso.toFixed(1)} hari
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-slate-400 rounded-l-full"
                      style={{ width: `${topPct}%` }}
                      title={`Janji TOP: ${c.avg_top_days} Hari`}
                    />
                    {c.avg_actual_dso > c.avg_top_days && (
                      <div
                        className="h-full bg-rose-500 rounded-r-full animate-pulse"
                        style={{ width: `${Math.max(5, dsoPct - topPct)}%` }}
                        title={`Keterlambatan: +${(c.avg_actual_dso - c.avg_top_days).toFixed(1)} Hari`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Narrative */}
      <SmartNarrativeBox
        status={highRiskList.length > 0 ? "warning" : "success"}
        title="Insight Kepatuhan Piutang"
        narrative={narrativeText}
        badges={[
          { label: `Rerata DSO: ${data.overall_avg_dso.toFixed(1)}h`, variant: "default" },
          { label: `${highRiskList.length} Klien Kritis`, variant: highRiskList.length > 0 ? "danger" : "success" }
        ]}
      />
    </div>
  );
}
