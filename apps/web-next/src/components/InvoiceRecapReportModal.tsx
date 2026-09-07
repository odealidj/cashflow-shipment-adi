"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  X, 
  Printer, 
  RotateCcw, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText,
  Building,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { 
  MONTH_NAMES, 
  getMonthRange, 
  getCurrentMonthRange, 
  formatActivePeriod 
} from "./FilterBar";
import { fetchWithAuth } from "@/lib/apiClient";

interface InvoiceRecapReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  defaultStatusFilter?: string;
}

export function InvoiceRecapReportModal({
  isOpen,
  onClose,
  defaultDateFrom = "",
  defaultDateTo = "",
  defaultStatusFilter = "ALL"
}: InvoiceRecapReportModalProps) {
  // Filter States
  const currentMonth = useMemo(() => getCurrentMonthRange(), []);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [searchQuery, setSearchQuery] = useState("");

  // Data States
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // 18 Month Dropdown Options
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
    return options;
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

  // Sync with default props whenever modal opens and set PDF export title
  useEffect(() => {
    if (isOpen) {
      setDateFrom(defaultDateFrom);
      setDateTo(defaultDateTo);
      setStatusFilter(defaultStatusFilter);
      setSearchQuery("");

      const originalTitle = document.title;
      document.title = "Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic";

      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, defaultDateFrom, defaultDateTo, defaultStatusFilter]);

  // Fetch full invoices data (limit=1000 to include all transactions without pagination cutoff)
  const fetchReportData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("client_name", searchQuery.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("sort_dir", "ASC");
      params.set("page", "1");
      params.set("limit", "1000");

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.status && data.data) {
        const rawEntries = Array.isArray(data.data) ? data.data : (data.data.entries || []);
        setInvoices(rawEntries);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data invoice untuk rekapitulasi:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [isOpen, dateFrom, dateTo, statusFilter, searchQuery]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  if (!isOpen) return null;

  // Format currency IDR
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Format date Indonesia (e.g. 01 Agustus 2026)
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format TOP terms
  const formatTopTerms = (inv: any) => {
    if (inv.top_terms && typeof inv.top_terms === "string" && inv.top_terms.trim() !== "") {
      return inv.top_terms;
    }
    if (inv.top_days === 0) {
      return "COD (Cash on Delivery)";
    }
    if (inv.top_days) {
      return `Net ${inv.top_days} Hari`;
    }
    return "-";
  };

  // Aggregates for 4 summary cards matching DOCX
  const totalAmount = invoices.reduce((acc, curr) => acc + (curr.amount ?? curr.total_amount ?? 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "PAID");
  const paidAmount = paidInvoices.reduce((acc, curr) => acc + (curr.amount ?? curr.total_amount ?? 0), 0);
  const unpaidInvoices = invoices.filter(i => i.status === "UNPAID");
  const unpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + (curr.amount ?? curr.total_amount ?? 0), 0);
  const overdueInvoices = invoices.filter(i => i.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce((acc, curr) => acc + (curr.amount ?? curr.total_amount ?? 0), 0);

  // Status Filter label for Meta Box
  const getStatusFilterLabel = () => {
    switch (statusFilter) {
      case "PAID": return "Lunas";
      case "UNPAID": return "Menunggu Pembayaran";
      case "OVERDUE": return "Jatuh Tempo (Overdue)";
      default: return "Aktif / Berjalan (Semua Status)";
    }
  };

  // Periode label
  const activePeriodLabel = formatActivePeriod(dateFrom, dateTo);
  const printDateLabel = formatDateIndo(new Date().toISOString());

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic";

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();

    // Fallback jika afterprint tidak tertrigger
    setTimeout(() => {
      if (document.title === "Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic") {
        document.title = originalTitle;
      }
    }, 3000);
  };

  // Unduh PDF langsung tanpa ketergantungan setelan header/footer browser
  const handleDownloadPdf = async () => {
    const element = document.getElementById("recap-report-printable");
    if (!element) return;

    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = 297; // Lebar A4 landscape (mm)
      const pdfHeight = 210; // Tinggi A4 landscape (mm)
      const marginX = 12; // Margin kiri dan kanan (mm)
      const marginTop = 12; // Margin atas (mm)
      const usableWidth = pdfWidth - marginX * 2;
      const usableHeight = pdfHeight - marginTop - 16;

      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      if (imgHeight <= usableHeight) {
        // 1 Halaman Saja (99% data rekap bulanan)
        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", marginX, marginTop, imgWidth, imgHeight);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(74, 85, 104);
        pdf.text("1", pdfWidth / 2, 202, { align: "center" });
      } else {
        // Multi Halaman
        let remainingHeight = canvas.height;
        let sourceY = 0;
        let pageNum = 1;
        const pageCanvasHeight = (usableHeight * canvas.width) / usableWidth;

        while (remainingHeight > 0) {
          const sliceHeight = Math.min(remainingHeight, pageCanvasHeight);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );
          }

          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.98);
          const renderedSliceHeight = (sliceHeight * usableWidth) / canvas.width;

          if (pageNum > 1) {
            pdf.addPage();
          }

          pdf.addImage(pageImgData, "JPEG", marginX, marginTop, usableWidth, renderedSliceHeight);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(74, 85, 104);
          pdf.text(`${pageNum}`, pdfWidth / 2, 202, { align: "center" });

          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;
          pageNum++;
        }
      }

      pdf.save("Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic.pdf");
    } catch (err) {
      console.error("Gagal mengekspor PDF langsung:", err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  // Unduh data rekapitulasi ke format spreadsheet Excel (.xlsx) via backend API (sama persis dengan CashflowReportModal)
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.append("date_from", dateFrom);
      if (dateTo) query.append("date_to", dateTo);
      if (statusFilter && statusFilter !== "ALL") query.append("status", statusFilter);
      if (searchQuery.trim()) query.append("client_name", searchQuery.trim());
      query.append("sort_dir", "ASC");

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/export?${query.toString()}`);
      if (!res.ok) {
        throw new Error("Gagal mengunduh file Excel dari server");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengekspor data ke Excel:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleResetFilter = () => {
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:static print:bg-transparent print:z-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-7xl overflow-hidden flex flex-col h-[96vh] print:h-auto print:border-none print:shadow-none print:rounded-none">
        
        {/* ======================================================== */}
        {/* TOOLBAR MODAL (SCREEN ONLY - HIDDEN ON PRINT)            */}
        {/* ======================================================== */}
        <div className="bg-[#1A365D] p-4 text-white flex flex-wrap justify-between items-center gap-3 shrink-0 print:hidden shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-sky-200 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide flex items-center gap-2">
                Pratinjau Cetak Rekapitulasi Invoice &amp; Piutang
              </h2>
              <p className="text-[11px] text-sky-200/80 font-medium">
                Format Resmi 1:1 Dokumen PT Adijayantara Logistic Indonesia
              </p>
            </div>
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Month Picker */}
            <select
              value={currentMonthKey}
              onChange={e => {
                const val = e.target.value;
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
              }}
              className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Semua Periode</option>
              {monthOptions.map((opt: any) => (
                <option key={opt.monthKey} value={opt.monthKey}>
                  📅 {opt.displayLabel}
                </option>
              ))}
              {currentMonthKey === "CUSTOM" && (
                <option value="CUSTOM">📅 Kustom Rentang Tanggal</option>
              )}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-white/20 bg-slate-800 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Semua Status</option>
              <option value="UNPAID">Menunggu Pembayaran</option>
              <option value="PAID">Lunas</option>
              <option value="OVERDUE">Jatuh Tempo (Overdue)</option>
            </select>

            <button
              onClick={handleResetFilter}
              className="p-1.5 rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Tombol Unduh PDF Langsung (Tanpa Watermark / URL / Header Browser) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting || loading}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ml-2"
              title="Unduh langsung file PDF resmi: Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic.pdf"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyusun PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF Resmi</span>
                </>
              )}
            </button>

            {/* Tombol Unduh Excel */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || loading || invoices.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              title="Unduh file Excel (.xlsx): Daftar_Invoice_Monitoring_PT_Adijayantara_Logistic.xlsx"
            >
              {isExportingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyusun Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Unduh Excel</span>
                </>
              )}
            </button>

            {/* Tombol Cetak via Printer Fisik */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Cetak Dokumen ke Printer Fisik (A4 Landscape)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Printer</span>
            </button>

            {/* Tutup Modal */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LEMBAR DOKUMEN CETAK RESMI (A4 LANDSCAPE FORMAT)         */}
        {/* ======================================================== */}
        <div 
          id="recap-report-printable"
          className="flex-1 p-6 md:p-10 overflow-y-auto soft-scrollbar bg-white text-[#2D3748] font-sans print:p-[12mm_15mm_14mm_15mm] print:overflow-visible print:w-full print:text-black"
        >
          
          {/* 1. KOP SURAT RESMI (Rata Tengah Sesuai Dokumen DOCX Asli, Logo di Kanan Sesuai Permintaan) */}
          <div className="border-b-4 border-double border-[#1A365D] pb-3 mb-4 relative">
            <div className="flex items-center justify-between">
              {/* Spacer penyeimbang sisi kiri agar teks kop tetap presisi di tengah */}
              <div className="w-28 h-24 shrink-0"></div>

              {/* Teks Kop Surat */}
              <div className="flex-1 text-center px-4">
                <h1 className="text-[15pt] font-bold text-[#1A365D] tracking-wider uppercase font-sans">
                  PT ADIJAYANTARA LOGISTIC INDONESIA
                </h1>
                <p className="text-[10pt] font-bold text-[#4A5568] tracking-wide mt-0.5 font-sans">
                  Freight Forwarding &amp; Logistics Services
                </p>
                <p className="text-[9pt] text-[#64748B] mt-1 leading-snug font-sans">
                  WISMA SMR JL YOS SUDARSO, Kav. 89 Lantai 9, UNIT 904, Jakarta Utara 14350
                </p>
                <p className="text-[9pt] text-[#64748B] leading-snug font-sans">
                  Email: adijantara.logistic@gmail.com
                </p>
              </div>

              {/* Logo Perusahaan (Sebelah Kanan) */}
              <div className="w-28 h-24 relative shrink-0 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo PT Adijayantara Logistic"
                  className="w-20 h-20 sm:w-22 sm:h-22 object-contain block"
                />
              </div>
            </div>
          </div>

          {/* 2. JUDUL DOKUMEN & SUBJUDUL (Persis DOCX) */}
          <div className="mb-3.5 text-left">
            <h2 className="text-[13pt] font-bold text-[#1A365D] tracking-tight uppercase">
              DAFTAR REKAPITULASI INVOICE &amp; PIUTANG
            </h2>
            <p className="text-[9.5pt] italic text-[#4A5568] mt-0.5">
              Laporan Pengiriman, Syarat Pembayaran (TOP), dan Jatuh Tempo Tagihan
            </p>
          </div>

          {/* 3. BARIS META 3 KOLOM (Tabel 1 di DOCX Asli: Periode, Status, Tanggal Cetak) */}
          <table className="w-full border-collapse mb-4 text-[9pt] bg-[#F1F5F9]">
            <tbody>
              <tr>
                <td className="w-1/3 py-2 px-3 text-left">
                  <span className="font-bold text-[#1A365D]">Periode: </span>
                  <span className="text-[#2D3748]">{activePeriodLabel}</span>
                </td>
                <td className="w-1/3 py-2 px-3 text-left">
                  <span className="font-bold text-[#1A365D]">Status: </span>
                  <span className="text-[#2D3748]">{getStatusFilterLabel()}</span>
                </td>
                <td className="w-1/3 py-2 px-3 text-left">
                  <span className="font-bold text-[#1A365D]">Tanggal Cetak: </span>
                  <span className="text-[#2D3748]">{printDateLabel}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. 4 SUMMARY KPI CELLS (Tabel 2 di DOCX Asli: 4 Kolom x 2 Baris, Border Horizontal #E2E8F0) */}
          <table className="w-full border-collapse mb-5 text-left border-y border-[#E2E8F0]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="bg-[#F8FAFC] py-2 px-3 text-[8.5pt] font-bold text-[#1A365D] uppercase tracking-wider w-1/4">
                  TOTAL TAGIHAN
                </th>
                <th className="bg-[#F0FDF4] py-2 px-3 text-[8.5pt] font-bold text-[#166534] uppercase tracking-wider w-1/4">
                  TERBAYAR (LUNAS)
                </th>
                <th className="bg-[#FFFBEB] py-2 px-3 text-[8.5pt] font-bold text-[#C2410C] uppercase tracking-wider w-1/4">
                  MENUNGGU PEMBAYARAN
                </th>
                <th className="bg-[#FEF2F2] py-2 px-3 text-[8.5pt] font-bold text-[#B91C1C] uppercase tracking-wider w-1/4">
                  JATUH TEMPO (OVERDUE)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* Total Tagihan */}
                <td className="bg-[#F8FAFC] py-2.5 px-3 align-top">
                  <div className="text-[11pt] font-bold text-[#1A365D] font-mono">
                    {formatCurrency(totalAmount)}
                  </div>
                  <div className="text-[8pt] text-[#64748B] mt-0.5">
                    {invoices.length} Invoice tercatat
                  </div>
                </td>

                {/* Terbayar (Lunas) */}
                <td className="bg-[#F0FDF4] py-2.5 px-3 align-top">
                  <div className="text-[11pt] font-bold text-[#166534] font-mono">
                    {formatCurrency(paidAmount)}
                  </div>
                  <div className="text-[8pt] text-[#64748B] mt-0.5">
                    {paidInvoices.length} Invoice terselesaikan
                  </div>
                </td>

                {/* Menunggu Pembayaran */}
                <td className="bg-[#FFFBEB] py-2.5 px-3 align-top">
                  <div className="text-[11pt] font-bold text-[#C2410C] font-mono">
                    {formatCurrency(unpaidAmount)}
                  </div>
                  <div className="text-[8pt] text-[#64748B] mt-0.5">
                    {unpaidInvoices.length} Invoice kredit berjalan
                  </div>
                </td>

                {/* Jatuh Tempo (Overdue) */}
                <td className="bg-[#FEF2F2] py-2.5 px-3 align-top">
                  <div className="text-[11pt] font-bold text-[#B91C1C] font-mono">
                    {formatCurrency(overdueAmount)}
                  </div>
                  <div className="text-[8pt] text-[#64748B] mt-0.5">
                    {overdueInvoices.length} Invoice melewati tempo
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 5. TABEL DATA UTAMA 8 KOLOM (Tabel 3 di DOCX Asli: Header Navy #1A365D, Border Horizontal #CBD5E0) */}
          <div className="mb-6 overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse text-left border-y border-[#CBD5E0] text-[8.5pt]">
              {/* Header Tabel Dark Navy */}
              <thead>
                <tr className="bg-[#1A365D] text-white font-bold text-[8.5pt]">
                  <th className="py-2 px-2 text-center w-[4.4%]">No</th>
                  <th className="py-2 px-3 text-left w-[13.6%]">No. Invoice</th>
                  <th className="py-2 px-3 text-left w-[21.4%]">Nama Klien / Perusahaan</th>
                  <th className="py-2 px-2 text-center w-[11.2%]">Tgl Pengiriman</th>
                  <th className="py-2 px-2 text-center w-[12.6%]">TOP (Terms)</th>
                  <th className="py-2 px-2 text-center w-[11.2%]">Tgl Jatuh Tempo</th>
                  <th className="py-2 px-3 text-right w-[13.1%]">Nominal Tagihan</th>
                  <th className="py-2 px-2 text-center w-[12.6%]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD5E0]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#1A365D]"></div>
                      <p className="mt-2 text-xs font-semibold">Memuat rekapitulasi invoice...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold">
                      Tidak ada data invoice yang sesuai kriteria filter.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => {
                    const isPaid = inv.status === "PAID";
                    const isOverdue = inv.status === "OVERDUE";
                    const isUnpaid = inv.status === "UNPAID";

                    // Persis DOCX: zebra row (even putih, odd F8FAFC), overdue baris penuh FEF2F2
                    const rowBgClass = isOverdue
                      ? "bg-[#FEF2F2]"
                      : idx % 2 === 1
                      ? "bg-[#F8FAFC]"
                      : "bg-white";

                    return (
                      <tr 
                        key={inv.id || idx} 
                        className={`${rowBgClass} text-[#2D3748] transition-colors`}
                      >
                        {/* 1. No */}
                        <td className="py-2 px-2 text-center text-[#2D3748]">
                          {idx + 1}
                        </td>

                        {/* 2. No. Invoice */}
                        <td className="py-2 px-3 text-left font-bold font-mono text-[#2D3748]">
                          {inv.invoice_no}
                        </td>

                        {/* 3. Nama Klien / Perusahaan */}
                        <td className="py-2 px-3 text-left font-bold text-[#2D3748]">
                          <div>{inv.client_name}</div>
                          {inv.notes && (
                            <span className="text-[7.5pt] text-slate-500 block font-normal mt-0.5 print:text-[7pt]">
                              {inv.notes}
                            </span>
                          )}
                        </td>

                        {/* 4. Tgl Pengiriman */}
                        <td className="py-2 px-2 text-center text-[#2D3748]">
                          {formatDateIndo(inv.shipment_date)}
                        </td>

                        {/* 5. TOP (Terms) */}
                        <td className="py-2 px-2 text-center text-[#2D3748]">
                          {formatTopTerms(inv)}
                        </td>

                        {/* 6. Tgl Jatuh Tempo */}
                        <td className="py-2 px-2 text-center text-[#2D3748]">
                          {formatDateIndo(inv.due_date)}
                        </td>

                        {/* 7. Nominal Tagihan */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#2D3748]">
                          {formatCurrency(inv.amount ?? inv.total_amount)}
                        </td>

                        {/* 8. Status */}
                        <td className="py-2 px-2 text-center font-bold">
                          {isPaid ? (
                            <span className="text-[#166534]">Lunas</span>
                          ) : isOverdue ? (
                            <span className="text-[#B91C1C]">Jatuh Tempo (Overdue)</span>
                          ) : (
                            <span className="text-[#C2410C]">Menunggu Pembayaran</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Footer Total Akumulasi (Latar #EDF2F7 persis DOCX) */}
              <tfoot className="bg-[#EDF2F7] font-bold text-[#1A365D] border-t border-[#CBD5E0]">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-[9pt] font-bold">
                    TOTAL KESELURUHAN INVOICE:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-[9pt] font-bold">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[8.5pt] font-bold">
                    {invoices.length} Tagihan
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 6. BLOK TANDA TANGAN 3 KOLOM (Tabel 4 di DOCX Asli: Dibuat, Diperiksa, Disetujui) */}
          <table className="w-full border-collapse mt-8 text-center text-[9.5pt] break-inside-avoid print:break-inside-avoid">
            <tbody>
              <tr>
                <td className="w-1/3 text-[#2D3748] print:text-black py-1 font-medium">Dibuat Oleh,</td>
                <td className="w-1/3 text-[#2D3748] print:text-black py-1 font-medium">Diperiksa Oleh,</td>
                <td className="w-1/3 text-[#2D3748] print:text-black py-1 font-medium">Disetujui Oleh,</td>
              </tr>
              <tr>
                <td className="w-1/3 h-20 align-bottom pb-2">
                  <div className="flex items-center justify-center font-bold text-[#2D3748] print:text-black">
                    <span>(</span>
                    <span className="inline-block w-44 sm:w-48 border-b-2 border-[#2D3748] print:border-black mx-1 mb-1"></span>
                    <span>)</span>
                  </div>
                </td>
                <td className="w-1/3 h-20 align-bottom pb-2">
                  <div className="flex items-center justify-center font-bold text-[#2D3748] print:text-black">
                    <span>(</span>
                    <span className="inline-block w-44 sm:w-48 border-b-2 border-[#2D3748] print:border-black mx-1 mb-1"></span>
                    <span>)</span>
                  </div>
                </td>
                <td className="w-1/3 h-20 align-bottom pb-2">
                  <div className="flex items-center justify-center font-bold text-[#2D3748] print:text-black">
                    <span>(</span>
                    <span className="inline-block w-44 sm:w-48 border-b-2 border-[#2D3748] print:border-black mx-1 mb-1"></span>
                    <span>)</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="w-1/3 italic text-[9pt] text-[#4A5568] print:text-black pt-1">
                  Staff Finance &amp; Billing
                </td>
                <td className="w-1/3 italic text-[9pt] text-[#4A5568] print:text-black pt-1">
                  Supervisor Keuangan
                </td>
                <td className="w-1/3 italic text-[9pt] text-[#4A5568] print:text-black pt-1">
                  Finance Manager
                </td>
              </tr>
            </tbody>
          </table>

          {/* 7. NOMOR HALAMAN RESMI DI TENGAH BAWAH */}
          <div className="mt-8 text-center text-[9pt] text-[#4A5568] font-medium font-sans print:block hidden">
            1
          </div>

        </div>
      </div>
    </div>
  );
}
