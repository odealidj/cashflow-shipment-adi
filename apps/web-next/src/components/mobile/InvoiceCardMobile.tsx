'use client';

import React from 'react';
import { FileText, Building2, Calendar, Clock, Check, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { formatDate } from '@/lib/dateUtils';

export interface InvoiceMobileData {
  id: number;
  invoice_no: string;
  client_name: string;
  customer_id?: number;
  shipment_date: string;
  top_terms?: string;
  top_days: number;
  due_date: string;
  total_amount?: number;
  amount?: number;
  status: string;
  notes?: string;
  paid_date?: string;
}

interface InvoiceCardMobileProps {
  invoice: InvoiceMobileData;
  onSettle: (invoice: InvoiceMobileData) => void;
  onViewDetail: (invoice: InvoiceMobileData) => void;
}

export const InvoiceCardMobile: React.FC<InvoiceCardMobileProps> = ({
  invoice,
  onSettle,
  onViewDetail,
}) => {
  const isPaid = invoice.status === 'PAID';
  const totalAmount = Number(invoice.total_amount ?? invoice.amount ?? 0);

  // Overdue check
  let isOverdue = invoice.status === 'OVERDUE';
  let overdueDays = 0;
  if (!isPaid && invoice.due_date) {
    const due = new Date(invoice.due_date);
    const now = new Date();
    if (!isNaN(due.getTime()) && now > due) {
      isOverdue = true;
      const diffTime = Math.abs(now.getTime() - due.getTime());
      overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div
      className={`rounded-2xl p-4 shadow-xs border transition-all ${
        isPaid
          ? 'bg-white border-slate-100 border-l-4 border-l-emerald-500'
          : isOverdue
          ? 'bg-rose-50/50 border-rose-200 border-l-4 border-l-rose-500'
          : 'bg-white border-slate-100 border-l-4 border-l-sky-600'
      }`}
    >
      {/* Top Row: Invoice Number & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100">
            <FileText className="w-4 h-4 text-sky-700" />
          </div>
          <div className="truncate">
            <span className="text-[13px] font-black text-slate-900 tracking-tight block truncate">
              {invoice.invoice_no || `INV-#${invoice.id}`}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Invoice Piutang Klien</span>
          </div>
        </div>

        <div className="shrink-0">
          {isPaid ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
              Lunas
            </span>
          ) : isOverdue ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider shadow-2xs animate-pulse">
              {overdueDays > 0 ? `Lewat ${overdueDays} Hari` : 'Jatuh Tempo'}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
              Belum Lunas
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Client Name & Shipment Info */}
      <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-800">
          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-extrabold text-[13px] truncate">
            {invoice.client_name || 'Customer Umum'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Kirim: {formatDate(invoice.shipment_date)}</span>
          </div>
          {invoice.top_terms && (
            <span className="text-slate-400">• {invoice.top_terms}</span>
          )}
        </div>
      </div>

      {/* Due Date Indicator */}
      {invoice.due_date && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${
          isOverdue ? 'text-rose-700' : 'text-slate-600'
        }`}>
          <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
          <span>Jatuh Tempo: {formatDate(invoice.due_date)}</span>
        </div>
      )}

      {/* Bottom Row: Nominal & Action Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Nominal Piutang
          </span>
          <span className="text-[15px] font-black text-slate-900 tracking-tight">
            {formatRupiah(totalAmount)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewDetail(invoice)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
          >
            Rincian
          </button>

          {!isPaid && (
            <button
              type="button"
              onClick={() => onSettle(invoice)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Pelunasan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
