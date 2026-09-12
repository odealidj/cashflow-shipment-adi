"use client";

import React from "react";
import { Clock, ArrowRightLeft, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { ChartInfoPopover } from "@/components/shared/ChartInfoPopover";
import { SmartNarrativeBox } from "@/components/shared/SmartNarrativeBox";

interface CashConversionGapCardProps {
  avgCustomerDSO: number;
  avgVendorDPO: number;
  financingGapDays: number;
  loading?: boolean;
}

export function CashConversionGapCard({
  avgCustomerDSO = 0,
  avgVendorDPO = 0,
  financingGapDays = 0,
  loading = false
}: CashConversionGapCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded-md mb-3" />
        <div className="h-28 bg-slate-100 rounded-xl mb-3" />
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  // Visual scaling (max out at 60 days for bar percentage)
  const maxDays = Math.max(60, avgCustomerDSO * 1.2, avgVendorDPO * 1.2);
  const dsoPct = Math.min(100, Math.max(10, (avgCustomerDSO / maxDays) * 100));
  const dpoPct = Math.min(100, Math.max(10, (avgVendorDPO / maxDays) * 100));

  const isGapHigh = financingGapDays > 20;
  const isHealthy = financingGapDays <= 14;

  let narrativeText = "";
  if (isGapHigh) {
    narrativeText = `Financing Gap modal kerja tinggi (${financingGapDays.toFixed(1)} hari). Kas internal harus menalangi biaya vendor selama lebih dari 3 minggu sebelum pelunasan customer diterima. Disarankan memperketat TOP customer atau menegosiasikan perpanjangan tempo vendor.`;
  } else if (financingGapDays > 0) {
    narrativeText = `Financing Gap berada pada rentang wajar (${financingGapDays.toFixed(1)} hari). Customer membayar rata-rata dalam ${avgCustomerDSO.toFixed(1)} hari, sedangkan kewajiban vendor diselesaikan dalam ${avgVendorDPO.toFixed(1)} hari.`;
  } else {
    narrativeText = `Posisi siklus kas ideal (Financing Gap negatif/nol). Uang tagihan dari customer diterima lebih cepat atau setara dengan jadwal pembayaran rekanan vendor, membebaskan kas dari beban talangan.`;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
              Prioritas 6 (P6)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isGapHigh 
                ? "bg-amber-100 text-amber-800 border-amber-200" 
                : "bg-emerald-100 text-emerald-800 border-emerald-200"
            }`}>
              {isGapHigh ? "● Gap Menengah" : "● Gap Terkendali"}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-1.5">
            Gap Siklus Konversi Kas (Cash Conversion Gap)
          </h3>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Selisih hari antara penerimaan uang customer (DSO) vs pembayaran ke rekanan armada (DPO)
          </p>
        </div>

        <ChartInfoPopover
          title="Gap Siklus Konversi Kas (Cash Conversion Cycle / CCC Gap)"
          purpose="Menghitung selisih hari antara berapa lama perusahaan harus menunggu uang masuk dari tagihan customer dibandingkan dengan seberapa cepat perusahaan harus membayar tagihan rekanan vendor armada."
          benefits={[
            "Mengetahui beban modal kerja yang harus ditalangi oleh kas perusahaan setiap putaran order.",
            "Acuan bagi divisi komersial & legal dalam menyelaraskan klausul tempo kontrak baru.",
            "Memperkecil kebutuhan pinjaman bank atau fasilitas anjak piutang (factoring)."
          ]}
          formula="Working Capital Financing Gap = Rerata Hari Pelunasan Customer (DSO) - Rerata Hari Pembayaran Vendor (DPO)"
        />
      </div>

      {/* Main KPI Stat & Comparison Bars */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
        {/* Highlight Gap Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Financing Gap Modal Kerja
              </div>
              <div className="text-xl font-black font-mono text-indigo-950">
                {financingGapDays.toFixed(1)} <span className="text-xs font-bold text-slate-500">Hari</span>
              </div>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium text-right">
            Kas menalangi: <strong className="text-slate-800">~{Math.max(0, Math.round(financingGapDays))} hari</strong> per order
          </span>
        </div>

        {/* Bi-directional comparative visual bars */}
        <div className="space-y-3">
          {/* Customer DSO Bar */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-sky-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                Tempo Terima Customer (DSO Riil)
              </span>
              <span className="font-mono text-sky-800">{avgCustomerDSO.toFixed(1)} Hari</span>
            </div>
            <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-700"
                style={{ width: `${dsoPct}%` }}
              />
            </div>
          </div>

          {/* Vendor DPO Bar */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-amber-800 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Tempo Bayar Vendor (DPO Rata-rata)
              </span>
              <span className="font-mono text-amber-800">{avgVendorDPO.toFixed(1)} Hari</span>
            </div>
            <div className="w-full h-3 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${dpoPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Narrative */}
      <SmartNarrativeBox
        status={isHealthy ? "success" : isGapHigh ? "warning" : "info"}
        title="Insight Modal Kerja"
        narrative={narrativeText}
        badges={[
          { label: `DSO: ${avgCustomerDSO.toFixed(1)}h`, variant: "info" },
          { label: `DPO: ${avgVendorDPO.toFixed(1)}h`, variant: "default" },
          { label: `Gap: ${financingGapDays.toFixed(1)}h`, variant: isGapHigh ? "warning" : "success" }
        ]}
      />
    </div>
  );
}
