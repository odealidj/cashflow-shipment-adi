'use client';

import React, { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { CashflowEntry } from '@/hooks/useCashflowMobile';
import { formatDate } from '@/lib/dateUtils';

interface TagihanCardMobileProps {
  entry: CashflowEntry;
  onQuickPay: (id: number) => Promise<{ success: boolean; error?: string }>;
}

export const TagihanCardMobile: React.FC<TagihanCardMobileProps> = ({ entry, onQuickPay }) => {
  const [isPaying, setIsPaying] = useState(false);

  // Check if overdue
  let isOverdue = false;
  let overdueDays = 0;
  if (entry.due_date) {
    const due = new Date(entry.due_date);
    const now = new Date();
    if (!isNaN(due.getTime()) && now > due) {
      isOverdue = true;
      const diffTime = Math.abs(now.getTime() - due.getTime());
      overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const handlePay = async () => {
    setIsPaying(true);
    await onQuickPay(entry.id);
    setIsPaying(false);
  };

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm border transition-all ${
        isOverdue ? 'bg-rose-50/70 border-rose-100' : 'bg-white border-slate-100'
      }`}
    >
      {/* Top: Vendor Name & Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-slate-900 truncate">
            {entry.vendor_name_raw || entry.act_information || 'Tagihan Operasional'}
          </h2>
          <p className="text-[12px] text-slate-600 truncate mt-0.5">{entry.act_information || 'Biaya Pengiriman'}</p>
        </div>

        {isOverdue && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white uppercase tracking-wider shadow-xs shrink-0">
            Lewat {overdueDays} Hari
          </span>
        )}
      </div>

      {/* Middle: Amount & Quick Pay Button */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-500 block">Total Tagihan</span>
          <span className="text-[16px] font-black text-slate-900 tracking-tight">
            {formatRupiah(entry.grand_cost || entry.debit)}
          </span>
        </div>

        <button
          onClick={handlePay}
          disabled={isPaying}
          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[12px] flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>{isPaying ? 'Memproses...' : 'Bayar'}</span>
        </button>
      </div>

      {/* Bottom: Due Date */}
      {entry.due_date && (
        <div className="mt-2 pt-2 border-t border-rose-200/60 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Jatuh tempo: {formatDate(entry.due_date)}</span>
        </div>
      )}
    </div>
  );
};
