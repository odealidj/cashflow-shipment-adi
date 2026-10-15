"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowRight, 
  Wallet, 
  Activity, 
  Download, 
  Upload, 
  ArrowUp, 
  ArrowDown,
  Edit2, 
  Trash2, 
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  TrendingUp,
  Calendar,
  Printer,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";

import { TopUpModal } from "./TopUpModal";
import { ShipmentModal } from "./ShipmentModal";
import { EditEntryModal } from "./EditEntryModal";
import { EntryDetailModal } from "./EntryDetailModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { CashflowReportModal } from "./CashflowReportModal";
import { FilterBar, FilterState, getCurrentMonthRange, formatActivePeriod } from "./FilterBar";
import { fetchWithAuth } from "@/lib/apiClient";
import { formatDate } from "@/lib/dateUtils";
import { TableCard, tableTheadClass, ActionButton } from "@/components/shared/TableCard";
import { TablePagination } from "@/components/shared/TablePagination";
import { useAuth } from "@/hooks/useAuth";

interface CashflowTableProps {
  onDataChange?: () => void;
}

export function CashflowTable({ onDataChange }: CashflowTableProps) {
  const { can } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC"); // Default DESC (urut dari transaksi terbaru)

  // Default Filter: Bulan Ini (Range 1 s/d Akhir Bulan Ini)
  const [filters, setFilters] = useState<FilterState>(() => {
    const currentMonth = getCurrentMonthRange();
    return {
      date_from: currentMonth.date_from,
      date_to: currentMonth.date_to,
      entry_type: "",
      remarks: "",
      vendor_name: ""
    };
  });

  // Modal States
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Collapsible KPI Summary State (dengan penyimpanan preferensi di localStorage)
  const [isKpiCollapsed, setIsKpiCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cashflow_kpi_collapsed") === "true";
    }
    return false;
  });

  const toggleKpi = () => {
    setIsKpiCollapsed(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("cashflow_kpi_collapsed", String(next));
      }
      return next;
    });
  };

  // Dropdown Menu Laporan & Dokumen State
  const [isDocMenuOpen, setIsDocMenuOpen] = useState(false);
  const docMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (docMenuRef.current && !docMenuRef.current.contains(event.target as Node)) {
        setIsDocMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "15");
    params.set("sort", sortDir);

    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.entry_type) params.set("entry_type", filters.entry_type);
    if (filters.remarks) params.set("remarks", filters.remarks);
    if (filters.vendor_name) params.set("vendor_name", filters.vendor_name);

    return params.toString();
  }, [page, sortDir, filters]);

  const fetchCashflow = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQueryString();
      const res = await fetchWithAuth(`/api/v1/cashflow?${query}`);
      const data = await res.json();
      if (data.status && data.data) {
        setEntries(Array.isArray(data.data) ? data.data : (data.data.entries || []));
        setTotal(data.meta?.total_items ?? data.data?.total ?? 0);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to fetch cashflow", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const [summary, setSummary] = useState<any>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.date_from) params.set("date_from", filters.date_from);
      if (filters.date_to) params.set("date_to", filters.date_to);

      const q = params.toString();
      const url = q ? `/api/v1/cashflow/summary?${q}` : "/api/v1/cashflow/summary";
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (data.status && data.data) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  }, [filters.date_from, filters.date_to]);

  useEffect(() => {
    fetchCashflow();
    fetchSummary();
  }, [fetchCashflow, fetchSummary]);

  const handleDataRefresh = () => {
    fetchCashflow();
    fetchSummary();
    if (onDataChange) onDataChange();
  };

  const toggleSort = () => {
    setSortDir(s => s === "ASC" ? "DESC" : "ASC");
  };

  const handleExport = async () => {
    try {
      const query = buildQueryString();
      const res = await fetchWithAuth(`/api/v1/cashflow/export?${query}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cashflow_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchWithAuth("/api/v1/cashflow/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.status) {
        alert(data.message);
        handleDataRefresh();
      } else {
        alert("Import failed: " + data.message);
      }
    } catch (err) {
      console.error("Import failed", err);
    }
  };

  const handleDeleteConfirm = async (entry: any) => {
    try {
      const res = await fetchWithAuth(`/api/v1/cashflow/${entry.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Gagal menghapus transaksi");
      handleDataRefresh();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Gagal menghapus transaksi dari database.");
    }
  };

  const handleOpenDelete = (entry: any) => {
    setEntryToDelete(entry);
    setIsDeleteOpen(true);
  };

  const handleStatusChange = async (entryId: any, nextStatus: string) => {
    try {
      await fetchWithAuth(`/api/v1/cashflow/${entryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: nextStatus })
      });
      handleDataRefresh();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };


  const renderRemarksBadge = (entry: any) => {
    const status = entry.remarks;
    if (entry.entry_type === "INVOICE_PAYMENT") {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
          title="Pelunasan Piutang Invoice Resmi"
        >
          <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Lunas
        </span>
      );
    }
    if (entry.entry_type === "TOP_UP" || status === "PAID") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "UNPAID")}
          title="Klik untuk ubah ke Belum Lunas"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
        >
          <CheckCircle2 className="w-3 h-3" /> Lunas
        </button>
      );
    } else if (status === "PENDING") {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer shadow-2xs"
        >
          <Clock className="w-3 h-3" /> Sebagian
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleStatusChange(entry.id, "PAID")}
          title="Klik untuk tandai Lunas"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
        >
          <AlertCircle className="w-3 h-3" /> Belum Lunas
        </button>
      );
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];

  return (
    <>
      <div className={`flex-1 flex flex-col space-y-4 min-h-0 ${isReportOpen ? "print:hidden" : ""}`}>
        {/* MINI SUMMARY STRIP (KPI SNAPSHOT REAL-TIME: 5 KARTU SEJAJAR) */}
        {summary && (() => {
          const currentMonth = getCurrentMonthRange();
          const isThisMonth = filters.date_from === currentMonth.date_from && filters.date_to === currentMonth.date_to;
          const activePeriodLabel = formatActivePeriod(filters.date_from, filters.date_to);

          return (
            <div className="shrink-0 space-y-2">
              {/* PENANDA WAKTU, PERIODE AKTIF & TOGGLE RINGKASAN */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                  <div className="w-5 h-5 rounded-md bg-sky-100/80 text-sky-800 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span>
                    Kinerja Kas & Shipment: <span className="text-sky-800 underline decoration-sky-300 underline-offset-2">{activePeriodLabel}</span>
                  </span>
                  {isThisMonth && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      ● Bulan Berjalan
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Mini Ringkasan Inline Saat Kartu KPI Dilipat */}
                  {isKpiCollapsed && (
                    <div className="flex items-center gap-2.5 text-xs font-mono font-bold bg-white px-3 py-1 rounded-xl border border-slate-200/80 shadow-2xs animate-fade-in">
                      <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Saldo:</span>
                      <span className={`font-black ${summary.current_saldo < 0 ? "text-rose-600" : "text-sky-950"}`}>
                        {formatCurrency(summary.current_saldo)}
                      </span>
                      <span className="text-slate-200">|</span>
                      <span className="text-slate-400 font-sans text-[10px] uppercase font-bold">Profit:</span>
                      <span className={summary.total_profit >= 0 ? "text-teal-700" : "text-rose-600"}>
                        {formatCurrency(summary.total_profit || 0)}
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-medium hidden md:block">
                    {isKpiCollapsed ? "Ringkasan dilipat" : "Nilai otomatis menyesuaikan filter"}
                  </div>

                  {/* Tombol Toggle Sembunyikan / Tampilkan Ringkasan */}
                  <button
                    type="button"
                    onClick={toggleKpi}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-sky-900 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
                    title={isKpiCollapsed ? "Tampilkan 5 kartu ringkasan KPI lengkap" : "Sembunyikan kartu ringkasan KPI untuk memperluas tabel transaksi"}
                  >
                    {isKpiCollapsed ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-sky-600" />
                        <span>Tampilkan Ringkasan</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sembunyikan Ringkasan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 5 KARTU KPI DENGAN LABEL JELAS (TAMPIL HANYA JIKA TIDAK DILIPAT) */}
              {!isKpiCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
                  {/* 1. Saldo Kas */}
                  <div className={`rounded-2xl p-3.5 border shadow-2xs transition-all ${
                    summary.current_saldo < 0
                      ? "bg-linear-to-b from-white to-rose-50/40 border-rose-200/90"
                      : summary.current_saldo < 5000000
                      ? "bg-linear-to-b from-white to-amber-50/40 border-amber-200/90"
                      : "bg-white border-slate-200/80"
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <span>Saldo Kas Terkini</span>
                      <Wallet className={`w-4 h-4 ${
                        summary.current_saldo < 0
                          ? "text-rose-600"
                          : summary.current_saldo < 5000000
                          ? "text-amber-600"
                          : "text-sky-700"
                      }`} />
                    </div>
                    <div className={`mt-1.5 font-mono text-base lg:text-lg font-black truncate ${
                      summary.current_saldo < 0
                        ? "text-rose-700"
                        : summary.current_saldo < 5000000
                        ? "text-amber-800"
                        : "text-sky-950"
                    }`}>
                      {formatCurrency(summary.current_saldo)}
                    </div>
                    <div className="text-[10px] mt-0.5 flex items-center justify-between">
                      <span className="text-slate-400">Saldo riil di kas</span>
                      {summary.current_saldo < 0 ? (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded border border-rose-200">Defisit Kas</span>
                      ) : summary.current_saldo < 5000000 ? (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">Saldo Menipis</span>
                      ) : null}
                    </div>
                  </div>

                  {/* 2. Total Profit & Margin */}
                  <div className="bg-white rounded-2xl p-3.5 border border-teal-200/80 shadow-2xs bg-gradient-to-b from-white to-teal-50/20">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <span>{isThisMonth ? "Profit Bulan Ini" : "Profit Periode Ini"}</span>
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="mt-1.5 font-mono text-base lg:text-lg font-black text-teal-700 truncate">
                      {formatCurrency(summary.total_profit || 0)}
                    </div>
                    <div className="text-[10px] text-teal-600 font-bold mt-0.5 flex items-center gap-1">
                      <span className="bg-teal-50 text-teal-700 px-1.5 py-0.2 rounded border border-teal-200/60 font-mono">
                        {summary.avg_margin_pct ? `${(summary.avg_margin_pct * 100).toFixed(1)}%` : "0%"}
                      </span>
                      <span className="text-slate-400 font-normal">avg margin</span>
                    </div>
                  </div>

                  {/* 3. Total Pengeluaran (Debit) */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <span>{isThisMonth ? "Pengeluaran Bulan Ini" : "Pengeluaran Periode Ini"}</span>
                      <ArrowDownRight className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="mt-1.5 font-mono text-base lg:text-lg font-black text-rose-600 truncate">
                      {formatCurrency(summary.total_debit)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kas keluar periode ini</div>
                  </div>

                  {/* 4. Total Modal Masuk (Kredit) */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <span>{isThisMonth ? "Modal Masuk Bulan Ini" : "Modal Masuk Periode Ini"}</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-1.5 font-mono text-base lg:text-lg font-black text-emerald-700 truncate">
                      {formatCurrency(summary.total_kredit)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Top-up kas periode ini</div>
                  </div>

                  {/* 5. Tagihan Belum Lunas */}
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                      <span>Tagihan Belum Lunas</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="mt-1.5 font-mono text-base lg:text-lg font-black text-amber-700 flex items-baseline gap-1.5 truncate">
                      <span>{summary.unpaid_count}</span>
                      <span className="text-xs font-bold text-slate-400 font-sans">
                        ({formatCurrency(summary.unpaid_amount)})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Kewajiban periode ini</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* UNIFIED 1 CARD CONTAINER: HEADER + FILTER BAR + 14-COL TABLE + FOOTER */}
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0">
          {/* Top Header & Actions Bar */}
          <div className="shrink-0 px-6 py-2.5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2.5 bg-slate-50/50">
            <div>
              <h1 className="text-base lg:text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <div className="w-6 h-6 lg:w-7 lg:h-7 rounded-lg bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span>Transaksi Cashflow & Shipment</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Monitoring arus kas, biaya shipment, jatuh tempo, serta histori operasional
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                hidden 
                ref={fileInputRef} 
                onChange={handleImport} 
              />

              {/* Dropdown Menu Laporan & Dokumen */}
              {(can("cashflow.export") || can("cashflow.import")) && (
                <div className="relative" ref={docMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsDocMenuOpen(prev => !prev)}
                    className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-all font-bold border border-slate-200/90 flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                    title="Menu Laporan, Ekspor, dan Impor Data"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700" />
                    <span>Laporan & Data</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDocMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isDocMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40 animate-fade-in">
                      {can("cashflow.export") && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocMenuOpen(false);
                            setIsReportOpen(true);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-sky-600" />
                          <span>Cetak Laporan</span>
                        </button>
                      )}
                      {can("cashflow.export") && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocMenuOpen(false);
                            handleExport();
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ekspor Excel (.xlsx)</span>
                        </button>
                      )}
                      {can("cashflow.import") && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocMenuOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Impor Excel</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Utama: Tambah Modal */}
              {can("cashflow.create") && (
                <button 
                  onClick={() => setIsTopUpOpen(true)}
                  className="text-xs bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-bold border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <Wallet className="w-3.5 h-3.5 text-slate-600" />
                  <span>Tambah Modal</span>
                </button>
              )}

              {/* Tombol Utama: Catat Shipment */}
              {can("cashflow.create") && (
                <button 
                  onClick={() => setIsShipmentOpen(true)}
                  className="text-xs bg-sky-700 hover:bg-sky-800 text-white px-3 py-1.5 rounded-lg transition-all font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Catat Shipment</span>
                </button>
              )}
            </div>
          </div>

          {/* Integrated Filter Bar (Embedded Sub-Header) */}
          <FilterBar
            embedded={true}
            filters={filters}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            onFilterChange={(f) => {
              setFilters(f);
              setPage(1);
            }}
            onReset={() => {
              const currentMonth = getCurrentMonthRange();
              setFilters({
                date_from: currentMonth.date_from,
                date_to: currentMonth.date_to,
                entry_type: "",
                remarks: "",
                vendor_name: ""
              });
              setSortDir("DESC");
              setPage(1);
            }}
          />

          {/* 14 Kolom Data Table */}
          <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-0">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className={tableTheadClass}>
              <tr>
                <th className="py-2.5 px-2.5 text-center w-11">No</th>
                <th 
                  onClick={toggleSort}
                  className="px-3 py-2.5 cursor-pointer hover:text-sky-950 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal</span>
                    {sortDir === "ASC" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-sky-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-2.5 min-w-[190px] xl:min-w-[220px]">Aktivitas</th>
                <th className="px-2.5 py-2.5 text-right min-w-[130px] xl:min-w-[150px]">Penjualan & Biaya</th>
                <th className="px-2.5 py-2.5 text-right min-w-[110px] xl:min-w-[130px]">Profit & Margin</th>
                <th className="px-2.5 py-2.5 text-center min-w-[95px] xl:min-w-[110px]">T.O.P / Due</th>
                <th className="px-3 py-2.5 text-right min-w-[125px] xl:min-w-[140px]">Arus Kas</th>
                <th className="px-3 py-2.5 text-right min-w-[125px] xl:min-w-[140px] bg-sky-100/60">
                  <span className="inline-flex items-center gap-1 bg-sky-950 text-white text-[9.5px] font-black px-2.5 py-0.5 rounded-md shadow-2xs tracking-wider border border-sky-800 whitespace-nowrap">
                    ★ ROLLING SALDO
                  </span>
                </th>
                <th className="px-2.5 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-700"></div>
                    <p className="mt-2 text-xs font-semibold">Memuat transaksi...</p>
                  </td>
                </tr>
              ) : safeEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada data transaksi pada rentang periode yang dipilih.
                  </td>
                </tr>
              ) : (
                safeEntries.map((entry: any, idx: number) => {
                  const isShipment = entry.entry_type === "SHIPMENT";
                  const isInvoicePayment = entry.entry_type === "INVOICE_PAYMENT";

                  return (
                    <tr 
                      key={entry.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Kolom No */}
                      <td className="py-2 px-2.5 text-center font-mono text-slate-400 font-bold">
                        {(page - 1) * 15 + idx + 1}
                      </td>

                      {/* 1. Tanggal */}
                      <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-slate-900 text-xs">
                        {formatDate(entry.date_of_entry)}
                      </td>

                      {/* 2. Aktivitas: Urutan Tipe Transaksi -> Vendor -> Customer -> Rute -> Keterangan */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 1. Tipe Transaksi */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isShipment 
                              ? "bg-sky-100 text-sky-800 border border-sky-200" 
                              : isInvoicePayment
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}>
                            {isInvoicePayment ? "PELUNASAN INVOICE" : entry.entry_type}
                          </span>

                          {/* 2. Vendor */}
                          {!isInvoicePayment && entry.vendor_name_raw && (
                            <span className="font-extrabold text-slate-900 text-xs line-clamp-1">
                              {entry.vendor_name_raw}
                            </span>
                          )}

                          {/* 3. Customer */}
                          {!isInvoicePayment && entry.customer_name_raw && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 line-clamp-1">
                              Cust: {entry.customer_name_raw}
                            </span>
                          )}
                        </div>

                        {/* 4. Rute & 5. Keterangan */}
                        {isInvoicePayment ? (
                          <div className="mt-0.5">
                            <Link
                              href={`/dashboard/invoices?search=${encodeURIComponent(
                                (entry.act_information || "").replace("Pelunasan Invoice: ", "").split(" - ")[0].trim()
                              )}`}
                              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 group/link"
                              title="Buka dokumen invoice terkait di Rekapitulasi Invoice"
                            >
                              <span>{entry.act_information || "-"}</span>
                              <ExternalLink className="w-3 h-3 opacity-70 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                        ) : (
                          <>
                            {/* 4. Rute (ACT_EXPLAIN) */}
                            {entry.act_explaination ? (
                              <div className="text-xs text-slate-800 mt-0.5 font-semibold line-clamp-1">
                                {entry.act_explaination}
                              </div>
                            ) : null}

                            {/* 5. Keterangan (ACT_INFO) */}
                            {entry.act_information ? (
                              <div className={`line-clamp-1 ${entry.act_explaination ? "text-[11px] text-slate-400 mt-0.5 italic" : "text-xs text-slate-700 mt-0.5 font-medium"}`}>
                                {entry.act_information}
                              </div>
                            ) : !entry.act_explaination ? (
                              <div className="text-xs text-slate-400 mt-0.5 font-normal">
                                -
                              </div>
                            ) : null}
                          </>
                        )}
                      </td>

                      {/* 3. Penjualan & Biaya */}
                      <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                        {isShipment ? (
                          <div>
                            <div className="text-xs font-bold text-slate-800">
                              {formatCurrency(entry.grand_selling)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Cost: {formatCurrency(entry.grand_cost)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 4. Profit & Margin */}
                      <td className="px-2.5 py-2 text-right font-mono whitespace-nowrap">
                        {isShipment ? (
                          <div>
                            <div className={`text-xs font-bold ${
                              entry.profit >= 0 ? "text-emerald-700" : "text-rose-600"
                            }`}>
                              {formatCurrency(entry.profit)}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                              {(entry.margin_pct * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 5. TOP & Due Date */}
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        {entry.top_days ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {entry.top_days} Hari
                            </span>
                            {entry.due_date && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {formatDate(entry.due_date)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 6. Arus Kas (Debit/Kredit) */}
                      <td className="px-3 py-2 text-right font-mono whitespace-nowrap">
                        {entry.debit > 0 ? (
                          <div>
                            <span className="text-rose-600 font-black text-xs">
                              - {formatCurrency(entry.debit)}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-sans uppercase">Kas Keluar</span>
                          </div>
                        ) : entry.kredit > 0 ? (
                          <div>
                            <span className={`font-black text-xs ${isInvoicePayment ? "text-indigo-700" : "text-emerald-700"}`}>
                              + {formatCurrency(entry.kredit)}
                            </span>
                            <span className={`text-[9px] block font-sans uppercase font-bold ${isInvoicePayment ? "text-indigo-600" : "text-slate-400"}`}>
                              {isInvoicePayment ? "Pelunasan Masuk" : "Kas Masuk"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
                        )}
                      </td>

                      {/* 7. Rolling Saldo */}
                      <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                        entry.saldo < 0 ? "bg-rose-50/30" : "bg-sky-50/30"
                      }`}>
                        <span className={`inline-block font-black text-xs px-2 py-0.5 rounded-md shadow-2xs ${
                          entry.saldo < 0
                            ? "bg-rose-50 text-rose-700 border border-rose-300 font-black"
                            : "bg-white text-sky-950 border border-sky-200/80"
                        }`}>
                          {entry.saldo < 0 && <span className="mr-1 text-[11px]">⚠️</span>}
                          {formatCurrency(entry.saldo)}
                        </span>
                      </td>

                      {/* 8. Status Pembayaran */}
                      <td className="px-2.5 py-2 text-center whitespace-nowrap">
                        {renderRemarksBadge(entry)}
                      </td>

                      {/* 9. Tombol Aksi (Seragam dengan ActionButton) */}
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Lihat Detail / Pratinjau */}
                          <ActionButton
                            onClick={() => {
                              setSelectedEntry(entry);
                              setIsDetailOpen(true);
                            }}
                            icon={<Eye className="w-3.5 h-3.5" />}
                            title="Lihat Detail Transaksi"
                            variant="sky"
                          />

                          {/* 2. Edit Transaksi */}
                          {can("cashflow.edit") && (
                            <ActionButton
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsEditOpen(true);
                              }}
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                              title="Edit Transaksi"
                              variant="amber"
                            />
                          )}

                          {/* 3. Hapus Transaksi */}
                          {can("cashflow.delete") && (
                            <ActionButton
                              onClick={() => handleOpenDelete(entry)}
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              title="Hapus Transaksi"
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

        {/* Pagination Footer Terpadu */}
        <TablePagination
          currentPage={page}
          totalItems={total}
          pageSize={15}
          currentCount={safeEntries.length}
          onPageChange={(newPage) => setPage(newPage)}
          itemUnit="transaksi"
          infoSuffix={`Urut ${sortDir}`}
        />
      </div>
    </div>

      <TopUpModal 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)} 
        onSuccess={handleDataRefresh} 
      />
      
      <ShipmentModal 
        isOpen={isShipmentOpen} 
        onClose={() => setIsShipmentOpen(false)} 
        onSuccess={handleDataRefresh} 
      />

      <EditEntryModal
        isOpen={isEditOpen}
        entry={selectedEntry}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedEntry(null);
        }}
        onSuccess={handleDataRefresh}
      />

      <EntryDetailModal
        isOpen={isDetailOpen}
        entry={selectedEntry}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedEntry(null);
        }}
        onEdit={(entry) => {
          setSelectedEntry(entry);
          setIsEditOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        entry={entryToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setEntryToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <CashflowReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        defaultDateFrom={filters.date_from}
        defaultDateTo={filters.date_to}
      />
    </>
  );
}
