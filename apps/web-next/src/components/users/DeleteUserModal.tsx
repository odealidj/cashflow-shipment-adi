"use client";

import { useState } from "react";
import { X, ShieldAlert, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";
import { UserItem } from "./UserModal";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserItem | null;
}

export function DeleteUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: DeleteUserModalProps) {
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menonaktifkan pengguna");
      }

      onSuccess();
      onClose();
      setConfirmedRisk(false);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Header with Rose-Navy Accent */}
        <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 backdrop-blur-md flex items-center justify-center border border-rose-400/30 text-rose-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Nonaktifkan Pengguna
              </h2>
              <p className="text-xs text-rose-200">
                Konfirmasi penghapusan/penonaktifan akses akun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* User Target Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.full_name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email} • <span className="uppercase font-semibold text-rose-600">{user.role}</span></p>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-200/70 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-900 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Tindakan ini akan <strong>menonaktifkan akun</strong> dan <strong>mencabut seluruh sesi login aktif</strong> pengguna saat ini.
            </span>
          </div>

          {/* Risk Confirmation Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedRisk}
              onChange={(e) => setConfirmedRisk(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <span className="text-xs text-slate-700 font-medium">
              Saya mengonfirmasi untuk menonaktifkan pengguna ini dari sistem.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!confirmedRisk || loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Ya, Nonaktifkan Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
