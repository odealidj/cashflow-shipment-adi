"use client";

import { CustomerTable } from "@/components/CustomerTable";

export default function CustomersPage() {
  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Full Interactive Customer CRUD Table */}
      <CustomerTable />
    </div>
  );
}
