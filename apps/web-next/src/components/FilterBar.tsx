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
    <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border ${
              isOpen || hasActiveFilters
                ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {hasActiveFilters && "(Active)"}
          </button>

          {/* Quick Search by Vendor */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor / activity..."
              value={filters.vendor_name}
              onChange={(e) => handleChange("vendor_name", e.target.value)}
              className="glass-input pl-9 pr-3 py-1.5 rounded-xl text-xs w-52 sm:w-64 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        )}
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 animate-fade-in">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleChange("date_from", e.target.value)}
              className="w-full glass-input rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleChange("date_to", e.target.value)}
              className="w-full glass-input rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Type</label>
            <select
              value={filters.entry_type}
              onChange={(e) => handleChange("entry_type", e.target.value)}
              className="w-full glass-input rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-brand-500 bg-black/40 text-white"
            >
              <option value="">All Types</option>
              <option value="SHIPMENT">SHIPMENT</option>
              <option value="TOP_UP">TOP_UP</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">Payment Status</label>
            <select
              value={filters.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              className="w-full glass-input rounded-xl py-1.5 px-3 text-xs focus:ring-1 focus:ring-brand-500 bg-black/40 text-white"
            >
              <option value="">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
