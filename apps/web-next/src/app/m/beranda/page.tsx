'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Hourglass, ArrowDown, ArrowUp, Wallet, ChevronRight } from 'lucide-react';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { KPICardMobile } from '@/components/mobile/KPICardMobile';
import { TransactionCardMobile } from '@/components/mobile/TransactionCardMobile';
import { useCashflowMobile } from '@/hooks/useCashflowMobile';
import { formatRupiah } from '@/hooks/useAutoCalculate';

export default function BerandaPage() {
  const { entries, summary, loading } = useCashflowMobile();
  const [greeting, setGreeting] = useState('Selamat Pagi');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [userName, setUserName] = useState('User');

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

    // Retrieve username if stored
    const storedUser = localStorage.getItem('transio_user_name');
    if (storedUser) setUserName(storedUser);
  }, []);

  // Today summary calculation
  const safeEntries = Array.isArray(entries) ? entries : [];
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEntries = safeEntries.filter((e) => e.date_of_entry === todayDateStr);
  const todayPemasukan = todayEntries.reduce((acc, curr) => acc + Number(curr.kredit || 0), 0);
  const todayPengeluaran = todayEntries.reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
  const todaySaldo = todayPemasukan - todayPengeluaran;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top AppBar */}
      <MobileHeader notificationCount={summary.unpaid_count} />

      <div className="px-4 py-4 space-y-4">
        {/* 1. Hero Banner: Tracking Pengiriman (Soft Elegant Slate Blue) */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-sky-900 p-4 text-white shadow-sm relative overflow-hidden">
          <div className="relative z-10 max-w-[70%]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-200">TRACKING PENGIRIMAN</span>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[9px] font-bold uppercase tracking-wide border border-white/10 text-slate-100">
                COMING SOON
              </span>
            </div>
            <p className="text-[12px] text-slate-300 font-medium leading-snug">
              Pantau status pengiriman barang real-time
            </p>
          </div>

          <div className="absolute right-2 bottom-1 text-white/10">
            <Truck className="w-24 h-24 stroke-[1.2] text-white/20" />
          </div>
        </div>

        {/* 2. Trial Period Banner */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/60 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Hourglass className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-slate-800">Masa uji coba: 17 hari tersisa</p>
            <p className="text-[11px] text-slate-500">Total uji coba 30 hari</p>
          </div>
        </div>

        {/* 3. Greeting Section */}
        <div>
          <h2 className="text-[18px] font-black text-slate-800 tracking-tight">
            {greeting}, {userName} 👋
          </h2>
          <p className="text-[12px] text-slate-500 font-medium mt-0.5">{currentDateStr}</p>
        </div>

        {/* 4. 2x2 KPI Grid */}
        <KPICardMobile summary={summary} />

        {/* 5. Laba Bulanan Chart (Soft Pastel Green) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-[14px] font-extrabold text-slate-800 mb-3">Laba Bulanan</h3>
          <div className="h-44 flex items-end justify-center gap-6 pt-4 pb-2 border-b border-slate-100">
            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="text-[11px] font-extrabold text-teal-700">
                {formatRupiah(summary.total_profit)}
              </div>
              <div className="w-10 bg-teal-600/80 hover:bg-teal-600 rounded-t-lg h-28 shadow-xs transition-all" />
              <span className="text-[11px] font-semibold text-slate-400">Bulan Ini</span>
            </div>
          </div>
        </div>

        {/* 6. Tren Saldo Chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-[14px] font-extrabold text-slate-800 mb-3">Tren Saldo</h3>
          <div className="h-32 bg-gradient-to-t from-slate-50 to-transparent rounded-xl p-3 flex flex-col justify-between border border-slate-100">
            <div className="flex justify-between items-center text-[12px]">
              <span className="text-slate-500 font-medium">Saldo Berjalan</span>
              <span className="font-extrabold text-sky-800">{formatRupiah(summary.current_saldo)}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-700/80 rounded-full w-3/4" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>Awal Periode</span>
              <span>Saat Ini</span>
            </div>
          </div>
        </div>

        {/* 7. Ringkasan Hari Ini */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📅</span>
              <h3 className="text-[13px] font-bold text-slate-900">Ringkasan Hari Ini</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
              {todayEntries.length} transaksi
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 rounded-xl p-2">
              <div className="flex items-center justify-center gap-0.5 text-emerald-600 text-[11px] font-bold mb-1">
                <ArrowDown className="w-3 h-3" />
                <span>Pemasukan</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todayPemasukan)}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-2">
              <div className="flex items-center justify-center gap-0.5 text-rose-600 text-[11px] font-bold mb-1">
                <ArrowUp className="w-3 h-3" />
                <span>Pengeluaran</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todayPengeluaran)}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-2">
              <div className="flex items-center justify-center gap-0.5 text-blue-600 text-[11px] font-bold mb-1">
                <Wallet className="w-3 h-3" />
                <span>Saldo</span>
              </div>
              <p className="text-[12px] font-black text-slate-800 truncate">{formatRupiah(todaySaldo)}</p>
            </div>
          </div>
        </div>

        {/* 8. Pantau Pengiriman Feature Promo */}
        <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-bold text-slate-900">Pantau Pengiriman</h4>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-200 text-purple-800">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">Informasi status pengiriman barang real-time</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        {/* 9. Transaksi Terakhir */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">Transaksi Terakhir</h3>
            <Link href="/m/laporan" className="text-[12px] font-bold text-blue-600 hover:text-blue-800">
              Lihat Semua
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
                <TransactionCardMobile key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
