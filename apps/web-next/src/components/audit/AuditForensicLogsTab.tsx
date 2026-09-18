"use client";

import React, { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Filter,
  FileSpreadsheet
} from "lucide-react";
import { AuditLog, getForensicLogs } from "@/lib/api/audit";
import { AuditDiffModal } from "./AuditDiffModal";

export const AuditForensicLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await getForensicLogs(page, 25, search, severity, action, entityType);
      setLogs(res.data || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error("Gagal memuat log forensik audit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, search, severity, action, entityType]);

  return (
    <div className="space-y-4">
      {/* Filter & Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari ID, referensi, staf..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all bg-slate-50/50"
            />
          </div>

          {/* Filter Tingkat Risiko */}
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Tingkat</option>
            <option value="CRITICAL">Kritis (Critical)</option>
            <option value="WARNING">Peringatan (Warning)</option>
            <option value="NORMAL">Normal</option>
          </select>

          {/* Filter Aksi */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE (Tambah)</option>
            <option value="UPDATE">UPDATE (Edit)</option>
            <option value="DELETE">DELETE (Hapus)</option>
            <option value="RESCHEDULE_DUE_DATE">RESCHEDULE (Tempo)</option>
            <option value="SETTLE_INVOICE">SETTLE (Pelunasan)</option>
          </select>

          {/* Filter Entitas */}
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-medium focus:outline-none"
          >
            <option value="">Semua Modul</option>
            <option value="cashflow">Buku Kas (Cashflow)</option>
            <option value="invoice">Tagihan (Invoice)</option>
          </select>

          <button
            type="button"
            onClick={fetchLogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-slate-600" : ""}`} />
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <strong className="text-slate-900">{totalCount}</strong> catatan log audit forensik
        </div>
      </div>

      {/* Tabel Log Forensik */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="p-3.5">ID &amp; Waktu Server</th>
                <th className="p-3.5">Pelaksana</th>
                <th className="p-3.5">Aksi &amp; Modul</th>
                <th className="p-3.5">Referensi Entitas</th>
                <th className="p-3.5 text-center">Status / Lag</th>
                <th className="p-3.5">Catatan / Alasan</th>
                <th className="p-3.5 text-center">Snapshot Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-4">
                      <div className="h-5 bg-slate-100 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    Tidak ada catatan log yang sesuai dengan filter
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors font-sans">
                    {/* ID & Waktu */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        #{log.id}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.system_timestamp || log.created_at).toLocaleString("id-ID")}
                      </div>
                    </td>

                    {/* Pelaksana */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {log.actor_role}
                      </div>
                    </td>

                    {/* Aksi & Modul */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                        {log.action}
                      </span>
                      <span className="ml-1.5 text-[10px] font-bold text-slate-500 uppercase">
                        {log.entity_type}
                      </span>
                    </td>

                    {/* Referensi Entitas */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 truncate max-w-xs" title={log.entity_reference}>
                        {log.entity_reference}
                      </div>
                    </td>

                    {/* Status & Lag */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700 font-extrabold"
                          : log.severity === "WARNING"
                          ? "bg-amber-100 text-amber-800 font-extrabold"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {log.severity}
                      </span>
                      {log.lag_days > 0 && (
                        <div className="text-[9px] font-bold text-amber-700 mt-0.5">
                          +{log.lag_days}d lag
                        </div>
                      )}
                    </td>

                    {/* Catatan / Alasan */}
                    <td className="p-3.5">
                      <div className="text-xs text-slate-600 truncate max-w-sm" title={log.flag_reason}>
                        {log.flag_reason || "-"}
                      </div>
                    </td>

                    {/* Snapshot Diff */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(log)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Detail</span>
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
            <span className="text-xs text-slate-500 font-medium font-sans">
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
