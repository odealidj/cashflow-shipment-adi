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

export const tableTheadClass = "bg-[#F1F5F9] border-b border-slate-200 text-[#334155] font-black tracking-wider uppercase text-[11px]";
