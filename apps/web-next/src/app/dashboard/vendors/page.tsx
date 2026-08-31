"use client";

import { VendorTable } from "@/components/VendorTable";

export default function VendorsPage() {
  return (
    <div className="space-y-4">
      {/* Full Interactive Vendor CRUD Table */}
      <VendorTable />
    </div>
  );
}
