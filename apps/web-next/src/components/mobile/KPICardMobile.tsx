'use client';

import React from 'react';
import { Wallet, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { CashflowSummary } from '@/hooks/useCashflowMobile';

interface KPICardMobileProps {
  summary: CashflowSummary;
}

export const KPICardMobile: React.FC<KPICardMobileProps> = ({ summary }) => {
  const cards = [
    {
      label: 'Total Saldo Aktif',
      value: formatRupiah(summary.current_saldo),
      subtitle: 'Kredit - Debit',
      borderColor: 'border-l-sky-700',
      valueColor: 'text-sky-800',
      icon: Wallet,
      iconBg: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Total Profit',
      value: formatRupiah(summary.total_profit),
      subtitle: 'Margin positif',
      borderColor: 'border-l-teal-600',
      valueColor: 'text-teal-700',
      icon: TrendingUp,
      iconBg: 'bg-teal-50 text-teal-700',
    },
    {
      label: 'Total Revenue',
      value: formatRupiah(summary.total_kredit),
      subtitle: 'Pemasukan keseluruhan',
      borderColor: 'border-l-indigo-600',
      valueColor: 'text-indigo-800',
      icon: DollarSign,
      iconBg: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Tagihan Belum Bayar',
      value: `${summary.unpaid_count} Menunggu`,
      subtitle: formatRupiah(summary.unpaid_amount),
      borderColor: 'border-l-rose-500',
      valueColor: 'text-rose-700',
      icon: Receipt,
      iconBg: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 border-l-[5px] ${card.borderColor} flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <span className="text-[12px] font-semibold text-slate-600 truncate">{card.label}</span>
              <div className={`w-6 h-6 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className={`text-[15px] font-black tracking-tight ${card.valueColor} truncate`}>
                {card.value}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
