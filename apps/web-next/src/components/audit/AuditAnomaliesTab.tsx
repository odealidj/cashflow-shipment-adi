"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from "lucide-react";
import { FraudAnomalyItem, getAuditAnomalies } from "@/lib/api/audit";
import { AuditDiffModal } from "./AuditDiffModal";

export const AuditAnomaliesTab: React.FC = () => {
  const [items, setItems] = useState<FraudAnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<FraudAnomalyItem | null>(null);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await getAuditAnomalies(page, 20, search);
      setItems(res.data || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error("Gagal mengambil daftar anomali:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [page, search]);

  return (
    <div className="space-y-4">
      {/* Header Bar dengan Filter & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari anomali, nomor urut, staf..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all bg-slate-50/50"
            />
          </div>
          <button
            type="button"
            onClick={fetchAnomalies}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-600" : ""}`} />
          </button>
        </div>

        <div className="text-xs text-slate-500 self-end sm:self-center font-medium">
          Ditemukan <strong className="text-slate-900">{totalCount}</strong> insiden anomali &amp; aksi berisiko
        </div>
      </div>

      {/* Table Daftar Anomali */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="p-3.5">Tingkat Risiko</th>
                <th className="p-3.5">Waktu &amp; Tanggal Kejadian</th>
                <th className="p-3.5">Pelaksana (Staf)</th>
                <th className="p-3.5">Aksi &amp; Entitas</th>
                <th className="p-3.5">Alasan Flagged / Indikasi Anomali</th>
                <th className="p-3.5 text-center">Snapshot Forensik</th>
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-emerald-500" />
                      <span className="font-semibold text-slate-700">Tidak ada anomali atau fraud terdeteksi</span>
                      <span className="text-[11px] text-slate-400">Seluruh transaksi dalam koridor batas kewajaran operasional</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Severity Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      {item.severity === "CRITICAL" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          KRITIS
                        </span>
                      ) : item.severity === "WARNING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PERHATIAN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          NORMAL
                        </span>
                      )}
                    </td>

                    {/* Waktu & Tanggal Kejadian */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        {new Date(item.system_timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.system_timestamp).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })} WIB
                      </div>
                      {item.lag_days > 0 && (
                        <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                          Lag: +{item.lag_days} hari
                        </div>
                      )}
                    </td>

                    {/* Pelaksana / Actor */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{item.actor_name}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {item.actor_role}
                      </div>
                    </td>

                    {/* Aksi & Entitas */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                          {item.action}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 truncate max-w-xs">
                          {item.entity_reference}
                        </span>
                      </div>
                    </td>

                    {/* Alasan Flagged */}
                    <td className="p-3.5">
                      <div className="text-xs text-rose-900 font-medium bg-rose-50/60 px-3 py-1.5 rounded-xl border border-rose-100 max-w-md">
                        {item.flag_reason || "Terdeteksi deviasi nilai"}
                      </div>
                    </td>

                    {/* Action Snapshot */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Detail Snapshot</span>
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
