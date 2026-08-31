"use client";

import React, { ReactNode } from "react";
import { Calendar } from "lucide-react";

interface KpiCardGridProps {
  periodLabel?: string;
  isCurrentPeriod?: boolean;
  periodPrefix?: string;
  infoNote?: string;
  children: ReactNode;
  cols?: 2 | 3 | 4 | 5;
}

export function KpiCardGrid({
  periodLabel,
  isCurrentPeriod,
  periodPrefix = "Kinerja",
  infoNote = "Nilai otomatis menyesuaikan filter periode",
  children,
  cols = 4
}: KpiCardGridProps) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
  }[cols];

  return (
    <div className="space-y-2">
      {periodLabel && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700">
            <div className="w-5 h-5 rounded-md bg-sky-100/80 text-sky-800 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span>
              {periodPrefix}: <span className="text-sky-800 underline decoration-sky-300 underline-offset-2">{periodLabel}</span>
            </span>
            {isCurrentPeriod && (
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                ● Bulan Berjalan
              </span>
            )}
          </div>
          {infoNote && (
            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {infoNote}
            </div>
          )}
        </div>
      )}

      <div className={`grid ${colClass} gap-3`}>
        {children}
      </div>
    </div>
  );
}
