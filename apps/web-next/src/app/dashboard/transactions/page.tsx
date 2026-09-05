"use client";

import { CashflowTable } from "@/components/CashflowTable";

export default function TransactionsPage() {
  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Full Interactive Cashflow Table */}
      <CashflowTable />
    </div>
  );
}
