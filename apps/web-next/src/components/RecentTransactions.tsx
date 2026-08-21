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
    if (entry.entry_type === "TOP_UP") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> PAID
        </span>
      );
    }
    if (status === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> PAID
        </span>
      );
    } else if (status === "PENDING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          <Clock className="w-3 h-3" /> PENDING
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3 h-3" /> UNPAID
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

  // Slice to max 5 recent transactions
  const recentList = entries.slice(0, 5);

  return (
    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Transaksi Terbaru</h3>
            <p className="text-gray-400 text-xs">5 pencatatan kas & pengiriman terkini</p>
          </div>
        </div>

        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-brand-300 hover:text-white text-xs font-semibold transition-all border border-white/10 group"
        >
          Lihat Semua Transaksi
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Content / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-white/[0.02] text-gray-400 border-b border-white/5">
            <tr>
              <th className="px-6 py-3 font-semibold uppercase tracking-wider">Tanggal & No</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Tipe</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">Vendor / Keterangan</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Debit (Keluar)</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Kredit (Masuk)</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Saldo</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-3 font-semibold uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                    <span>Memuat data transaksi...</span>
                  </div>
                </td>
              </tr>
            ) : recentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">
                  Belum ada transaksi tercatat.
                </td>
              </tr>
            ) : (
              recentList.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsDetailOpen(true);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-mono text-white font-medium">{formatDate(entry.date_of_entry)}</div>
                    <div className="text-[10px] text-gray-500 font-mono">Seq #{entry.sequence_no}</div>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap">
                    {entry.entry_type === "TOP_UP" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <ArrowUpRight className="w-3 h-3" /> TOP UP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <ArrowDownRight className="w-3 h-3" /> SHIPMENT
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 max-w-xs truncate">
                    <div className="font-medium text-white truncate">
                      {entry.vendor_name_raw || entry.act_information || "Penambahan Modal"}
                    </div>
                    {entry.act_explaination && (
                      <div className="text-[11px] text-gray-400 truncate">{entry.act_explaination}</div>
                    )}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-right font-mono font-medium">
                    {entry.debit > 0 ? (
                      <span className="text-orange-400">-{formatCurrency(entry.debit)}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-right font-mono font-medium">
                    {entry.kredit > 0 ? (
                      <span className="text-emerald-400">+{formatCurrency(entry.kredit)}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-right font-mono font-bold text-white">
                    {formatCurrency(entry.saldo)}
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {renderStatusBadge(entry)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setIsDetailOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
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
          // Redirect to transactions page if they want to edit
          window.location.href = "/dashboard/transactions";
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
