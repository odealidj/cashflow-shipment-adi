"use client";

import { useEffect, useState } from "react";
import { 
  LogOut, 
  LayoutDashboard, 
  Truck, 
  Receipt, 
  FileText,
  Building2,
  Sparkles,
  Route,
  Smartphone, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      window.location.href = "/";
      return;
    }
    setUser(JSON.parse(userData));

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-500 font-semibold text-sm">Memuat dashboard...</div>;

  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive = pathname.startsWith("/dashboard/transactions");
  const isInvoicesActive = pathname.startsWith("/dashboard/invoices");
  const isCustomersActive = pathname.startsWith("/dashboard/customers");
  const isVendorsActive = pathname.startsWith("/dashboard/vendors");
  const isActInfoActive = pathname.startsWith("/dashboard/activity-info");
  const isActRoutesActive = pathname.startsWith("/dashboard/activity-routes");

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
                    alt="Logo"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links Grouped by Functionality */}
          <nav className="space-y-3">
            {/* GRUP 1: UTAMA */}
            <div>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                  Utama
                </div>
              )}
              <div className="space-y-1">
                <Link 
                  href="/dashboard" 
                  title="Dashboard Overview"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isDashboardActive 
                    ? "bg-sky-700/80 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Dashboard Overview</span>}
                </Link>
              </div>
            </div>

            {/* GRUP 2: TRANSAKSI & OPERASIONAL */}
            <div className={`pt-1 ${isCollapsed ? "border-t border-white/10 pt-2.5" : ""}`}>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                  Transaksi & Kas
                </div>
              )}
              <div className="space-y-1">
                <Link 
                  href="/dashboard/transactions" 
                  title="Transaksi Cashflow & Shipment"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isTransactionsActive 
                    ? "bg-sky-700/80 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Receipt className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Transaksi Cashflow</span>}
                </Link>

                <Link 
                  href="/dashboard/invoices" 
                  title="Monitoring Invoice & Piutang"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isInvoicesActive 
                    ? "bg-sky-700/80 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Monitoring Invoice</span>}
                </Link>
              </div>
            </div>

            {/* GRUP 3: DATA MASTER */}
            <div className={`pt-1 ${isCollapsed ? "border-t border-white/10 pt-2.5" : ""}`}>
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black text-slate-400/90 uppercase tracking-widest">
                  Data Master
                </div>
              )}
              <div className="space-y-1">
                <Link 
                  href="/dashboard/customers" 
                  title="Master Customer (Klien)"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isCustomersActive 
                    ? "bg-sky-700/80 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Building2 className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Daftar Customer</span>}
                </Link>

                <Link 
                  href="/dashboard/vendors" 
                  title="Master Vendor (Armada & Transporter)"
                  className={`flex items-center gap-3 rounded-xl transition-all text-xs font-bold ${
                    isCollapsed ? "justify-center p-3" : "px-3.5 py-2.5"
                  } ${
                    isVendorsActive 
                    ? "bg-sky-700/80 text-white shadow-xs" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Truck className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">Daftar Vendor</span>}
                </Link>

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
            </div>

            {/* GRUP 4: AKSES MOBILE PWA */}
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
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
              title={`${user?.full_name || "Pengguna"} (${user?.role || "ADMIN"})`}
            >
              {user?.full_name?.charAt(0) || "U"}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.full_name || "Pengguna"}</p>
                <p className="text-[10px] text-sky-300 truncate uppercase font-semibold">{user?.role || "ADMIN"}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
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
