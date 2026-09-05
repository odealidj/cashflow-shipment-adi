"use client";

import React, { useState } from "react";
import { X, CheckCircle2, DollarSign, Calendar, FileText, Link, ShieldCheck, Loader2 } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface SettleInvoiceModalProps {
  isOpen: boolean;
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettleInvoiceModal({ isOpen, invoice, onClose, onSuccess }: SettleInvoiceModalProps) {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever invoice changes
  React.useEffect(() => {
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentReference("");
    setPaymentProofUrl("");
    setPaymentNotes("");
    setError(null);
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const invoiceAmount = Number(invoice.amount ?? invoice.total_amount ?? 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        payment_date: paymentDate,
        payment_reference: paymentReference.trim() || undefined,
        payment_proof_url: paymentProofUrl.trim() || undefined,
        notes: paymentNotes.trim() || undefined
      };

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${invoice.id}/pay`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal memproses pelunasan invoice");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses pelunasan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Pelunasan Tagihan Invoice
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pencatatan pembayaran lunas 100% dan bukti transfer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 pb-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-sky-900 bg-sky-100/70 px-2 py-0.5 rounded-md">
                {invoice.invoice_no}
              </span>
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                Jatuh Tempo:{" "}
                <span
                  className={`font-mono px-2 py-0.5 rounded text-[11px] font-bold border ${
                    invoice?.status === "PAID"
                      ? "text-slate-600 bg-slate-100 border-slate-200"
                      : invoice?.status === "OVERDUE"
                      ? "text-rose-600 bg-rose-50 border-rose-200"
                      : "text-amber-800 bg-amber-50 border-amber-200"
                  }`}
                >
                  {formatDate(invoice.due_date)}
                </span>
              </span>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
              <div className="text-sm font-extrabold text-slate-900">{invoice.client_name}</div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Total Nominal Pelunasan:</span>
              <span className="text-base font-black font-mono text-emerald-700">
                {formatCurrency(invoiceAmount)}
              </span>
            </div>
          </div>

          <div className="mt-2.5 px-3 py-2 bg-emerald-50/60 border border-emerald-200/70 rounded-lg flex items-start gap-2 text-[11px] text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Sistem mencatat pelunasan penuh (100%). Status invoice akan otomatis berubah menjadi <strong>LUNAS</strong>.
            </span>
          </div>
        </div>

        {/* Form Pelunasan */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Tanggal Pelunasan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Pembayaran / Lunas <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Nomor Referensi / Bukti Transfer (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>No. Referensi / Bukti Transaksi</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Misal: TRF-BCA-90812 atau No. Giro/Cek"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Link / URL Bukti Transfer (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Link / URL File Bukti Transfer</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <div className="relative">
              <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://drive.google.com/... atau link cloud storage"
                value={paymentProofUrl}
                onChange={(e) => setPaymentProofUrl(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Catatan Pelunasan (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Catatan Tambahan</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">(opsional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan tambahan pelunasan, penerima kas, dsb."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Konfirmasi Pelunasan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
