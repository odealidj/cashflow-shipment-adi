"use client";

import { CashflowTable } from "@/components/CashflowTable";

export default function TransactionsPage() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Full Interactive Cashflow Table */}
      <CashflowTable />
    </div>
  );
}
