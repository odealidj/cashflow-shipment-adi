'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  Store, 
  ArrowUpDown, 
  X, 
  Check, 
  Truck, 
  Route, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertCircle,
  FileText,
  CreditCard
} from 'lucide-react';
import { TransactionCardMobile } from '@/components/mobile/TransactionCardMobile';
import { VendorPerformanceCard } from '@/components/mobile/VendorPerformanceCard';
import { useCashflowMobile, CashflowEntry } from '@/hooks/useCashflowMobile';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { formatDate } from '@/lib/dateUtils';

export default function LaporanPage() {
  const { entries, loading, quickPay } = useCashflowMobile();
  const safeEntries = Array.isArray(entries) ? entries : [];
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID' | 'PENDING'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // Modal / Bottom Sheet States
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CashflowEntry | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Temp states for modals
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [tempVendor, setTempVendor] = useState('');

  // Extract unique vendor list from entries
  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    safeEntries.forEach((e) => {
      if (e.vendor_name_raw && e.vendor_name_raw.trim() !== '') {
        set.add(e.vendor_name_raw.trim());
      }
    });
    return Array.from(set).sort();
  }, [safeEntries]);

  // Filter and search logic
  const filteredEntries = useMemo(() => {
    return safeEntries.filter((entry) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && entry.remarks !== statusFilter) {
        return false;
      }

      // 2. Search Query (Vendor & Activity)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const vendorMatch = entry.vendor_name_raw?.toLowerCase().includes(q);
        const actMatch = entry.act_information?.toLowerCase().includes(q);
        const expMatch = entry.act_explaination?.toLowerCase().includes(q);
        if (!vendorMatch && !actMatch && !expMatch) return false;
      }

      // 3. Date Range Filter
      if (dateFrom) {
        const entryDate = entry.date_of_entry?.split('T')[0];
        if (entryDate && entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = entry.date_of_entry?.split('T')[0];
        if (entryDate && entryDate > dateTo) return false;
      }

      // 4. Vendor Filter
      if (selectedVendor) {
        if (entry.vendor_name_raw?.trim() !== selectedVendor.trim()) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortAsc) {
        return new Date(a.date_of_entry).getTime() - new Date(b.date_of_entry).getTime();
      }
      return new Date(b.date_of_entry).getTime() - new Date(a.date_of_entry).getTime();
    });
  }, [safeEntries, statusFilter, searchQuery, dateFrom, dateTo, selectedVendor, sortAsc]);

  const hasActiveAdvancedFilter = Boolean(dateFrom || dateTo || selectedVendor);

  const clearAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedVendor('');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const handleDetailQuickPay = async () => {
    if (!selectedEntry) return;
    setIsPaying(true);
    const res = await quickPay(selectedEntry.id);
    setIsPaying(false);
    if (res.success) {
      setSelectedEntry({ ...selectedEntry, remarks: 'PAID' });
      alert('Transaksi berhasil ditandai LUNAS!');
    } else {
      alert(res.error || 'Gagal memperbarui status bayar');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Page Title (Centered) */}
      <div className="pt-6 pb-2 text-center">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Laporan Transaksi</h1>
        <p className="text-[11px] text-slate-500 font-medium">Buku kas & rincian operasional ekspedisi</p>
      </div>

      <div className="px-4 py-2 space-y-3.5">
        {/* 1. Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari vendor, armada, atau rute..."
            className="w-full bg-white pl-10 pr-4 py-2.5 rounded-full border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
          />
        </div>

        {/* 2. Status Filter Chips (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'UNPAID', label: 'Belum Lunas' },
            { key: 'PAID', label: 'Lunas' },
            { key: 'PENDING', label: 'Sebagian' },
          ].map((chip) => {
            const isActive = statusFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setStatusFilter(chip.key as any)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* 3. Advanced Filter Row (Date Range & Vendor) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Button Filter Rentang Tanggal */}
          <button 
            onClick={() => {
              setTempDateFrom(dateFrom);
              setTempDateTo(dateTo);
              setIsDateModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold shadow-xs transition-all cursor-pointer ${
              dateFrom || dateTo
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {dateFrom || dateTo
                ? `${dateFrom || '...'} s/d ${dateTo || '...'}`
                : 'Rentang Tanggal'}
            </span>
          </button>

          {/* Button Filter Vendor */}
          <button 
            onClick={() => {
              setTempVendor(selectedVendor);
              setIsVendorModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold shadow-xs transition-all cursor-pointer ${
              selectedVendor
                ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">
              {selectedVendor ? selectedVendor : 'Vendor'}
            </span>
          </button>

          {/* Reset button if active */}
          {hasActiveAdvancedFilter && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* 4. Result Count & Sort Button */}
        <div className="flex items-center justify-between text-[12px] pt-1">
          <span className="text-slate-500 font-medium">
            Menampilkan {filteredEntries.length} transaksi
          </span>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center gap-1 text-slate-700 font-bold hover:text-blue-600 cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortAsc ? 'Terlama' : 'Terbaru'}</span>
          </button>
        </div>

        {/* 5. Performa Vendor Card */}
        <VendorPerformanceCard entries={safeEntries} />

        {/* 6. List Card Transaksi (Clickable for Detail Modal) */}
        <div className="space-y-2.5 pt-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Memuat transaksi...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100 text-xs">
              Tidak ada transaksi yang sesuai dengan filter.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="cursor-pointer active:scale-98 transition-transform"
              >
                <TransactionCardMobile entry={entry} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL BOTTOM-SHEET: RINCIAN DETAIL TRANSAKSI             */}
      {/* ======================================================== */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[88vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-700" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Rincian Transaksi #{selectedEntry.sequence_no || selectedEntry.id}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    ID Database: #{selectedEntry.id} • {formatDate(selectedEntry.date_of_entry)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto space-y-3 py-1 text-xs">
              {/* Status & Entry Type */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">{selectedEntry.entry_type === 'TOP_UP' ? '💳' : '🚚'}</span>
                  <div>
                    <span className="font-bold text-slate-800 block text-[13px]">
                      {selectedEntry.entry_type === 'TOP_UP' ? 'Top-Up Modal Kas' : 'Biaya Pengiriman Shipment'}
                    </span>
                    <span className="text-[10px] text-slate-400">Tipe Buku Kas</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                  selectedEntry.remarks === 'PAID' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : selectedEntry.remarks === 'UNPAID'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {selectedEntry.remarks === 'PAID' ? 'LUNAS' : selectedEntry.remarks === 'UNPAID' ? 'BELUM LUNAS' : 'SEBAGIAN'}
                </span>
              </div>

              {/* Detail Info Armada & Rute */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Keterangan Armada / Aktivitas
                  </span>
                  <p className="font-extrabold text-slate-900 text-xs mt-0.5">
                    {selectedEntry.act_information || '-'}
                  </p>
                </div>

                {selectedEntry.act_explaination && (
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Rincian Catatan / Rute
                    </span>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">
                      {selectedEntry.act_explaination}
                    </p>
                  </div>
                )}

                {selectedEntry.vendor_name_raw && (
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Vendor / Transporter
                    </span>
                    <p className="font-extrabold text-sky-800 text-xs mt-0.5">
                      {selectedEntry.vendor_name_raw}
                    </p>
                  </div>
                )}
              </div>

              {/* Rincian Finansial (HPP, Selling, Profit, Saldo) */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-extrabold text-slate-800 block pb-1 border-b border-slate-100">
                  Rincian Keuangan
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Biaya Kas Keluar (Debit / HPP)</span>
                    <span className="font-extrabold text-rose-600 text-[13px]">
                      {formatRupiah(selectedEntry.debit || selectedEntry.grand_cost)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Kredit Masuk (Revenue)</span>
                    <span className="font-extrabold text-emerald-600 text-[13px]">
                      {formatRupiah(selectedEntry.kredit || selectedEntry.grand_selling)}
                    </span>
                  </div>
                </div>

                {selectedEntry.entry_type === 'SHIPMENT' && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-500 block">Profit Bersih</span>
                      <span className={`font-black text-[13px] ${selectedEntry.profit >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                        {formatRupiah(selectedEntry.profit)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Margin Keuntungan</span>
                      <span className="font-black text-sky-700 text-[13px]">
                        {selectedEntry.margin_pct}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-slate-600 font-bold">Saldo Akhir Berjalan:</span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatRupiah(selectedEntry.saldo)}
                  </span>
                </div>
              </div>

              {/* Info T.O.P & Jatuh Tempo */}
              {selectedEntry.due_date && (
                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="font-bold block text-xs">Jatuh Tempo Pembayaran</span>
                      <span className="text-[10px] text-amber-700">T.O.P: {selectedEntry.top_days || 0} hari</span>
                    </div>
                  </div>
                  <span className="font-black text-xs text-amber-950">
                    {formatDate(selectedEntry.due_date)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
              {selectedEntry.remarks !== 'PAID' && (
                <button
                  type="button"
                  onClick={handleDetailQuickPay}
                  disabled={isPaying}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isPaying ? 'Memproses...' : 'Tandai Lunas'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FILTER RENTANG TANGGAL                            */}
      {/* ======================================================== */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Filter Rentang Tanggal</h3>
              <button 
                onClick={() => setIsDateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dari Tanggal (Date From)</label>
                <input
                  type="date"
                  value={tempDateFrom}
                  onChange={(e) => setTempDateFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sampai Tanggal (Date To)</label>
                <input
                  type="date"
                  value={tempDateTo}
                  onChange={(e) => setTempDateTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTempDateFrom('');
                  setTempDateTo('');
                  setDateFrom('');
                  setDateTo('');
                  setIsDateModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setDateFrom(tempDateFrom);
                  setDateTo(tempDateTo);
                  setIsDateModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-xs cursor-pointer"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FILTER VENDOR                                     */}
      {/* ======================================================== */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-base">Pilih Vendor</h3>
              <button 
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 py-1">
              <button
                onClick={() => setTempVendor('')}
                className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  tempVendor === '' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Semua Vendor</span>
                {tempVendor === '' && <Check className="w-4 h-4 text-blue-600" />}
              </button>

              {availableVendors.map((vendor) => (
                <button
                  key={vendor}
                  onClick={() => setTempVendor(vendor)}
                  className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    tempVendor === vendor ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{vendor}</span>
                  {tempVendor === vendor && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTempVendor('');
                  setSelectedVendor('');
                  setIsVendorModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedVendor(tempVendor);
                  setIsVendorModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-xs cursor-pointer"
              >
                Pilih Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
