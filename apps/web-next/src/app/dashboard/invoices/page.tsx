"use client";

import React, { useState, useEffect, useCallback } from "react";
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
      {/* 4 SUMMARY CARDS (SESUAI DOKUMEN REKAPITULASI RESMI) */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Tagihan */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Total Tagihan</span>
              <FileText className="w-4 h-4 text-sky-700" />
            </div>
            <div className="mt-2 font-mono text-xl font-black text-slate-900 truncate">
              {formatCurrency(summary.total_amount)}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {summary.total_count} Invoice tercatat
            </div>
          </div>

          {/* Card 2: Terbayar (Lunas) */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs bg-gradient-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Terbayar (Lunas)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 font-mono text-xl font-black text-emerald-700 truncate">
              {formatCurrency(summary.paid_amount)}
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {summary.paid_count} Invoice terselesaikan
            </div>
          </div>

          {/* Card 3: Menunggu Pembayaran (Piutang) */}
          <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs bg-gradient-to-b from-white to-amber-50/20">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Menunggu Pembayaran</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 font-mono text-xl font-black text-amber-700 truncate">
              {formatCurrency(summary.unpaid_amount)}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
              {summary.unpaid_count} Invoice kredit berjalan
            </div>
          </div>

          {/* Card 4: Jatuh Tempo (Overdue) */}
          <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs bg-gradient-to-b from-white to-rose-50/20">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <span>Jatuh Tempo (Overdue)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2 font-mono text-xl font-black text-rose-600 truncate">
              {formatCurrency(summary.overdue_amount)}
            </div>
            <div className="text-[11px] text-rose-600 font-bold mt-0.5">
              {summary.overdue_count} Invoice melewati tempo
            </div>
          </div>
        </div>
      )}

      {/* LAYER 1: HEADER & ACTIONS */}
      <div className="flex flex-wrap justify-between items-center gap-4 py-1">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak Rekapitulasi</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Invoice Baru</span>
          </button>
        </div>
      </div>

      {/* LAYER 2: FILTER BAR CARD MANDIRI */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
        {/* Status Tabs */}
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

        {/* Search & Date Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama klien / no. invoice..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Dari:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Sampai:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* LAYER 3: DATA TABLE MANDIRI (8 KOLOM RESMI) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-slate-200 text-[#334155] font-black tracking-wider uppercase text-[11px]">
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
                    Memuat data invoice...
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
                              title="Tandai LUNAS"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Tombol Hapus (Soft Delete) */}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoice_no)}
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
            {/* Total Footer Row */}
            {invoices.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/80 border-t-2 border-slate-200 font-black text-slate-900">
                  <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-[11px]">
                    Total Keseluruhan Invoice ({invoices.length} Tagihan):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-sky-950">
                    {formatCurrency(invoices.reduce((acc, curr) => acc + Number(curr.amount || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
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

      {/* MODAL CETAK KWITANSI RESMI */}
      <InvoicePrintModal
        isOpen={!!selectedInvoiceForPrint}
        onClose={() => setSelectedInvoiceForPrint(null)}
        invoice={selectedInvoiceForPrint}
      />
    </div>
  );
}
