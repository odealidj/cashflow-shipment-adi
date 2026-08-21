"use client";

import { useEffect, useState } from "react";
import { LogOut, Activity, LayoutDashboard, Truck, Receipt } from "lucide-react";
import Link from "next/link";
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

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const isDashboardActive = pathname === "/dashboard";
  const isTransactionsActive = pathname.startsWith("/dashboard/transactions");
  const isVendorsActive = pathname.startsWith("/dashboard/vendors");

  return (
    <div className="min-h-screen flex animate-fade-in bg-black">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/10 m-4 rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Activity className="text-white w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cashflow</h2>
          </div>

          <nav className="space-y-2">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isDashboardActive 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
            <Link 
              href="/dashboard/transactions" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isTransactionsActive 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Receipt className="w-5 h-5" />
              Transaksi
            </Link>
            <Link 
              href="/dashboard/vendors" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isVendorsActive 
                ? "bg-white/10 text-white shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Truck className="w-5 h-5" />
              Vendors
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user.full_name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-gray-400 truncate uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
