"use client";

import React, { ReactNode } from "react";

interface TableCardProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function TableCard({ children, footer }: TableCardProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs">
      <div className="overflow-x-auto">
        {children}
      </div>
      {footer && (
        <div className="border-t border-slate-200 bg-slate-50/50 p-3">
          {footer}
        </div>
      )}
    </div>
  );
}

export const tableTheadClass = "bg-[#EBF3FA] text-[#223249] border-b border-sky-200/70 font-black tracking-wider uppercase text-[11px]";

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
