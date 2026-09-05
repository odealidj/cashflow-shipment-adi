"use client";

import { CustomerTable } from "@/components/CustomerTable";

export default function CustomersPage() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Full Interactive Customer CRUD Table */}
      <CustomerTable />
    </div>
  );
}
