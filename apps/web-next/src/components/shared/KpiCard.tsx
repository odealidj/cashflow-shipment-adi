"use client";

import React, { ReactNode } from "react";

export type KpiVariant = "default" | "success" | "warning" | "danger" | "teal" | "sky";

interface KpiCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle?: string | ReactNode;
  variant?: KpiVariant;
}

const variantStyles: Record<KpiVariant, { border: string; bgGradient: string; textVal: string; iconCol: string }> = {
  default: {
    border: "border-slate-200/80",
    bgGradient: "bg-white",
    textVal: "text-slate-900",
    iconCol: "text-sky-700"
  },
  success: {
    border: "border-emerald-200/80",
    bgGradient: "bg-white bg-gradient-to-b from-white to-emerald-50/20",
    textVal: "text-emerald-700",
    iconCol: "text-emerald-600"
  },
  warning: {
    border: "border-amber-200/80",
    bgGradient: "bg-white bg-gradient-to-b from-white to-amber-50/20",
    textVal: "text-amber-700",
    iconCol: "text-amber-600"
  },
  danger: {
    border: "border-rose-200/80",
    bgGradient: "bg-white bg-gradient-to-b from-white to-rose-50/20",
    textVal: "text-rose-600",
    iconCol: "text-rose-600"
  },
  teal: {
    border: "border-teal-200/80",
    bgGradient: "bg-white bg-gradient-to-b from-white to-teal-50/20",
    textVal: "text-teal-700",
    iconCol: "text-teal-600"
  },
  sky: {
    border: "border-sky-200/80",
    bgGradient: "bg-white bg-gradient-to-b from-white to-sky-50/20",
    textVal: "text-sky-950",
    iconCol: "text-sky-700"
  }
};

export function KpiCard({ title, value, icon, subtitle, variant = "default" }: KpiCardProps) {
  const st = variantStyles[variant] || variantStyles.default;

  return (
    <div className={`rounded-2xl p-3.5 border ${st.border} ${st.bgGradient} shadow-2xs transition-all hover:shadow-xs`}>
      <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider">
        <span className="truncate pr-1">{title}</span>
        <span className={st.iconCol}>{icon}</span>
      </div>
      <div className={`mt-1.5 font-mono text-base lg:text-lg font-black ${st.textVal} truncate`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
