"use client";

import React from "react";
import Link from "next/link";
import { 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  Building
} from "lucide-react";

interface UrgentInvoicesPanelProps {
  invoices: any[];
  loading?: boolean;
}

export function UrgentInvoicesPanel({
  invoices,
  loading = false
}: UrgentInvoicesPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const calculateDaysDiff = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr);
    const now = new Date();
    // Normalize to midnight
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filter urgent invoices: OVERDUE or UNPAID with due_date in past or within next 7 days
  const urgentList = (invoices || [])
    .filter((inv) => inv.status === "OVERDUE" || inv.status === "UNPAID")
    .map((inv) => {
      const daysOverdue = calculateDaysDiff(inv.due_date);
      return {
        ...inv,
        daysOverdue
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Prioritas Penagihan Piutang
                {urgentList.length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.2 bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                    {urgentList.length} Perlu Follow-up
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Invoice klien yang telah jatuh tempo atau mendekati batas tempo
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/invoices"
            className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 group"
          >
            <span>Buka Invoices</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium animate-pulse">
            Memeriksa status penagihan invoice...
          </div>
        ) : urgentList.length === 0 ? (
          <div className="py-7 px-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-center my-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black text-emerald-800">
              Semua Penagihan Piutang Lancar
            </h4>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Tidak ada invoice yang melewati jatuh tempo saat ini. Arus kas piutang aman.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {urgentList.map((inv) => {
              const isPastDue = inv.daysOverdue > 0;
              return (
                <div
                  key={inv.id || inv.invoice_number}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800 truncate">
                        {inv.invoice_number}
                      </span>
                      {isPastDue ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                          Terlambat {inv.daysOverdue} Hari
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          Mendekati Tempo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{inv.customer_name || "Pelanggan Tanpa Nama"}</span>
                      <span>•</span>
                      <span className="text-slate-400">
                        Jatuh Tempo: {inv.due_date ? inv.due_date.substring(0, 10) : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-xs text-rose-700">
                      {formatCurrency(Number(inv.total_amount) || 0)}
                    </div>
                    <Link
                      href={`/dashboard/invoices?search=${encodeURIComponent(inv.invoice_number)}`}
                      className="text-[10px] text-sky-700 hover:text-sky-900 font-bold inline-flex items-center gap-0.5 mt-0.5"
                    >
                      <span>Detail</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Strategi Collection:</span>
        <span className="text-slate-700 font-bold">
          Follow-up invoice &gt; 7 hari keterlambatan via WhatsApp & Email
        </span>
      </div>
    </div>
  );
}
