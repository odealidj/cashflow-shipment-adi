"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Clock, 
  Users, 
  History, 
  RefreshCw, 
  Lock,
  Download,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuditSummaryKPI, getAuditSummary } from "@/lib/api/audit";
import { AuditKPISummary } from "@/components/audit/AuditKPISummary";
import { AuditAnomaliesTab } from "@/components/audit/AuditAnomaliesTab";
import { AuditInputLagTab } from "@/components/audit/AuditInputLagTab";
import { AuditStaffScorecardTab } from "@/components/audit/AuditStaffScorecardTab";
import { AuditForensicLogsTab } from "@/components/audit/AuditForensicLogsTab";

export default function AuditDashboardPage() {
  const { user, can } = useAuth();
  const [activeTab, setActiveTab] = useState<"anomalies" | "lag" | "scorecard" | "logs">("anomalies");
  const [summary, setSummary] = useState<AuditSummaryKPI | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const data = await getAuditSummary();
      setSummary(data);
    } catch (err) {
      console.error("Gagal memuat KPI ringkasan audit:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Access Control: Khusus Owner, Direktur, Super Admin atau memiliki permission audit.view
  const hasAccess = 
    can("audit.view") || 
    user?.role === "owner" || 
    user?.role === "direktur" || 
    user?.role === "super_admin";

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          Akses Khusus Eksekutif (Restricted)
        </h2>
        <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
          Halaman Audit Forensik &amp; Pemantauan SLA hanya dapat diakses oleh Pemilik Perusahaan (Owner), Direktur, atau Administrator berwenang.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* 1. Executive Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                AUDIT FORENSIK &amp; PENGAWASAN EKSEKUTIF
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                ANTI-FRAUD &amp; SLA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistem radar anomali margin kas, integritas operasional, dan pemantauan SLA keterlambatan input staf.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? "animate-spin text-amber-600" : "text-slate-500"}`} />
            <span>Segarkan Metrik</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Banner */}
      <AuditKPISummary summary={summary} loading={loadingSummary} />

      {/* 3. Tab Switcher Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-px">
        {/* Tab 1: Radar Anomali */}
        <button
          type="button"
          onClick={() => setActiveTab("anomalies")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "anomalies"
              ? "border-rose-600 text-rose-700 bg-rose-50/60 font-black"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Radar Anomali (Anti-Fraud)</span>
          {summary && summary.total_anomalies_count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {summary.total_anomalies_count}
            </span>
          )}
        </button>

        {/* Tab 2: Pelacak Keterlambatan */}
        <button
          type="button"
          onClick={() => setActiveTab("lag")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "lag"
              ? "border-amber-600 text-amber-700 bg-amber-50/60 font-black"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Pelacak Keterlambatan (Input Lag)</span>
          {summary && summary.total_late_inputs > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-600 text-white">
              {summary.total_late_inputs}
            </span>
          )}
        </button>

        {/* Tab 3: Rapor Disiplin Staf */}
        <button
          type="button"
          onClick={() => setActiveTab("scorecard")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "scorecard"
              ? "border-emerald-600 text-emerald-700 bg-emerald-50/60 font-black"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Rapor Disiplin Staf (SLA)</span>
          {summary && summary.total_staff_monitored > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white">
              {summary.total_staff_monitored}
            </span>
          )}
        </button>

        {/* Tab 4: Log Forensik Lengkap */}
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "logs"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/60 font-black"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <History className="w-4 h-4 text-indigo-600" />
          <span>Log Forensik Lengkap</span>
          {summary && summary.total_logs > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-800">
              {summary.total_logs}
            </span>
          )}
        </button>
      </div>

      {/* 4. Tab Content Panels */}
      {activeTab === "anomalies" && <AuditAnomaliesTab />}
      {activeTab === "lag" && <AuditInputLagTab />}
      {activeTab === "scorecard" && <AuditStaffScorecardTab />}
      {activeTab === "logs" && <AuditForensicLogsTab />}
    </div>
  );
}
