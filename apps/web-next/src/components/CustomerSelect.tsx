"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Building2, ChevronDown, Check, Plus, Search, X, Sparkles, Phone, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

export interface Customer {
  id: number;
  name: string;
  pic_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface CustomerSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function CustomerSelect({
  value = "",
  onChange,
  required = false,
  placeholder = "Pilih atau ketik nama klien / perusahaan...",
  className = ""
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Mini Modal State for Customer
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPicName, setQuickPicName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickAddress, setQuickAddress] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const fetchCustomers = async () => {
    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/customers?limit=200");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data?.entries || data.data || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
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

  const filteredCustomers = useMemo(() => {
    const query = (searchTerm || "").toLowerCase().trim();
    if (!query) return customers;
    return customers.filter(c => {
      const cName = (c.name || "").toLowerCase();
      const cPic = (c.pic_name || "").toLowerCase();
      const cPhone = (c.phone || "").toLowerCase();
      return cName.includes(query) || cPic.includes(query) || cPhone.includes(query);
    });
  }, [customers, searchTerm]);

  const isExactMatch = customers.some(c => {
    return (c.name || "").toLowerCase() === (searchTerm || "").trim().toLowerCase();
  });

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchTerm(name);
    setIsOpen(false);
  };

  // Open Quick Modal to register to Master Customer DB
  const handleOpenQuickModal = (initialName?: string) => {
    setQuickName(initialName || searchTerm || value || "");
    setQuickPicName("");
    setQuickPhone("");
    setQuickAddress("");
    setQuickError("");
    setIsQuickModalOpen(true);
    setIsOpen(false);
  };

  // Save to Master Customer DB & select
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      setQuickError("Nama klien / perusahaan wajib diisi.");
      return;
    }

    setQuickLoading(true);
    setQuickError("");

    try {
      const res = await fetchWithAuth("http://localhost:8080/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickName.trim(),
          pic_name: quickPicName.trim(),
          phone: quickPhone.trim(),
          address: quickAddress.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal mendaftarkan customer baru.");
      }

      const newCustomer: Customer = data.data;
      setCustomers(prev => [newCustomer, ...prev.filter(c => c.id !== newCustomer.id)]);
      handleSelect(newCustomer.name);
      setIsQuickModalOpen(false);
    } catch (err: any) {
      setQuickError(err.message || "Terjadi kesalahan saat menyimpan master customer.");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field with Dropdown Toggle */}
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Building2 className="w-4 h-4 text-sky-700" />
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
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-14 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold transition-all shadow-2xs placeholder:text-slate-400"
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
            title="Buka Pilihan Customer"
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
              <Building2 className="w-3.5 h-3.5 text-sky-700" />
              <span>Daftar Master Customer & Klien</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">{customers.length} Terdaftar</span>
          </div>

          {/* Quick Add Banner (Jika sedang mengetik sesuatu yang belum terdaftar di DB) */}
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
                    <span className="block text-[10px] text-sky-700/80 font-normal">Pilih langsung untuk invoice ini</span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold bg-sky-200/80 text-sky-900 px-2 py-0.5 rounded-md shrink-0">
                  Gunakan
                </span>
              </button>

              {/* Option B: Register to Master Customer DB */}
              <button
                type="button"
                onClick={() => handleOpenQuickModal(searchTerm.trim())}
                className="w-full py-1 px-3 rounded-lg text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100/50 flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Daftarkan permanen ke Master Customer (Lengkap PIC)</span>
              </button>
            </div>
          )}

          {/* Customer Items List */}
          <div className="overflow-y-auto soft-scrollbar p-1 divide-y divide-slate-50 flex-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">Klien "{searchTerm}" belum terdaftar.</p>
                <p className="text-[11px] text-slate-400">
                  Anda dapat langsung menggunakannya atau mendaftarkannya ke Master Customer.
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
              filteredCustomers.map((customer) => {
                const customerName = customer.name;
                const isSelected = (value || "").toLowerCase().trim() === customerName.toLowerCase().trim();

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customerName)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 text-sky-950 font-black border border-sky-200/60 shadow-2xs"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-black shrink-0">
                        {(customerName.slice(0, 2) || "CS").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate font-bold text-slate-800">{customerName}</span>
                        {(customer.pic_name || customer.phone) && (
                          <span className="text-[10px] text-slate-400 block -mt-0.5 truncate font-normal">
                            {[customer.pic_name, customer.phone].filter(Boolean).join(" • ")}
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
              <span>+ Daftarkan Master Customer Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK MINI MODAL UNTUK MASTER CUSTOMER                                   */}
      {/* ========================================================================= */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header Nordic Navy Gradient */}
            <div className="bg-linear-to-r from-[#1B2A4A] to-[#223249] p-4.5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Building2 className="w-4.5 h-4.5 text-sky-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">Daftarkan Master Customer Baru</h3>
                  <p className="text-[11px] text-sky-200/80 font-medium">
                    Penambahan langsung ke database customer tanpa reload
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
            <form onSubmit={handleSaveQuickCustomer} className="p-5 space-y-3.5">
              {quickError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              {/* Nama Perusahaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Klien / Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Mis. PT. Surya Mandiri Abadi"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Nama PIC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kontak PIC (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Mis. Ibu Rina (Finance)"
                  value={quickPicName}
                  onChange={(e) => setQuickPicName(e.target.value)}
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
                  placeholder="Mis. 081298765432"
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
