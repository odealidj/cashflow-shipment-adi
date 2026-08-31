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
  Download
} from "lucide-react";
import { CreateInvoiceModal } from "@/components/CreateInvoiceModal";
import { InvoicePrintModal } from "@/components/InvoicePrintModal";
import { fetchWithAuth } from "@/lib/apiClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";
import { TableCard, tableTheadClass } from "@/components/shared/TableCard";
import { 
  formatActivePeriod, 
  getCurrentMonthRange, 
  getMonthRange, 
  formatYMD,
  MONTH_NAMES 
} from "@/components/FilterBar";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");

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

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("client_name", searchQuery.trim());
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("sort_dir", sortDir);
      params.set("limit", "100");

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.status && data.data) {
        setInvoices(data.data.entries || []);
        setTotal(data.data.total || 0);
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
  }, [statusFilter, searchQuery, dateFrom, dateTo, sortDir]);

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

  const handleDeleteInvoice = async (id: number, invNo: string) => {
    if (!window.confirm(`Hapus invoice ${invNo}? Data akan diarsipkan (soft delete).`)) return;
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.status) {
        fetchInvoices();
        fetchSummary();
      } else {
        alert(data.message || "Gagal menghapus invoice");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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
    setStatusFilter("ALL");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setSortDir("ASC");
  };

  return (
    <div className="space-y-4">
      {/* 4 SUMMARY CARDS (SHARED DESIGN SYSTEM) */}
      {summary && (() => {
        const curMonth = getCurrentMonthRange();
        const isCurrentMonth = dateFrom === curMonth.date_from && dateTo === curMonth.date_to;
        const activePeriodLabel = formatActivePeriod(dateFrom, dateTo);

        return (
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
        );
      })()}

      {/* LAYER 1: SHARED PAGE HEADER */}
      <PageHeader
        icon={<FileText className="w-4 h-4" />}
        title="Daftar Rekapitulasi Invoice & Piutang"
        subtitle="Laporan pengiriman, syarat pembayaran (TOP), dan monitoring jatuh tempo tagihan klien"
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Rekapitulasi</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Invoice Baru</span>
            </button>
          </>
        }
      />

      {/* LAYER 2: FILTER BAR CARD MANDIRI (SERAGAM DENGAN TRANSAKSI CASHFLOW) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        {/* Baris 1: Status Tabs & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
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
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-white text-sky-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortDir(s => s === "ASC" ? "DESC" : "ASC")}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Urutan: {sortDir === "ASC" ? "Tgl Lama → Baru" : "Tgl Baru → Lama"}</span>
            </button>
            <button
              onClick={handleResetFilter}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Baris 2: Search Input & Month Period Preset Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama klien / no. invoice..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Quick Month Dropdown Picker (Seragam dengan FilterBar Cashflow) */}
          <div className="sm:col-span-6 flex items-center gap-2">
            <div className="relative flex-1">
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">Semua Periode Transaksi</option>
                {monthOptions.map((opt: any) => (
                  <option key={opt.monthKey} value={opt.monthKey}>
                    📅 {opt.displayLabel}
                  </option>
                ))}
                {currentMonthKey === "CUSTOM" && (
                  <option value="CUSTOM">📅 Kustom Rentang Tanggal...</option>
                )}
              </select>
            </div>

            {/* Custom Date Inputs if needed */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="Tanggal Awal"
              className="w-32 px-2 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="Tanggal Akhir"
              className="w-32 px-2 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* LAYER 3: SHARED TABLE CARD (8 KOLOM RESMI DOKUMEN) */}
      <TableCard
        footer={
          invoices.length > 0 ? (
            <div className="flex items-center justify-between font-black text-slate-900 text-xs px-2">
              <span className="uppercase tracking-wider text-[11px] text-slate-500">
                Total Akumulasi Tagihan ({invoices.length} Invoice):
              </span>
              <span className="font-mono text-sm text-sky-950">
                {formatCurrency(invoices.reduce((acc, curr) => acc + Number(curr.amount || 0), 0))}
              </span>
            </div>
          ) : null
        }
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={tableTheadClass}>
              <th className="py-3.5 px-3 text-center w-12">No</th>
              <th className="py-3.5 px-3">No. Invoice</th>
              <th className="py-3.5 px-3">Nama Klien / Perusahaan</th>
              <th className="py-3.5 px-3 text-center">Tgl Pengiriman</th>
              <th className="py-3.5 px-3 text-center">TOP (Terms)</th>
              <th className="py-3.5 px-3 text-center">Tgl Jatuh Tempo</th>
              <th className="py-3.5 px-4 text-right">Nominal Tagihan</th>
              <th className="py-3.5 px-3 text-center">Status</th>
              <th className="py-3.5 px-3 text-center w-28">Aksi</th>
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
                    <td className="py-3 px-3 text-center font-mono">
                      {formatDate(inv.shipment_date)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-slate-200">
                        {inv.top_terms}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={isOverdue ? "text-rose-600 font-black" : "text-slate-700 font-semibold"}>
                        {formatDate(inv.due_date)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-[13px]">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3" />
                          Lunas
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Menunggu Bayar
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Tombol Cetak / PDF Kwitansi */}
                        <button
                          onClick={() => setSelectedInvoiceForPrint(inv)}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                          title="Pratinjau / Cetak Kwitansi Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Cepat Pelunasan */}
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            title="Tandai Sudah Lunas"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Tombol Hapus (Soft Delete) */}
                        <button
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Hapus Invoice (Soft Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableCard>

      {/* MODAL BUAT INVOICE */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
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
    </div>
  );
}
