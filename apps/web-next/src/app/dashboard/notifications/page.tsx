"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  Search,
  Filter,
  ShieldAlert,
  Inbox,
  Clock,
  ArrowRight
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { KpiCardGrid } from "@/components/shared/KpiCardGrid";
import { KpiCard } from "@/components/shared/KpiCard";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem, NotificationSeverity, NotificationCategory } from "@/types/notification";
import { formatRelativeTime } from "@/components/notifications/NotificationBell";

export default function NotificationsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerInvoiceCheck,
  } = useNotifications(false);

  // Load all notifications initially
  useEffect(() => {
    fetchNotifications({ limit: 100 });
  }, [fetchNotifications]);

  const handleScan = async () => {
    setIsScanning(true);
    await triggerInvoiceCheck();
    await fetchNotifications({ limit: 100 });
    setIsScanning(false);
  };

  // Filtered Notifications based on filters
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== "ALL" && item.severity !== selectedSeverity) {
        return false;
      }
      // Read status filter
      if (selectedStatus === "UNREAD" && item.is_read) return false;
      if (selectedStatus === "READ" && !item.is_read) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMsg = item.message.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [notifications, selectedCategory, selectedSeverity, selectedStatus, searchQuery]);

  // KPI Calculations
  const totalCount = notifications.length;
  const criticalCount = notifications.filter((n) => n.severity === "CRITICAL" && !n.is_read).length;
  const warningCount = notifications.filter((n) => n.severity === "WARNING" && !n.is_read).length;

  const renderSeverityBadge = (severity: NotificationSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 stroke-[2.5]" />
            <span>KRITIS</span>
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            <span>PERINGATAN</span>
          </span>
        );
      case "INFO":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-700 border border-sky-200">
            <Info className="w-3 h-3 stroke-[2.5]" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const renderCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case "INVOICE":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            TAGIHAN
          </span>
        );
      case "CASHFLOW":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            KAS & SALDO
          </span>
        );
      case "VENDOR":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
            VENDOR
          </span>
        );
      case "SHIPMENT":
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
            PENGIRIMAN
          </span>
        );
      case "SYSTEM":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            SISTEM
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={<Bell className="w-5 h-5 text-sky-700" />}
        title="Pusat Notifikasi & Peringatan Bisnis"
        subtitle="Pantau peringatan jatuh tempo tagihan, batas saldo kas darurat, dan integritas operasional secara real-time."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-sky-600" : "text-slate-500"}`} />
              <span>{isScanning ? "Memindai..." : "Pindai Jatuh Tempo"}</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>
        }
      />

      {/* KPI Highlights */}
      <KpiCardGrid cols={4}>
        <KpiCard
          title="Total Notifikasi"
          value={totalCount.toString()}
          variant="sky"
          subtitle="Semua riwayat notifikasi"
          icon={<Inbox className="w-5 h-5 text-sky-600" />}
        />
        <KpiCard
          title="Belum Dibaca"
          value={unreadCount.toString()}
          variant={unreadCount > 0 ? "warning" : "success"}
          subtitle="Memerlukan tindakan segera"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <KpiCard
          title="Peringatan Kritis"
          value={criticalCount.toString()}
          variant="danger"
          subtitle="Invoice Overdue / Kas Minim"
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        />
        <KpiCard
          title="Peringatan Waspada"
          value={warningCount.toString()}
          variant="warning"
          subtitle="Jatuh Tempo H-3 / Hari H"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        />
      </KpiCardGrid>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          {[
            { id: "ALL", label: "Semua Kategori" },
            { id: "INVOICE", label: "Tagihan & Invoice" },
            { id: "CASHFLOW", label: "Arus Kas & Saldo" },
            { id: "VENDOR", label: "Mitra & Armada" },
            { id: "SYSTEM", label: "Sistem & Keamanan" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Second Row: Dropdowns & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              <option value="ALL">Semua Tingkat (Severity)</option>
              <option value="CRITICAL">🔴 Kritis Saja</option>
              <option value="WARNING">🟡 Waspada Saja</option>
              <option value="INFO">🔵 Informasi Saja</option>
            </select>

            {/* Read Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              <option value="ALL">Semua Status Baca</option>
              <option value="UNREAD">Hanya Belum Dibaca</option>
              <option value="READ">Hanya Sudah Dibaca</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau pesan..."
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin text-sky-500" />
            <p>Memuat seluruh daftar notifikasi...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
              <Check className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-sm font-black text-slate-800">Tidak Ada Notifikasi Sesuai Filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== "ALL" || selectedSeverity !== "ALL" || selectedStatus !== "ALL"
                ? "Cobalah menyetel ulang filter atau kata kunci pencarian Anda."
                : "Semua tagihan dan operasional kas dalam kondisi normal dan terkendali."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-colors ${
                  !item.is_read ? "bg-sky-50/30 hover:bg-sky-50/50" : "hover:bg-slate-50/70"
                }`}
              >
                {/* Left Section: Icon & Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Indicator Icon */}
                  <div className="mt-0.5 shrink-0">
                    {item.severity === "CRITICAL" ? (
                      <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs">
                        <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    ) : item.severity === "WARNING" ? (
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                        <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-200 shadow-2xs">
                        <Info className="w-5 h-5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>

                  {/* Notification Details */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderSeverityBadge(item.severity)}
                      {renderCategoryBadge(item.category)}
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" (" + formatRelativeTime(item.created_at) + ")"}
                      </span>
                    </div>

                    <h4 className={`text-sm tracking-tight ${!item.is_read ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.action_url && (
                    <Link
                      href={item.action_url}
                      onClick={() => !item.is_read && markAsRead(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors border border-sky-200 cursor-pointer shadow-2xs"
                    >
                      <span>Buka Dokumen</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {!item.is_read ? (
                    <button
                      onClick={() => markAsRead(item.id)}
                      title="Tandai Sudah Dibaca"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-semibold px-2 py-1 bg-slate-100 rounded-lg">
                      Sudah Dibaca
                    </span>
                  )}

                  <button
                    onClick={() => deleteNotification(item.id)}
                    title="Hapus Notifikasi"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
