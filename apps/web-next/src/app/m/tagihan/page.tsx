'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Check, 
  X, 
  Building2, 
  Calendar, 
  Printer, 
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  Layers
} from 'lucide-react';
import { TagihanCardMobile } from '@/components/mobile/TagihanCardMobile';
import { InvoiceCardMobile, InvoiceMobileData } from '@/components/mobile/InvoiceCardMobile';
import { CustomerSelect } from '@/components/CustomerSelect';
import { InvoicePrintModal } from '@/components/InvoicePrintModal';
import { useCashflowMobile } from '@/hooks/useCashflowMobile';
import { formatRupiah } from '@/hooks/useAutoCalculate';
import { formatDate } from '@/lib/dateUtils';
import { fetchWithAuth } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

const TOP_OPTIONS = [
  { label: 'Cash on Delivery (0 Hari)', days: 0 },
  { label: 'Net 7 Hari', days: 7 },
  { label: 'Net 14 Hari', days: 14 },
  { label: 'Net 30 Hari', days: 30 },
  { label: 'Net 45 Hari', days: 45 },
  { label: 'Net 60 Hari', days: 60 },
];

export default function TagihanPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { entries, loading: cashflowLoading, quickPay } = useCashflowMobile();
  const safeEntries = Array.isArray(entries) ? entries : [];

  // Main Segment: Customer Invoices (Piutang) vs Vendor Payables (Hutang Operasional)
  const [mainSegment, setMainSegment] = useState<'CUSTOMER_INVOICE' | 'VENDOR_EXPENSE'>('CUSTOMER_INVOICE');

  // Customer Invoices State
  const [invoices, setInvoices] = useState<InvoiceMobileData[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID'>('ALL');

  // Modals for Invoices
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<InvoiceMobileData | null>(null);
  const [selectedInvoiceForSettle, setSelectedInvoiceForSettle] = useState<InvoiceMobileData | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<InvoiceMobileData | null>(null);

  // Form State: Create Invoice
  const [newInvoiceNo, setNewInvoiceNo] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newShipmentDate, setNewShipmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTopDays, setNewTopDays] = useState(14);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [createInvoiceError, setCreateInvoiceError] = useState<string | null>(null);

  // Form State: Settle Invoice
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleRef, setSettleRef] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);

  // Vendor Payables Filter State
  const [vendorTabFilter, setVendorTabFilter] = useState<'ALL' | 'UNPAID' | 'OVERDUE'>('ALL');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/m/login');
    }
  }, [user, authLoading, router]);

  // Load Invoices from Backend
  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const [resList, resSummary] = await Promise.all([
        fetchWithAuth('/api/v1/invoices?page=1&limit=150&sort_dir=DESC'),
        fetchWithAuth('/api/v1/invoices/summary'),
      ]);

      if (resList.ok) {
        const jsonList = await resList.json();
        if (jsonList.status && Array.isArray(jsonList.data)) {
          setInvoices(jsonList.data);
        }
      }

      if (resSummary.ok) {
        const jsonSummary = await resSummary.json();
        if (jsonSummary.status && jsonSummary.data) {
          setInvoiceSummary(jsonSummary.data);
        }
      }
    } catch (err) {
      console.error('Gagal memuat invoice customer di mobile:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Filter Customer Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status Filter
      if (invoiceStatusFilter !== 'ALL') {
        if (invoiceStatusFilter === 'OVERDUE') {
          if (inv.status !== 'OVERDUE') {
            if (inv.status === 'PAID') return false;
            if (!inv.due_date) return false;
            const due = new Date(inv.due_date);
            const now = new Date();
            if (isNaN(due.getTime()) || now <= due) return false;
          }
        } else if (inv.status !== invoiceStatusFilter) {
          return false;
        }
      }

      // Search Query
      if (invoiceSearch.trim() !== '') {
        const q = invoiceSearch.toLowerCase();
        const noMatch = inv.invoice_no?.toLowerCase().includes(q);
        const clientMatch = inv.client_name?.toLowerCase().includes(q);
        const notesMatch = inv.notes?.toLowerCase().includes(q);
        if (!noMatch && !clientMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearch]);

  // Invoice KPI Summary Metrics
  const invoiceMetrics = useMemo(() => {
    let unpaidTotal = 0;
    let unpaidCount = 0;
    let overdueTotal = 0;
    let overdueCount = 0;
    let paidTotal = 0;
    let paidCount = 0;

    const now = new Date();
    invoices.forEach((inv) => {
      const amt = Number(inv.total_amount ?? inv.amount ?? 0);
      if (inv.status === 'PAID') {
        paidTotal += amt;
        paidCount++;
      } else {
        unpaidTotal += amt;
        unpaidCount++;

        let isOverdue = inv.status === 'OVERDUE';
        if (!isOverdue && inv.due_date) {
          const due = new Date(inv.due_date);
          if (!isNaN(due.getTime()) && now > due) {
            isOverdue = true;
          }
        }
        if (isOverdue) {
          overdueTotal += amt;
          overdueCount++;
        }
      }
    });

    return {
      unpaidTotal,
      unpaidCount,
      overdueTotal,
      overdueCount,
      paidTotal,
      paidCount,
    };
  }, [invoices]);

  // Vendor Payables Logic (from Cashflow)
  const allVendorTagihan = useMemo(() => {
    return safeEntries.filter((e) => e.entry_type === 'SHIPMENT' && e.remarks !== 'PAID');
  }, [safeEntries]);

  const overdueVendorTagihan = useMemo(() => {
    const now = new Date();
    return allVendorTagihan.filter((e) => {
      if (!e.due_date) return false;
      const due = new Date(e.due_date);
      return !isNaN(due.getTime()) && now > due;
    });
  }, [allVendorTagihan]);

  const displayedVendorTagihan = useMemo(() => {
    if (vendorTabFilter === 'OVERDUE') return overdueVendorTagihan;
    if (vendorTabFilter === 'UNPAID') return allVendorTagihan.filter((e) => e.remarks === 'UNPAID');
    return allVendorTagihan;
  }, [allVendorTagihan, overdueVendorTagihan, vendorTabFilter]);

  // Create Invoice Submission
  const handleCreateInvoice = async () => {
    setCreateInvoiceError(null);
    if (!newClientName.trim()) {
      setCreateInvoiceError('Pilih atau ketik nama Customer terlebih dahulu.');
      return;
    }
    if (newAmount <= 0) {
      setCreateInvoiceError('Nominal tagihan invoice harus lebih dari Rp 0.');
      return;
    }

    setIsSubmittingInvoice(true);
    try {
      const selectedTop = TOP_OPTIONS.find((t) => t.days === Number(newTopDays));
      const topTerms = selectedTop ? selectedTop.label : `Net ${newTopDays} Hari`;

      const payload = {
        invoice_no: newInvoiceNo.trim() || undefined,
        client_name: newClientName.trim(),
        shipment_date: newShipmentDate,
        top_terms: topTerms,
        top_days: Number(newTopDays),
        amount: Number(newAmount),
        status: newStatus,
        notes: newNotes.trim(),
      };

      const res = await fetchWithAuth('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || 'Gagal membuat invoice');
      }

      // Reset Form & Reload
      setIsCreateOpen(false);
      setNewInvoiceNo('');
      setNewClientName('');
      setNewAmount(0);
      setNewNotes('');
      await loadInvoices();
      alert('Invoice berhasil diterbitkan!');
    } catch (err: any) {
      setCreateInvoiceError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Settle Invoice Submission
  const handleSettleInvoice = async () => {
    if (!selectedInvoiceForSettle) return;
    setIsSubmittingSettle(true);
    try {
      const payload = {
        payment_date: settleDate,
        payment_reference: settleRef.trim() || undefined,
        notes: settleNotes.trim() || undefined,
      };

      const res = await fetchWithAuth(`/api/v1/invoices/${selectedInvoiceForSettle.id}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || 'Gagal memproses pelunasan invoice');
      }

      setSelectedInvoiceForSettle(null);
      setSettleRef('');
      setSettleNotes('');
      await loadInvoices();
      alert('Invoice berhasil ditandai Lunas!');
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pelunasan invoice');
    } finally {
      setIsSubmittingSettle(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tagihan & Piutang</h1>
        <p className="text-[12px] text-slate-500 font-medium">
          Kelola piutang invoice pelanggan & hutang operasional vendor
        </p>
      </div>

      <div className="px-4 py-2 space-y-4">
        {/* Segment Switcher (Piutang Customer vs Hutang Vendor) */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => setMainSegment('CUSTOMER_INVOICE')}
            className={`flex-1 py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mainSegment === 'CUSTOMER_INVOICE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Piutang Customer</span>
          </button>
          <button
            type="button"
            onClick={() => setMainSegment('VENDOR_EXPENSE')}
            className={`flex-1 py-2 rounded-xl text-[12px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mainSegment === 'VENDOR_EXPENSE'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hutang Vendor</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PIUTANG CUSTOMER (INVOICE KLIEN)                  */}
        {/* ======================================================== */}
        {mainSegment === 'CUSTOMER_INVOICE' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* KPI Cards: Piutang Summary */}
            <div className="grid grid-cols-2 gap-3">
              {/* Belum Lunas */}
              <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-sky-600">
                <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-bold">
                  <Receipt className="w-3.5 h-3.5 text-sky-600" />
                  <span>Piutang Belum Lunas</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-[16px] font-black text-slate-900 block truncate">
                    {formatRupiah(invoiceMetrics.unpaidTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {invoiceMetrics.unpaidCount} invoice aktif
                  </span>
                </div>
              </div>

              {/* Lewat Jatuh Tempo (Overdue) */}
              <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-rose-500">
                <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Jatuh Tempo (Overdue)</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-[16px] font-black text-rose-700 block truncate">
                    {formatRupiah(invoiceMetrics.overdueTotal)}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold">
                    {invoiceMetrics.overdueCount} perlu ditagih
                  </span>
                </div>
              </div>
            </div>

            {/* Overdue Alert Banner */}
            {invoiceMetrics.overdueCount > 0 && (
              <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3.5 text-rose-900 shadow-2xs">
                <div className="flex items-center gap-2 font-black text-[12px]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{invoiceMetrics.overdueCount} Invoice Melewati Jatuh Tempo!</span>
                </div>
                <p className="text-[11px] text-rose-700 mt-1 leading-snug font-medium">
                  Terdapat piutang sebesar <b>{formatRupiah(invoiceMetrics.overdueTotal)}</b> yang memerlukan follow-up penagihan ke klien.
                </p>
              </div>
            )}

            {/* Search Bar & Add Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Cari no invoice, customer..."
                  className="w-full bg-white pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateInvoiceError(null);
                  setIsCreateOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Buat Invoice</span>
              </button>
            </div>

            {/* Filter Status Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'ALL', label: 'Semua', count: invoices.length },
                { key: 'UNPAID', label: 'Belum Lunas', count: invoiceMetrics.unpaidCount },
                { key: 'OVERDUE', label: 'Jatuh Tempo', count: invoiceMetrics.overdueCount },
                { key: 'PAID', label: 'Lunas', count: invoiceMetrics.paidCount },
              ].map((chip) => {
                const isActive = invoiceStatusFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setInvoiceStatusFilter(chip.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label} ({chip.count})
                  </button>
                );
              })}
            </div>

            {/* List Invoice Cards */}
            <div className="space-y-3 pt-1">
              {invoicesLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  Memuat daftar invoice...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-600">Tidak ada invoice yang sesuai.</p>
                  <p className="text-[11px]">Silakan sesuaikan filter pencarian atau buat invoice baru.</p>
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <InvoiceCardMobile
                    key={inv.id}
                    invoice={inv}
                    onSettle={(invoice) => {
                      setSelectedInvoiceForSettle(invoice);
                      setSettleDate(new Date().toISOString().split('T')[0]);
                      setSettleRef('');
                      setSettleNotes('');
                    }}
                    onViewDetail={(invoice) => setSelectedInvoiceForDetail(invoice)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: HUTANG VENDOR (BIAYA OPERASIONAL CASHFLOW)        */}
        {/* ======================================================== */}
        {mainSegment === 'VENDOR_EXPENSE' && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Belum Dibayar */}
              <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-sky-700">
                <div className="flex items-center gap-1.5 text-slate-600 text-[12px] font-bold">
                  <Clock className="w-3.5 h-3.5 text-sky-700" />
                  <span>Belum Dibayar</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-800">{allVendorTagihan.length}</span>
                </div>
              </div>

              {/* Jatuh Tempo */}
              <div className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-100 border-l-[5px] border-l-rose-500">
                <div className="flex items-center gap-1.5 text-rose-700 text-[12px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Jatuh Tempo</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-rose-700">{overdueVendorTagihan.length}</span>
                </div>
              </div>
            </div>

            {/* Overdue Vendor Banner */}
            {overdueVendorTagihan.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-rose-800 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-[13px]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{overdueVendorTagihan.length} tagihan vendor perlu perhatian</span>
                </div>
                <p className="text-[12px] text-rose-700 mt-1 leading-snug">
                  Biaya pengiriman telah melewati batas jatuh tempo dan memerlukan pelunasan kas segera.
                </p>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {[
                { key: 'ALL', label: 'Semua', count: allVendorTagihan.length },
                { key: 'UNPAID', label: 'Belum Bayar', count: allVendorTagihan.filter((e) => e.remarks === 'UNPAID').length },
                { key: 'OVERDUE', label: 'Lewat Tempo', count: overdueVendorTagihan.length },
              ].map((tab) => {
                const isActive = vendorTabFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setVendorTabFilter(tab.key as any)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      isActive ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>

            {/* List Vendor Tagihan Cards */}
            <div className="space-y-3 pt-1">
              {cashflowLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">Memuat tagihan...</div>
              ) : displayedVendorTagihan.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100 text-xs">
                  Tidak ada tagihan hutang vendor yang tertunda saat ini.
                </div>
              ) : (
                displayedVendorTagihan.map((entry) => (
                  <TagihanCardMobile key={entry.id} entry={entry} onQuickPay={quickPay} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: BUAT INVOICE CUSTOMER BARU (MOBILE)               */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Buat Invoice Customer</h3>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createInvoiceError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-semibold">
                {createInvoiceError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 py-1 text-xs">
              {/* Customer Select */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Customer / Klien <span className="text-rose-500">*</span>
                </label>
                <CustomerSelect
                  value={newClientName}
                  onChange={setNewClientName}
                  placeholder="Pilih atau ketik nama customer..."
                  required
                />
              </div>

              {/* No Invoice (Opsional) */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Nomor Invoice <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={newInvoiceNo}
                  onChange={(e) => setNewInvoiceNo(e.target.value)}
                  placeholder="Otomatis (contoh: INV-202610-001)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tanggal Kirim */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Tanggal Pengiriman</label>
                <input
                  type="date"
                  value={newShipmentDate}
                  onChange={(e) => setNewShipmentDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* T.O.P & Due Date */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Term of Payment (T.O.P)</label>
                <select
                  value={newTopDays}
                  onChange={(e) => setNewTopDays(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {TOP_OPTIONS.map((opt) => (
                    <option key={opt.days} value={opt.days}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nominal Tagihan */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={newAmount || ''}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  placeholder="Rp 0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-black text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Catatan Rute / Keterangan Muatan
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Contoh: Pengiriman 2 Unit Fuso Cikarang - Surabaya..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Status Awal */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Status Awal</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="UNPAID">Belum Lunas (UNPAID)</option>
                  <option value="PAID">Langsung Lunas (PAID)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={isSubmittingInvoice}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingInvoice ? 'Menyimpan...' : 'Terbitkan Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETAIL INVOICE & CETAK (BOTTOM-SHEET)             */}
      {/* ======================================================== */}
      {selectedInvoiceForDetail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-700" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {selectedInvoiceForDetail.invoice_no || `Invoice #${selectedInvoiceForDetail.id}`}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    ID Database: #{selectedInvoiceForDetail.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoiceForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-1 text-xs">
              {/* Status Badge */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {selectedInvoiceForDetail.client_name}
                    </span>
                    <span className="text-[10px] text-slate-400">Customer Penerima Tagihan</span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                  selectedInvoiceForDetail.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedInvoiceForDetail.status === 'OVERDUE'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedInvoiceForDetail.status === 'PAID'
                    ? 'LUNAS'
                    : selectedInvoiceForDetail.status === 'OVERDUE'
                    ? 'JATUH TEMPO'
                    : 'BELUM LUNAS'}
                </span>
              </div>

              {/* Rincian Finansial & Jatuh Tempo */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Total Nilai Tagihan:</span>
                  <span className="text-base font-black text-slate-900">
                    {formatRupiah(selectedInvoiceForDetail.total_amount || selectedInvoiceForDetail.amount || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Tanggal Pengiriman</span>
                    <span className="font-bold text-slate-800">
                      {formatDate(selectedInvoiceForDetail.shipment_date)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Jatuh Tempo</span>
                    <span className="font-bold text-slate-800">
                      {formatDate(selectedInvoiceForDetail.due_date)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-400 block font-medium">Term of Payment</span>
                  <span className="font-bold text-slate-800">
                    {selectedInvoiceForDetail.top_terms || `Net ${selectedInvoiceForDetail.top_days} Hari`}
                  </span>
                </div>

                {selectedInvoiceForDetail.notes && (
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400 block font-medium">Catatan / Rute</span>
                    <p className="font-medium text-slate-700 mt-0.5 leading-relaxed">
                      {selectedInvoiceForDetail.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceForPrint(selectedInvoiceForDetail);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>

              {selectedInvoiceForDetail.status !== 'PAID' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForSettle(selectedInvoiceForDetail);
                    setSelectedInvoiceForDetail(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Pelunasan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PROSES PELUNASAN INVOICE (BOTTOM-SHEET)           */}
      {/* ======================================================== */}
      {selectedInvoiceForSettle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Pelunasan Invoice</h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {selectedInvoiceForSettle.invoice_no} • {selectedInvoiceForSettle.client_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInvoiceForSettle(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1 text-xs">
              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Nominal Pelunasan
                  </span>
                  <span className="text-base font-black text-emerald-900">
                    {formatRupiah(selectedInvoiceForSettle.total_amount || selectedInvoiceForSettle.amount || 0)}
                  </span>
                </div>
                <span className="text-xl">💰</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Referensi / Bukti Transfer
                </label>
                <input
                  type="text"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  placeholder="Contoh: TRF-BCA-889123"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="Keterangan tambahan (opsional)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForSettle(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSettleInvoice}
                disabled={isSubmittingSettle}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingSettle ? 'Menyimpan...' : 'Konfirmasi Lunas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRATINJAU CETAK KWITANSI / DOKUMEN RESMI          */}
      {/* ======================================================== */}
      <InvoicePrintModal
        isOpen={Boolean(selectedInvoiceForPrint)}
        onClose={() => setSelectedInvoiceForPrint(null)}
        invoice={selectedInvoiceForPrint}
      />
    </div>
  );
}
