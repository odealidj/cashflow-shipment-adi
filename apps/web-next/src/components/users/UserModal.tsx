"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, UserCheck, Mail, Phone, Lock, Shield, Sparkles, Loader2 } from "lucide-react";
import { API_BASE_URL, fetchWithAuth } from "@/lib/apiClient";

export interface UserItem {
  id?: string;
  email: string;
  phone?: string;
  full_name: string;
  role: string;
  status: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: UserItem | null;
  isSuperAdmin?: boolean;
}

export function UserModal({
  isOpen,
  onClose,
  onSuccess,
  editUser,
  isSuperAdmin = false,
}: UserModalProps) {
  const isEdit = !!editUser?.id;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("finance");
  const [status, setStatus] = useState("ACTIVE");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editUser) {
      setFullName(editUser.full_name || "");
      setEmail(editUser.email || "");
      setPhone(editUser.phone || "");
      setRole(editUser.role || "finance");
      setStatus(editUser.status || "ACTIVE");
      setPassword("");
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setRole("finance");
      setStatus("ACTIVE");
      setPassword("");
    }
    setError("");
  }, [editUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!fullName.trim()) throw new Error("Nama lengkap wajib diisi");
      if (!email.trim()) throw new Error("Email wajib diisi");
      if (!isEdit && (!password || password.length < 6)) {
        throw new Error("Password minimal 6 karakter");
      }

      const payload: any = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? phone.trim() : null,
        role: role,
        status: status,
      };

      if (!isEdit) {
        payload.password = password;
      }

      const url = isEdit
        ? `${API_BASE_URL}/users/${editUser?.id}`
        : `${API_BASE_URL}/users`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan data pengguna");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header with Nordic Navy Gradient */}
        <div className="bg-gradient-to-r from-[#223249] to-[#1a2638] text-white p-5 px-6 flex items-center justify-between border-b border-sky-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-sky-300">
              {isEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEdit ? "Edit Pengguna & Peran" : "Tambah Pengguna Baru"}
              </h2>
              <p className="text-xs text-sky-200">
                {isEdit
                  ? "Perbarui informasi akun dan hak akses pengguna"
                  : "Daftarkan akun staf atau pimpinan ke dalam sistem"}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Login *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@adijayantara.co.id"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nomor Telepon (WhatsApp)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Peran Akun (Role) *</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                >
                  <option value="finance">💼 Finance & Akuntansi</option>
                  <option value="admin">🛡️ Administrator Bisnis</option>
                  <option value="direktur">👔 Direktur (Monitoring)</option>
                  <option value="owner">📊 Pemilik Modal (Executive)</option>
                  {isSuperAdmin && (
                    <option value="super_admin">🔒 IT Super Admin (Root)</option>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Status Akun *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
              >
                <option value="ACTIVE">🟢 Aktif (Bisa Login)</option>
                <option value="INACTIVE">🔴 Non-Aktif (Blokir Akses)</option>
              </select>
            </div>
          </div>

          {/* Password (Only when adding new user) */}
          {!isEdit && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700">Password Awal *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Pengguna dapat mengganti password ini setelah login.
              </p>
            </div>
          )}

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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? "Simpan Perubahan" : "Daftarkan Pengguna"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
