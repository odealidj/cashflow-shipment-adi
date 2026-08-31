"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Truck, ChevronDown, Check, Plus, Search, X, Sparkles, Phone, Building2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface Vendor {
  id: number;
  name?: string;
  vendor_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

interface VendorSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function VendorSelect({
  value = "",
  onChange,
  required = false,
  placeholder = "Pilih atau ketik nama vendor...",
  className = ""
}: VendorSelectProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Mini Modal State for Vendor
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickContactPerson, setQuickContactPerson] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/vendors?limit=200", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data?.entries || []);
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getVendorName = (v: Vendor) => (v.name || v.vendor_name || "").trim();

  const filteredVendors = useMemo(() => {
    const query = (searchTerm || "").toLowerCase().trim();
    if (!query) return vendors;
    return vendors.filter(v => {
      const vName = getVendorName(v).toLowerCase();
      const vPhone = (v.phone || "").toLowerCase();
      const vContact = (v.contact_person || "").toLowerCase();
      return vName.includes(query) || vPhone.includes(query) || vContact.includes(query);
    });
  }, [vendors, searchTerm]);

  const isExactMatch = vendors.some(v => {
    const vName = getVendorName(v);
    return vName.toLowerCase() === (searchTerm || "").trim().toLowerCase();
  });

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchTerm(name);
    setIsOpen(false);
  };

  // Open Quick Modal to register to Master Vendor DB
  const handleOpenQuickModal = (initialName?: string) => {
    setQuickName(initialName || searchTerm || value || "");
    setQuickPhone("");
    setQuickContactPerson("");
    setQuickError("");
    setIsQuickModalOpen(true);
    setIsOpen(false);
  };

  // Save to Master Vendor DB & select
  const handleSaveQuickVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickError("Nama vendor wajib diisi.");
      return;
    }

    setQuickLoading(true);
    setQuickError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: quickName.trim(),
          phone: quickPhone.trim(),
          contact_person: quickContactPerson.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal mendaftarkan vendor baru.");
      }

      const newVendor: Vendor = data.data;
      setVendors(prev => [newVendor, ...prev.filter(v => v.id !== newVendor.id)]);
      handleSelect(getVendorName(newVendor));
      setIsQuickModalOpen(false);
    } catch (err: any) {
      setQuickError(err.message || "Terjadi kesalahan saat menyimpan master vendor.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field with Dropdown Toggle */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Truck className="w-4 h-4 text-sky-700" />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={searchTerm}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setSearchTerm(v);
            onChange(v);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-14 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold transition-all shadow-2xs placeholder:text-slate-400"
        />

        {/* Action icons right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
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
            title="Buka Pilihan Vendor"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-sky-700" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Filtered Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col">
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 text-sky-900">
              <Truck className="w-3.5 h-3.5 text-sky-700" />
              <span>Daftar Master Vendor & Transporter</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">{vendors.length} Terdaftar</span>
          </div>

          {/* Quick Add Banner (Sky Blue Theme - Seragam dengan yang lain) */}
          {searchTerm.trim() !== "" && !isExactMatch && (
            <div className="p-2 bg-sky-50/80 border-b border-sky-100 shrink-0 space-y-1">
              {/* Option A: Quick Use directly */}
              <button
                type="button"
                onClick={() => handleSelect(searchTerm.trim())}
                className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-sky-100/60 border border-sky-200 text-sky-900 text-xs font-bold flex items-center justify-between transition-all shadow-2xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div className="truncate text-left">
                    <span className="font-extrabold text-sky-900">Gunakan "{searchTerm.trim()}"</span>
                    <span className="block text-[10px] text-sky-700/80 font-normal">Pilih langsung untuk transaksi ini</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-md shrink-0">
                  Gunakan
                </span>
              </button>

              {/* Option B: Register to Master Vendor DB */}
              <button
                type="button"
                onClick={() => handleOpenQuickModal(searchTerm.trim())}
                className="w-full py-1 px-3 rounded-lg text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Daftarkan permanen ke Master Vendor (Lengkap Kontak)</span>
              </button>
            </div>
          )}

          {/* Vendor Items List */}
          <div className="overflow-y-auto soft-scrollbar p-1 divide-y divide-slate-50 flex-1">
            {filteredVendors.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">Vendor "{searchTerm}" belum terdaftar.</p>
                <p className="text-[11px] text-slate-400">
                  Anda dapat langsung menggunakannya atau mendaftarkannya ke Master Vendor.
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-all"
                  >
                    Gunakan Langsung
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickModal(searchTerm.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Daftarkan Master
                  </button>
                </div>
              </div>
            ) : (
              filteredVendors.map((vendor) => {
                const vendorName = getVendorName(vendor);
                const isSelected = (value || "").toLowerCase().trim() === vendorName.toLowerCase().trim();

                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => handleSelect(vendorName)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 text-sky-950 font-black border border-sky-200/60 shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        {(vendorName.slice(0, 2) || "VD").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-800">{vendorName}</span>
                        {(vendor.contact_person || vendor.phone) && (
                          <span className="text-[10px] text-slate-400 block -mt-0.5 truncate font-normal">
                            {[vendor.contact_person, vendor.phone].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sky-700 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Bar: Tombol Tambah Master Baru Selalu Tersedia */}
          <div className="p-2 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenQuickModal()}
              className="w-full py-1.5 px-3 rounded-xl border border-dashed border-slate-300 hover:border-sky-600 hover:bg-sky-50/50 text-slate-600 hover:text-sky-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-700" />
              <span>+ Daftarkan Master Vendor Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MINI MODAL UNTUK MASTER VENDOR                                     */}
      {/* ========================================================================= */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Nordic Navy Gradient */}
            <div className="bg-linear-to-r from-[#1B2A4A] to-[#223249] p-4.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Truck className="w-4.5 h-4.5 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Daftarkan Master Vendor Baru</h3>
                  <p className="text-[11px] text-sky-200/80 font-medium">
                    Penambahan langsung ke database vendor tanpa reload
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
            <form onSubmit={handleSaveQuickVendor} className="p-5 space-y-3.5">
              {quickError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              {/* Nama Vendor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Vendor / Mitra Transporter <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Mis. PT. Samudera Logistik Jaya"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Nama PIC / Kontak */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kontak PIC (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Mis. Pak Hendra"
                  value={quickContactPerson}
                  onChange={(e) => setQuickContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* No Telepon */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Telepon / WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Mis. 081234567890"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
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
                      <span>Menyimpan...</span>
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
