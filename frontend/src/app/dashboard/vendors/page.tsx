"use client";

import { VendorTable } from "@/components/VendorTable";

export default function VendorsPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Vendors</h1>
        <p className="text-gray-400">Manage all your transport partners and shipment entities in one place.</p>
      </header>
      
      {/* Table Component */}
      <VendorTable />
    </>
  );
}
