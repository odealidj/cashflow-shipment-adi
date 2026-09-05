"use client";

import { useEffect, useState } from "react";
import { 
  LogOut, 
  LayoutDashboard, 
  Truck, 
  Receipt, 
  Building2,
  Sparkles,
  Route,
  Smartphone, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Users,
  ShieldCheck,
  Activity,
  Bell
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotifications } from "@/hooks/useNotifications";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, canManageUsers, isSuperAdmin, can } = useAuth();
  const { unreadCount } = useNotifications(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isUtamaOpen, setIsUtamaOpen] = useState<boolean>(true);
  const [isMasterRekananOpen, setIsMasterRekananOpen] = useState<boolean>(true);
  const [isPresetAktivitasOpen, setIsPresetAktivitasOpen] = useState<boolean>(true);
  const [isPengaturanSistemOpen, setIsPengaturanSistemOpen] = useState<boolean>(true);
  const [isAplikasiMobileOpen, setIsAplikasiMobileOpen] = useState<boolean>(true);
  const pathname = usePathname();

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar_collapsed");
    if (savedCollapsed === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive = pathname.startsWith("/dashboard/transactions");
  const isInvoicesActive = pathname.startsWith("/dashboard/invoices");
  const isCustomersActive = pathname.startsWith("/dashboard/customers");
  const isVendorsActive = pathname.startsWith("/dashboard/vendors");
  const isActInfoActive = pathname.startsWith("/dashboard/activity-info");
  const isActRoutesActive = pathname.startsWith("/dashboard/activity-routes");
  const isUsersActive = pathname.startsWith("/dashboard/users");
  const isRolesActive = pathname.startsWith("/dashboard/roles");
  const isMetricsActive = pathname.startsWith("/dashboard/system-metrics");
  const isNotificationsActive = pathname.startsWith("/dashboard/notifications");

  // Auto expand parent group when active child route is selected
  useEffect(() => {
    if (isDashboardActive || isTransactionsActive || isInvoicesActive || isNotificationsActive) {
      setIsUtamaOpen(true);
    }
    if (isCustomersActive || isVendorsActive) {
      setIsMasterRekananOpen(true);
    }
    if (isActInfoActive || isActRoutesActive) {
      setIsPresetAktivitasOpen(true);
    }
    if (isUsersActive || isRolesActive || isMetricsActive) {
      setIsPengaturanSistemOpen(true);
    }
  }, [
    isDashboardActive,
    isTransactionsActive,
    isInvoicesActive,
    isNotificationsActive,
    isCustomersActive,
    isVendorsActive,
    isActInfoActive,
    isActRoutesActive,
    isUsersActive,
    isRolesActive,
    isMetricsActive
  ]);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "super_admin":
        return "IT SUPER ADMIN";
      case "admin":
        return "ADMINISTRATOR BISNIS";
      case "finance":
        return "FINANCE & AKUNTANSI";
      case "direktur":
        return "DIREKTUR";
      case "owner":
        return "PEMILIK MODAL";
      default:
        return role?.toUpperCase() || "PENGGUNA";
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "super_admin":
        return "from-purple-600 to-indigo-700 text-purple-200 border-purple-400/30";
      case "admin":
        return "from-blue-600 to-sky-700 text-sky-200 border-sky-400/30";
      case "finance":
        return "from-emerald-600 to-teal-700 text-emerald-200 border-emerald-400/30";
      case "direktur":
        return "from-amber-600 to-indigo-800 text-amber-200 border-amber-400/30";
      case "owner":
        return "from-amber-500 to-orange-700 text-amber-100 border-amber-400/30";
      default:
        return "from-slate-600 to-slate-700 text-slate-200 border-slate-400/30";
    }
  };

  return (
    <div className="h-screen flex bg-[#F4F6F9] text-slate-900 font-sans antialiased overflow-hidden">
      {/* Soft Slate Navy Sidebar (Expandable / Collapsible) */}
      <aside 
        className={`bg-[#223249] text-white m-3 rounded-2xl flex flex-col shadow-lg shrink-0 border border-slate-700/30 transition-all duration-300 relative h-[calc(100vh-1.5rem)] ${
          isCollapsed ? "w-20" : "w-68"
        }`}
      >
        {/* Toggle Collapse Button (< or >) */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-8 w-7 h-7 rounded-full bg-[#223249] border-2 border-slate-600/80 text-slate-200 hover:text-white hover:bg-sky-800 flex items-center justify-center shadow-md cursor-pointer transition-all z-30"
          title={isCollapsed ? "Buka Menu (Expand)" : "Tutup Menu (Collapse)"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>

        {/* ZONA 1: Logo Branding Section (Fixed at Top) */}
        <div className="p-3.5 pb-2 shrink-0">
          {!isCollapsed ? (
            /* Expanded View: Banner Modern */
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center gap-3 shadow-md animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
                <Image
                  src="/logo.png"
                  alt="Logo PT. Adijayantara Logistics Indonesia"
                  width={70}
                  height={70}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-white leading-tight tracking-tight uppercase truncate">
                  Adijayantara
                </h1>
                <p className="text-[11px] text-sky-200 font-bold leading-tight mt-0.5 truncate">
                  Logistics Indonesia
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-sky-950/50 text-sky-300 text-[9px] font-extrabold tracking-wider rounded-md border border-sky-400/20 truncate">
                  CASHFLOW
                </span>
              </div>
            </div>
          ) : (
            /* Collapsed View: Icon Only */
            <div className="flex justify-center animate-fade-in py-1">
              <div 
                className="w-13 h-13 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md"
                title="PT. Adijayantara Logistics Indonesia"
              >
                <Image
                  src="/logo.png"
                  alt="Logo PT. Adijayantara Logistics Indonesia"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
          )}
        </div>

        {/* ZONA 2: Navigation Links (Scrolls Independently) */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-1 space-y-3 soft-scrollbar min-h-0">
          {/* GRUP 1: UTAMA (Expandable / Collapsible) */}
          <div>
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsUtamaOpen(prev => !prev)}
                className="w-full px-3 pb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400/90 uppercase tracking-widest hover:text-white transition-colors cursor-pointer select-none group"
                title={isUtamaOpen ? "Tutup grup Utama" : "Buka grup Utama"}
              >
                <div className="flex items-center gap-1.5">
                  <span>Utama</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-sky-950/70 text-sky-300 border border-sky-400/30 group-hover:border-sky-400/60 leading-none">
                    {1 + (can("cashflow.view") ? 1 : 0) + (can("invoices.view") ? 1 : 0) + (can("notifications.view") ? 1 : 0)}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isUtamaOpen ? "rotate-0" : "-rotate-90"}`} />
              </button>
            ) : null}

            {((!isCollapsed && isUtamaOpen) || isCollapsed) && (
              <div className="space-y-1 animate-fade-in">
                {/* 1. Monitoring Finansial (Dashboard Utama) */}
                <Link 
                  href="/dashboard" 
                  title="Monitoring Finansial"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isDashboardActive 
                    ? "bg-sky-600 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Monitoring Finansial</span>}
                </Link>

                {/* 2. Kas & Operasional (Cashflow) */}
                {can("cashflow.view") && (
                  <Link 
                    href="/dashboard/transactions" 
                    title="Kas & Operasional"
                    className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isTransactionsActive 
                      ? "bg-sky-600 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Receipt className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">Kas & Operasional</span>}
                  </Link>
                )}

                {/* 3. Monitoring Invoice & Piutang */}
                {can("invoices.view") && (
                  <Link 
                    href="/dashboard/invoices" 
                    title="Monitoring Invoice & Piutang"
                    className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isInvoicesActive 
                      ? "bg-sky-600 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">Monitoring Invoice</span>}
                  </Link>
                )}

                {/* 4. Pusat Notifikasi */}
                {can("notifications.view") && (
                  <Link 
                    href="/dashboard/notifications" 
                    title="Pusat Notifikasi & Peringatan"
                    className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isNotificationsActive 
                      ? "bg-sky-600 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="relative">
                      <Bell className="w-5 h-5 shrink-0" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#223249] animate-pulse" />
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">Pusat Notifikasi</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* GRUP 2: MASTER REKANAN (Expandable / Collapsible) */}
          {(can("customers.view") || can("vendors.view")) && (
            <div className="pt-2 border-t border-white/10">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsMasterRekananOpen(prev => !prev)}
                  className="w-full px-3 pb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400/90 uppercase tracking-widest hover:text-white transition-colors cursor-pointer select-none group"
                  title={isMasterRekananOpen ? "Tutup grup Master Rekanan" : "Buka grup Master Rekanan"}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Master Rekanan</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-sky-950/70 text-sky-300 border border-sky-400/30 group-hover:border-sky-400/60 leading-none">
                      {(can("customers.view") ? 1 : 0) + (can("vendors.view") ? 1 : 0)}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isMasterRekananOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>
              ) : null}
              
              {((!isCollapsed && isMasterRekananOpen) || isCollapsed) && (
                <div className="space-y-1 animate-fade-in">
                  {can("customers.view") && (
                    <Link 
                      href="/dashboard/customers" 
                      title="Customer"
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                        isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                      } ${
                        isCustomersActive 
                        ? "bg-sky-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Building2 className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="truncate">Customer</span>}
                    </Link>
                  )}

                  {can("vendors.view") && (
                    <Link 
                      href="/dashboard/vendors" 
                      title="Vendor"
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                        isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                      } ${
                        isVendorsActive 
                        ? "bg-sky-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Truck className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="truncate">Vendor</span>}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GRUP 3: PRESET AKTIVITAS (Expandable / Collapsible) */}
          {can("presets.view") && (
            <div className="pt-2 border-t border-white/10">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsPresetAktivitasOpen(prev => !prev)}
                  className="w-full px-3 pb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400/90 uppercase tracking-widest hover:text-white transition-colors cursor-pointer select-none group"
                  title={isPresetAktivitasOpen ? "Tutup grup Preset Aktivitas" : "Buka grup Preset Aktivitas"}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Preset Aktivitas</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-sky-950/70 text-sky-300 border border-sky-400/30 group-hover:border-sky-400/60 leading-none">
                      2
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isPresetAktivitasOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>
              ) : null}
              
              {((!isCollapsed && isPresetAktivitasOpen) || isCollapsed) && (
                <div className="space-y-1 animate-fade-in">
                  <Link 
                    href="/dashboard/activity-info" 
                    title="Master Keterangan Aktivitas (Armada)"
                    className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isActInfoActive 
                      ? "bg-sky-700/80 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Sparkles className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">Keterangan Aktivitas</span>}
                  </Link>

                  <Link 
                    href="/dashboard/activity-routes" 
                    title="Master Catatan & Rute Pengiriman"
                    className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                      isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                    } ${
                      isActRoutesActive 
                      ? "bg-emerald-700/80 text-white shadow-xs" 
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Route className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="truncate">Catatan & Rute</span>}
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* GRUP 4: PENGATURAN SISTEM (Expandable / Collapsible) */}
          {(can("users.view") || can("roles.view") || can("system.view") || isSuperAdmin) && (
            <div className="pt-2 border-t border-white/10">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsPengaturanSistemOpen(prev => !prev)}
                  className="w-full px-3 pb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400/90 uppercase tracking-widest hover:text-white transition-colors cursor-pointer select-none group"
                  title={isPengaturanSistemOpen ? "Tutup grup Pengaturan Sistem" : "Buka grup Pengaturan Sistem"}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pengaturan Sistem</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-sky-950/70 text-sky-300 border border-sky-400/30 group-hover:border-sky-400/60 leading-none">
                      {(can("users.view") ? 1 : 0) + (can("roles.view") ? 1 : 0) + ((can("system.view") || isSuperAdmin) ? 1 : 0)}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isPengaturanSistemOpen ? "rotate-0" : "-rotate-90"}`} />
                </button>
              ) : null}

              {((!isCollapsed && isPengaturanSistemOpen) || isCollapsed) && (
                <div className="space-y-1 animate-fade-in">
                  {can("users.view") && (
                    <Link 
                      href="/dashboard/users" 
                      title="Manajemen Pengguna & Akun"
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                        isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                      } ${
                        isUsersActive 
                        ? "bg-purple-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Users className="w-5 h-5 text-purple-300 shrink-0" />
                      {!isCollapsed && <span className="truncate">Manajemen Pengguna</span>}
                    </Link>
                  )}

                  {can("roles.view") && (
                    <Link 
                      href="/dashboard/roles" 
                      title="Peran & Hak Akses (PBAC)"
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                        isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                      } ${
                        isRolesActive 
                        ? "bg-sky-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-sky-300 shrink-0" />
                      {!isCollapsed && <span className="truncate">Peran & Hak Akses</span>}
                    </Link>
                  )}

                  {(can("system.view") || isSuperAdmin) && (
                    <Link 
                      href="/dashboard/system-metrics" 
                      title="Telemetri & Metrik Sistem"
                      className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                        isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                      } ${
                        isMetricsActive 
                        ? "bg-amber-600 text-white shadow-xs" 
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <Activity className="w-5 h-5 text-amber-300 shrink-0" />
                      {!isCollapsed && <span className="truncate">Telemetri & Metrik</span>}
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GRUP 5: AKSES MOBILE PWA (Expandable / Collapsible) */}
          <div className="pt-2 border-t border-white/10">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setIsAplikasiMobileOpen(prev => !prev)}
                className="w-full px-3 pb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400/90 uppercase tracking-widest hover:text-white transition-colors cursor-pointer select-none group"
                title={isAplikasiMobileOpen ? "Tutup grup Aplikasi Mobile" : "Buka grup Aplikasi Mobile"}
              >
                <div className="flex items-center gap-1.5">
                  <span>Aplikasi Mobile</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-sky-950/70 text-sky-300 border border-sky-400/30 group-hover:border-sky-400/60 leading-none">
                    1
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isAplikasiMobileOpen ? "rotate-0" : "-rotate-90"}`} />
              </button>
            ) : null}

            {((!isCollapsed && isAplikasiMobileOpen) || isCollapsed) && (
              <div className="space-y-1 animate-fade-in">
                <Link 
                  href="/m" 
                  title="Buka Mobile PWA"
                  className={`flex items-center gap-3 rounded-xl text-xs font-bold text-sky-200 hover:bg-white/10 hover:text-white transition-all ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-sky-300 shrink-0" />
                  {!isCollapsed && <span className="truncate">Buka Mobile PWA</span>}
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* ZONA 3: User Info & Logout (Fixed at Bottom) */}
        <div className="p-3.5 pt-3 border-t border-white/10 shrink-0 bg-[#223249]">
          <div className={`flex items-center gap-2.5 mb-3 ${isCollapsed ? "justify-center px-0" : "px-1"}`}>
            <div 
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${getRoleBadgeStyle(user?.role)} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 border`}
              title={`${user?.full_name || "Pengguna"} (${getRoleLabel(user?.role)})`}
            >
              {user?.full_name?.charAt(0) || "U"}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.full_name || "Pengguna"}</p>
                <p className="text-[10px] text-sky-300 truncate uppercase font-semibold">
                  {getRoleLabel(user?.role)}
                </p>
              </div>
            )}
          </div>
          <button 
            onClick={logout}
            title="Keluar"
            className={`flex items-center gap-2 w-full rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/30 transition-all cursor-pointer ${
              isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area with Persistent Top Header */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Navigation Bar */}
        <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-2xs z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-tight text-slate-800 uppercase hidden sm:inline">
              PT Adijayantara Logistics Indonesia
            </span>
            <span className="text-slate-300 text-xs hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 font-semibold truncate">
              Shipment & Cashflow Control
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Notification Bell */}
            <NotificationBell />

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Info Pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700">{user?.full_name || "Pengguna"}</span>
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto soft-scrollbar scroll-smooth min-w-0 flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
