"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityInfoPage() {
  return (
    <div className="min-h-[calc(100vh-7.5rem)] flex flex-col space-y-4">
      {/* Master Data Khusus Keterangan Aktivitas & Jenis Armada (ACT_INFO) */}
      <ActivityPresetTable category="ACT_INFO" />
    </div>
  );
}
