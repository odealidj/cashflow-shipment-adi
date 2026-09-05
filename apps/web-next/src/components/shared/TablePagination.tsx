"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages?: number;
  totalItems: number;
  pageSize: number;
  currentCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemUnit?: string;
  className?: string;
  infoSuffix?: string;
}

export function TablePagination({
  currentPage,
  totalPages: customTotalPages,
  totalItems,
  pageSize,
  currentCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50],
  itemUnit = "data",
  className = "",
  infoSuffix = ""
}: TablePaginationProps) {
  const totalPages = customTotalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min((currentPage - 1) * pageSize + currentCount, totalItems);

  // Generate visible page numbers (max 5 page buttons with smart sliding window)
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div
      className={`shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 flex flex-wrap justify-between items-center gap-3 select-none ${className}`}
    >
      {/* 1. Kiri: Info Jumlah Data & Pilihan Limit Baris */}
      <div className="flex items-center flex-wrap gap-3">
        <div className="text-xs text-slate-500 font-medium">
          Menampilkan{" "}
          <span className="font-extrabold text-slate-900">
            {totalItems === 0 ? "0" : `${startItem} - ${endItem}`}
          </span>{" "}
          dari <span className="font-extrabold text-slate-900">{totalItems}</span> {itemUnit}
          {infoSuffix && <span className="text-slate-400 ml-1">({infoSuffix})</span>}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-2 border-l border-slate-200">
            <span>Baris per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Kanan: Tombol Navigasi Halaman Profesional */}
      <div className="flex items-center gap-1.5">
        {/* Tombol Halaman Pertama (<<) */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="Halaman Pertama"
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Tombol Sebelumnya (<) */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Halaman Sebelumnya"
          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </button>

        {/* Nomor Halaman Dinamis */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === "..." || typeof p === "string") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-xs text-slate-400 font-bold">
                  ...
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-7 h-7 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#1B2A4A] text-white shadow-xs border border-[#1B2A4A] scale-105"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Tombol Selanjutnya (>) */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Halaman Selanjutnya"
          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Tombol Halaman Terakhir (>>) */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Halaman Terakhir"
          className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
