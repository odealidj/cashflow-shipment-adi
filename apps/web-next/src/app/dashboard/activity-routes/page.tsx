"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityRoutesPage() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Master Data Khusus Catatan Tambahan & Rute Delivery (ACT_EXPLAIN) */}
      <ActivityPresetTable category="ACT_EXPLAIN" />
    </div>
  );
}
