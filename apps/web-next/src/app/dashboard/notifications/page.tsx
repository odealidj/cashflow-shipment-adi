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
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  ShieldAlert,
  Inbox,
  Clock,
  ArrowRight
} from "lucide-react";
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
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* KPI Highlights */}
      <div className="shrink-0">
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
      </div>

      {/* Unified 1 Card Container */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0">
        {/* Top Actions Bar */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-800 flex items-center justify-center shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <span>Pusat Notifikasi & Peringatan Bisnis</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantau peringatan jatuh tempo tagihan, batas saldo kas darurat, dan integritas operasional secara real-time
            </p>
          </div>
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>
        </div>

        {/* Integrated Filter Sub-Header Toolbar */}
        <div className="shrink-0 p-4 pb-3.5 bg-slate-50/40 border-b border-slate-100 space-y-3 transition-all">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100/80 pb-2.5">
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
                    : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Second Row: Search & Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul atau isi pesan..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium placeholder:text-slate-400 shadow-2xs"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                  title="Reset Pencarian"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Severity Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Tingkat</option>
                  <option value="CRITICAL">🔴 Kritis Saja</option>
                  <option value="WARNING">🟡 Waspada Saja</option>
                  <option value="INFO">🔵 Informasi Saja</option>
                </select>
              </div>

              {/* Read Status Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">Semua Status Baca</option>
                  <option value="UNREAD">Hanya Belum Dibaca</option>
                  <option value="READ">Hanya Sudah Dibaca</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Notifications List Container */}
        <div className="flex-1 overflow-auto soft-scrollbar scroll-smooth relative min-h-0">
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

        {/* Footer Info Bar */}
        <div className="shrink-0 border-t border-slate-100 px-6 py-3 bg-white flex flex-wrap justify-between items-center text-xs text-slate-500 font-medium">
          <span>
            Menampilkan <strong className="text-slate-800 font-bold">{filteredNotifications.length}</strong> dari{" "}
            <strong className="text-slate-800 font-bold">{totalCount}</strong> notifikasi
          </span>
          <span>
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Semua notifikasi telah dibaca"}
          </span>
        </div>
      </div>
    </div>
  );
}
