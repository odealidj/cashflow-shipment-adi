"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Sparkles, Truck, Route, FileText, CheckCircle2 } from "lucide-react";

export interface ActivityPreset {
  id?: number;
  category: "ACT_INFO" | "ACT_EXPLAIN";
  name: string;
  description?: string;
  is_active?: boolean;
}

interface ActivityPresetModalProps {
  isOpen: boolean;
  preset: ActivityPreset | null;
  defaultCategory?: "ACT_INFO" | "ACT_EXPLAIN";
  lockCategory?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActivityPresetModal({ 
  isOpen, 
  preset, 
  defaultCategory = "ACT_INFO",
  lockCategory = false,
  onClose, 
  onSuccess 
}: ActivityPresetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<{
    category: "ACT_INFO" | "ACT_EXPLAIN";
    name: string;
    description: string;
  }>({
    category: defaultCategory,
    name: "",
    description: ""
  });

  const isEdit = Boolean(preset && preset.id);

  useEffect(() => {
    if (preset) {
      setFormData({
        category: preset.category || defaultCategory,
        name: preset.name || "",
        description: preset.description || ""
      });
    } else {
      setFormData({
        category: defaultCategory,
        name: "",
        description: ""
      });
    }
    setError("");
  }, [preset, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Nama opsi preset wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const url = isEdit
        ? `http://localhost:8080/api/v1/activity-presets/${preset?.id}`
        : "http://localhost:8080/api/v1/activity-presets";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: formData.category,
          name: formData.name.trim(),
          description: formData.description.trim(),
          is_active: true
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || `HTTP Error ${res.status}` };
      }

      if (!res.ok) {
        throw new Error(data.message || (isEdit ? "Gagal memperbarui preset" : "Gagal menambahkan preset"));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan master opsi");
    } finally {
      setLoading(false);
    }
  };

  const isArmada = formData.category === "ACT_INFO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative my-auto border border-slate-100 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${
            isArmada
              ? "bg-sky-50 text-sky-700 border border-sky-100" 
              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}>
            {isArmada ? <Truck className="w-5 h-5" /> : <Route className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEdit 
                ? `Edit ${isArmada ? "Keterangan Armada" : "Rute Delivery"} #${preset?.id}` 
                : `Tambah ${isArmada ? "Keterangan Aktivitas / Armada" : "Catatan / Rute Delivery"}`}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit 
                ? "Perbarui pilihan preset standar transaksi" 
                : "Daftarkan pilihan standar agar penulisan transaksi selalu seragam"}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kategori Preset (Only show if not locked) */}
          {!lockCategory ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kelompok / Kategori Master <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: "ACT_INFO" })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formData.category === "ACT_INFO"
                      ? "bg-sky-700 text-white border-sky-700 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Keterangan Aktivitas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, category: "ACT_EXPLAIN" })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formData.category === "ACT_EXPLAIN"
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Route className="w-4 h-4" />
                  <span>Rute & Delivery</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="text-slate-400">Kategori:</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                isArmada 
                  ? "bg-sky-50 text-sky-800 border-sky-200" 
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}>
                {isArmada ? <Truck className="w-3.5 h-3.5" /> : <Route className="w-3.5 h-3.5" />}
                {isArmada ? "Keterangan Aktivitas / Armada (ACT_INFO)" : "Catatan Tambahan / Rute (ACT_EXPLAIN)"}
              </span>
            </div>
          )}

          {/* Nama Preset */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isArmada ? "Nama Keterangan / Armada" : "Nama Rute / Catatan Delivery"} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isArmada ? <Truck className="w-4 h-4 text-sky-700" /> : <Route className="w-4 h-4 text-emerald-600" />}
              </div>
              <input
                type="text"
                required
                placeholder={isArmada ? "Mis. Tronton Bak 30 Ton" : "Mis. CIBINONG - SBY, Delivery"}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Deskripsi Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi / Penjelasan Singkat (Opsional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder={isArmada ? "Mis. Truk kapasitas 30 Ton untuk muatan semen / material" : "Mis. Pengiriman rute reguler antar gudang atau pabrik"}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isArmada 
                  ? "bg-sky-700 hover:bg-sky-800 active:scale-95" 
                  : "bg-emerald-700 hover:bg-emerald-800 active:scale-95"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEdit ? "Perbarui Opsi" : "Simpan Opsi"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
