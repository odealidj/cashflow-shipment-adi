"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Tv, 
  X, 
  Maximize2, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Compass, 
  Truck, 
  Users, 
  PieChart, 
  ArrowRightLeft,
  Calendar,
  AlertTriangle,
  FileText
} from "lucide-react";
import { CashflowRunwayChart, CashflowRunwayData } from "./CashflowRunwayChart";
import { CashConversionGapCard } from "./CashConversionGapCard";
import { RouteBCGMatrixChart, RouteMatrixData } from "./RouteBCGMatrixChart";
import { VendorEfficiencyChart, VendorEfficiencyData } from "./VendorEfficiencyChart";
import { CustomerDsoDisciplineChart, CustomerDisciplineData } from "./CustomerDsoDisciplineChart";
import { CustomerParetoChart } from "./CustomerParetoChart";

export type FocusedChartType = "runway" | "gap" | "bcg" | "vendor" | "dso" | "pareto" | null;

interface StrategicIntelligenceDashboardProps {
  runwayData: CashflowRunwayData | null;
  routeMatrixData: RouteMatrixData | null;
  vendorEfficiencyData: VendorEfficiencyData | null;
  customerDisciplineData: CustomerDisciplineData | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function StrategicIntelligenceDashboard({
  runwayData,
  routeMatrixData,
  vendorEfficiencyData,
  customerDisciplineData,
  loading = false,
  onRefresh
}: StrategicIntelligenceDashboardProps) {
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [focusedChart, setFocusedChart] = useState<FocusedChartType>(null);

  const enterPresentation = () => {
    setIsPresentationMode(true);
    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const exitPresentation = () => {
    setIsPresentationMode(false);
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (focusedChart) {
          setFocusedChart(null);
        } else if (isPresentationMode) {
          exitPresentation();
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPresentationMode, focusedChart]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className={isPresentationMode 
      ? "fixed inset-0 z-50 bg-[#090f1e] text-slate-100 overflow-y-auto p-4 sm:p-8 space-y-6 soft-scrollbar animate-in fade-in duration-200" 
      : "space-y-4"
    }>
      {/* 1. Mode Rapat (Boardroom Presentation Top Banner) */}
      {isPresentationMode && (
        <div className="bg-[#121c32] border border-slate-700/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Mode Presentasi Rapat (Boardroom TV)
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Intelijen Bisnis & Portofolio</span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                Evaluasi 6 Matriks Keputusan Strategis Dewan Direksi
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Likuiditas Kas • Matriks Rute BCG • Ketergantungan Vendor • Disiplin DSO • Konsentrasi Pareto 80/20
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-time Multi-Model Intelligence</span>
            </div>

            <button
              type="button"
              onClick={exitPresentation}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/50 shadow-sm transition-all cursor-pointer"
              title="Keluar dari Mode Presentasi (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Keluar (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Header Card (Match TREN MAKRO EKSEKUTIF Style & Font Size) */}
      {!isPresentationMode && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 py-2 sm:px-5 sm:py-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Sisi Kiri: Identitas Intelijen Strategis */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-amber-200/80">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    INTELIJEN STRATEGIS EKSEKUTIF
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200/60">
                    6 Grafik Keputusan
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
                    Intelijen Bisnis: Likuiditas, Koridor Rute & Portofolio Pelanggan
                  </h2>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Button Mode Rapat */}
            <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
              <button
                type="button"
                onClick={enterPresentation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                title="Tampilkan dalam Mode Presentasi Rapat (Layar Penuh TV)"
              >
                <Tv className="w-3.5 h-3.5 text-amber-700 group-hover:scale-110 transition-transform" />
                <span>Mode Rapat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Grid 3 Zona Analitik Intelijen */}
      <div className="space-y-4">
        {/* Zona 1: Likuiditas & Ketahanan Modal Kerja (P1 & P6) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-sky-600 rounded-full" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${
              isPresentationMode ? "text-sky-400" : "text-slate-800"
            }`}>
              Zona 1: Likuiditas & Ketahanan Modal Kerja (Early Warning System)
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
            <div className="lg:col-span-2">
              <CashflowRunwayChart 
                data={runwayData} 
                loading={loading}
                onMaximize={() => setFocusedChart("runway")}
                isPresentationMode={isPresentationMode}
              />
            </div>
            <div className="lg:col-span-1">
              <CashConversionGapCard
                avgCustomerDSO={runwayData?.avg_customer_dso || 0}
                avgVendorDPO={runwayData?.avg_vendor_dpo || 0}
                financingGapDays={runwayData?.financing_gap_days || 0}
                loading={loading}
                onMaximize={() => setFocusedChart("gap")}
                isPresentationMode={isPresentationMode}
              />
            </div>
          </div>
        </div>

        {/* Zona 2: Profitabilitas Koridor & Armada Rekanan (P2 & P4) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-emerald-600 rounded-full" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${
              isPresentationMode ? "text-emerald-400" : "text-slate-800"
            }`}>
              Zona 2: Profitabilitas Koridor Rute & Efisiensi Rekanan Vendor
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
            <RouteBCGMatrixChart 
              data={routeMatrixData} 
              loading={loading}
              onMaximize={() => setFocusedChart("bcg")}
              isPresentationMode={isPresentationMode}
            />
            <VendorEfficiencyChart 
              data={vendorEfficiencyData} 
              loading={loading}
              onMaximize={() => setFocusedChart("vendor")}
              isPresentationMode={isPresentationMode}
            />
          </div>
        </div>

        {/* Zona 3: Portofolio & Kualitas Pelanggan (P3 & P5) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-indigo-600 rounded-full" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${
              isPresentationMode ? "text-indigo-400" : "text-slate-800"
            }`}>
              Zona 3: Portofolio Pelanggan, Disiplin DSO & Deteksi Churn
            </h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
            <CustomerDsoDisciplineChart 
              data={customerDisciplineData} 
              loading={loading}
              onMaximize={() => setFocusedChart("dso")}
              isPresentationMode={isPresentationMode}
            />
            <CustomerParetoChart 
              data={customerDisciplineData} 
              loading={loading}
              onMaximize={() => setFocusedChart("pareto")}
              isPresentationMode={isPresentationMode}
            />
          </div>
        </div>
      </div>

      {/* 4. Interactive Focus Modal (Max per Grafik) */}
      {focusedChart && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121c32] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-5 text-slate-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-indigo-200 dark:border-indigo-800">
                  {focusedChart === "runway" && <DollarSign className="w-5 h-5" />}
                  {focusedChart === "gap" && <ArrowRightLeft className="w-5 h-5" />}
                  {focusedChart === "bcg" && <Compass className="w-5 h-5" />}
                  {focusedChart === "vendor" && <Truck className="w-5 h-5" />}
                  {focusedChart === "dso" && <Users className="w-5 h-5" />}
                  {focusedChart === "pareto" && <PieChart className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Fokus Grafik Eksekutif
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">• PT Adijayantara Logistic</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                    {focusedChart === "runway" && "Proyeksi Arus Kas 30–60 Hari ke Depan (Cashflow Runway)"}
                    {focusedChart === "gap" && "Gap Siklus Konversi Kas (Cash Conversion Gap)"}
                    {focusedChart === "bcg" && "Matriks Kuadran Profitabilitas Rute (Logistics BCG Matrix)"}
                    {focusedChart === "vendor" && "Analisis Efisiensi & Ketergantungan Rekanan Vendor"}
                    {focusedChart === "dso" && "Skor Kepatuhan Tempo & DSO per Customer"}
                    {focusedChart === "pareto" && "Konsentrasi Portofolio Pelanggan (Pareto 80/20 & Churn Warning)"}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFocusedChart(null)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all cursor-pointer shrink-0"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Render enlarged specific chart */}
            <div className="space-y-4">
              {focusedChart === "runway" && (
                <div className="space-y-4">
                  <CashflowRunwayChart data={runwayData} loading={loading} isPresentationMode={false} />
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs space-y-2">
                    <div className="font-black text-sky-950 dark:text-sky-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-sky-600" />
                      <span>Rekomendasi Tindakan Likuiditas (Finance Board)</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li>Pertahankan buffer likuiditas minimum setara 14 hari rata-rata pengeluaran operasional ritase.</li>
                      <li>Prioritaskan penagihan piutang dari customer dengan invoice mendekati jatuh tempo sebelum tanggal titik terendah kas.</li>
                      <li>Gunakan proyeksi inflow mingguan untuk menyusun batch jadwal pelunasan hutang rekanan vendor.</li>
                    </ul>
                  </div>
                </div>
              )}

              {focusedChart === "gap" && (
                <div className="space-y-4">
                  <CashConversionGapCard 
                    avgCustomerDSO={runwayData?.avg_customer_dso || 0}
                    avgVendorDPO={runwayData?.avg_vendor_dpo || 0}
                    financingGapDays={runwayData?.financing_gap_days || 0}
                    loading={loading}
                    isPresentationMode={false}
                  />
                  <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2">
                    <div className="font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Strategi Penyelarasan Klausul Tempo Kontrak</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li>Perpendek batas TOP bagi customer baru maksimal 14 hari untuk menekan beban modal talangan internal.</li>
                      <li>Negosiasikan fasilitas TOP 30 hari ke rekanan armada utama yang memiliki volume order rutin.</li>
                      <li>Setiap penambahan margin rute harus memperhitungkan biaya modal (cost of capital) dari financing gap.</li>
                    </ul>
                  </div>
                </div>
              )}

              {focusedChart === "bcg" && (
                <div className="space-y-4">
                  <RouteBCGMatrixChart data={routeMatrixData} loading={loading} isPresentationMode={false} />
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
                    <div className="font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      <span>Rencana Aksi Portofolio Koridor Pengiriman</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li><strong>Rute Bintang (Stars):</strong> Alokasikan unit armada terandal dan berikan kepastian jadwal pengiriman.</li>
                      <li><strong>Rute Potensial (Opportunities):</strong> Berikan insentif komisi sales untuk meningkatkan volume muatan balik (backload).</li>
                      <li><strong>Rute Evaluasi (Evaluate):</strong> Lakukan penyesuaian tarif jual minimal +8% atau ganti jenis rekanan vendor untuk menekan HPP.</li>
                    </ul>
                  </div>
                </div>
              )}

              {focusedChart === "vendor" && (
                <div className="space-y-4">
                  <VendorEfficiencyChart data={vendorEfficiencyData} loading={loading} isPresentationMode={false} />
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
                    <div className="font-black text-amber-950 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>Kebijakan Pengadaan & Mitigasi Monopoli Armada</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li>Batasi porsi konsentrasi maksimal satu rekanan vendor di bawah 35% untuk menjaga fleksibilitas operasional.</li>
                      <li>Gunakan data volume ritase tahunan untuk mendapatkan tarif kontrak jangka panjang (*rebate*) dari vendor besar.</li>
                      <li>Bangun kemitraan dengan 2-3 vendor lapis kedua (*tier-2*) untuk antisipasi lonjakan muatan *peak season*.</li>
                    </ul>
                  </div>
                </div>
              )}

              {focusedChart === "dso" && (
                <div className="space-y-4">
                  <CustomerDsoDisciplineChart data={customerDisciplineData} loading={loading} isPresentationMode={false} />
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs space-y-2">
                    <div className="font-black text-blue-950 dark:text-blue-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Manajemen Kredit Piutang & Kebijakan Koleksi</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li>Terapkan klausul penahanan order baru (*credit hold*) bagi customer dengan status High Risk atau keterlambatan &gt; 15 hari.</li>
                      <li>Berikan apresiasi perpanjangan plafon bagi customer kategori Prime yang disiplin melunasi sebelum jatuh tempo.</li>
                      <li>Gunakan sistem notifikasi otomatis H-3 sebelum invoice jatuh tempo untuk memperlancar proses administrasi finance klien.</li>
                    </ul>
                  </div>
                </div>
              )}

              {focusedChart === "pareto" && (
                <div className="space-y-4">
                  <CustomerParetoChart data={customerDisciplineData} loading={loading} isPresentationMode={false} />
                  <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs space-y-2">
                    <div className="font-black text-purple-950 dark:text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <PieChart className="w-4 h-4 text-purple-600" />
                      <span>Program Retensi Klien & Diversifikasi Portofolio</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 font-medium">
                      <li>Segera lakukan kunjungan evaluasi berkala bagi klien yang terdeteksi *Churn Warning* (penurunan order &gt; 40%).</li>
                      <li>Gencarkan akuisisi klien di industri FMCG dan manufaktur untuk menyeimbangkan konsentrasi 80% omset.</li>
                      <li>Bentuk tim *key account manager* khusus untuk mendampingi 5 pelanggan korporat terbesar perusahaan.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setFocusedChart(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                Tutup Tampilan Fokus (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
