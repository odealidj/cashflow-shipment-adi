"use client";

import { ActivityPresetTable } from "@/components/ActivityPresetTable";

export default function ActivityPresetsPage() {
  return (
    <div className="space-y-4">
      {/* Full Interactive Activity Presets CRUD Table */}
      <ActivityPresetTable />
    </div>
  );
}
