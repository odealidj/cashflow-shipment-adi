"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityRoutesPage() {
  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Master Data Khusus Catatan Tambahan & Rute Delivery (ACT_EXPLAIN) */}
      <ActivityPresetTable category="ACT_EXPLAIN" />
    </div>
  );
}
