"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Filter, 
  Search, 
  RotateCcw, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { fetchWithAuth } from "@/lib/apiClient";

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
  embedded?: boolean;
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

  const formatDateIndo = (str: string) => formatDate(str);

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
  onToggleSort,
  embedded = false
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbPeriods, setDbPeriods] = useState<Array<{
    month_key: string;
    year: number;
    month: number;
    total_count: number;
  }>>([]);

  // Fetch available periods from backend database
  useEffect(() => {
    let isMounted = true;
    async function loadPeriods() {
      try {
        const res = await fetchWithAuth("/api/v1/cashflow/periods");
        if (res.ok) {
          const json = await res.json();
          if (json.status && Array.isArray(json.data) && isMounted) {
            setDbPeriods(json.data);
          }
        }
      } catch (err) {
        console.error("Gagal memuat periode transaksi cashflow:", err);
      }
    }
    loadPeriods();
    return () => {
      isMounted = false;
    };
  }, []);

  // Generate dynamic month options bounded by actual data and current month (no future months)
  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();
    const curRange = getMonthRange(currentY, currentM);
    const lastRange = getMonthRange(currentY, currentM - 1);

    // Build count map from DB periods
    const countMap = new Map<string, number>();
    dbPeriods.forEach((p) => {
      countMap.set(p.month_key, p.total_count);
    });

    // Keys set: always include current month and last month
    const keysSet = new Set<string>();
    keysSet.add(curRange.monthKey);
    keysSet.add(lastRange.monthKey);

    // Add all months from DB that have data, capped at current month (strictly no future months)
    dbPeriods.forEach((p) => {
      if (p.month_key && p.month_key <= curRange.monthKey) {
        keysSet.add(p.month_key);
      }
    });

    const options = Array.from(keysSet).map((mKey) => {
      const [yStr, mStr] = mKey.split("-");
      const y = parseInt(yStr, 10);
      const mIdx = parseInt(mStr, 10) - 1;
      const range = getMonthRange(y, mIdx);
      const count = countMap.get(mKey) || 0;
      const isCurrent = mKey === curRange.monthKey;
      const isLast = mKey === lastRange.monthKey;

      let displayLabel = range.label;
      if (isCurrent) {
        displayLabel = count > 0 
          ? `${range.label} (Bulan Ini - ${count} transaksi)`
          : `${range.label} (Bulan Ini)`;
      } else if (isLast && count === 0) {
        displayLabel = `${range.label} (Bulan Lalu)`;
      } else if (count > 0) {
        displayLabel = `${range.label} (${count} transaksi)`;
      }

      return {
        ...range,
        isCurrent,
        totalCount: count,
        displayLabel
      };
    });

    // Sort newest first (descending by monthKey)
    return options.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [dbPeriods]);

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

  const currentIndex = useMemo(() => {
    return monthOptions.findIndex((opt) => opt.monthKey === currentMonthKey);
  }, [monthOptions, currentMonthKey]);

  // Newer months are at lower index (0 is newest/current month)
  // Older months are at higher index (monthOptions.length - 1 is oldest)
  const canGoNext = currentIndex > 0;
  const canGoPrev = currentIndex >= 0 && currentIndex < monthOptions.length - 1;

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  // Month navigation: previous month (older period)
  const handlePrevMonth = () => {
    if (currentIndex >= 0 && currentIndex < monthOptions.length - 1) {
      const prevOpt = monthOptions[currentIndex + 1];
      onFilterChange({
        ...filters,
        date_from: prevOpt.date_from,
        date_to: prevOpt.date_to
      });
    } else if (currentIndex === -1 && monthOptions.length > 0) {
      // If currently ALL or CUSTOM, select current month
      const curOpt = monthOptions[0];
      onFilterChange({
        ...filters,
        date_from: curOpt.date_from,
        date_to: curOpt.date_to
      });
    }
  };

  // Month navigation: next month (newer period)
  const handleNextMonth = () => {
    if (currentIndex > 0) {
      const nextOpt = monthOptions[currentIndex - 1];
      onFilterChange({
        ...filters,
        date_from: nextOpt.date_from,
        date_to: nextOpt.date_to
      });
    }
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

  const lastMonthRange = useMemo(() => {
    const now = new Date();
    return getMonthRange(now.getFullYear(), now.getMonth() - 1);
  }, []);
  const isLastMonthActive = 
    filters.date_from === lastMonthRange.date_from && filters.date_to === lastMonthRange.date_to;

  const hasActiveFilters =
    Boolean(filters.entry_type) ||
    Boolean(filters.remarks) ||
    Boolean(filters.vendor_name) ||
    (!isCurrentMonthActive && (Boolean(filters.date_from) || Boolean(filters.date_to)));

  return (
    <div className={embedded 
      ? "shrink-0 px-6 py-2.5 bg-slate-50/40 border-b border-slate-100 space-y-2.5 transition-all" 
      : "bg-white border border-slate-200/80 rounded-2xl p-3 space-y-2.5 transition-all shadow-2xs"
    }>
      {/* BARIS UTAMA: SEARCH, MONTH SELECTOR, QUICK ACTION, RANGE FILTER, SORT */}
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
              disabled={!canGoPrev}
              title={canGoPrev ? "Bulan Sebelumnya" : "Batas periode terlama"}
              className={`p-1 rounded-lg transition-colors ${
                canGoPrev
                  ? "hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-300 opacity-40 cursor-not-allowed"
              }`}
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
              disabled={!canGoNext}
              title={canGoNext ? "Bulan Berikutnya" : "Batas bulan terbaru (Bulan Ini)"}
              className={`p-1 rounded-lg transition-colors ${
                canGoNext
                  ? "hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-300 opacity-40 cursor-not-allowed"
              }`}
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                isLastMonthActive
                  ? "bg-sky-800 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
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

          {/* URUTKAN TRANSAKSI (SEJAJAR DENGAN RANGE & FILTER) */}
          {onToggleSort && (
            <button
              type="button"
              onClick={onToggleSort}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-sky-800 shadow-2xs"
              title="Klik untuk ubah urutan transaksi (Terbaru / Terlama)"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Urut: {sortDir === "ASC" ? "Terlama (ASC) ↑" : "Terbaru (DESC) ↓"}</span>
            </button>
          )}
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
                  <option value="INVOICE_PAYMENT">PELUNASAN INVOICE (Penerimaan Tagihan)</option>
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
