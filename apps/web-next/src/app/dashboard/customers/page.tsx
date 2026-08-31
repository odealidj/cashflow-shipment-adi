"use client";

import { CustomerTable } from "@/components/CustomerTable";

export default function CustomersPage() {
  return (
    <div className="space-y-4">
      {/* Full Interactive Customer CRUD Table */}
      <CustomerTable />
    </div>
  );
}
