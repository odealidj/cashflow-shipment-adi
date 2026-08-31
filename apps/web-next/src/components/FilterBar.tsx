"use client";

import { useState } from "react";
import { Filter, Search, RotateCcw } from "lucide-react";

export interface FilterState {
  date_from: string;
  date_to: string;
  entry_type: string;
  remarks: string;
  vendor_name: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters =
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    Boolean(filters.entry_type) ||
    Boolean(filters.remarks) ||
    Boolean(filters.vendor_name);

  return (
    <div className="mb-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Quick Search & Filter Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari vendor / rute / aktivitas..."
              value={filters.vendor_name}
              onChange={(e) => handleChange("vendor_name", e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 w-56 sm:w-68 shadow-2xs font-medium"
            />
          </div>

          {/* Quick Category Tabs */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {[
              { label: "Semua", entry_type: "", remarks: "" },
              { label: "Shipment", entry_type: "SHIPMENT", remarks: "" },
              { label: "Top Up", entry_type: "TOP_UP", remarks: "" },
              { label: "Belum Lunas", entry_type: "", remarks: "UNPAID" }
            ].map((pill, idx) => {
              const isActive = 
                (pill.entry_type === "" && pill.remarks === "" && !filters.entry_type && !filters.remarks) ||
                (pill.entry_type !== "" && filters.entry_type === pill.entry_type) ||
                (pill.remarks !== "" && filters.remarks === pill.remarks);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onFilterChange({
                      ...filters,
                      entry_type: pill.entry_type,
                      remarks: pill.remarks
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-sky-800 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Advanced Filter Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isOpen || hasActiveFilters
                ? "bg-sky-700 text-white border-sky-700 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Lanjutan {hasActiveFilters ? "●" : ""}</span>
          </button>
        </div>

        {/* Right: Reset Action */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Expandable Advanced Filters */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleChange("date_from", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleChange("date_to", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Tipe Transaksi</label>
            <select
              value={filters.entry_type}
              onChange={(e) => handleChange("entry_type", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium cursor-pointer"
            >
              <option value="">Semua Tipe</option>
              <option value="SHIPMENT">SHIPMENT (Biaya)</option>
              <option value="TOP_UP">TOP_UP (Modal)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Pembayaran</label>
            <select
              value={filters.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="UNPAID">Belum Lunas (UNPAID)</option>
              <option value="PENDING">Sebagian (PENDING)</option>
              <option value="PAID">Lunas (PAID)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
