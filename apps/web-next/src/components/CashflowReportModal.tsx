"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Printer, 
  Download, 
  FileSpreadsheet, 
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
  // Mode Tampilan: "separated" (Versi 1: Kolom Top-Up Terpisah) | "rolling" (Versi 2: Kolom Top-Up + Saldo Sebelumnya)
  const [reportVersion, setReportVersion] = useState<"separated" | "rolling">("separated");

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
          setEntries(Array.isArray(dataEntries.data) ? dataEntries.data : (dataEntries.data.entries || []));
        }
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [isOpen, dateFrom, dateTo]);

  // Transformasi Data Khusus Tab 2 (Versi Dokumen Asli Kantor - Top-Up + Saldo Sebelumnya):
  // Persis baris 7 & 8 di file CASHFLOW SHIPMENT CONTROL.xlsx:
  // Row 7: Kredit = TopUp (100jt), Debit = 28.15jt, Saldo = 71.85jt
  // Row 8: Kredit = Saldo Sebelumnya (71.85jt) + TopUp baru jika ada, Debit = 7.5jt, Saldo = 64.35jt
  const rollingMergedEntries = useMemo(() => {
    const result: any[] = [];
    let previousSaldo: number | null = null;
    let pendingTopUp = 0;

    for (const entry of entries) {
      if (entry.entry_type === "TOP_UP") {
        pendingTopUp += (entry.kredit || 0);
        if (previousSaldo === null) {
          previousSaldo = (entry.saldo || 0) - (entry.kredit || 0);
        }
        continue;
      }

      // Entri SHIPMENT
      let kreditCell: number;
      if (previousSaldo === null) {
        kreditCell = (entry.saldo || 0) + (entry.debit || 0);
      } else {
        kreditCell = previousSaldo + pendingTopUp;
      }
      pendingTopUp = 0;
      const saldoCell = kreditCell - (entry.debit || 0);
      previousSaldo = saldoCell;

      result.push({
        ...entry,
        kredit: kreditCell,
        saldo: saldoCell,
        hasMergedTopUp: kreditCell > 0,
      });
    }

    // Jika ada sisa Top-Up di akhir tanpa shipment lanjutan
    if (pendingTopUp > 0) {
      const base = previousSaldo !== null ? previousSaldo : 0;
      const kreditCell = base + pendingTopUp;
      const lastDate = entries.length > 0 ? entries[entries.length - 1].date_of_entry : new Date().toISOString();
      result.push({
        id: "merged-tail-topup",
        entry_type: "TOP_UP",
        kredit: kreditCell,
        debit: 0,
        saldo: kreditCell,
        date_of_entry: lastDate,
        act_information: "Top-Up Modal Kas",
        act_explaination: "Dana modal tersedia",
        vendor_name_raw: "-",
        top_days: 0,
        due_date: null,
        grand_cost: 0,
        grand_selling: 0,
        profit: 0,
        margin_pct: 0,
        remarks: "PAID"
      });
    }

    return result;
  }, [entries]);

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

  const handleDownloadExcel = async (formatOverride?: "separated" | "rolling") => {
    const activeFormat = formatOverride || reportVersion;
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.append("date_from", dateFrom);
      if (dateTo) query.append("date_to", dateTo);
      query.append("format", activeFormat);

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow/export?${query.toString()}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const formatLabel = activeFormat === "rolling" 
        ? "Versi2_TopUp_Plus_Saldo_Asli" 
        : "Versi1_TopUp_Terpisah";
      a.download = `Laporan_Cashflow_${formatLabel}_${dateFrom || "awal"}_sd_${dateTo || "akhir"}.xlsx`;
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
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

          {/* Switcher 2 Versi Tampilan Excel Dokumen */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => setReportVersion("separated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportVersion === "separated"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>1. Excel (Top-Up Terpisah)</span>
            </button>
            <button
              onClick={() => setReportVersion("rolling")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                reportVersion === "rolling"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>2. Excel (Top-Up + Saldo Sebelumnya)</span>
            </button>
          </div>

          {/* Action Buttons: Unduh 2 Versi & Print */}
          <div className="flex items-center gap-2">
            {/* Tombol Unduh Versi 1: Top-Up Terpisah */}
            <button
              onClick={() => handleDownloadExcel("separated")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                reportVersion === "separated"
                  ? "bg-sky-500 text-white border-sky-400 shadow-xs"
                  : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40"
              }`}
              title="Unduh format Excel Versi 1: Top-Up di baris tersendiri (Standar Akuntansi)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh V1 (Top-Up Terpisah)</span>
            </button>

            {/* Tombol Unduh Versi 2: Top-Up + Saldo Sebelumnya */}
            <button
              onClick={() => handleDownloadExcel("rolling")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                reportVersion === "rolling"
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-xs"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
              }`}
              title="Unduh format Excel Versi 2: Top-Up + Saldo Sebelumnya (Persis Asli Kantor)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh V2 (Top-Up + Saldo)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Cetak Dokumen atau Simpan ke PDF"
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
          ) : (
            
            /* ==================================================== */
            /* TAMPILAN PRATINJAU CETAK DOKUMEN RESMI EXCEL         */
            /* ==================================================== */
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 mx-auto max-w-[1300px]">
              {/* Header Dokumen Excel */}
              <div className="border-b-2 border-slate-800 pb-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 font-mono">
                      PT ADIJAYANTARA LOGISTIC INDONESIA
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="inline-block bg-emerald-700 text-white text-xs font-black px-3 py-1 rounded font-mono tracking-wider uppercase">
                        CASHFLOW SHIPMENT CONTROL
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                        reportVersion === "separated"
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}>
                        {reportVersion === "separated"
                          ? "Versi 1: Kolom Top-Up Terpisah"
                          : "Versi 2: Top-Up + Saldo Sebelumnya"}
                      </span>
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
                      <th className="border border-slate-400 px-2 py-2 w-28 text-right">
                        {reportVersion === "rolling" ? "TOPUP+SALDO" : "KREDIT"}
                      </th>
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
                    {(reportVersion === "rolling" ? rollingMergedEntries : entries).map((entry, idx) => (
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
          )}

        </div>
      </div>
    </div>
  );
}
