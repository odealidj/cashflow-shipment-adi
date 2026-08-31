"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  Receipt
} from "lucide-react";
import { EntryDetailModal } from "./EntryDetailModal";

interface RecentTransactionsProps {
  entries: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function RecentTransactions({ entries, loading = false, onRefresh }: RecentTransactionsProps) {
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const renderStatusBadge = (entry: any) => {
    const status = entry.remarks;
    if (entry.entry_type === "TOP_UP" || status === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Lunas
        </span>
      );
    } else if (status === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <Clock className="w-3 h-3" /> Sebagian
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-3 h-3" /> Belum Lunas
        </span>
      );
    }
  };

  const handleStatusChange = async (id: number, nextStatus: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:8080/api/v1/cashflow/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: nextStatus })
      });
      if (selectedEntry && selectedEntry.id === id) {
        setSelectedEntry({ ...selectedEntry, remarks: nextStatus });
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];
  const recentList = safeEntries.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Transaksi Terbaru</h3>
            <p className="text-slate-500 text-xs">5 pencatatan kas & shipment terkini</p>
          </div>
        </div>

        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-xs group cursor-pointer"
        >
          <span>Lihat Semua</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Content / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-5 py-3 font-bold uppercase tracking-wider">Tanggal & Seq</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Tipe</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Vendor / Keterangan</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Debit (Keluar)</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Kredit (Masuk)</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Rolling Saldo</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Status</th>
              <th className="px-5 py-3 font-bold uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                    <span>Memuat data transaksi...</span>
                  </div>
                </td>
              </tr>
            ) : recentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  Belum ada transaksi tercatat.
                </td>
              </tr>
            ) : (
              recentList.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsDetailOpen(true);
                  }}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{formatDate(entry.date_of_entry)}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Seq #{entry.sequence_no}</div>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {entry.entry_type === "TOP_UP" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3" /> TOP UP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <ArrowDownRight className="w-3 h-3" /> SHIPMENT
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 max-w-xs truncate">
                    <div className="font-bold text-slate-900 truncate">
                      {entry.vendor_name_raw || entry.act_information || "Penambahan Modal"}
                    </div>
                    {entry.act_explaination && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{entry.act_explaination}</div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold">
                    {entry.debit > 0 ? (
                      <span className="text-rose-600">-{formatCurrency(entry.debit)}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-bold">
                    {entry.kredit > 0 ? (
                      <span className="text-emerald-600">+{formatCurrency(entry.kredit)}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono font-black text-blue-700">
                    {formatCurrency(entry.saldo)}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {renderStatusBadge(entry)}
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Lihat Detail"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <EntryDetailModal
        isOpen={isDetailOpen}
        entry={selectedEntry}
        onClose={() => setIsDetailOpen(false)}
        onEdit={() => {
          window.location.href = "/dashboard/transactions";
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
