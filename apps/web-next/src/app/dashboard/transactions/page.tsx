"use client";

import { CashflowTable } from "@/components/CashflowTable";

export default function TransactionsPage() {
  return (
    <div className="space-y-4">
      {/* Full Interactive Cashflow Table */}
      <CashflowTable />
    </div>
  );
}
