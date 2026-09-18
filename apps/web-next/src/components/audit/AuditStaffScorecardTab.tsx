"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  Edit3,
  Trash2
} from "lucide-react";
import { StaffSLAItem, getStaffScorecard } from "@/lib/api/audit";

export const AuditStaffScorecardTab: React.FC = () => {
  const [items, setItems] = useState<StaffSLAItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScorecard = async () => {
    try {
      setLoading(true);
      const data = await getStaffScorecard();
      setItems(data);
    } catch (err) {
      console.error("Gagal memuat rapor staf:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecard();
  }, []);

  const getScoreGrade = (pct: number) => {
    if (pct >= 90) return { grade: "A", color: "text-emerald-700 bg-emerald-100 border-emerald-300", label: "Sangat Disiplin" };
    if (pct >= 75) return { grade: "B", color: "text-blue-700 bg-blue-100 border-blue-300", label: "Baik" };
    if (pct >= 60) return { grade: "C", color: "text-amber-700 bg-amber-100 border-amber-300", label: "Perlu Peningkatan" };
    return { grade: "D", color: "text-rose-700 bg-rose-100 border-rose-300", label: "Pelanggaran SLA" };
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Rapor Kepatuhan &amp; Disiplin Input Staf Operasional</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluasi kecepatan input transaksi fisik terhadap waktu server untuk mencegah keterlambatan penagihan (cashflow lag).
          </p>
        </div>

        <button
          type="button"
          onClick={fetchScorecard}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Muat Ulang"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Grid Leaderboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.slice(0, 3).map((staff, idx) => {
          const { grade, color, label } = getScoreGrade(staff.on_time_percentage);
          return (
            <div 
              key={staff.actor_name + idx}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-black uppercase text-slate-900 truncate max-w-[140px]">
                      {staff.actor_name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${color}`}>
                    Grade {grade}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-2">
                  <span>Role: <strong className="uppercase text-slate-700">{staff.actor_role}</strong></span>
                  <span>&middot;</span>
                  <span>Total Entri: <strong className="text-slate-900">{staff.total_entries}</strong></span>
                </div>

                {/* Progress Bar Kepatuhan */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[10px] font-extrabold text-slate-600">
                    <span>Disiplin Tepat Waktu</span>
                    <span className="text-slate-900">{staff.on_time_percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${Math.min(100, staff.on_time_percentage)}%` }} 
                    />
                    <div 
                      className="bg-rose-500 h-full" 
                      style={{ width: `${Math.max(0, 100 - staff.on_time_percentage)}%` }} 
                    />
                  </div>
                </div>

                {/* Breakdown Mini Cards */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                    <div className="text-slate-500 text-[9px] font-bold">&le; 1 Hari</div>
                    <div className="font-extrabold text-emerald-800">{staff.on_time_entries}</div>
                  </div>
                  <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                    <div className="text-slate-500 text-[9px] font-bold">2-3 Hari</div>
                    <div className="font-extrabold text-amber-800">{staff.acceptable_entries}</div>
                  </div>
                  <div className="bg-rose-50/70 p-1.5 rounded-lg border border-rose-100">
                    <div className="text-slate-500 text-[9px] font-bold">&gt; 3 Hari</div>
                    <div className="font-extrabold text-rose-800">{staff.critical_late_entries}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Rata-rata Lag: <strong className="text-slate-800">{staff.avg_lag_days.toFixed(1)} hari</strong></span>
                <span>Koreksi: <strong className="text-slate-800">{staff.total_edits} edit</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabel Detail Rapor Lengkap Staf */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="p-3.5">Staf &amp; Jabatan</th>
                <th className="p-3.5 text-center">Grade Disiplin</th>
                <th className="p-3.5 text-center">Total Entri</th>
                <th className="p-3.5 text-center">Tepat Waktu (&le;1 Hari)</th>
                <th className="p-3.5 text-center">Toleransi (2-3 Hari)</th>
                <th className="p-3.5 text-center">Kritis (&gt;3 Hari)</th>
                <th className="p-3.5 text-center">Rata-rata Lag</th>
                <th className="p-3.5 text-center">Edit / Hapus</th>
                <th className="p-3.5">Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="p-4">
                      <div className="h-5 bg-slate-100 rounded-md w-full" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Belum ada data aktivitas staf yang tercatat
                  </td>
                </tr>
              ) : (
                items.map((staff) => {
                  const { grade, color, label } = getScoreGrade(staff.on_time_percentage);
                  return (
                    <tr key={staff.actor_name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{staff.actor_name}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          {staff.actor_role}
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${color}`}>
                          {grade} &middot; {staff.on_time_percentage}%
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-800">
                        {staff.total_entries}
                      </td>

                      <td className="p-3.5 text-center font-extrabold text-emerald-700">
                        {staff.on_time_entries}
                      </td>

                      <td className="p-3.5 text-center font-semibold text-amber-700">
                        {staff.acceptable_entries}
                      </td>

                      <td className="p-3.5 text-center font-extrabold text-rose-700">
                        {staff.critical_late_entries > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black">
                            {staff.critical_late_entries}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-700">
                        {staff.avg_lag_days.toFixed(1)} hari
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold">
                          <span className="text-slate-600 flex items-center gap-0.5" title="Total Edit">
                            <Edit3 className="w-3 h-3 text-slate-400" /> {staff.total_edits}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 flex items-center gap-0.5" title="Total Hapus">
                            <Trash2 className="w-3 h-3 text-rose-400" /> {staff.total_deletions}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(staff.last_active_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
