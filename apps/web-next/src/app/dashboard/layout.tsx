"use client";

import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, Truck, Receipt, Smartphone } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      window.location.href = "/";
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-500 font-semibold text-sm">Memuat dashboard...</div>;

  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive = pathname.startsWith("/dashboard/transactions");
  const isVendorsActive = pathname.startsWith("/dashboard/vendors");

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Soft Slate Navy Sidebar */}
      <aside className="w-68 bg-[#223249] text-white m-3 rounded-2xl p-4 flex flex-col justify-between shadow-lg shrink-0 border border-slate-700/30">
        <div>
          {/* Logo Branding: Horizontal Modern Banner (Enlarged & Crisp) */}
          <div className="mb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 flex items-center gap-3.5 shadow-md">
              <div className="w-18 h-18 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
                <Image
                  src="/logo.png"
                  alt="Logo PT. Adijayantara Logistics Indonesia"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-black text-white leading-tight tracking-tight uppercase">
                  Adijayantara
                </h1>
                <p className="text-[11px] text-sky-200 font-bold leading-tight mt-0.5">
                  Logistics Indonesia
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-sky-950/50 text-sky-300 text-[9px] font-extrabold tracking-wider rounded-md border border-sky-400/20">
                  CASHFLOW CONTROL
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isDashboardActive 
                ? "bg-sky-700/80 text-white shadow-xs" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Overview
            </Link>
            <Link 
              href="/dashboard/transactions" 
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isTransactionsActive 
                ? "bg-sky-700/80 text-white shadow-xs" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Receipt className="w-4 h-4" />
              Transaksi Cashflow
            </Link>
            <Link 
              href="/dashboard/vendors" 
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
                isVendorsActive 
                ? "bg-sky-700/80 text-white shadow-xs" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Truck className="w-4 h-4" />
              Daftar Vendor
            </Link>

            {/* Mobile PWA Shortcut */}
            <div className="pt-4 mt-4 border-t border-white/10">
              <Link 
                href="/m" 
                className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-sky-200 hover:bg-white/10 hover:text-white transition-all"
              >
                <Smartphone className="w-4 h-4 text-sky-300" />
                <span>Buka Mobile PWA</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 pb-2 border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || "Pengguna"}</p>
              <p className="text-[10px] text-blue-300 truncate uppercase font-semibold">{user?.role || "ADMIN"}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
