"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, ShieldAlert, FileText, CheckCircle2, Clock } from "lucide-react";

export interface InvoiceItem {
  id: number;
  invoice_no: string;
  client_name: string;
  shipment_date: string;
  top_terms: string;
  top_days: number;
  due_date: string;
  total_amount?: number;
  amount?: number;
  status: string;
  notes?: string;
}

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  invoice: InvoiceItem | null;
  onClose: () => void;
  onConfirm: (invoice: InvoiceItem) => Promise<void>;
}

export function DeleteInvoiceModal({
  isOpen,
  invoice,
  onClose,
  onConfirm
}: DeleteInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [isUnderstandConsequences, setIsUnderstandConsequences] = useState(false);

  if (!isOpen || !invoice) return null;

  const requiredKeyword = `HAPUS-${invoice.invoice_no}`;
  const isKeywordValid = confirmKeyword.trim().toUpperCase() === requiredKeyword.toUpperCase();
  const canDelete = isUnderstandConsequences && isKeywordValid && !loading;

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const handleExecuteDelete = async () => {
    if (!canDelete) return;
    try {
      setLoading(true);
      await onConfirm(invoice);
      setConfirmKeyword("");
      setIsUnderstandConsequences(false);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmKeyword("");
    setIsUnderstandConsequences(false);
    onClose();
  };

  const isPaid = invoice.status === "PAID";
  const isOverdue = invoice.status === "OVERDUE";
  const invoiceAmount = invoice.total_amount ?? invoice.amount ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 relative my-auto border border-rose-100 shadow-2xl overflow-hidden">
        {/* Tombol Tutup */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Peringatan Keamanan */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Hapus Invoice Piutang</span>
            </h3>
            <p className="text-[11px] text-rose-600 font-bold uppercase tracking-wider">
              Tindakan Kritis & Tidak Dapat Dibatalkan
            </p>
          </div>
        </div>

        {/* Ringkasan Invoice yang Dihapus */}
        <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-3.5 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Nomor Invoice:</span>
            <span className="font-mono font-black text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded text-[11px]">
              {invoice.invoice_no}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Customer:</span>
            <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
              {invoice.client_name}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Tgl Pengiriman:</span>
            <span className="font-mono font-medium text-slate-700">
              {formatDate(invoice.shipment_date)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Nominal Tagihan:</span>
            <span className="font-mono font-black text-rose-600 text-xs">
              {formatCurrency(invoiceAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1 border-t border-rose-100/80">
            <span className="text-slate-500 font-medium">Status Tagihan:</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isOverdue
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isPaid ? "Lunas" : isOverdue ? "Jatuh Tempo" : "Menunggu Pembayaran"}
            </span>
          </div>
        </div>

        {/* Dampak Audit Ketat */}
        <div className="space-y-2 mb-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
          <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Dampak Penghapusan Data:
          </p>
          <ul className="list-disc list-inside text-[11px] space-y-1 text-slate-500">
            <li>Menghapus tagihan invoice dari daftar piutang aktif secara permanen.</li>
            <li>Memengaruhi total rekapitulasi penerimaan dan piutang klien.</li>
            <li>Data akan diarsipkan (soft delete) dan tercatat dalam log audit.</li>
          </ul>
        </div>

        {/* Verifikasi Keamanan Pengguna */}
        <div className="space-y-3 mb-5">
          {/* Checkbox Konfirmasi Pemahaman */}
          <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUnderstandConsequences}
              onChange={(e) => setIsUnderstandConsequences(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span className="text-[11px] leading-tight font-medium text-slate-600">
              Saya memahami resiko ini dan bertanggung jawab penuh atas penghapusan data invoice ini.
            </span>
          </label>

          {/* Validasi Ketik Keyword */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-600">
              Ketik kode verifikasi: <code className="text-rose-700 font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{requiredKeyword}</code>
            </label>
            <input
              type="text"
              placeholder={`Ketik ${requiredKeyword}`}
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 border-slate-200 focus:border-rose-500 focus:ring-rose-500/20 text-slate-800 placeholder-slate-400 uppercase"
            />
          </div>
        </div>

        {/* Aksi Bawah */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={!canDelete}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
              canDelete
                ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-rose-600/20"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? "Menghapus..." : "Konfirmasi Hapus"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
