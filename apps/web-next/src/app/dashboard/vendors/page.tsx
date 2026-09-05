"use client";

import { VendorTable } from "@/components/VendorTable";

export default function VendorsPage() {
  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Full Interactive Vendor CRUD Table */}
      <VendorTable />
    </div>
  );
}
