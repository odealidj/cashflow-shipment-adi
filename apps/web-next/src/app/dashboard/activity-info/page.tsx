"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityInfoPage() {
  return (
    <div className="space-y-4">
      {/* Master Data Khusus Keterangan Aktivitas & Jenis Armada (ACT_INFO) */}
      <ActivityPresetTable category="ACT_INFO" />
    </div>
  );
}
