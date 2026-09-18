"use client";

import React from "react";
import { X, ArrowRight, FileCode2, History } from "lucide-react";
import { AuditLog, FraudAnomalyItem } from "@/lib/api/audit";

interface AuditDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AuditLog | FraudAnomalyItem | null;
}

export const AuditDiffModal: React.FC<AuditDiffModalProps> = ({ isOpen, onClose, item }) => {
  if (!isOpen || !item) return null;

  const parseJSON = (data: any) => {
    if (!data) return null;
    if (typeof data === "object") return data;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  };

  const oldVals = parseJSON(item.old_values);
  const newVals = parseJSON(item.new_values);

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">null</span>;
    if (typeof val === "number") {
      if (val >= 10000) {
        return `Rp ${val.toLocaleString("id-ID")}`;
      }
      return val.toString();
    }
    if (typeof val === "boolean") return val ? "true" : "false";
    return String(val);
  };

  // Extract all unique keys from old and new values
  const allKeys = Array.from(new Set([
    ...(oldVals && typeof oldVals === "object" ? Object.keys(oldVals) : []),
    ...(newVals && typeof newVals === "object" ? Object.keys(newVals) : [])
  ]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Snapshot Perubahan Forensik</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                  item.severity === "CRITICAL"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : item.severity === "WARNING"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-slate-100 text-slate-700"
                }`}>
                  {item.severity}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {item.entity_reference} &middot; Pelaksana: <strong className="text-slate-700">{item.actor_name}</strong> ({item.actor_role})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Alasan Flagged */}
          {item.flag_reason && (
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/80 text-rose-900 flex items-start gap-2.5">
              <span className="font-bold text-rose-700 shrink-0">Indikasi Audit:</span>
              <span>{item.flag_reason}</span>
            </div>
          )}

          {/* Perbandingan Old vs New */}
          {allKeys.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-black text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                    <th className="p-2.5">Kolom / Parameter</th>
                    <th className="p-2.5 bg-rose-50/50 text-rose-900 border-r border-slate-200">Nilai Sebelumnya (Old)</th>
                    <th className="p-2.5 bg-emerald-50/50 text-emerald-900">Nilai Sesudahnya (New)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {allKeys.map((key) => {
                    const oldV = oldVals ? oldVals[key] : undefined;
                    const newV = newVals ? newVals[key] : undefined;
                    const isChanged = JSON.stringify(oldV) !== JSON.stringify(newV);

                    return (
                      <tr key={key} className={isChanged ? "bg-amber-50/30" : ""}>
                        <td className="p-2.5 font-bold text-slate-700 font-sans">
                          {key}
                        </td>
                        <td className="p-2.5 bg-rose-50/20 text-rose-700 border-r border-slate-200">
                          {formatValue(oldV)}
                        </td>
                        <td className="p-2.5 bg-emerald-50/20 text-emerald-700 font-semibold">
                          {formatValue(newV)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5" /> Snapshot Lama
                </div>
                <pre className="text-[10px] font-mono text-slate-800 whitespace-pre-wrap">
                  {JSON.stringify(oldVals, null, 2) || "Tidak ada data lama"}
                </pre>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5" /> Snapshot Baru
                </div>
                <pre className="text-[10px] font-mono text-slate-800 whitespace-pre-wrap">
                  {JSON.stringify(newVals, null, 2) || "Tidak ada data baru"}
                </pre>
              </div>
            </div>
          )}

          {/* Waktu & Detail Tambahan */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              Server Timestamp: <strong className="text-slate-700">{new Date(item.system_timestamp || item.created_at).toLocaleString("id-ID")}</strong>
            </div>
            {item.lag_days > 0 && (
              <div className="font-bold text-amber-700">
                Keterlambatan Input: {item.lag_days} hari setelah tanggal fisik
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
