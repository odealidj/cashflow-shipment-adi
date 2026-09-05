"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
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
  Filter
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

  // Sync with default props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDateFrom(defaultDateFrom);
      setDateTo(defaultDateTo);
      setStatusFilter(defaultStatusFilter);
      setSearchQuery("");
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
    window.print();
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
                Pratinjau Cetak Rekapitulasi Invoice & Piutang
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

            {/* Cetak / Simpan PDF */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 ml-2"
              title="Cetak Dokumen atau Simpan ke PDF (A4 Landscape)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
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
        <div className="flex-1 p-6 md:p-10 overflow-y-auto soft-scrollbar bg-white text-slate-900 font-sans print:p-0 print:overflow-visible print:w-full">
          
          {/* 1. KOP SURAT RESMI (Rata Tengah Sesuai Dokumen DOCX Asli) */}
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

          {/* 2. JUDUL DOKUMEN & SUBJUDUL */}
          <div className="mb-4">
            <h2 className="text-lg font-black text-[#1A365D] tracking-tight uppercase">
              DAFTAR REKAPITULASI INVOICE & PIUTANG
            </h2>
            <p className="text-xs font-semibold text-[#4A5568] mt-0.5">
              Laporan Pengiriman, Syarat Pembayaran (TOP), dan Jatuh Tempo Tagihan
            </p>
          </div>

          {/* 3. BARIS META 3 KOLOM (Tabel 0 di DOCX Asli) */}
          <div className="grid grid-cols-3 gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg p-2.5 mb-5 text-xs text-[#1A365D] font-bold">
            <div>
              <span className="text-slate-500 font-semibold">Periode:</span> {activePeriodLabel}
            </div>
            <div className="text-center">
              <span className="text-slate-500 font-semibold">Status:</span> {getStatusFilterLabel()}
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold">Tanggal Cetak:</span> {printDateLabel}
            </div>
          </div>

          {/* 4. 4 SUMMARY CARDS (Tabel 1 di DOCX Asli) */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {/* Card 1: TOTAL TAGIHAN */}
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                TOTAL TAGIHAN
              </span>
              <p className="text-base font-black text-[#1A365D] mt-1 font-mono">
                {formatCurrency(totalAmount)}
              </p>
              <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                {invoices.length} Invoice tercatat
              </span>
            </div>

            {/* Card 2: TERBAYAR (LUNAS) */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-black text-[#166534] uppercase tracking-wider block">
                TERBAYAR (LUNAS)
              </span>
              <p className="text-base font-black text-[#14532D] mt-1 font-mono">
                {formatCurrency(paidAmount)}
              </p>
              <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                {paidInvoices.length} Invoice terselesaikan
              </span>
            </div>

            {/* Card 3: MENUNGGU PEMBAYARAN */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-black text-[#B45309] uppercase tracking-wider block">
                MENUNGGU PEMBAYARAN
              </span>
              <p className="text-base font-black text-[#78350F] mt-1 font-mono">
                {formatCurrency(unpaidAmount)}
              </p>
              <span className="text-[11px] font-semibold text-amber-700 block mt-0.5">
                {unpaidInvoices.length} Invoice kredit berjalan
              </span>
            </div>

            {/* Card 4: JATUH TEMPO (OVERDUE) */}
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-black text-[#B91C1C] uppercase tracking-wider block">
                JATUH TEMPO (OVERDUE)
              </span>
              <p className="text-base font-black text-[#7F1D1D] mt-1 font-mono">
                {formatCurrency(overdueAmount)}
              </p>
              <span className="text-[11px] font-semibold text-rose-700 block mt-0.5">
                {overdueInvoices.length} Invoice melewati tempo
              </span>
            </div>
          </div>

          {/* 5. TABEL DATA UTAMA 8 KOLOM (Tabel 2 di DOCX Asli) */}
          <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left border-collapse text-xs">
              {/* Header Tabel Dark Navy */}
              <thead>
                <tr className="bg-[#1A365D] text-white font-black uppercase text-[11px] tracking-wide">
                  <th className="py-2.5 px-2 text-center w-10 border border-[#2A4365]">No</th>
                  <th className="py-2.5 px-3 text-left w-36 border border-[#2A4365]">No. Invoice</th>
                  <th className="py-2.5 px-3 text-left border border-[#2A4365]">Customer</th>
                  <th className="py-2.5 px-2 text-center w-32 border border-[#2A4365]">Tgl Pengiriman</th>
                  <th className="py-2.5 px-2 text-center w-36 border border-[#2A4365]">TOP (Terms)</th>
                  <th className="py-2.5 px-2 text-center w-32 border border-[#2A4365]">Tgl Jatuh Tempo</th>
                  <th className="py-2.5 px-3 text-right w-36 border border-[#2A4365]">Nominal Tagihan</th>
                  <th className="py-2.5 px-2 text-center w-40 border border-[#2A4365]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
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

                    // Zebra row background & Overdue soft red row highlight (persis DOCX asli)
                    const rowBgClass = isOverdue
                      ? "bg-[#FEF2F2] print:bg-[#FEF2F2]"
                      : idx % 2 === 1
                      ? "bg-[#F8FAFC] print:bg-[#F8FAFC]"
                      : "bg-white print:bg-white";

                    return (
                      <tr 
                        key={inv.id || idx} 
                        className={`${rowBgClass} transition-colors border-b border-slate-200`}
                      >
                        {/* 1. No */}
                        <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>

                        {/* 2. No. Invoice */}
                        <td className="py-2 px-3 font-mono font-black text-[#1A365D] border-r border-slate-200">
                          {inv.invoice_no}
                        </td>

                        {/* 3. Nama Klien / Perusahaan */}
                        <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                          <div>{inv.client_name}</div>
                          {inv.notes && (
                            <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                              {inv.notes}
                            </span>
                          )}
                        </td>

                        {/* 4. Tgl Pengiriman */}
                        <td className="py-2 px-2 text-center text-slate-700 font-medium border-r border-slate-200">
                          {formatDateIndo(inv.shipment_date)}
                        </td>

                        {/* 5. TOP (Terms) */}
                        <td className="py-2 px-2 text-center text-slate-700 font-medium border-r border-slate-200">
                          {formatTopTerms(inv)}
                        </td>

                        {/* 6. Tgl Jatuh Tempo */}
                        <td className="py-2 px-2 text-center font-bold border-r border-slate-200">
                          <span className={isOverdue ? "text-rose-700 font-black" : "text-slate-700"}>
                            {formatDateIndo(inv.due_date)}
                          </span>
                        </td>

                        {/* 7. Nominal Tagihan */}
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                          {formatCurrency(inv.amount ?? inv.total_amount)}
                        </td>

                        {/* 8. Status Badge */}
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black border ${
                              isPaid
                                ? "bg-emerald-50 text-[#166534] border-emerald-300"
                                : isOverdue
                                ? "bg-rose-100 text-[#B91C1C] border-rose-300"
                                : "bg-amber-50 text-[#C2410C] border-amber-300"
                            }`}
                          >
                            {isPaid 
                              ? "Lunas" 
                              : isOverdue 
                              ? "Jatuh Tempo (Overdue)" 
                              : "Menunggu Pembayaran"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Footer Total Akumulasi (Latar #EDF2F7 persis DOCX) */}
              <tfoot className="bg-[#EDF2F7] font-bold text-slate-900 border-t-2 border-slate-400">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs border-r border-slate-300">
                    TOTAL KESELURUHAN INVOICE:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-black text-[#1A365D] border-r border-slate-300">
                    {formatCurrency(totalAmount)}
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs font-black text-slate-800">
                    {invoices.length} Tagihan
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 6. BLOK TANDA TANGAN 3 KOLOM (Tabel 3 di DOCX Asli) */}
          <div className="grid grid-cols-3 gap-8 mt-10 text-center text-xs font-sans text-slate-800 break-inside-avoid">
            {/* Kolom 1: Dibuat Oleh */}
            <div>
              <p className="font-semibold text-slate-600">Dibuat Oleh,</p>
              <div className="h-16 flex items-center justify-center"></div>
              <p className="font-bold text-slate-900">( _______________________ )</p>
              <p className="font-bold text-slate-700 text-[11px] mt-1">Staff Finance & Billing</p>
            </div>

            {/* Kolom 2: Diperiksa Oleh */}
            <div>
              <p className="font-semibold text-slate-600">Diperiksa Oleh,</p>
              <div className="h-16 flex items-center justify-center"></div>
              <p className="font-bold text-slate-900">( _______________________ )</p>
              <p className="font-bold text-slate-700 text-[11px] mt-1">Supervisor Keuangan</p>
            </div>

            {/* Kolom 3: Disetujui Oleh */}
            <div>
              <p className="font-semibold text-slate-600">Disetujui Oleh,</p>
              <div className="h-16 flex items-center justify-center"></div>
              <p className="font-bold text-slate-900">( _______________________ )</p>
              <p className="font-bold text-slate-700 text-[11px] mt-1">Finance Manager</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
