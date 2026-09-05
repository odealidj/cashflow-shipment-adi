"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityInfoPage() {
  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Master Data Khusus Keterangan Aktivitas & Jenis Armada (ACT_INFO) */}
      <ActivityPresetTable category="ACT_INFO" />
    </div>
  );
}
