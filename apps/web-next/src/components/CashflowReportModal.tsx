"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  LayoutGrid, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle
} from "lucide-react";
import { 
  MONTH_NAMES, 
  getMonthRange, 
  getCurrentMonthRange, 
  formatActivePeriod 
} from "./FilterBar";
import { fetchWithAuth } from "@/lib/apiClient";

interface CashflowReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

export function CashflowReportModal({
  isOpen,
  onClose,
  defaultDateFrom,
  defaultDateTo
}: CashflowReportModalProps) {
  // Mode Tampilan: "excel" (Format Excel Asli Dokumen) | "grid" (Format Grid Modern Dashboard)
  const [reportVersion, setReportVersion] = useState<"excel" | "grid">("excel");

  // State Periode
  const currentMonth = useMemo(() => getCurrentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom || currentMonth.date_from);
  const [dateTo, setDateTo] = useState(defaultDateTo || currentMonth.date_to);

  // Month navigation state
  const [selectedYear, setSelectedYear] = useState(currentMonth.year);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(currentMonth.monthIndex);

  // Data State
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Set default saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (defaultDateFrom && defaultDateTo) {
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
        const fromParts = defaultDateFrom.split("-");
        if (fromParts.length === 3) {
          const y = parseInt(fromParts[0], 10);
          const m = parseInt(fromParts[1], 10) - 1;
          const range = getMonthRange(y, m);
          if (range.date_from === defaultDateFrom && range.date_to === defaultDateTo) {
            setSelectedYear(y);
            setSelectedMonthIndex(m);
          }
        }
      }
    }
  }, [isOpen, defaultDateFrom, defaultDateTo]);

  // Fetch data laporan ketika filter periode berubah
  useEffect(() => {
    if (!isOpen) return;

    const fetchReportData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (dateFrom) query.append("date_from", dateFrom);
        if (dateTo) query.append("date_to", dateTo);
        query.append("sort_dir", "ASC");
        query.append("limit", "1000"); // Ambil seluruh transaksi dalam periode cetak

        const resEntries = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow?${query.toString()}`);
        const dataEntries = await resEntries.json();
        if (dataEntries.status && dataEntries.data) {
          setEntries(dataEntries.data.entries || []);
        }
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [isOpen, dateFrom, dateTo]);

  if (!isOpen) return null;

  // Handler Pindah Bulan
  const handleSelectMonth = (year: number, monthIdx: number) => {
    setSelectedYear(year);
    setSelectedMonthIndex(monthIdx);
    const range = getMonthRange(year, monthIdx);
    setDateFrom(range.date_from);
    setDateTo(range.date_to);
  };

  const handlePrevMonth = () => {
    let nextM = selectedMonthIndex - 1;
    let nextY = selectedYear;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    }
    handleSelectMonth(nextY, nextM);
  };

  const handleNextMonth = () => {
    let nextM = selectedMonthIndex + 1;
    let nextY = selectedYear;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    handleSelectMonth(nextY, nextM);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = async () => {
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.append("date_from", dateFrom);
      if (dateTo) query.append("date_to", dateTo);
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow/export?${query.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_Cashflow_${dateFrom || "awal"}_sd_${dateTo || "akhir"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error("Gagal mendownload Excel:", e);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Kalkulasi agregat langsung dari daftar entri
  const totalKredit = entries.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
  const totalDebit = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalGrandCost = entries.reduce((acc, curr) => acc + (curr.grand_cost || 0), 0);
  const totalGrandSelling = entries.reduce((acc, curr) => acc + (curr.grand_selling || 0), 0);
  const totalProfit = entries.reduce((acc, curr) => acc + (curr.profit || 0), 0);
  const avgMargin = totalGrandSelling > 0 ? (totalProfit / totalGrandSelling) * 100 : 0;
  const endingSaldo = entries.length > 0 ? entries[entries.length - 1].saldo : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl overflow-hidden flex flex-col h-[95vh]">
        
        {/* ======================================================== */}
        {/* TOOLBAR MODAL ATAS (SCREEN ONLY - TIDAK TERCETAK)        */}
        {/* ======================================================== */}
        <div className="bg-[#223249] p-4 text-white flex flex-wrap justify-between items-center gap-3 shrink-0 print:hidden shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide flex items-center gap-2">
                Cetak Laporan Transaksi Cashflow & Shipment
              </h2>
              <p className="text-[11px] text-sky-200/80 font-medium">
                Periode: <span className="font-bold text-white">{formatActivePeriod(dateFrom, dateTo)}</span> ({entries.length} Transaksi)
              </p>
            </div>
          </div>

          {/* Switcher Versi Tampilan */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setReportVersion("excel")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportVersion === "excel"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>1. Versi Excel Asli Dokumen</span>
            </button>
            <button
              onClick={() => setReportVersion("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportVersion === "grid"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>2. Versi Modern Grid Table</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Unduh File Excel Asli"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .XLSX</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BAR KONTROL FILTER PERIODE (SCREEN ONLY)                 */}
        {/* ======================================================== */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs">
          {/* Quick Month Selector */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-700" />
              Pilih Bulan:
            </span>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <button
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-slate-800 text-xs whitespace-nowrap">
                {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
              </span>
              <button
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => handleSelectMonth(currentMonth.year, currentMonth.monthIndex)}
              className="px-2.5 py-1 rounded-lg bg-sky-100/70 hover:bg-sky-100 text-sky-800 font-bold text-[11px] border border-sky-200 transition cursor-pointer"
            >
              Bulan Berjalan
            </button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Kustom Tanggal:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* AREA DOKUMEN CETAK (PRINT PAPER VIEW)                    */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto soft-scrollbar p-6 lg:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
              <p className="mt-2 text-xs font-semibold">Mengambil data transaksi laporan...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-24 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs max-w-lg mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700">Tidak ada transaksi pada periode ini.</p>
              <p className="text-xs text-slate-500 mt-1">Silakan pilih bulan lain atau ubah rentang tanggal.</p>
            </div>
          ) : reportVersion === "excel" ? (
            
            /* ==================================================== */
            /* VERSI 1: FORMAT EXCEL ASLI (CASHFLOW SHIPMENT CONTROL)*/
            /* ==================================================== */
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 mx-auto max-w-[1300px]">
              {/* Header Dokumen Excel */}
              <div className="border-b-2 border-slate-800 pb-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 font-mono">
                      PT ADIJAYANTARA LOGISTIC INDONESIA
                    </h1>
                    <div className="inline-block bg-emerald-700 text-white text-xs font-black px-3 py-1 rounded mt-1 font-mono tracking-wider uppercase">
                      CASHFLOW SHIPMENT CONTROL
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-600">
                      PERIODE: <span className="font-black text-slate-900">{formatActivePeriod(dateFrom, dateTo)}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Excel Asli 14 Kolom */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse border border-slate-400">
                  <thead>
                    <tr className="bg-[#E2EFDA] text-[#276A3C] font-black uppercase text-center border-b border-slate-400">
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right">KREDIT</th>
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right">DEBIT</th>
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right bg-[#C6E0B4]">SALDO</th>
                      <th className="border border-slate-400 px-2 py-2 w-24">DATE OF DEBIT</th>
                      <th className="border border-slate-400 px-2 py-2 min-w-[180px]">ACT INFORMATION</th>
                      <th className="border border-slate-400 px-2 py-2 min-w-[160px]">ACT EXPLAINATION</th>
                      <th className="border border-slate-400 px-2 py-2 min-w-[130px]">VENDOR</th>
                      <th className="border border-slate-400 px-2 py-2 w-16">T O P</th>
                      <th className="border border-slate-400 px-2 py-2 w-24">DUE DATE</th>
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right">GRAND COST</th>
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right">GRAND SELLING</th>
                      <th className="border border-slate-400 px-2 py-2 w-24 text-right">PROFIT</th>
                      <th className="border border-slate-400 px-2 py-2 w-20 text-center">MARGIN %</th>
                      <th className="border border-slate-400 px-2 py-2 w-20 text-center">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-mono text-slate-800">
                    {entries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-slate-50 transition-colors">
                        {/* Kredit */}
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-emerald-800">
                          {entry.kredit > 0 ? formatCurrency(entry.kredit) : "-"}
                        </td>
                        {/* Debit */}
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-rose-800">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </td>
                        {/* Saldo */}
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-black bg-slate-50 text-slate-900">
                          {formatCurrency(entry.saldo)}
                        </td>
                        {/* Date of Debit */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-sans">
                          {formatDate(entry.date_of_entry)}
                        </td>
                        {/* Act Information */}
                        <td className="border border-slate-300 px-2 py-1.5 font-sans font-bold text-slate-900">
                          {entry.act_information || "-"}
                        </td>
                        {/* Act Explaination */}
                        <td className="border border-slate-300 px-2 py-1.5 font-sans text-slate-600">
                          {entry.act_explaination || "-"}
                        </td>
                        {/* Vendor */}
                        <td className="border border-slate-300 px-2 py-1.5 font-sans font-semibold text-slate-900">
                          {entry.vendor_name_raw || "-"}
                        </td>
                        {/* TOP */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-sans">
                          {entry.top_days ? `${entry.top_days} HARI` : "-"}
                        </td>
                        {/* Due Date */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-sans text-amber-800 font-semibold">
                          {formatDate(entry.due_date)}
                        </td>
                        {/* Grand Cost */}
                        <td className="border border-slate-300 px-2 py-1.5 text-right">
                          {entry.grand_cost > 0 ? formatCurrency(entry.grand_cost) : "-"}
                        </td>
                        {/* Grand Selling */}
                        <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-slate-900">
                          {entry.grand_selling > 0 ? formatCurrency(entry.grand_selling) : "-"}
                        </td>
                        {/* Profit */}
                        <td className={`border border-slate-300 px-2 py-1.5 text-right font-bold ${
                          entry.profit >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}>
                          {entry.entry_type === "SHIPMENT" ? formatCurrency(entry.profit) : "-"}
                        </td>
                        {/* Margin */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                          {entry.entry_type === "SHIPMENT" ? `${(entry.margin_pct * 100).toFixed(1)}%` : "-"}
                        </td>
                        {/* Remarks */}
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-sans font-bold text-[10px]">
                          {entry.remarks || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Total Akumulasi Excel */}
                  <tfoot>
                    <tr className="bg-[#F2F2F2] font-black font-mono text-slate-900 border-t-2 border-slate-500">
                      <td className="border border-slate-400 px-2 py-2 text-right text-emerald-800">
                        {formatCurrency(totalKredit)}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right text-rose-800">
                        {formatCurrency(totalDebit)}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right bg-[#C6E0B4]">
                        {formatCurrency(endingSaldo)}
                      </td>
                      <td colSpan={6} className="border border-slate-400 px-2 py-2 text-center font-sans text-xs uppercase tracking-wider">
                        TOTAL AKUMULASI PERIODE LAPORAN
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right">
                        {formatCurrency(totalGrandCost)}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right">
                        {formatCurrency(totalGrandSelling)}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-right text-emerald-800">
                        {formatCurrency(totalProfit)}
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-center">
                        {avgMargin.toFixed(1)}%
                      </td>
                      <td className="border border-slate-400 px-2 py-2 text-center text-slate-500">
                        -
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tanda Tangan & Verifikasi Pembukuan */}
              <div className="grid grid-cols-3 gap-8 mt-10 text-center text-xs font-sans">
                <div>
                  <p className="text-slate-500">Dibuat Oleh:</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">Staff Administrasi Kas</p>
                </div>
                <div>
                  <p className="text-slate-500">Diperiksa Oleh:</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">Finance & Accounting</p>
                </div>
                <div>
                  <p className="text-slate-500">Disetujui Oleh:</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">Direktur Operasional</p>
                </div>
              </div>
            </div>

          ) : (

            /* ==================================================== */
            /* VERSI 2: FORMAT GRID MODERN APLIKASI (DASHBOARD STYLE)*/
            /* ==================================================== */
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 mx-auto max-w-[1250px] space-y-6">
              {/* Header Modern dengan Logo & Ringkasan */}
              <div className="border-b border-slate-200 pb-5 flex flex-wrap justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-900 text-white flex items-center justify-center font-black text-sm">
                      AJ
                    </div>
                    <div>
                      <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        PT ADIJAYANTARA LOGISTIC INDONESIA
                      </h1>
                      <p className="text-xs font-bold text-sky-700">Laporan Rekapitulasi Transaksi Cashflow & Shipment</p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block bg-sky-100 text-sky-900 text-xs font-black px-3 py-1 rounded-lg border border-sky-200">
                    PERIODE: {formatActivePeriod(dateFrom, dateTo)}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    Total: {entries.length} Transaksi Tercatat
                  </p>
                </div>
              </div>

              {/* Strip KPI Ringkasan Cepat */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Kas Masuk</span>
                  <span className="text-sm font-black font-mono text-emerald-800 mt-0.5 block">
                    + {formatCurrency(totalKredit)}
                  </span>
                </div>
                <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Kas Keluar</span>
                  <span className="text-sm font-black font-mono text-rose-800 mt-0.5 block">
                    - {formatCurrency(totalDebit)}
                  </span>
                </div>
                <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-sky-700 block">Total Estimasi Profit</span>
                  <span className="text-sm font-black font-mono text-sky-900 mt-0.5 block">
                    {formatCurrency(totalProfit)} ({avgMargin.toFixed(1)}%)
                  </span>
                </div>
                <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Saldo Kas Akhir</span>
                  <span className="text-sm font-black font-mono text-slate-900 mt-0.5 block">
                    {formatCurrency(endingSaldo)}
                  </span>
                </div>
              </div>

              {/* Grid Modern Table */}
              <div className="rounded-2xl border border-sky-200/80 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#EBF3FA] text-[#223249] border-b border-sky-200/70 uppercase text-[11px] font-black tracking-wider">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">No</th>
                      <th className="py-3 px-3">Tanggal</th>
                      <th className="py-3 px-3 min-w-[200px]">Vendor & Aktivitas</th>
                      <th className="py-3 px-3 text-right">Penjualan & Biaya</th>
                      <th className="py-3 px-3 text-right">Profit & Margin</th>
                      <th className="py-3 px-3 text-center">T.O.P / Due</th>
                      <th className="py-3 px-3 text-right">Arus Kas</th>
                      <th className="py-3 px-3 text-right bg-sky-100/50">Rolling Saldo</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {entries.map((entry, idx) => {
                      const isShipment = entry.entry_type === "SHIPMENT";
                      return (
                        <tr key={entry.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                            {formatDate(entry.date_of_entry)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                isShipment ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {entry.entry_type}
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]">
                                {entry.vendor_name_raw || "-"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                              {entry.act_information || "-"}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                            {isShipment ? (
                              <div>
                                <div className="font-bold text-slate-800 text-xs">{formatCurrency(entry.grand_selling)}</div>
                                <div className="text-[10px] text-slate-400">HPP: {formatCurrency(entry.grand_cost)}</div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                            {isShipment ? (
                              <div>
                                <div className={`font-bold text-xs ${entry.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                  {formatCurrency(entry.profit)}
                                </div>
                                <div className="text-[10px] text-slate-500">{(entry.margin_pct * 100).toFixed(1)}%</div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {entry.top_days ? (
                              <div>
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                                  {entry.top_days} H
                                </span>
                                <div className="text-[10px] text-amber-700 font-bold mt-0.5">{formatDate(entry.due_date)}</div>
                              </div>
                            ) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                            {entry.debit > 0 ? (
                              <span className="text-rose-600 font-bold">- {formatCurrency(entry.debit)}</span>
                            ) : entry.kredit > 0 ? (
                              <span className="text-emerald-700 font-bold">+ {formatCurrency(entry.kredit)}</span>
                            ) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-sky-50/40">
                            {formatCurrency(entry.saldo)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.remarks === "PAID" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : entry.remarks === "PENDING"
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {entry.remarks === "PAID" ? "Lunas" : entry.remarks === "PENDING" ? "Sebagian" : "Belum Lunas"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs font-sans">
                <div>
                  <p className="text-slate-500">Dibuat Oleh:</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">Finance Administrasi</p>
                </div>
                <div>
                  <p className="text-slate-500">Mengetahui & Menyetujui:</p>
                  <div className="h-14"></div>
                  <p className="font-bold text-slate-900 border-t border-slate-300 pt-1">Pimpinan / Direksi</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
