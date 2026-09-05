"use client";

import React, { useState, useMemo } from "react";
import { X, Calendar, Clock, AlertTriangle, CheckCircle2, History, Loader2, ArrowRight } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface RescheduleInvoiceModalProps {
  isOpen: boolean;
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleInvoiceModal({ isOpen, invoice, onClose, onSuccess }: RescheduleInvoiceModalProps) {
  const currentDueDateStr = invoice?.due_date ? String(invoice.due_date).split("T")[0] : "";
  const [newDueDate, setNewDueDate] = useState(() => currentDueDateStr);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial newDueDate when invoice changes
  React.useEffect(() => {
    if (invoice?.due_date) {
      setNewDueDate(String(invoice.due_date).split("T")[0]);
    }
    setReason("");
    setError(null);
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // Calculate day difference
  const diffDays = useMemo(() => {
    if (!currentDueDateStr || !newDueDate) return 0;
    const oldD = new Date(currentDueDateStr);
    const newD = new Date(newDueDate);
    const diffTime = newD.getTime() - oldD.getTime();
    return Math.round(diffTime / (1000 * 3600 * 24));
  }, [currentDueDateStr, newDueDate]);

  const isChanged = currentDueDateStr !== newDueDate && Boolean(newDueDate);
  const isReasonValid = reason.trim().length >= 5;

  // Check if rescheduling overdue invoice to future
  const todayStr = new Date().toISOString().split("T")[0];
  const willResetOverdue = invoice.status === "OVERDUE" && newDueDate >= todayStr;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChanged) {
      setError("Silakan pilih tanggal jatuh tempo yang berbeda dari tanggal saat ini.");
      return;
    }
    if (!isReasonValid) {
      setError("Mohon isi alasan perubahan tanggal jatuh tempo minimal 5 karakter.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        new_due_date: newDueDate,
        reason: reason.trim()
      };

      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${invoice.id}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal mengubah tanggal jatuh tempo");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memperbarui tanggal jatuh tempo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Perubahan Jatuh Tempo (Reschedule)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Perpanjang tempo pembayaran klien dengan pencatatan audit log
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

        {/* Invoice Info Card */}
        <div className="p-6 pb-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-sky-900 bg-sky-100/70 px-2 py-0.5 rounded-md">
                {invoice.invoice_no}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Klien: <strong className="text-slate-800">{invoice.client_name}</strong>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Jatuh Tempo Saat Ini:</span>
              <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                {formatDate(currentDueDateStr)}
              </span>
            </div>

            {invoice.reschedule_count > 0 && (
              <div className="text-[11px] font-semibold text-amber-700 bg-amber-50/80 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Invoice ini sudah pernah diperpanjang sebanyak <strong>{invoice.reschedule_count} kali</strong>.</span>
              </div>
            )}
          </div>
        </div>

        {/* Form Reschedule */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Pemilihan Tanggal Baru & Perbandingan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tanggal Jatuh Tempo Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition cursor-pointer"
              />
            </div>

            {/* Visual Perubahan Hari */}
            {isChanged && (
              <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
                  <span>{formatDate(currentDueDateStr)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-slate-900">{formatDate(newDueDate)}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                    diffDays > 0
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  {diffDays > 0 ? `+${diffDays} Hari` : `${diffDays} Hari`}
                </span>
              </div>
            )}
          </div>

          {/* Notifikasi otomatis status reset */}
          {willResetOverdue && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-2 text-xs text-sky-900 font-medium">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Status invoice akan otomatis dinormalisasi dari <strong>Jatuh Tempo</strong> menjadi <strong>Menunggu Pembayaran</strong> karena jatuh tempo baru masih berlaku di masa depan.
              </span>
            </div>
          )}

          {/* Alasan Perubahan (Audit Log Wajib) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Alasan Perubahan Tempo <span className="text-rose-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">Audit Log Wajib (min. 5 kar.)</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Jelaskan alasan perpanjangan jatuh tempo (contoh: Permintaan penyesuaian termin dari purchasing klien PT XYZ, disetujui via email/WA)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition"
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
              disabled={loading || !isChanged || !isReasonValid}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan Tempo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
