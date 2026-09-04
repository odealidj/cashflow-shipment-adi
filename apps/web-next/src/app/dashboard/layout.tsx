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
  Activity
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, canManageUsers, isSuperAdmin, can } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMasterRekananOpen, setIsMasterRekananOpen] = useState<boolean>(true);
  const [isPresetAktivitasOpen, setIsPresetAktivitasOpen] = useState<boolean>(true);
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

  // Auto expand parent group when active child route is selected
  useEffect(() => {
    if (isCustomersActive || isVendorsActive) {
      setIsMasterRekananOpen(true);
    }
    if (isActInfoActive || isActRoutesActive) {
      setIsPresetAktivitasOpen(true);
    }
  }, [isCustomersActive, isVendorsActive, isActInfoActive, isActRoutesActive]);

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
    <div className="min-h-screen flex bg-[#F4F6F9] text-slate-900 font-sans antialiased">
      {/* Soft Slate Navy Sidebar (Expandable / Collapsible) */}
      <aside 
        className={`bg-[#223249] text-white m-3 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg shrink-0 border border-slate-700/30 transition-all duration-300 relative ${
          isCollapsed ? "w-20" : "w-68"
        }`}
      >
        {/* Toggle Collapse Button (< or >) */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-8 w-7 h-7 rounded-full bg-[#223249] border-2 border-slate-600/80 text-slate-200 hover:text-white hover:bg-sky-800 flex items-center justify-center shadow-md cursor-pointer transition-all z-20"
          title={isCollapsed ? "Buka Menu (Expand)" : "Tutup Menu (Collapse)"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>

        <div>
          {/* Logo Branding Section */}
          <div className="mb-6">
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

          {/* Navigation Links */}
          <nav className="space-y-4">
            {/* GRUP 1: UTAMA */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                  Utama
                </div>
              )}
              <div className="space-y-1">
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
              </div>
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
                        title="Klien / Perusahaan"
                        className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                          isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                        } ${
                          isCustomersActive 
                          ? "bg-sky-600 text-white shadow-xs" 
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Building2 className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="truncate">Klien / Perusahaan</span>}
                      </Link>
                    )}

                    {can("vendors.view") && (
                      <Link 
                        href="/dashboard/vendors" 
                        title="Mitra Armada & Transporter"
                        className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                          isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                        } ${
                          isVendorsActive 
                          ? "bg-sky-600 text-white shadow-xs" 
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Truck className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="truncate">Mitra Armada (Vendor)</span>}
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

            {/* GRUP 4: PENGATURAN SISTEM */}
            {(can("users.view") || can("roles.view") || can("system.view") || isSuperAdmin) && (
              <div className="pt-2 border-t border-white/10">
                {!isCollapsed && (
                  <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                    Pengaturan Sistem
                  </div>
                )}
                <div className="space-y-1">
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
              </div>
            )}

            {/* GRUP 5: AKSES MOBILE PWA */}
            <div className={`pt-2 border-t border-white/10 ${isCollapsed ? "flex justify-center pt-2.5" : ""}`}>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                  Aplikasi Mobile
                </div>
              )}
              <Link 
                href="/m" 
                title="Buka Mobile PWA"
                className={`flex items-center gap-3 rounded-xl text-xs font-bold text-sky-200 hover:bg-white/10 hover:text-white transition-all ${
                  isCollapsed ? "justify-center p-3" : "px-3.5 py-2"
                }`}
              >
                <Smartphone className="w-5 h-5 text-sky-300 shrink-0" />
                {!isCollapsed && <span className="truncate">Buka Mobile PWA</span>}
              </Link>
            </div>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 pb-1 border-t border-white/10">
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto soft-scrollbar scroll-smooth min-w-0">
        {children}
      </main>
    </div>
  );
}
