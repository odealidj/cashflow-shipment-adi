"use client";

import { useState, useMemo } from "react";
import { 
  Filter, 
  Search, 
  RotateCcw, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

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
  sortDir?: "ASC" | "DESC";
  onToggleSort?: () => void;
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0); // Last day of month
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    date_from: formatYMD(start),
    date_to: formatYMD(end),
    year,
    monthIndex,
    monthKey: `${year}-${pad(monthIndex + 1)}`,
    label: `${MONTH_NAMES[monthIndex]} ${year}`
  };
}

export function getCurrentMonthRange() {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth());
}

export function formatActivePeriod(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return "Semua Waktu";

  const formatDateIndo = (str: string) => {
    if (!str) return "";
    const parts = str.split("-");
    if (parts.length !== 3) return str;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parts[0];
    return `${d} ${MONTH_NAMES[m]?.slice(0, 3)} ${y}`;
  };

  if (dateFrom && dateTo) {
    const fromParts = dateFrom.split("-");
    const toParts = dateTo.split("-");
    if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === "01") {
      const y = parseInt(fromParts[0], 10);
      const m = parseInt(fromParts[1], 10) - 1;
      const mRange = getMonthRange(y, m);
      if (dateTo === mRange.date_to) {
        return `${MONTH_NAMES[m]} ${y}`;
      }
    }
    return `${formatDateIndo(dateFrom)} – ${formatDateIndo(dateTo)}`;
  }

  if (dateFrom) return `Mulai ${formatDateIndo(dateFrom)}`;
  if (dateTo) return `Sampai ${formatDateIndo(dateTo)}`;
  return "Semua Waktu";
}

export function FilterBar({ 
  filters, 
  onFilterChange, 
  onReset,
  sortDir = "ASC",
  onToggleSort
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Generate 18 month options (12 months back, current, 5 months forward)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();

    for (let i = -12; i <= 5; i++) {
      const d = new Date(currentY, currentM + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const range = getMonthRange(y, m);
      const isCurrent = i === 0;
      options.push({
        ...range,
        isCurrent,
        displayLabel: isCurrent ? `${range.label} (Bulan Ini)` : range.label
      });
    }
    return options.reverse(); // Newest first
  }, []);

  // Determine current active month state
  const currentMonthKey = useMemo(() => {
    if (!filters.date_from && !filters.date_to) return "ALL";
    const fromParts = filters.date_from?.split("-");
    const toParts = filters.date_to?.split("-");
    if (fromParts?.length === 3 && toParts?.length === 3) {
      if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === "01") {
        const y = parseInt(fromParts[0], 10);
        const m = parseInt(fromParts[1], 10) - 1;
        const mRange = getMonthRange(y, m);
        if (filters.date_to === mRange.date_to) {
          return mRange.monthKey;
        }
      }
    }
    return "CUSTOM";
  }, [filters.date_from, filters.date_to]);

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  // Month navigation: previous month
  const handlePrevMonth = () => {
    let baseYear: number;
    let baseMonth: number;

    if (filters.date_from) {
      const parts = filters.date_from.split("-");
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1;
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonth = now.getMonth();
    }

    const prevRange = getMonthRange(baseYear, baseMonth - 1);
    onFilterChange({
      ...filters,
      date_from: prevRange.date_from,
      date_to: prevRange.date_to
    });
  };

  // Month navigation: next month
  const handleNextMonth = () => {
    let baseYear: number;
    let baseMonth: number;

    if (filters.date_from) {
      const parts = filters.date_from.split("-");
      baseYear = parseInt(parts[0], 10);
      baseMonth = parseInt(parts[1], 10) - 1;
    } else {
      const now = new Date();
      baseYear = now.getFullYear();
      baseMonth = now.getMonth();
    }

    const nextRange = getMonthRange(baseYear, baseMonth + 1);
    onFilterChange({
      ...filters,
      date_from: nextRange.date_from,
      date_to: nextRange.date_to
    });
  };

  // Select month from dropdown
  const handleMonthSelect = (value: string) => {
    if (value === "ALL") {
      onFilterChange({
        ...filters,
        date_from: "",
        date_to: ""
      });
      return;
    }
    if (value === "CUSTOM") {
      setIsOpen(true);
      return;
    }

    const [yStr, mStr] = value.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const mRange = getMonthRange(y, m);
    onFilterChange({
      ...filters,
      date_from: mRange.date_from,
      date_to: mRange.date_to
    });
  };

  // Quick preset shortcuts
  const applyPreset = (preset: "THIS_MONTH" | "LAST_MONTH" | "LAST_30" | "ALL") => {
    const now = new Date();
    if (preset === "THIS_MONTH") {
      const cur = getCurrentMonthRange();
      onFilterChange({ ...filters, date_from: cur.date_from, date_to: cur.date_to });
    } else if (preset === "LAST_MONTH") {
      const last = getMonthRange(now.getFullYear(), now.getMonth() - 1);
      onFilterChange({ ...filters, date_from: last.date_from, date_to: last.date_to });
    } else if (preset === "LAST_30") {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      onFilterChange({ ...filters, date_from: formatYMD(start), date_to: formatYMD(end) });
    } else if (preset === "ALL") {
      onFilterChange({ ...filters, date_from: "", date_to: "" });
    }
  };

  const curMonth = getCurrentMonthRange();
  const isCurrentMonthActive = 
    filters.date_from === curMonth.date_from && filters.date_to === curMonth.date_to;

  const hasActiveFilters =
    Boolean(filters.entry_type) ||
    Boolean(filters.remarks) ||
    Boolean(filters.vendor_name) ||
    (!isCurrentMonthActive && (Boolean(filters.date_from) || Boolean(filters.date_to)));

  return (
    <div className="mb-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 space-y-2.5 transition-all shadow-2xs">
      {/* BARIS UTAMA: SEARCH, MONTH SELECTOR, QUICK ACTION */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari vendor / rute / aktivitas..."
              value={filters.vendor_name}
              onChange={(e) => handleChange("vendor_name", e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 w-52 sm:w-60 shadow-2xs font-medium"
            />
          </div>

          {/* MONTH CONTROLLER (PER-BULAN DENGAN PREV/NEXT) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center px-1">
              <Calendar className="w-3.5 h-3.5 text-sky-700 mr-1.5 pointer-events-none" />
              <select
                value={currentMonthKey}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 pr-5 py-1 focus:outline-none cursor-pointer appearance-none"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.monthKey} value={opt.monthKey}>
                    {opt.displayLabel}
                  </option>
                ))}
                <option value="ALL">Semua Waktu (Tanpa Filter)</option>
                {currentMonthKey === "CUSTOM" && (
                  <option value="CUSTOM">
                    Kustom: {formatActivePeriod(filters.date_from, filters.date_to)}
                  </option>
                )}
              </select>
              <div className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                ▼
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* QUICK PRESET BUTTONS */}
          <div className="hidden sm:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => applyPreset("THIS_MONTH")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isCurrentMonthActive
                  ? "bg-sky-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("LAST_MONTH")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Bulan Lalu
            </button>
            <button
              type="button"
              onClick={() => applyPreset("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                !filters.date_from && !filters.date_to
                  ? "bg-sky-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
          </div>

          {/* RANGE TANGGAL & FILTER LANJUTAN TOGGLE */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isOpen || currentMonthKey === "CUSTOM" || filters.entry_type || filters.remarks
                ? "bg-sky-700 text-white border-sky-700 shadow-2xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Range & Filter {currentMonthKey === "CUSTOM" ? "(Kustom)" : ""}</span>
          </button>
        </div>

        {/* RIGHT: RESET ACTION */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs"
            title="Kembalikan ke Bulan Ini"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset (Bulan Ini)</span>
          </button>
        )}
      </div>

      {/* BARIS SUB-NAV: KATEGORI PILL & INFORMASI PERIODE AKTIF */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
        {/* Kategori Pills */}
        <div className="flex items-center gap-1">
          {[
            { label: "Semua Tipe", entry_type: "", remarks: "" },
            { label: "Shipment", entry_type: "SHIPMENT", remarks: "" },
            { label: "Top Up Modal", entry_type: "TOP_UP", remarks: "" },
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
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Status Periode Aktif & Urutan */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/70 text-sky-900 font-bold border border-sky-200">
            <Calendar className="w-3 h-3 text-sky-700" />
            <span>Periode: {formatActivePeriod(filters.date_from, filters.date_to)}</span>
          </span>

          {onToggleSort && (
            <button
              type="button"
              onClick={onToggleSort}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold hover:text-sky-800 cursor-pointer shadow-2xs"
              title="Klik untuk ubah urutan"
            >
              <span>Urut: {sortDir === "ASC" ? "Terlama (ASC) ↑" : "Terbaru (DESC) ↓"}</span>
            </button>
          )}
        </div>
      </div>

      {/* EXPANDABLE SECTION: RENTANG TANGGAL KUSTOM & FILTER DETAIL */}
      {isOpen && (
        <div className="pt-3 border-t border-slate-200/80 animate-fade-in space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                Pilih Rentang Tanggal Spesifik (Range Tanggal)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPreset("THIS_MONTH")}
                  className="text-[10px] text-sky-700 hover:underline font-bold px-1.5 py-0.5"
                >
                  Bulan Ini
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => applyPreset("LAST_30")}
                  className="text-[10px] text-sky-700 hover:underline font-bold px-1.5 py-0.5"
                >
                  30 Hari Terakhir
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => applyPreset("ALL")}
                  className="text-[10px] text-slate-500 hover:underline font-bold px-1.5 py-0.5"
                >
                  Hapus Rentang
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Dari Tanggal (Mulai)
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleChange("date_from", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Sampai Tanggal (Selesai)
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleChange("date_to", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tipe Transaksi
                </label>
                <select
                  value={filters.entry_type}
                  onChange={(e) => handleChange("entry_type", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">Semua Tipe Transaksi</option>
                  <option value="SHIPMENT">SHIPMENT (Pengiriman / Biaya)</option>
                  <option value="TOP_UP">TOP_UP (Kas Masuk / Modal)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Status Pembayaran (TOP)
                </label>
                <select
                  value={filters.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-sky-600 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="UNPAID">Belum Lunas (UNPAID)</option>
                  <option value="PENDING">Sebagian (PENDING)</option>
                  <option value="PAID">Lunas (PAID)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
