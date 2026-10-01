'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  ArrowDown, 
  ArrowUp, 
  Wallet, 
  ChevronRight, 
  TrendingUp, 
  PlusCircle, 
  Activity, 
  Calendar 
} from 'lucide-react';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { KPICardMobile } from '@/components/mobile/KPICardMobile';
import { TransactionCardMobile } from '@/components/mobile/TransactionCardMobile';
import { useCashflowMobile } from '@/hooks/useCashflowMobile';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/hooks/useAutoCalculate';

const ROLE_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  super_admin: { label: 'Super Admin IT', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  admin: { label: 'Administrator', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  finance: { label: 'Finance & Kasir', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  operator: { label: 'Staff Operasional', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  direktur: { label: 'Direksi Eksekutif', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  owner: { label: 'Komisaris / Owner', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  viewer: { label: 'Auditor / Viewer', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function BerandaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { entries, summary, loading } = useCashflowMobile();
  const [greeting, setGreeting] = useState('Selamat Pagi');
  const [currentDateStr, setCurrentDateStr] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/m/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Dynamic greeting based on current hour
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi');
    else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang');
    else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    // Format current date in Indonesian
    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setCurrentDateStr(formatted);
  }, []);

  // Today summary calculation
  const safeEntries = Array.isArray(entries) ? entries : [];
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEntries = safeEntries.filter((e) => e.date_of_entry?.startsWith(todayDateStr));
  const todayPemasukan = todayEntries.reduce((acc, curr) => acc + Number(curr.kredit || 0), 0);
  const todayPengeluaran = todayEntries.reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
  const todaySaldo = todayPemasukan - todayPengeluaran;

  const userRoleInfo = user?.role ? ROLE_BADGES[user.role] : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top AppBar */}
      <MobileHeader notificationCount={summary.unpaid_count} />

      <div className="px-4 py-4 space-y-4">
        {/* 1. Hero Banner: Tracking Pengiriman (Nordic Navy to Sky Gradient) */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#1C2B4A] to-sky-900 p-4 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-200">
                TRACKING PENGIRIMAN
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[9px] font-bold uppercase tracking-wide border border-white/10 text-slate-100">
                COMING SOON
              </span>
            </div>
            <p className="text-[12px] text-slate-300 font-medium leading-snug">
              Pantau status armada & pengiriman barang secara real-time
            </p>
          </div>

          <div className="absolute right-2 bottom-1 text-white/10">
            <Truck className="w-24 h-24 stroke-[1.2] text-white/15" />
          </div>
        </div>

        {/* 2. Status Sistem & Koneksi */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/70 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[12px] font-bold text-slate-800">Sistem Kas & Pengiriman Aktif</p>
              <p className="text-[10px] text-slate-400 font-medium">Cloud Database Biznet • Terverifikasi</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
            PRODUKSI
          </span>
        </div>

        {/* 3. Greeting Section with User Profile & Role */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[17px] font-black text-slate-900 tracking-tight">
                {greeting}, {user?.full_name?.split(' ')[0] || 'Rekan'} 👋
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {userRoleInfo && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${userRoleInfo.bg} ${userRoleInfo.text} ${userRoleInfo.border}`}>
                  {userRoleInfo.label}
                </span>
              )}
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{currentDateStr}</span>
              </span>
            </div>
          </div>

          <Link
            href="/m/tambah"
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-600/20 active:scale-95 transition-all shrink-0"
            title="Tambah Transaksi"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.2]" />
          </Link>
        </div>

        {/* 4. 2x2 KPI Grid */}
        <KPICardMobile summary={summary} />

        {/* 5. Laba Bulanan & Ringkasan Performa */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-extrabold text-slate-900">Performa Keuangan</h3>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
              Margin Rata-rata {summary.avg_margin_pct}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Profit Bersih</span>
              <span className={`text-[15px] font-black tracking-tight ${summary.total_profit >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                {formatRupiah(summary.total_profit)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Grand Selling - HPP</span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block">Tagihan Tertunda</span>
              <span className="text-[15px] font-black text-rose-700 tracking-tight">
                {formatRupiah(summary.unpaid_amount)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{summary.unpaid_count} faktur belum lunas</span>
            </div>
          </div>
        </div>

        {/* 6. Ringkasan Hari Ini */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-[13px] font-extrabold text-slate-900">Aktivitas Hari Ini</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
              {todayEntries.length} transaksi
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <div className="flex items-center justify-center gap-0.5 text-emerald-600 text-[11px] font-bold mb-1">
                <ArrowDown className="w-3 h-3" />
                <span>Masuk</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todayPemasukan)}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <div className="flex items-center justify-center gap-0.5 text-rose-600 text-[11px] font-bold mb-1">
                <ArrowUp className="w-3 h-3" />
                <span>Keluar</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todayPengeluaran)}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <div className="flex items-center justify-center gap-0.5 text-blue-600 text-[11px] font-bold mb-1">
                <Wallet className="w-3 h-3" />
                <span>Net Hari Ini</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todaySaldo)}</p>
            </div>
          </div>
        </div>

        {/* 7. Transaksi Terakhir */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">Transaksi Terakhir</h3>
            <Link href="/m/laporan" className="text-[12px] font-bold text-blue-600 hover:text-blue-800">
              Lihat Semua ({safeEntries.length})
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">Memuat transaksi...</div>
          ) : safeEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-slate-400 border border-slate-100 text-xs">
              Belum ada transaksi tercatat.
            </div>
          ) : (
            <div className="space-y-2.5">
              {safeEntries.slice(0, 5).map((entry) => (
                <Link key={entry.id} href="/m/laporan" className="block active:scale-98 transition-transform">
                  <TransactionCardMobile entry={entry} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
