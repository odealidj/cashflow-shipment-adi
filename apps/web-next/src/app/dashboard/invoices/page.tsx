"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileText, 
  Plus, 
  Search, 
  RotateCcw, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Filter,
  Calendar,
  Building,
  ArrowUpDown,
  Download,
  Edit2,
  Edit3,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  History
} from "lucide-react";
import { CreateInvoiceModal } from "@/components/CreateInvoiceModal";
import { EditInvoiceModal } from "@/components/EditInvoiceModal";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import { InvoiceRecapReportModal } from "@/components/InvoiceRecapReportModal";
import { DeleteInvoiceModal, InvoiceItem } from "@/components/DeleteInvoiceModal";
import { SettleInvoiceModal } from "@/components/SettleInvoiceModal";
import { RescheduleInvoiceModal } from "@/components/RescheduleInvoiceModal";
import { InvoiceHistoryModal } from "@/components/InvoiceHistoryModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";
import { TableCard, tableTheadClass, ActionButton } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { useAuth } from "@/hooks/useAuth";
import { 
  formatActivePeriod, 
  getCurrentMonthRange, 
  getMonthRange, 
  formatYMD,
  MONTH_NAMES 
} from "@/components/FilterBar";

export default function InvoicesPage() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<any>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceItem | null>(null);
  const [isRecapReportOpen, setIsRecapReportOpen] = useState(false);
  const [selectedInvoiceForSettle, setSelectedInvoiceForSettle] = useState<any>(null);
  const [selectedInvoiceForReschedule, setSelectedInvoiceForReschedule] = useState<any>(null);
  const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] = useState<any>(null);

  // Filters State (Default: Bulan Ini saat pertama kali dibuka)
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>(() => getCurrentMonthRange().date_from);
  const [dateTo, setDateTo] = useState<string>(() => getCurrentMonthRange().date_to);
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [isRangeFilterOpen, setIsRangeFilterOpen] = useState(false);

  // 18 Month Dropdown Options (Sama dengan CashflowTable)
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
      const isCurrent = i === 0;
      options.push({
        ...range,
        isCurrent,
        displayLabel: isCurrent ? `${range.label} (Bulan Ini)` : range.label
      });
    }
    return options.reverse();
  }, []);

  const currentMonthKey = useMemo(() => {
    if (!dateFrom && !dateTo) return "ALL";
    const fromParts = dateFrom?.split("-");
    const toParts = dateTo?.split("-");
    if (fromParts?.length === 3 && toParts?.length === 3) {
      if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === "01") {
        const y = parseInt(fromParts[0], 10);
        const m = parseInt(fromParts[1], 10) - 1;
        const mRange = getMonthRange(y, m);
        if (dateTo === mRange.date_to) {
          return mRange.monthKey;
        }
      }
    }
    return "CUSTOM";
  }, [dateFrom, dateTo]);

  // Month navigation: previous month
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

  // Month navigation: next month
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

  // Month navigation: select dropdown
  const handleMonthSelect = (value: string) => {
    if (value === "ALL") {
      setDateFrom("");
      setDateTo("");
      return;
    }
    if (value === "CUSTOM") {
      setIsRangeFilterOpen(true);
      return;
    }
    const [yStr, mStr] = value.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const mRange = getMonthRange(y, m);
    setDateFrom(mRange.date_from);
    setDateTo(mRange.date_to);
  };

  // Quick preset shortcuts
  const applyPreset = (preset: "THIS_MONTH" | "LAST_MONTH" | "ALL") => {
    const now = new Date();
    if (preset === "THIS_MONTH") {
      const cur = getCurrentMonthRange();
      setDateFrom(cur.date_from);
      setDateTo(cur.date_to);
    } else if (preset === "LAST_MONTH") {
      const last = getMonthRange(now.getFullYear(), now.getMonth() - 1);
      setDateFrom(last.date_from);
      setDateTo(last.date_to);
    } else if (preset === "ALL") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const curMonth = getCurrentMonthRange();
  const isCurrentMonthActive =
    dateFrom === curMonth.date_from && dateTo === curMonth.date_to;
  const isLastMonthActive = (() => {
    const now = new Date();
    const last = getMonthRange(now.getFullYear(), now.getMonth() - 1);
    return dateFrom === last.date_from && dateTo === last.date_to;
  })();
  const isAllPeriodActive = !dateFrom && !dateTo;

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    Boolean(searchQuery) ||
    (!isCurrentMonthActive && (Boolean(dateFrom) || Boolean(dateTo)));


  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, dateFrom, dateTo, sortDir]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("client_name", searchQuery.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("sort_dir", sortDir);
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.status && data.data) {
        setInvoices(Array.isArray(data.data) ? data.data : (data.data.entries || []));
        setTotal(data.meta?.total_items ?? data.data?.total ?? 0);
      } else {
        setInvoices([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("Failed to fetch invoices", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, dateFrom, dateTo, sortDir, page, pageSize]);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const q = params.toString();
      const url = q ? `http://localhost:8080/api/v1/invoices/summary?${q}` : "http://localhost:8080/api/v1/invoices/summary";
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (data.status && data.data) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch invoice summary", err);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
    fetchSummary();
  }, [fetchInvoices, fetchSummary]);

  const handleMarkPaid = async (id: number) => {
    if (!window.confirm("Tandai invoice ini sebagai LUNAS?")) return;
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${id}/pay`, {
        method: "PATCH"
      });
      const data = await res.json();
      if (data.status) {
        fetchInvoices();
        fetchSummary();
      } else {
        alert(data.message || "Gagal mengubah status pelunasan");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleConfirmDelete = async (inv: InvoiceItem) => {
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${inv.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal menghapus invoice");
      }
      fetchInvoices();
      fetchSummary();
    } catch (err: any) {
      alert("Error: " + err.message);
      throw err;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const handleResetFilter = () => {
    const cur = getCurrentMonthRange();
    setStatusFilter("ALL");
    setSearchQuery("");
    setDateFrom(cur.date_from);
    setDateTo(cur.date_to);
    setSortDir("ASC");
    setIsRangeFilterOpen(false);
  };

  return (
    <>
      <div className={`flex-1 flex flex-col space-y-4 min-h-0 ${isRecapReportOpen ? "print:hidden" : ""}`}>
      {/* 4 SUMMARY CARDS (SHARED DESIGN SYSTEM) */}
      {summary && (() => {
        const curMonth = getCurrentMonthRange();
        const isCurrentMonth = dateFrom === curMonth.date_from && dateTo === curMonth.date_to;
        const activePeriodLabel = formatActivePeriod(dateFrom, dateTo);

        return (
          <div className="shrink-0">
            <KpiCardGrid
              periodPrefix="Monitoring Piutang & Invoice"
              periodLabel={activePeriodLabel}
              isCurrentPeriod={isCurrentMonth}
              cols={4}
            >
            {/* Card 1: Total Tagihan */}
            <KpiCard
              title="Total Tagihan"
              value={formatCurrency(summary.total_amount)}
              icon={<FileText className="w-4 h-4" />}
              subtitle={`${summary.total_count} Invoice tercatat`}
              variant="default"
            />

            {/* Card 2: Terbayar (Lunas) */}
            <KpiCard
              title="Terbayar (Lunas)"
              value={formatCurrency(summary.paid_amount)}
              icon={<CheckCircle2 className="w-4 h-4" />}
              subtitle={`${summary.paid_count} Invoice terselesaikan`}
              variant="success"
            />

            {/* Card 3: Menunggu Pembayaran (Piutang) */}
            <KpiCard
              title="Menunggu Pembayaran"
              value={formatCurrency(summary.unpaid_amount)}
              icon={<Clock className="w-4 h-4" />}
              subtitle={`${summary.unpaid_count} Invoice kredit berjalan`}
              variant="warning"
            />

            {/* Card 4: Jatuh Tempo (Overdue) */}
            <KpiCard
              title="Jatuh Tempo (Overdue)"
              value={formatCurrency(summary.overdue_amount)}
              icon={<AlertTriangle className="w-4 h-4" />}
              subtitle={`${summary.overdue_count} Invoice melewati tempo`}
              variant="danger"
            />
            </KpiCardGrid>
          </div>
        );
      })()}

      {/* UNIFIED 1 CARD CONTAINER: HEADER + FILTERS & TABS + 8-COL TABLE + FOOTER */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0">
        {/* 1. Header & Primary Action Bar */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
              <span>Daftar Rekapitulasi Invoice & Piutang</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Laporan pengiriman, syarat pembayaran (TOP), dan monitoring jatuh tempo tagihan klien
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {can("invoices.print") && (
              <button
                onClick={() => setIsRecapReportOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak Rekapitulasi</span>
              </button>
            )}

            {can("invoices.create") && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Buat Invoice Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Integrated Filter Toolbar (Sub-Header) - Persis Transaksi Cashflow & Shipment */}
        <div className="shrink-0 p-4 pb-3.5 bg-slate-50/40 border-b border-slate-100 space-y-3 transition-all">
          {/* BARIS UTAMA: SEARCH, MONTH CONTROLLER, QUICK PRESETS, RANGE & FILTER, RESET */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama klien / no. invoice / catatan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 w-56 sm:w-64 shadow-2xs font-medium"
                />
              </div>

              {/* MONTH CONTROLLER (PER-BULAN DENGAN PREV/NEXT) */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Bulan Sebelumnya"
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative flex items-center px-1">
                  <Calendar className="w-3.5 h-3.5 text-sky-700 mr-1.5 pointer-events-none" />
                  <select
                    value={currentMonthKey}
                    onChange={e => handleMonthSelect(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 pr-5 py-1 focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="ALL">Semua Periode Transaksi</option>
                    {monthOptions.map((opt: any) => (
                      <option key={opt.monthKey} value={opt.monthKey}>
                        {opt.displayLabel}
                      </option>
                    ))}
                    {currentMonthKey === "CUSTOM" && (
                      <option value="CUSTOM">
                        Kustom: {formatActivePeriod(dateFrom, dateTo)}
                      </option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                    ▼
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Bulan Berikutnya"
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* QUICK PRESET BUTTONS (BULAN INI, BULAN LALU, SEMUA) */}
              <div className="hidden sm:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => applyPreset("THIS_MONTH")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isCurrentMonthActive
                      ? "bg-sky-800 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("LAST_MONTH")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isLastMonthActive
                      ? "bg-sky-800 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Bulan Lalu
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isAllPeriodActive
                      ? "bg-sky-800 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Semua
                </button>
              </div>

              {/* RANGE TANGGAL & FILTER LANJUTAN TOGGLE */}
              <button
                type="button"
                onClick={() => setIsRangeFilterOpen(!isRangeFilterOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isRangeFilterOpen || currentMonthKey === "CUSTOM"
                    ? "bg-sky-700 text-white border-sky-700 shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Range & Filter {currentMonthKey === "CUSTOM" ? "(Kustom)" : ""}</span>
              </button>
            </div>

            {/* RIGHT: RESET ACTION */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
                title="Kembalikan ke Bulan Ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset (Bulan Ini)</span>
              </button>
            )}
          </div>

          {/* BARIS SUB-NAV: STATUS TABS & STATUS PERIODE AKTIF */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
            {/* Status Pills */}
            <div className="flex items-center gap-1">
              {[
                { id: "ALL", label: "Semua Tagihan" },
                { id: "UNPAID", label: "Menunggu Pembayaran" },
                { id: "PAID", label: "Lunas" },
                { id: "OVERDUE", label: "Jatuh Tempo (Overdue)" },
              ].map(tab => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-slate-800 text-white shadow-2xs"
                        : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Status Periode Aktif & Urutan */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/70 text-sky-900 font-bold border border-sky-200">
                <Calendar className="w-3 h-3 text-sky-700" />
                <span>Periode: {formatActivePeriod(dateFrom, dateTo)}</span>
              </span>

              <button
                type="button"
                onClick={() => setSortDir(s => (s === "ASC" ? "DESC" : "ASC"))}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold hover:text-sky-800 cursor-pointer shadow-2xs"
                title="Klik untuk ubah urutan"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Urut: {sortDir === "ASC" ? "Tgl Lama → Baru (ASC)" : "Tgl Baru → Lama (DESC)"}</span>
              </button>
            </div>
          </div>

          {/* EXPANDABLE SECTION: RENTANG TANGGAL KUSTOM */}
          {isRangeFilterOpen && (
            <div className="pt-3 border-t border-slate-200/80 animate-fade-in space-y-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-700" />
                    Pilih Rentang Tanggal Spesifik (Range Tanggal Tagihan)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 30);
                        setDateFrom(formatYMD(start));
                        setDateTo(formatYMD(end));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      30 Hari Terakhir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 7);
                        setDateFrom(formatYMD(start));
                        setDateTo(formatYMD(end));
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      7 Hari Terakhir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal Awal (Dari)
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tanggal Akhir (Sampai)
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600 font-medium cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. 8 Kolom Data Table */}
        <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className={tableTheadClass}>
              <tr>
                <th className="py-3.5 px-3 text-center w-12">No</th>
                <th className="py-3.5 px-3">No. Invoice</th>
                <th className="py-3.5 px-3">Customer</th>
                <th className="py-3.5 px-3 text-center">Tgl Pengiriman</th>
                <th className="py-3.5 px-3 text-center">TOP (Terms)</th>
                <th className="py-3.5 px-3 text-center">Tgl Jatuh Tempo</th>
                <th className="py-3.5 px-4 text-right">Nominal Tagihan</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-center w-44">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-sky-700"></div>
                    <p className="mt-2 text-xs font-semibold">Memuat data invoice...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada data invoice yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const isPaid = inv.status === "PAID";
                  const isOverdue = inv.status === "OVERDUE";
                  const isUnpaid = inv.status === "UNPAID";

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-sky-900">
                        {inv.invoice_no}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 block">{inv.client_name}</span>
                        {inv.notes && (
                          <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                            {inv.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-600">
                        {formatDate(inv.shipment_date)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 text-slate-700">
                          {inv.top_days} Hari
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`font-bold ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                            {formatDate(inv.due_date)}
                          </span>
                          {inv.reschedule_count > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceForHistory(inv)}
                              title="Lihat riwayat perpanjangan jatuh tempo"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded-md cursor-pointer transition"
                            >
                              <History className="w-2.5 h-2.5" />
                              Diundur {inv.reschedule_count}x
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-xs">
                        {formatCurrency(inv.amount ?? inv.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isOverdue
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Lunas
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              Jatuh Tempo (Overdue)
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Menunggu Pembayaran
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Pelunasan Invoice (Full Settlement) */}
                          {!isPaid && can("invoices.mark_paid") && (
                            <ActionButton
                              onClick={() => setSelectedInvoiceForSettle(inv)}
                              icon={<Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                              title="Pelunasan Invoice (Bayar Lunas)"
                              variant="emerald"
                            />
                          )}

                          {/* 2. Ubah Jatuh Tempo (Reschedule) */}
                          {!isPaid && can("invoices.edit") && (
                            <ActionButton
                              onClick={() => setSelectedInvoiceForReschedule(inv)}
                              icon={<Calendar className="w-3.5 h-3.5" />}
                              title="Ubah Jatuh Tempo (Reschedule)"
                              variant="amber"
                            />
                          )}

                          {/* 3. Riwayat & Audit Log */}
                          <ActionButton
                            onClick={() => setSelectedInvoiceForHistory(inv)}
                            icon={<History className="w-3.5 h-3.5" />}
                            title="Riwayat & Audit Log Tagihan"
                            variant="slate"
                          />

                          {/* 4. Cetak Kwitansi */}
                          {can("invoices.print") && (
                            <ActionButton
                              onClick={() => setSelectedInvoiceForPrint(inv)}
                              icon={<Printer className="w-3.5 h-3.5" />}
                              title="Cetak Kwitansi Tagihan"
                              variant="sky"
                            />
                          )}

                          {/* 5. Edit Invoice */}
                          {can("invoices.edit") && (
                            <ActionButton
                              onClick={() => setSelectedInvoiceForEdit(inv)}
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              title="Edit Invoice"
                              variant="amber"
                            />
                          )}

                          {/* 6. Hapus Invoice */}
                          {can("invoices.delete") && (
                            <ActionButton
                              onClick={() => setInvoiceToDelete(inv)}
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              title="Hapus Invoice (Soft Delete)"
                              variant="rose"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer Pagination Terpadu */}
        <TablePagination
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          currentCount={invoices.length}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          itemUnit="invoice"
          infoSuffix={`Urut ${sortDir}`}
        />
      </div>
    </div>

      {/* MODAL BUAT INVOICE */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchInvoices();
          fetchSummary();
        }}
      />

      {/* MODAL EDIT INVOICE */}
      <EditInvoiceModal
        isOpen={!!selectedInvoiceForEdit}
        invoice={selectedInvoiceForEdit}
        onClose={() => setSelectedInvoiceForEdit(null)}
        onSuccess={() => {
          fetchInvoices();
          fetchSummary();
        }}
      />

      {/* MODAL CETAK KWITANSI RESMI */}
      <InvoicePrintModal
        isOpen={!!selectedInvoiceForPrint}
        onClose={() => setSelectedInvoiceForPrint(null)}
        invoice={selectedInvoiceForPrint}
      />

      {/* MODAL KONFIRMASI HAPUS INVOICE (SESUAI DENGAN CASHFLOW DELETECONFIRMMODAL) */}
      <DeleteInvoiceModal
        isOpen={!!invoiceToDelete}
        invoice={invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* MODAL CETAK REKAPITULASI INVOICE & PIUTANG (1:1 DOKUMEN ASLI KANTOR) */}
      <InvoiceRecapReportModal
        isOpen={isRecapReportOpen}
        onClose={() => setIsRecapReportOpen(false)}
        defaultDateFrom={dateFrom}
        defaultDateTo={dateTo}
        defaultStatusFilter={statusFilter}
      />

      {/* MODAL PELUNASAN INVOICE */}
      <SettleInvoiceModal
        isOpen={!!selectedInvoiceForSettle}
        invoice={selectedInvoiceForSettle}
        onClose={() => setSelectedInvoiceForSettle(null)}
        onSuccess={() => {
          fetchInvoices();
          fetchSummary();
        }}
      />

      {/* MODAL PERPANJANGAN JATUH TEMPO (RESCHEDULE) */}
      <RescheduleInvoiceModal
        isOpen={!!selectedInvoiceForReschedule}
        invoice={selectedInvoiceForReschedule}
        onClose={() => setSelectedInvoiceForReschedule(null)}
        onSuccess={() => {
          fetchInvoices();
          fetchSummary();
        }}
      />

      {/* MODAL RIWAYAT & AUDIT LOG INVOICE */}
      <InvoiceHistoryModal
        isOpen={!!selectedInvoiceForHistory}
        invoice={selectedInvoiceForHistory}
        onClose={() => setSelectedInvoiceForHistory(null)}
      />
    </>
  );
}
