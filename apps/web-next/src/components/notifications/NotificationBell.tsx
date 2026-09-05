"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem, NotificationSeverity } from "@/types/notification";

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}j lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return dateString;
  }
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    unreadCount,
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    triggerInvoiceCheck,
  } = useNotifications(true);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications({ limit: 6 });
    }
    setIsOpen((prev) => !prev);
  };

  const handleScan = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsScanning(true);
    await triggerInvoiceCheck();
    setIsScanning(false);
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const renderSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertCircle className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "WARNING":
        return (
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
      case "INFO":
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200">
            <Info className="w-4 h-4 stroke-[2.5]" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        aria-label="Buka Notifikasi"
        aria-expanded={isOpen}
        className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-sky-100/80 text-sky-700 shadow-2xs"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95"
        }`}
      >
        <Bell className="w-5 h-5 stroke-[2.2]" />

        {/* Pulsing Badge for Unread Count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-xs animate-pulse ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-fade-in text-slate-800">
          {/* Header */}
          <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900">Notifikasi</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                  {unreadCount} baru
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Semua Dibaca
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Scan / Sync Button */}
              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                title="Pindai Ulang Jatuh Tempo Invoice Sekarang"
                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-sky-600" : ""}`} />
              </button>

              {/* Mark All Read Button */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  title="Tandai Semua Sudah Dibaca"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Baca Semua</span>
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 soft-scrollbar">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin text-sky-500" />
                <p>Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-11 h-11 mx-auto mb-2 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <p className="text-xs font-bold text-slate-700">Semua Terkendali!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ada notifikasi aktif saat ini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex gap-3 relative group ${
                    !item.is_read
                      ? "bg-sky-50/40 hover:bg-sky-50/70"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* Unread Left Border Indicator */}
                  {!item.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-r" />
                  )}

                  {/* Severity Icon */}
                  {renderSeverityIcon(item.severity)}

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs truncate ${!item.is_read ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      {item.action_url ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 group-hover:text-sky-700">
                          <span>Buka Dokumen</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      ) : <span />}

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(item.id);
                          }}
                          title="Tandai sudah dibaca"
                          className="text-[10px] text-slate-400 hover:text-emerald-600 font-semibold flex items-center gap-0.5 p-1 -m-1 rounded hover:bg-slate-100"
                        >
                          <Check className="w-3 h-3" />
                          <span>Sudah Dibaca</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2.5 bg-slate-50/90 border-t border-slate-200/80 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors w-full py-1 rounded-lg hover:bg-sky-100/50"
            >
              <span>Pusat Notifikasi Lengkap</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
