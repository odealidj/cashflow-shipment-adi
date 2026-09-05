"use client";

import React, { ReactNode } from "react";

interface TableCardProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function TableCard({ children, footer, className = "" }: TableCardProps) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-[480px] ${className}`}>
      <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-[220px]">
        {children}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-slate-100 bg-white">
          {footer}
        </div>
      )}
    </div>
  );
}

export const tableTheadClass = "sticky top-0 z-10 bg-[#EBF3FA]/95 backdrop-blur-xs text-[#223249] border-b border-sky-200/70 font-black tracking-wider uppercase text-[11px] shadow-2xs select-none";

export interface ActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  variant?: "sky" | "amber" | "rose" | "slate" | "emerald";
  disabled?: boolean;
}

export function ActionButton({ onClick, icon, title, variant = "sky", disabled = false }: ActionButtonProps) {
  const variantStyles = {
    sky: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    slate: "bg-slate-50 text-slate-600 hover:bg-slate-100",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]}`}
    >
      {icon}
    </button>
  );
}
