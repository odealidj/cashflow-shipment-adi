"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { 
  MapPin, 
  ArrowRight, 
  TrendingUp, 
  Truck, 
  Percent, 
  Award 
} from "lucide-react";

interface TopRoutesAnalyticsPanelProps {
  cashflowEntries: any[];
  loading?: boolean;
}

export function TopRoutesAnalyticsPanel({
  cashflowEntries,
  loading = false
}: TopRoutesAnalyticsPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Group shipment entries by Route (act_information or act_explaination)
  const topRoutes = useMemo(() => {
    const routeMap = new Map<
      string,
      {
        name: string;
        trips: number;
        revenue: number;
        profit: number;
      }
    >();

    (cashflowEntries || [])
      .filter((e) => e.entry_type === "SHIPMENT")
      .forEach((entry) => {
        const rawName = (entry.act_information || entry.act_explaination || "Rute Umum Operasional").trim();
        // Clean up common prefixes if any
        const name = rawName.length > 35 ? `${rawName.substring(0, 32)}...` : rawName;

        const existing = routeMap.get(name) || {
          name,
          trips: 0,
          revenue: 0,
          profit: 0
        };

        existing.trips += 1;
        existing.revenue += Number(entry.grand_selling) || 0;
        existing.profit += Number(entry.profit) || 0;

        routeMap.set(name, existing);
      });

    return Array.from(routeMap.values())
      .map((r) => {
        const marginPct = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
        return {
          ...r,
          marginPct
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [cashflowEntries]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Rute & Pengiriman Paling Menguntungkan
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Kontribusi margin profit kotor dan frekuensi trip per rute armada
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/transactions"
            className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 group"
          >
            <span>Detail Buku Kas</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium animate-pulse">
            Menganalisis performa rute pengiriman...
          </div>
        ) : topRoutes.length === 0 ? (
          <div className="py-7 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center my-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black text-slate-700">
              Belum Ada Data Shipment
            </h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Belum ada transaksi pengiriman armada yang tercatat pada rentang periode ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topRoutes.map((route, idx) => {
              const rankColor = [
                "bg-amber-100 text-amber-800 border-amber-300",
                "bg-slate-200 text-slate-700 border-slate-300",
                "bg-orange-100 text-orange-800 border-orange-200"
              ][idx] || "bg-slate-100 text-slate-600 border-slate-200";

              return (
                <div
                  key={route.name}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border font-mono shrink-0 ${rankColor}`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        <span className="truncate">{route.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                          <Truck className="w-3 h-3 text-slate-400" />
                          {route.trips} Pengiriman
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                          Omset: {formatCurrency(route.revenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-xs text-teal-700">
                      +{formatCurrency(route.profit)}
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200/80 inline-block mt-0.5">
                      Margin {route.marginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Evaluasi Margin Armada:</span>
        <span className="text-teal-700 font-bold">
          Prioritaskan negosiasi vendor pada rute dengan margin &lt; 10%
        </span>
      </div>
    </div>
  );
}
