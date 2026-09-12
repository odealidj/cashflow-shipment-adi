"use client";

import React from "react";
import { Sparkles, Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type NarrativeStatus = "success" | "warning" | "danger" | "info";

export interface SmartNarrativeBadge {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export interface SmartNarrativeBoxProps {
  status?: NarrativeStatus;
  title?: string;
  narrative: string;
  badges?: SmartNarrativeBadge[];
  className?: string;
}

export function SmartNarrativeBox({
  status = "info",
  title = "Insight Eksekutif",
  narrative,
  badges = [],
  className = ""
}: SmartNarrativeBoxProps) {
  const getStatusStyles = () => {
    switch (status) {
      case "success":
        return {
          container: "bg-emerald-50/70 border-emerald-200/80 text-emerald-950",
          iconBg: "bg-emerald-100 text-emerald-700",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          titleColor: "text-emerald-900"
        };
      case "warning":
        return {
          container: "bg-amber-50/80 border-amber-200/80 text-amber-950",
          iconBg: "bg-amber-100 text-amber-700",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          titleColor: "text-amber-900"
        };
      case "danger":
        return {
          container: "bg-rose-50/80 border-rose-200/80 text-rose-950",
          iconBg: "bg-rose-100 text-rose-700",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          titleColor: "text-rose-900"
        };
      default:
        return {
          container: "bg-sky-50/70 border-sky-200/70 text-sky-950",
          iconBg: "bg-sky-100 text-sky-700",
          icon: <Sparkles className="w-3.5 h-3.5" />,
          titleColor: "text-sky-900"
        };
    }
  };

  const current = getStatusStyles();

  return (
    <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start gap-2.5 shadow-2xs ${current.container} ${className}`}>
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${current.iconBg}`}>
        {current.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className={`font-black text-[11px] uppercase tracking-wider ${current.titleColor}`}>
            {title}
          </span>
          {badges.map((b, idx) => {
            let bClass = "bg-slate-100 text-slate-700 border-slate-200";
            if (b.variant === "success") bClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
            if (b.variant === "warning") bClass = "bg-amber-100 text-amber-800 border-amber-300";
            if (b.variant === "danger") bClass = "bg-rose-100 text-rose-800 border-rose-300";
            if (b.variant === "info") bClass = "bg-sky-100 text-sky-800 border-sky-300";

            return (
              <span
                key={idx}
                className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full border leading-tight ${bClass}`}
              >
                {b.label}
              </span>
            );
          })}
        </div>
        <p className="text-[11px] font-medium leading-relaxed opacity-90">
          {narrative}
        </p>
      </div>
    </div>
  );
}
