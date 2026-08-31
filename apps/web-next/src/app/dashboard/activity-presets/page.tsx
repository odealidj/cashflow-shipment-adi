"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ActivityPresetsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/activity-info");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-slate-400 font-semibold">
      Mengalihkan ke menu Keterangan Aktivitas...
    </div>
  );
}
