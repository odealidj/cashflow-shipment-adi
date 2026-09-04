"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
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
  const [dateFrom, setDateFrom] = useState(defaultDateFrom ?? currentMonth.date_from);
  const [dateTo, setDateTo] = useState(defaultDateTo ?? currentMonth.date_to);

  // Data State
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate 18 Month Dropdown Options (12 months back, current, 5 months forward)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();

    for (let i = -12; i <= 5; i++) {
      const d = new Date(currentY, currentM + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const range = getMonthRange(y, m);
      const isCurrent = y === currentY && m === currentM;

      options.push({
        ...range,
        isCurrent,
        displayLabel: `${MONTH_NAMES[m]} ${y}${isCurrent ? " (Bulan Ini)" : ""}`
      });
    }
    return options.reverse(); // Newest first
  }, []);

  // Determine current active dropdown key
  const currentMonthKey = useMemo(() => {
    if (!dateFrom && !dateTo) return "ALL";
    for (const opt of monthOptions) {
      if (opt.date_from === dateFrom && opt.date_to === dateTo) {
        return opt.monthKey;
      }
    }
    return "CUSTOM";
  }, [dateFrom, dateTo, monthOptions]);

  // Stepper Display Label
  const selectedMonthLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      const fromParts = dateFrom.split("-");
      const toParts = dateTo.split("-");
      if (fromParts.length === 3 && toParts.length === 3 && fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === "01") {
        const y = parseInt(fromParts[0], 10);
        const m = parseInt(fromParts[1], 10) - 1;
        const range = getMonthRange(y, m);
        if (dateTo === range.date_to) {
          return `${MONTH_NAMES[m]} ${y}`;
        }
      }
    }
    if (!dateFrom && !dateTo) return "Semua Periode";
    return "Kustom Tanggal";
  }, [dateFrom, dateTo]);

  // Set default saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setDateFrom(defaultDateFrom ?? currentMonth.date_from);
      setDateTo(defaultDateTo ?? currentMonth.date_to);
    }
  }, [isOpen, defaultDateFrom, defaultDateTo, currentMonth]);

  // Fetch data laporan ketika filter periode berubah
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (dateFrom) query.append("date_from", dateFrom);
        if (dateTo) query.append("date_to", dateTo);
        query.append("sort", "ASC");
        query.append("limit", "1000"); // Ambil seluruh transaksi dalam periode cetak

        const resEntries = await fetchWithAuth(`http://localhost:8080/api/v1/cashflow?${query.toString()}`);
        const dataEntries = await resEntries.json();
        if (!isMounted) return;

        if (dataEntries.status && dataEntries.data) {
          const raw = Array.isArray(dataEntries.data) ? dataEntries.data : (dataEntries.data.entries || []);
          setEntries(raw);
        } else {
          setEntries([]);
        }
      } catch (err) {
        console.error("Gagal memuat data laporan:", err);
        if (isMounted) setEntries([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReportData();

    return () => {
      isMounted = false;
    };
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

  // Handler Pindah Bulan via Dropdown
  const handleMonthDropdownChange = (val: string) => {
    if (val === "ALL") {
      setDateFrom("");
      setDateTo("");
    } else if (val !== "CUSTOM") {
      const [yStr, mStr] = val.split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      const mRange = getMonthRange(y, m);
      setDateFrom(mRange.date_from);
      setDateTo(mRange.date_to);
    }
  };

  // Handler Stepper Bulan Sebelumnya
  const handlePrevMonth = () => {
    let baseYear: number;
    let baseMonth: number;

    if (dateFrom) {
      const parts = dateFrom.split("-");
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1;
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonth = now.getMonth();
    }

    const prevRange = getMonthRange(baseYear, baseMonth - 1);
    setDateFrom(prevRange.date_from);
    setDateTo(prevRange.date_to);
  };

  // Handler Stepper Bulan Berikutnya
  const handleNextMonth = () => {
    let baseYear: number;
    let baseMonth: number;

    if (dateFrom) {
      const parts = dateFrom.split("-");
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1;
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonth = now.getMonth();
    }

    const nextRange = getMonthRange(baseYear, baseMonth + 1);
    setDateFrom(nextRange.date_from);
    setDateTo(nextRange.date_to);
  };

  // Handler Tombol Cepat: Bulan Ini
  const handleCurrentMonthClick = () => {
    const cur = getCurrentMonthRange();
    setDateFrom(cur.date_from);
    setDateTo(cur.date_to);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent print:z-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl overflow-hidden flex flex-col h-[95vh] print:h-auto print:border-none print:shadow-none print:rounded-none">
        
        {/* ======================================================== */}
        {/* 1. HEADER UTAMA (STANDAR DENGAN TOMBOL CLOSE POJOK KANAN) */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-[#17253D] via-[#1E2E48] to-[#25395A] px-6 py-4 text-white flex justify-between items-center shrink-0 border-b border-white/10 print:hidden shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30 shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-black tracking-tight text-white">
                  Cetak Laporan Transaksi Cashflow & Shipment
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                  {entries.length} Transaksi
                </span>
              </div>
              <p className="text-xs text-sky-200/80 font-medium mt-0.5">
                Periode Aktif: <span className="font-bold text-white">{formatActivePeriod(dateFrom, dateTo)}</span> • Format Siap Cetak A4 Landscape & Ekspor Excel
              </p>
            </div>
          </div>

          {/* Tombol Close Standar Pojok Kanan Atas */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-rose-600/90 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. SUB-TOOLBAR: KONTROL FILTER BULAN & AKSI EKSPOR       */}
        {/* ======================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs shadow-2xs">
          
          {/* SISI KIRI: FILTER PERIODE & PILIH BULAN */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-extrabold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-sky-700" />
              Pilih Bulan:
            </span>

            {/* Dropdown 18 Bulan */}
            <select
              value={currentMonthKey}
              onChange={(e) => handleMonthDropdownChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">📅 Semua Periode</option>
              {monthOptions.map((opt) => (
                <option key={opt.monthKey} value={opt.monthKey}>
                  📅 {opt.displayLabel}
                </option>
              ))}
              {currentMonthKey === "CUSTOM" && (
                <option value="CUSTOM">📅 Kustom Rentang Tanggal</option>
              )}
            </select>

            {/* Stepper Bulan (< Bulan >) */}
            <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <button
                onClick={handlePrevMonth}
                title="Bulan Sebelumnya"
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 py-1 font-bold text-slate-700 text-xs whitespace-nowrap min-w-[110px] text-center">
                {selectedMonthLabel}
              </span>
              <button
                onClick={handleNextMonth}
                title="Bulan Berikutnya"
                className="p-1.5 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Tombol Cepat: Bulan Ini */}
            <button
              onClick={handleCurrentMonthClick}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] border transition cursor-pointer shadow-2xs ${
                currentMonthKey === currentMonth.monthKey
                  ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                  : "bg-white hover:bg-sky-50 text-sky-700 border-sky-200"
              }`}
            >
              Bulan Ini
            </button>

            {/* Kustom Rentang Tanggal */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs">
              <span className="text-slate-400 font-medium text-[11px]">Kustom:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              />
              <span className="text-slate-400 text-[11px]">s/d</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* SISI KANAN: FORMAT SWITCHER & TOMBOL AKSI */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Switcher 2 Versi Tampilan Excel */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300 shadow-inner">
              <button
                onClick={() => setReportVersion("separated")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportVersion === "separated"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Format Versi 1: Baris Top-Up Terpisah (Standar Akuntansi)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                <span>1. Top-Up Terpisah</span>
              </button>
              <button
                onClick={() => setReportVersion("rolling")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportVersion === "rolling"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Format Versi 2: Top-Up + Saldo Berjalan (Sesuai File Excel Asli Kantor)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Top-Up + Saldo</span>
              </button>
            </div>

            {/* Tombol Unduh Excel */}
            <button
              onClick={() => handleDownloadExcel(reportVersion)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Unduh format Excel sesuai versi yang aktif"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Excel</span>
            </button>

            {/* Tombol Cetak / PDF */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Cetak Dokumen atau Simpan ke PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
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
              {/* 1. KOP SURAT RESMI (Rata Tengah Sesuai Dokumen DOCX & Excel) */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4 relative">
                <div className="flex items-center justify-between">
                  {/* Logo Perusahaan */}
                  <div className="w-20 h-20 relative shrink-0">
                    <Image
                      src="/logo.png"
                      alt="Logo PT Adijayantara Logistic"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>

                  {/* Teks Kop Surat */}
                  <div className="flex-1 text-center px-4">
                    <h1 className="text-xl font-black text-[#1A365D] tracking-wider uppercase font-sans">
                      PT ADIJAYANTARA LOGISTIC INDONESIA
                    </h1>
                    <p className="text-xs font-bold text-[#4A5568] tracking-wide mt-0.5 font-sans">
                      Freight Forwarding & Logistics Services
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-1 leading-tight font-sans">
                      WISMA SMR JL YOS SUDARSO, Kav. 89 Lantai 9, UNIT 904, Jakarta Utara 14350
                      <span className="mx-2 font-bold text-slate-400">•</span>
                      Email: adijantara.logistic@gmail.com
                    </p>
                  </div>

                  {/* Spacer penyeimbang sisi kanan */}
                  <div className="w-20 h-20 shrink-0 hidden sm:block"></div>
                </div>
              </div>

              {/* 2. SUB-HEADER DOKUMEN & PERIODE */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
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
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-600">
                    PERIODE: <span className="font-black text-slate-900">{formatActivePeriod(dateFrom, dateTo)}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
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
