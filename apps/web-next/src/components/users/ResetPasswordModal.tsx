"use client";

import { useState } from "react";
import { X, KeyRound, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";
import { UserItem } from "./UserModal";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserItem | null;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password baru minimal 6 karakter");
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/users/${user.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mereset password pengguna");
      }

      onSuccess();
      onClose();
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto">
        {/* Header with Amber-Navy Accent */}
        <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 backdrop-blur-md flex items-center justify-center border border-amber-400/30 text-amber-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Reset Password Pengguna
              </h2>
              <p className="text-xs text-sky-200">
                Atur ulang kata sandi login untuk pengguna ini
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* User Target Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.full_name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2.5 text-amber-800 text-[11px] font-medium leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Mereset password akan <strong>secara otomatis memutus sesi aktif (force logout)</strong> pengguna di semua perangkat.
            </span>
          </div>

          {/* New Password Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700">Password Baru *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
              />
            </div>
          </div>

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
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Reset Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
