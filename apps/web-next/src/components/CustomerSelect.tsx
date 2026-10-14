"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Building2, ChevronDown, Check, X, Sparkles } from "lucide-react";
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
  placeholder = "Pilih atau ketik nama customer...",
  className = ""
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/customers?limit=200");
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data.data) ? data.data : (data.data?.entries || []));
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

  // Filter customers based on current input value (maksimal 10 item untuk menjaga keringkasan)
  const { filteredCustomers, totalMatches } = useMemo(() => {
    const query = (value || "").toLowerCase().trim();
    const matches = !query 
      ? customers 
      : customers.filter(c => {
          const cName = (c.name || "").toLowerCase();
          const cPic = (c.pic_name || "").toLowerCase();
          const cPhone = (c.phone || "").toLowerCase();
          return cName.includes(query) || cPic.includes(query) || cPhone.includes(query);
        });
    return {
      filteredCustomers: matches.slice(0, 10),
      totalMatches: matches.length
    };
  }, [customers, value]);

  // Handle Input Change:
  // Mulai 3 karakter: jika ada match di master data, munculkan listnya.
  // Jika huruf berikutnya tidak ada match: hilangkan listnya.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange(text);

    const query = text.toLowerCase().trim();
    if (query.length >= 3) {
      const hasMatches = customers.some(c => {
        const cName = (c.name || "").toLowerCase();
        const cPic = (c.pic_name || "").toLowerCase();
        const cPhone = (c.phone || "").toLowerCase();
        return cName.includes(query) || cPic.includes(query) || cPhone.includes(query);
      });
      setIsOpen(hasMatches);
    } else {
      // Kurang dari 3 karakter: sembunyikan dropdown rekomendasi otomatis
      setIsOpen(false);
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
          value={value}
          placeholder={placeholder}
          onChange={handleInputChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-14 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none font-semibold transition-all shadow-2xs placeholder:text-slate-400"
        />

        {/* Action icons right */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
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
            title="Buka / Tutup Pilihan Customer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-sky-700" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Suggestion List - Hanya tampil jika isOpen dan ada item yang cocok */}
      {isOpen && filteredCustomers.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-64 flex flex-col">
          {/* Header Info Ringkas */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-sky-800">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Daftar Customer Rekomendasi</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {totalMatches > 10 ? `10 dari ${totalMatches} pilihan` : `${totalMatches} pilihan`}
            </span>
          </div>

          {/* Customer Items List */}
          <div className="overflow-y-auto soft-scrollbar p-1 divide-y divide-slate-50 flex-1">
            {filteredCustomers.map((customer) => {
              const isSelected = (value || "").toLowerCase().trim() === customer.name.toLowerCase().trim();

              return (
                <button
                  key={customer.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(customer.name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-sky-50 text-sky-950 font-black border border-sky-200/60 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-black shrink-0">
                      {(customer.name.slice(0, 2) || "CS").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-800">{customer.name}</div>
                      {(customer.pic_name || customer.phone) && (
                        <div className="text-[10px] text-slate-400 truncate font-normal">
                          {[customer.pic_name, customer.phone].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-sky-700 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
