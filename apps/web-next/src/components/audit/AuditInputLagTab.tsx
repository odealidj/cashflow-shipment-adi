"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { AuditLog, getInputLagRecords } from "@/lib/api/audit";
import { AuditDiffModal } from "./AuditDiffModal";

export const AuditInputLagTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minLag, setMinLag] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await getInputLagRecords(page, 20, search, minLag);
      setLogs(res.data || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error("Gagal memuat catatan keterlambatan input:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, minLag]);

  const getLagBadge = (days: number) => {
    if (days <= 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Tepat Waktu (0-1 Hari)
        </span>
      );
    } else if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          Terlambat {days} Hari (Wajar)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Kritis: {days} Hari (Pelanggaran SLA)
        </span>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* SLA Guideline Bar */}
      <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900">Standar SLA Kepatuhan Waktu Input PT ALI</h4>
            <p className="text-[11px] text-slate-500">
              Transaksi wajib dicatat ke sistem maksimal 1 hari setelah keberangkatan armada atau penerbitan SPK.
            </p>
          </div>
        </div>

        {/* SLA Threshold Legend */}
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-extrabold">
          <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
            Hijau: 0-1 Hari (Disiplin)
          </span>
          <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
            Kuning: 2-3 Hari (Toleransi)
          </span>
          <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
            Merah: &gt; 3 Hari (Pelanggaran)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari transaksi, staf, entitas..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-slate-50/50"
            />
          </div>

          {/* Filter Minimal Keterlambatan */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMinLag(undefined); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                minLag === undefined ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Semua Terlambat
            </button>
            <button
              type="button"
              onClick={() => { setMinLag(2); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                minLag === 2 ? "bg-white text-amber-800 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              &ge; 2 Hari
            </button>
            <button
              type="button"
              onClick={() => { setMinLag(4); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                minLag === 4 ? "bg-white text-rose-800 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              &gt; 3 Hari (Kritis)
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Ditemukan <strong className="text-slate-900">{totalCount}</strong> catatan transaksi terlambat
        </div>
      </div>

      {/* Table Keterlambatan Input */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="p-3.5">Status SLA Keterlambatan</th>
                <th className="p-3.5">Tanggal Lapangan (Fisik)</th>
                <th className="p-3.5">Waktu Input Server</th>
                <th className="p-3.5">Staf Penginput</th>
                <th className="p-3.5">Entitas &amp; Deskripsi</th>
                <th className="p-3.5 text-center">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-4">
                      <div className="h-5 bg-slate-100 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <span className="font-semibold text-slate-700">Tidak ada transaksi terlambat ditemukan</span>
                      <span className="text-[11px] text-slate-400">Seluruh data tercatat tepat waktu sesuai batas SLA</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 whitespace-nowrap">
                      {getLagBadge(log.lag_days)}
                    </td>

                    <td className="p-3.5 whitespace-nowrap font-bold text-slate-800">
                      {log.event_date ? (
                        new Date(log.event_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {new Date(log.system_timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.system_timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })} WIB
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {log.actor_role}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 max-w-sm truncate">
                        {log.entity_reference}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                        {log.flag_reason || "Transaksi tercatat setelah tanggal kejadian fisik"}
                      </div>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(log)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Snapshot</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Diff Modal */}
      <AuditDiffModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />
    </div>
  );
};
