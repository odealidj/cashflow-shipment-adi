'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Bell, Settings, Plus } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide BottomNav on full-screen push pages like /m/tambah and /m/pin
  if (pathname === '/m/tambah' || pathname === '/m/pin' || pathname === '/m') {
    return null;
  }

  const navItems = [
    { href: '/m/beranda', label: 'Beranda', icon: Home },
    { href: '/m/laporan', label: 'Laporan', icon: BarChart2 },
    // Center FAB item is handled separately
    { href: '/m/tagihan', label: 'Tagihan', icon: Bell },
    { href: '/m/pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center">
      <div className="w-full max-w-md bg-white border-t border-slate-200/80 px-3 py-2 flex items-center justify-around pointer-events-auto relative shadow-lg">
        {/* Left 2 Tabs */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Elevated FAB (+) Button */}
        <div className="relative -top-5 flex flex-col items-center">
          <Link
            href="/m/tambah"
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 active:scale-95 transition-all"
            aria-label="Tambah Transaksi"
          >
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </Link>
        </div>

        {/* Right 2 Tabs */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
