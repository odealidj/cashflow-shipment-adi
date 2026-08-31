'use client';

import React, { useState, useMemo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { TagihanCardMobile } from '@/components/mobile/TagihanCardMobile';
import { useCashflowMobile } from '@/hooks/useCashflowMobile';
import { formatRupiah } from '@/hooks/useAutoCalculate';

export default function TagihanPage() {
  const { entries, loading, quickPay } = useCashflowMobile();
  const safeEntries = Array.isArray(entries) ? entries : [];
  const [tabFilter, setTabFilter] = useState<'ALL' | 'UNPAID' | 'OVERDUE'>('ALL');

  // Filter only unpaid or pending entries (tagihan)
  const allTagihan = useMemo(() => {
    return safeEntries.filter((e) => e.entry_type === 'SHIPMENT' && e.remarks !== 'PAID');
  }, [safeEntries]);

  // Calculate overdue count
  const overdueTagihan = useMemo(() => {
    const now = new Date();
    return allTagihan.filter((e) => {
      if (!e.due_date) return false;
      const due = new Date(e.due_date);
      return !isNaN(due.getTime()) && now > due;
    });
  }, [allTagihan]);

  // Filtered according to selected tab
  const displayedTagihan = useMemo(() => {
    if (tabFilter === 'OVERDUE') return overdueTagihan;
    if (tabFilter === 'UNPAID') return allTagihan.filter((e) => e.remarks === 'UNPAID');
    return allTagihan;
  }, [allTagihan, overdueTagihan, tabFilter]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tagihan</h1>
        <p className="text-[13px] text-slate-500 font-medium">Kelola tagihan yang belum dibayar</p>
      </div>

      <div className="px-4 py-2 space-y-4">
        {/* 1. Summary Row (2 Kolom) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Belum Dibayar */}
          <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-sky-700">
            <div className="flex items-center gap-1.5 text-slate-600 text-[12px] font-bold">
              <Clock className="w-3.5 h-3.5 text-sky-700" />
              <span>Belum Dibayar</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-800">{allTagihan.length}</span>
            </div>
          </div>

          {/* Jatuh Tempo */}
          <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-rose-500">
            <div className="flex items-center gap-1.5 text-rose-700 text-[12px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Jatuh Tempo</span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-rose-700">{overdueTagihan.length}</span>
            </div>
          </div>
        </div>

        {/* 2. Alert Banner (If any overdue) */}
        {overdueTagihan.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-rose-800">
            <div className="flex items-center gap-2 font-bold text-[13px]">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{overdueTagihan.length} tagihan perlu perhatian</span>
            </div>
            <p className="text-[12px] text-rose-700 mt-1 leading-snug">
              Tagihan telah melewati batas jatuh tempo dan memerlukan pelunasan segera.
            </p>
          </div>
        )}

        {/* 3. Filter Tabs (Semua, Belum Bayar, Lewat Jatuh Tempo) */}
        <div className="flex items-center gap-2">
          {[
            { key: 'ALL', label: 'Semua', count: allTagihan.length },
            { key: 'UNPAID', label: 'Belum Bayar', count: allTagihan.filter((e) => e.remarks === 'UNPAID').length },
            { key: 'OVERDUE', label: 'Lewat Jatuh Tempo', count: overdueTagihan.length },
          ].map((tab) => {
            const isActive = tabFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTabFilter(tab.key as any)}
                className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                  isActive ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 4. List Tagihan Cards */}
        <div className="space-y-3 pt-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Memuat tagihan...</div>
          ) : displayedTagihan.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100 text-xs">
              Tidak ada tagihan yang tertunda saat ini.
            </div>
          ) : (
            displayedTagihan.map((entry) => (
              <TagihanCardMobile key={entry.id} entry={entry} onQuickPay={quickPay} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
