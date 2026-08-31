'use client';

import React from 'react';
import { BarChart3, Trophy, AlertTriangle } from 'lucide-react';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { CashflowEntry } from '@/hooks/useCashflowMobile';

interface VendorPerformanceCardProps {
  entries: CashflowEntry[];
}

export const VendorPerformanceCard: React.FC<VendorPerformanceCardProps> = ({ entries }) => {
  const safeEntries = Array.isArray(entries) ? entries : [];
  // Aggregate profit per vendor
  const vendorStats: Record<string, number> = {};
  safeEntries.forEach((e) => {
    if (e.entry_type === 'SHIPMENT' && e.vendor_name_raw) {
      const v = e.vendor_name_raw.trim();
      vendorStats[v] = (vendorStats[v] || 0) + Number(e.profit || 0);
    }
  });

  const sortedVendors = Object.entries(vendorStats).sort((a, b) => b[1] - a[1]);

  if (sortedVendors.length === 0) {
    return null;
  }

  const bestVendor = sortedVendors[0];
  const worstVendor = sortedVendors[sortedVendors.length - 1];

  const maxAbsProfit = Math.max(...sortedVendors.map(([_, p]) => Math.abs(p)), 1);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="font-extrabold text-[15px] text-slate-900">Performa Vendor</h3>
      </div>

      {/* 2 Highlight Boxes */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Best Vendor */}
        <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold">
            <Trophy className="w-3.5 h-3.5" />
            <span>Vendor Terbaik</span>
          </div>
          <div className="mt-1.5">
            <p className="text-[13px] font-bold text-slate-900 truncate">{bestVendor[0]}</p>
            <p className="text-[12px] font-extrabold text-emerald-600">{formatRupiah(bestVendor[1])}</p>
          </div>
        </div>

        {/* Attention Vendor */}
        <div className="bg-rose-50/80 border border-rose-100 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Perhatian</span>
          </div>
          <div className="mt-1.5">
            <p className="text-[13px] font-bold text-slate-900 truncate">{worstVendor[0]}</p>
            <p className="text-[12px] font-extrabold text-rose-600">{formatRupiah(worstVendor[1])}</p>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart List */}
      <div className="space-y-2.5">
        {sortedVendors.slice(0, 5).map(([vendor, profit]) => {
          const isPositive = profit >= 0;
          const pct = Math.min(Math.round((Math.abs(profit) / maxAbsProfit) * 100), 100);

          return (
            <div key={vendor} className="flex items-center gap-2 text-[12px]">
              <span className="w-24 text-slate-700 font-semibold truncate shrink-0">{vendor}</span>
              
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.max(pct, 5)}%` }}
                />
              </div>

              <span className={`w-20 text-right font-extrabold shrink-0 text-[11px] ${isPositive ? 'text-slate-800' : 'text-rose-600'}`}>
                {formatRupiah(profit)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
