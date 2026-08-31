"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityRoutesPage() {
  return (
    <div className="space-y-4">
      {/* Master Data Khusus Catatan Tambahan & Rute Delivery (ACT_EXPLAIN) */}
      <ActivityPresetTable category="ACT_EXPLAIN" />
    </div>
  );
}
