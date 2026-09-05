"use client";

import React from "react";
import { Wallet, TrendingUp, AlertCircle, Percent, DollarSign, FileText, Receipt, Clock } from "lucide-react";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";

export interface SummaryData {
  current_saldo: number;
  total_kredit: number;
  total_debit: number;
  total_profit: number;
  avg_margin_pct: number;
  unpaid_count: number;
  unpaid_amount: number;
}

export interface InvoiceSummaryData {
  total_count: number;
  total_amount: number;
  paid_count: number;
  paid_amount: number;
  unpaid_count: number;
  unpaid_amount: number;
  overdue_count: number;
  overdue_amount: number;
}

interface KPICardsProps {
  summary: SummaryData;
  invoiceSummary?: InvoiceSummaryData | null;
  loading?: boolean;
  periodLabel?: string;
  isCurrentPeriod?: boolean;
}

export function KPICards({ 
  summary, 
  invoiceSummary, 
  loading = false,
  periodLabel,
  isCurrentPeriod
}: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const overdueCount = invoiceSummary?.overdue_count || 0;
  const clientPending = invoiceSummary?.unpaid_amount || 0;
  const clientPendingVariant = overdueCount > 0 ? "danger" : clientPending > 0 ? "warning" : "default";

  return (
    <KpiCardGrid
      periodLabel={periodLabel}
      isCurrentPeriod={isCurrentPeriod}
      periodPrefix="Posisi Keuangan"
      infoNote="Metrik terintegrasi Kas Operasional & Penagihan Invoicing"
      cols={5}
    >
      {/* 1. Rolling Saldo Kas */}
      <KpiCard
        title="Rolling Saldo Kas"
        value={loading ? "..." : formatCurrency(summary.current_saldo)}
        icon={<Wallet className="w-4 h-4" />}
        subtitle="Saldo kas aktif siap pakai"
        variant="sky"
      />

      {/* 2. Total Omset Penjualan (Invoicing) */}
      <KpiCard
        title="Total Omset Tagihan"
        value={loading ? "..." : formatCurrency(invoiceSummary?.total_amount || 0)}
        icon={<FileText className="w-4 h-4" />}
        subtitle={`${invoiceSummary?.total_count || 0} invoice diterbitkan`}
        variant="default"
      />

      {/* 3. Laba Operasional & Margin */}
      <KpiCard
        title="Laba Operasional"
        value={loading ? "..." : formatCurrency(summary.total_profit)}
        icon={<TrendingUp className="w-4 h-4" />}
        subtitle={`Margin rata-rata ${((summary.avg_margin_pct || 0) * 100).toFixed(1)}%`}
        variant="teal"
      />

      {/* 4. Piutang Klien (AR) */}
      <KpiCard
        title="Piutang Customer"
        value={loading ? "..." : formatCurrency(clientPending)}
        icon={<Receipt className="w-4 h-4" />}
        subtitle={
          overdueCount > 0 ? (
            <span className="text-rose-600 font-bold">{overdueCount} invoice jatuh tempo!</span>
          ) : (
            `${invoiceSummary?.unpaid_count || 0} tagihan berjalan`
          )
        }
        variant={clientPendingVariant}
      />

      {/* 5. Kewajiban Vendor (AP) */}
      <KpiCard
        title="Kewajiban Vendor TOP"
        value={loading ? "..." : formatCurrency(summary.unpaid_amount)}
        icon={<Clock className="w-4 h-4" />}
        subtitle={`${summary.unpaid_count} tagihan vendor menunggu`}
        variant={summary.unpaid_count > 0 ? "danger" : "default"}
      />
    </KpiCardGrid>
  );
}
