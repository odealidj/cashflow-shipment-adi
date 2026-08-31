'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText, 
  AlignLeft, 
  Store, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Check
} from 'lucide-react';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useCashflowMobile } from '@/hooks/useCashflowMobile';
import { useAutoCalculate, formatRupiah } from '@/hooks/useAutoCalculate';
import { VendorSelect } from '@/components/VendorSelect';

export default function TambahTransaksiPage() {
  const router = useRouter();
  const { summary, createEntry } = useCashflowMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [entryType, setEntryType] = useState<'SHIPMENT' | 'TOP_UP'>('SHIPMENT');
  const [dateOfEntry, setDateOfEntry] = useState(new Date().toISOString().split('T')[0]);
  const [kredit, setKredit] = useState<number>(0);
  const [debit, setDebit] = useState<number>(0);
  const [actInformation, setActInformation] = useState('');
  const [actExplaination, setActExplaination] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [grandCost, setGrandCost] = useState<number>(0);
  const [grandSelling, setGrandSelling] = useState<number>(0);
  const [topDays, setTopDays] = useState<number>(14);
  const [manualDueDate, setManualDueDate] = useState<string>('');
  const [remarks, setRemarks] = useState<'PAID' | 'UNPAID' | 'PENDING'>('UNPAID');

  // Auto Calculations
  const calc = useAutoCalculate(
    {
      kredit,
      debit,
      grandCost,
      grandSelling,
      dateOfEntry,
      topDays,
    },
    summary.current_saldo
  );

  const effectiveDueDate = manualDueDate || calc.dueDate;

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    if (entryType === 'SHIPMENT') {
      const finalCost = Number(grandCost || debit || 0);
      if (finalCost <= 0) {
        setErrorMessage('Harap masukkan nilai Grand Cost / Biaya untuk transaksi shipment.');
        setIsSubmitting(false);
        return;
      }
      // Validasi konsistensi
      if (debit > 0 && grandCost > 0 && debit !== grandCost) {
        setErrorMessage('Nilai Debit Keluar harus sama dengan Grand Cost (HPP).');
        setIsSubmitting(false);
        return;
      }
    }

    if (entryType === 'TOP_UP' && kredit <= 0) {
      setErrorMessage('Harap masukkan nilai Kredit untuk Top-Up modal.');
      setIsSubmitting(false);
      return;
    }

    const finalDebit = entryType === 'SHIPMENT' ? Number(grandCost || debit || 0) : Number(debit || 0);
    const finalGrandCost = entryType === 'SHIPMENT' ? finalDebit : 0;

    const payload = {
      entry_type: entryType,
      date_of_entry: dateOfEntry,
      kredit: Number(kredit || 0),
      debit: finalDebit,
      saldo: calc.saldo,
      act_information: actInformation || (entryType === 'TOP_UP' ? 'Penambahan Modal' : 'Operasional Pengiriman'),
      act_explaination: actExplaination,
      vendor_name_raw: entryType === 'SHIPMENT' ? vendorName : undefined,
      top_days: entryType === 'SHIPMENT' ? Number(topDays || 0) : 0,
      due_date: entryType === 'SHIPMENT' ? effectiveDueDate : undefined,
      grand_cost: finalGrandCost,
      grand_selling: Number(grandSelling || 0),
      profit: calc.profit,
      margin_pct: calc.marginPct,
      remarks: entryType === 'TOP_UP' ? 'PAID' : remarks,
    };

    const res = await createEntry(payload as any);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/m/beranda');
    } else {
      setErrorMessage(res.error || 'Gagal menyimpan transaksi');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* Dark Navy AppBar */}
      <MobileHeader
        title="Tambah Transaksi"
        variant="dark"
        showBack={true}
        backUrl="/m/beranda"
        showSave={true}
        onSave={handleSubmit}
        isSaving={isSubmitting}
      />

      <div className="px-4 py-4 space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Mode Switch (Shipment vs Top-Up) */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setEntryType('SHIPMENT');
              setRemarks('UNPAID');
            }}
            className={`flex-1 py-2 rounded-lg text-[13px] font-extrabold transition-all cursor-pointer ${
              entryType === 'SHIPMENT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🚚 Biaya Shipment
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryType('TOP_UP');
              setRemarks('PAID');
            }}
            className={`flex-1 py-2 rounded-lg text-[13px] font-extrabold transition-all cursor-pointer ${
              entryType === 'TOP_UP' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💳 Top-Up Kas
          </button>
        </div>

        {/* ======================================================== */}
        {/* SEKSI 1: INFORMASI DASAR & KAS                           */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <span className="text-sm">📋</span>
            <h3 className="font-bold text-[14px] text-slate-900">Informasi Dasar & Kas</h3>
          </div>

          {/* Tanggal Transaksi */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              <input
                type="date"
                value={dateOfEntry}
                onChange={(e) => setDateOfEntry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Kredit Awal (Top-Up) vs Debit (Biaya) */}
          {entryType === 'TOP_UP' ? (
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">Kredit Masuk (Modal)</label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
                <input
                  type="number"
                  value={kredit || ''}
                  onChange={(e) => setKredit(Number(e.target.value))}
                  placeholder="Rp 0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[12px] font-bold text-slate-700">Debit Keluar (Biaya Kas)</label>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                  = Grand Cost (HPP)
                </span>
              </div>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
                <input
                  type="number"
                  value={debit || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setDebit(val);
                    setGrandCost(val);
                  }}
                  placeholder="Rp 0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Saldo Akhir (Otomatis) */}
          <div>
            <label className="block text-[12px] font-bold text-slate-500 mb-1">Saldo Akhir (Otomatis)</label>
            <div className="w-full bg-[#EFF6FF] border border-blue-200 rounded-xl px-3 py-2.5 text-[14px] font-black text-blue-700">
              {formatRupiah(calc.saldo)}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SEKSI 2: AKTIVITAS & VENDOR                              */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <span className="text-sm">🚚</span>
            <h3 className="font-bold text-[14px] text-slate-900">Aktivitas & Vendor</h3>
          </div>

          {/* Keterangan Aktivitas */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1">Keterangan Aktivitas</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              <input
                type="text"
                value={actInformation}
                onChange={(e) => setActInformation(e.target.value)}
                placeholder="Mis. Kirim Tronton Cibinong-SBY"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Rincian / Catatan Tambahan */}
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1">Rincian / Catatan Tambahan</label>
            <div className="relative">
              <AlignLeft className="w-4 h-4 text-blue-600 absolute left-3 top-3" />
              <textarea
                rows={2}
                value={actExplaination}
                onChange={(e) => setActExplaination(e.target.value)}
                placeholder="Keterangan rute, muatan, atau catatan tambahan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Vendor */}
          {entryType === 'SHIPMENT' && (
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">Vendor / Transporter</label>
              <VendorSelect
                value={vendorName}
                onChange={setVendorName}
                placeholder="Pilih atau ketik vendor..."
              />
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SEKSI 3: KEUANGAN & PEMBAYARAN (Khusus Shipment)        */}
        {/* ======================================================== */}
        {entryType === 'SHIPMENT' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="text-sm">💵</span>
              <h3 className="font-bold text-[14px] text-slate-900">Keuangan & Pembayaran</h3>
            </div>

            {/* Grand Cost & Grand Selling */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Grand Cost (HPP)</label>
                <div className="relative">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500 absolute left-2.5 top-3" />
                  <input
                    type="number"
                    value={grandCost || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGrandCost(val);
                      setDebit(val);
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-[12px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Grand Selling (Jual)</label>
                <div className="relative">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-3" />
                  <input
                    type="number"
                    value={grandSelling || ''}
                    onChange={(e) => setGrandSelling(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-[12px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Auto Profit & Margin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Profit (Otomatis)</label>
                <div className="bg-[#F0FDF4] border border-emerald-200 rounded-xl px-2.5 py-2 text-[13px] font-black text-emerald-700 truncate">
                  {formatRupiah(calc.profit)}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Margin % (Otomatis)</label>
                <div className="bg-[#EFF6FF] border border-blue-200 rounded-xl px-2.5 py-2 text-[13px] font-black text-blue-700">
                  {calc.marginPct}%
                </div>
              </div>
            </div>

            {/* T.O.P & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">T.O.P (Hari)</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-3" />
                  <input
                    type="number"
                    value={topDays || ''}
                    onChange={(e) => setTopDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2 py-2 text-[12px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={effectiveDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full bg-[#FFF7ED] border border-amber-200 rounded-xl px-2.5 py-2 text-[12px] text-amber-900 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Status Pembayaran */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">Status Pembayaran</label>
              <select
                value={remarks}
                onChange={(e) => setRemarks(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="UNPAID">Belum Lunas (UNPAID)</option>
                <option value="PENDING">Sebagian / Proses (PENDING)</option>
                <option value="PAID">Lunas (PAID)</option>
              </select>
            </div>
          </div>
        )}

        {/* Sticky Submit Button */}
        <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-md pointer-events-auto">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
