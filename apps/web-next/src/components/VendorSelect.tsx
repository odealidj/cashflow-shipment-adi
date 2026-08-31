"use client";

import { useState, useEffect, useRef } from "react";
import { Truck, ChevronDown, Check, Plus, Search } from "lucide-react";

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

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  useEffect(() => {
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

  const filteredVendors = vendors.filter(v => {
    const vName = getVendorName(v);
    return vName.toLowerCase().includes((searchTerm || "").toLowerCase());
  });

  const isExactMatch = vendors.some(v => {
    const vName = getVendorName(v);
    return vName.toLowerCase() === (searchTerm || "").trim().toLowerCase();
  });

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchTerm(name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          required={required}
          value={searchTerm}
          onChange={(e) => {
            const v = e.target.value;
            setSearchTerm(v);
            onChange(v);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
        />
        <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Floating Filtered Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-fade-in divide-y divide-slate-50">
          <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Daftar Master Vendor</span>
            <span>{vendors.length} Terdaftar</span>
          </div>

          {filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => {
              const vendorName = getVendorName(vendor);
              const isSelected = (value || "").toLowerCase() === vendorName.toLowerCase();
              return (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => handleSelect(vendorName)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100/60 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      {(vendorName.slice(0, 2) || "VD").toUpperCase()}
                    </div>
                    <div>
                      <span className="block text-slate-800 font-bold">{vendorName}</span>
                      {vendor.phone && (
                        <span className="text-[10px] text-slate-400 block -mt-0.5">
                          {vendor.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400 italic">
              Tidak ada vendor terdaftar dengan nama tersebut
            </div>
          )}

          {/* Option to use/register new vendor name if typed */}
          {searchTerm.trim() !== "" && !isExactMatch && (
            <button
              type="button"
              onClick={() => handleSelect(searchTerm.trim())}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors flex items-center gap-2 mt-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gunakan vendor baru: &ldquo;<strong>{searchTerm.trim()}</strong>&rdquo;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
