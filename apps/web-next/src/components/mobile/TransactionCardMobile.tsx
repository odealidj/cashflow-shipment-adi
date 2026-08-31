'use client';

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { CashflowEntry } from '@/hooks/useCashflowMobile';

interface TransactionCardMobileProps {
  entry: CashflowEntry;
}

export const TransactionCardMobile: React.FC<TransactionCardMobileProps> = ({ entry }) => {
  const isShipment = entry.entry_type === 'SHIPMENT';
  const isPaid = entry.remarks === 'PAID';
  const isUnpaid = entry.remarks === 'UNPAID';
  const isPending = entry.remarks === 'PENDING';

  // Calculate overdue days
  let overdueDays = 0;
  if (!isPaid && entry.due_date) {
    const due = new Date(entry.due_date);
    const now = new Date();
    if (!isNaN(due.getTime()) && now > due) {
      const diffTime = Math.abs(now.getTime() - due.getTime());
      overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // Format date display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 border-l-4 border-l-rose-500 relative transition-all">
      {/* Top Row: Vendor & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-slate-900 truncate">
            {entry.vendor_name_raw || entry.act_information || 'Top-Up Kas'}
          </h2>
          <p className="text-[12px] text-slate-600 truncate mt-0.5">
            {entry.act_information || entry.act_explaination || (isShipment ? 'Biaya Operasional' : 'Modal Masuk')}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0 gap-1">
          {isPaid && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs">
              Lunas
            </span>
          )}
          {isUnpaid && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs">
              Belum Lunas
            </span>
          )}
          {isPending && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-white shadow-xs">
              Sebagian
            </span>
          )}

          <span className={`text-[14px] font-extrabold ${isShipment ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isShipment ? formatRupiah(entry.debit) : formatRupiah(entry.kredit)}
          </span>
        </div>
      </div>

      {/* Bottom Info Row: Date, Profit, Margin */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatDate(entry.date_of_entry)}</span>
        </div>

        {isShipment && (
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold ${entry.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Profit: {formatRupiah(entry.profit)}
            </span>
            {entry.margin_pct > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-bold rounded text-[10px]">
                {entry.margin_pct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Overdue Alert if applicable */}
      {overdueDays > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
          <Clock className="w-3.5 h-3.5" />
          <span>Lewat {overdueDays} hari</span>
        </div>
      )}
    </div>
  );
};
