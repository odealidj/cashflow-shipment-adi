"use client";

import { VendorTable } from "@/components/VendorTable";

export default function VendorsPage() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Full Interactive Vendor CRUD Table */}
      <VendorTable />
    </div>
  );
}
