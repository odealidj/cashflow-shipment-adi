"use client";

import React, { useState, useEffect, useRef } from "react";
import { Info, X, Target, Briefcase, Calculator } from "lucide-react";

export interface ChartInfoPopoverProps {
  title: string;
  purpose: string;
  benefits: string[];
  formula?: string;
  dataSources?: string[];
  align?: "left" | "right";
}

export function ChartInfoPopover({
  title,
  purpose,
  benefits,
  formula,
  dataSources,
  align = "right"
}: ChartInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? "bg-sky-700 text-white shadow-xs"
            : "text-slate-400 hover:text-sky-700 hover:bg-sky-50"
        }`}
        title={`Penjelasan & Manfaat: ${title}`}
        aria-label={`Penjelasan & Manfaat: ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 top-full mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-white border border-sky-100 shadow-xl text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-black text-slate-900 text-xs leading-tight">
                {title}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Section 1: Untuk Apa Grafik Ini? */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-sky-800 uppercase tracking-wider mb-1">
                <Target className="w-3 h-3 text-sky-700" />
                <span>Untuk Apa Grafik Ini?</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pl-4 border-l-2 border-sky-200">
                {purpose}
              </p>
            </div>

            {/* Section 2: Manfaat Bisnis & Keputusan Eksekutif */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">
                <Briefcase className="w-3 h-3 text-emerald-700" />
                <span>Manfaat & Keputusan Bisnis</span>
              </div>
              <ul className="space-y-1 pl-4 border-l-2 border-emerald-200">
                {benefits.map((b, idx) => (
                  <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Rumus & Basis Data */}
            {formula && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  <Calculator className="w-3 h-3 text-slate-400" />
                  <span>Formula & Basis Data</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-[10px] font-mono text-slate-700 border border-slate-200/60 leading-relaxed">
                  {formula}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
