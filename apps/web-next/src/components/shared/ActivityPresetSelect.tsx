"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronDown, 
  Check, 
  Sparkles, 
  Route, 
  Truck, 
  Search, 
  X, 
  Plus, 
  FileText, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface ActivityPreset {
  id: number;
  category: "ACT_INFO" | "ACT_EXPLAIN";
  name: string;
  description?: string;
  is_active: boolean;
}

interface ActivityPresetSelectProps {
  category: "ACT_INFO" | "ACT_EXPLAIN";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function ActivityPresetSelect({
  category,
  value,
  onChange,
  placeholder,
  required = false,
  className = ""
}: ActivityPresetSelectProps) {
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Mini Modal State
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickDescription, setQuickDescription] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");

  const isArmada = category === "ACT_INFO";

  const fetchPresets = async () => {
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/activity-presets?category=${category}&limit=100`);
      const data = await res.json();
      if (data.status && data.data && Array.isArray(data.data.entries)) {
        setPresets(data.data.entries);
      }
    } catch (err) {
      console.error("Failed to load activity presets", err);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [category]);

  // Handle Outside Click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPresets = useMemo(() => {
    const query = (searchTerm || value || "").toLowerCase().trim();
    if (!query) return presets;
    return presets.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query))
    );
  }, [presets, searchTerm, value]);

  // Buka Quick Mini Modal
  const handleOpenQuickModal = (initialName?: string) => {
    setQuickName(initialName || searchTerm || value || "");
    setQuickDescription("");
    setQuickError("");
    setIsQuickModalOpen(true);
    setIsOpen(false);
  };

  // Submit Quick Mini Modal
  const handleSaveQuickPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickError("Nama wajib diisi.");
      return;
    }

    setQuickLoading(true);
    setQuickError("");

    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/activity-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          name: quickName.trim(),
          description: quickDescription.trim(),
          is_active: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal mendaftarkan master data.");
      }

      // 1. Ambil data baru
      const newPreset: ActivityPreset = data.data;

      // 2. Tambahkan ke list lokal
      setPresets(prev => [newPreset, ...prev.filter(p => p.id !== newPreset.id)]);

      // 3. Otomatis pilih item baru ke input form
      onChange(newPreset.name);

      // 4. Tutup modal
      setIsQuickModalOpen(false);
    } catch (err: any) {
      setQuickError(err.message || "Terjadi kesalahan saat menyimpan master data.");
    } finally {
      setQuickLoading(false);
    }
  };

  const isExactMatch = presets.some(
    p => p.name.trim().toLowerCase() === (searchTerm || value || "").trim().toLowerCase()
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Field with Dropdown Toggle */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {isArmada ? <Truck className="w-4 h-4 text-sky-700" /> : <Route className="w-4 h-4 text-emerald-600" />}
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value}
          placeholder={placeholder || (isArmada ? "Pilih / ketik jenis armada..." : "Pilih / ketik rute delivery...")}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-14 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold transition-all shadow-2xs placeholder:text-slate-400"
        />

        {/* Action icons right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              title="Hapus"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md text-slate-400 hover:text-sky-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Buka Pilihan Preset"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-sky-700" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Suggestion List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-sky-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Pilihan Resmi Master {isArmada ? "Armada" : "Rute"}</span>
            </span>
            <span className="text-[10px] text-slate-400">Bisa ketik bebas</span>
          </div>

          {/* Quick Add Banner (Jika sedang mengetik sesuatu yang belum terdaftar di DB) */}
          {(searchTerm || value) && !isExactMatch && (
            <div className="p-2 bg-sky-50/80 border-b border-sky-100">
              <button
                type="button"
                onClick={() => handleOpenQuickModal(searchTerm || value)}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-sky-100/60 border border-sky-200 text-sky-900 text-xs font-bold flex items-center justify-between transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="truncate text-left">
                    <span className="font-extrabold text-sky-900">Daftarkan "{searchTerm || value}"</span>
                    <span className="block text-[10px] text-sky-700/80 font-normal">Tambah ke master data via form cepat</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-md shrink-0">
                  + Modal Cepat
                </span>
              </button>
            </div>
          )}

          {/* Preset Items List */}
          <div className="overflow-y-auto soft-scrollbar p-1 divide-y divide-slate-50 flex-1">
            {filteredPresets.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">"{value}" belum ada di master data.</p>
                <p className="text-[11px] text-slate-400">
                  Anda dapat tetap menyimpannya di transaksi ini atau mendaftarkannya ke Master Data agar tersimpan permanen.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenQuickModal(value)}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Daftarkan Sekarang
                </button>
              </div>
            ) : (
              filteredPresets.map((preset) => {
                const isSelected = value.trim().toLowerCase() === preset.name.trim().toLowerCase();

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onChange(preset.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected 
                        ? "bg-sky-50 text-sky-950 font-black border border-sky-200/60 shadow-2xs" 
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        isArmada ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isArmada ? "🚛" : "📍"}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate">{preset.name}</div>
                        {preset.description && (
                          <div className="text-[10px] text-slate-400 truncate font-normal">{preset.description}</div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-sky-700 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Bar: Tombol Tambah Master Baru Selalu Tersedia */}
          <div className="p-2 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleOpenQuickModal()}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-sky-600 hover:bg-sky-50/50 text-slate-600 hover:text-sky-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-700" />
              <span>+ Daftarkan Master {isArmada ? "Armada" : "Rute"} Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MINI MODAL (POPOVER) UNTUK KEHATI-HATIAN PENDAFTARAN MASTER DATA   */}
      {/* ========================================================================= */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Nordic Navy Gradient */}
            <div className="bg-linear-to-r from-[#1B2A4A] to-[#223249] p-4.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  {isArmada ? <Truck className="w-4.5 h-4.5 text-sky-300" /> : <Route className="w-4.5 h-4.5 text-emerald-300" />}
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    {isArmada ? "Daftarkan Master Armada Baru" : "Daftarkan Master Rute Baru"}
                  </h3>
                  <p className="text-[11px] text-sky-200/80 font-medium">
                    Penambahan langsung ke database tanpa reload
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveQuickPreset} className="p-5 space-y-3.5">
              {quickError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              {/* Kategori Badge Info */}
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-500">Kategori Database:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black border ${
                  isArmada 
                    ? "bg-sky-50 text-sky-800 border-sky-200" 
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}>
                  {isArmada ? "Keterangan Aktivitas (ACT_INFO)" : "Catatan Tambahan (ACT_EXPLAIN)"}
                </span>
              </div>

              {/* Nama Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isArmada ? "Nama Keterangan / Armada" : "Nama Rute / Catatan Delivery"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={isArmada ? "Mis. Tronton Lostbak 32 Ton" : "Mis. CIBINONG - SBY, Delivery"}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Deskripsi Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Penjelasan Singkat (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder={isArmada ? "Kapasitas muatan, dimensi, atau peruntukan armada..." : "Rincian titik muat & bongkar, estimasi waktu..."}
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none shadow-2xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  disabled={quickLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={quickLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-sky-700 hover:bg-sky-800 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {quickLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan & Gunakan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
