"use client";

import { CashflowTable } from "@/components/CashflowTable";
import { Receipt } from "lucide-react";

export default function TransactionsPage() {
  return (
    <>
      <header className="mb-6 flex flex-wrap justify-between items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Manajemen Buku Kas</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Transaksi Cashflow</h1>
          <p className="text-gray-400 text-sm">
            Kelola pencatatan kas rolling, tracking biaya pengiriman, T.O.P vendor, serta import/export data Excel.
          </p>
        </div>
      </header>

      {/* Full Interactive Cashflow Table */}
      <CashflowTable />
    </>
  );
}
