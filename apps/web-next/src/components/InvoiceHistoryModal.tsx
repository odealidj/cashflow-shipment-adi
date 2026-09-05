"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  History, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  User, 
  ExternalLink, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";

interface InvoiceHistoryModalProps {
  isOpen: boolean;
  invoice: any;
  onClose: () => void;
}

export function InvoiceHistoryModal({ isOpen, invoice, onClose }: InvoiceHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !invoice?.id) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${invoice.id}/history`);
        const data = await res.json();
        if (!res.ok || !data.status) {
          throw new Error(data.message || "Gagal mengambil riwayat invoice");
        }
        setHistoryData(data.data);
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat riwayat");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

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

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const currentInvoice = historyData?.invoice || invoice;
  const dueHistories = historyData?.reschedule_logs || historyData?.due_date_histories || [];
  const payHistories = historyData?.payment_logs || historyData?.payment_histories || [];

  const isPaid = currentInvoice.status === "PAID";
  const isOverdue = currentInvoice.status === "OVERDUE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Riwayat & Audit Log Tagihan</span>
                <span className="font-mono text-xs text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded-md font-bold">
                  {currentInvoice.invoice_no}
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Penerbitan, perubahan jatuh tempo, dan riwayat pelunasan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Banner */}
        <div className="shrink-0 p-5 bg-slate-50/50 border-b border-slate-200/70 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
            <div className="font-extrabold text-slate-900 truncate mt-0.5">{currentInvoice.client_name}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tagihan</div>
            <div className="font-black font-mono text-slate-900 mt-0.5">
              {formatCurrency(Number(currentInvoice.amount ?? currentInvoice.total_amount ?? 0))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jatuh Tempo Saat Ini</div>
            <div className="mt-0.5">
              <span
                className={`inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded-md border ${
                  isPaid
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : isOverdue
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {formatDate(currentInvoice.due_date)}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  isPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isOverdue
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {isPaid ? "Lunas" : isOverdue ? "Jatuh Tempo (Overdue)" : "Menunggu Pembayaran"}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-6 soft-scrollbar space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-sky-700 mb-2" />
              <p className="text-xs font-semibold">Memuat riwayat log invoice...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          ) : (
            <div className="relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-6">
              
              {/* 1. Milestone: Pelunasan (Jika Ada) */}
              {payHistories.map((pay: any) => {
                const ref = pay.reference_no || pay.payment_reference;
                const proof = pay.proof_url || pay.payment_proof_url;
                const recorder = pay.created_by_name || pay.recorded_by_name || "Sistem";
                const amountVal = pay.amount ?? pay.amount_paid ?? 0;

                return (
                  <div key={pay.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          Pelunasan Tagihan (Lunas 100%)
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 font-bold">
                          {formatDate(pay.payment_date)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-slate-500">Nominal Lunas: </span>
                          <strong className="font-mono text-emerald-700 font-black">
                            {formatCurrency(Number(amountVal))}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Dicatat Oleh: </span>
                          <strong className="text-slate-800">{recorder}</strong>
                        </div>
                      </div>

                      {ref && (
                        <div className="text-xs text-slate-700 bg-white/70 border border-emerald-200/60 p-2 rounded-lg font-mono">
                          <span className="text-slate-400 font-sans text-[10px] uppercase font-bold block">No. Bukti / Ref:</span>
                          {ref}
                        </div>
                      )}

                      {proof && (
                        <div className="pt-1">
                          <a
                            href={proof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Buka File Bukti Transfer</span>
                          </a>
                        </div>
                      )}

                      {pay.notes && (
                        <div className="text-xs text-slate-600 bg-white/50 p-2 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Catatan:</span>
                          {pay.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 2. Milestone: Perubahan Jatuh Tempo (Reschedule) */}
              {dueHistories.map((reschedule: any) => {
                const oldDue = reschedule.previous_due_date || reschedule.old_due_date;
                const changer = reschedule.changed_by_name || "Sistem";

                return (
                  <div key={reschedule.id} className="relative group">
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-amber-500 border-2 border-white text-white flex items-center justify-center shadow-xs">
                      <Calendar className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          Perpanjangan Tanggal Jatuh Tempo
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(reschedule.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200/70 text-xs font-mono">
                        <span className="text-slate-600 font-bold">{formatDate(oldDue)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-900 font-black">{formatDate(reschedule.new_due_date)}</span>
                        <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800">
                          {reschedule.days_added > 0 ? `+${reschedule.days_added} Hari` : `${reschedule.days_added} Hari`}
                        </span>
                      </div>

                      <div className="text-xs bg-white/70 p-2.5 rounded-lg border border-amber-200/50">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Alasan Perpanjangan:</div>
                        <p className="text-slate-800 font-medium mt-0.5">{reschedule.reason}</p>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Diubah oleh: <strong className="text-slate-700">{changer}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 3. Milestone: Penerbitan Invoice Awal (Base Event) */}
              <div className="relative group">
                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-sky-600 border-2 border-white text-white flex items-center justify-center shadow-xs">
                  <FileText className="w-3 h-3 stroke-[2.5]" />
                </div>
                <div className="bg-sky-50/40 border border-sky-200/70 rounded-xl p-4 shadow-2xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-700" />
                      Penerbitan Invoice Tagihan
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {formatDateTime(currentInvoice.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500">Tgl Pengiriman: </span>
                      <strong className="font-mono text-slate-800">{formatDate(currentInvoice.shipment_date)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Term of Payment: </span>
                      <strong className="font-mono text-slate-800">{currentInvoice.top_days} Hari</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Jatuh Tempo Awal: </span>
                      <strong className="font-mono text-sky-900">
                        {formatDate(currentInvoice.original_due_date || currentInvoice.due_date)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Dibuat Oleh: </span>
                      <strong className="text-slate-800">{currentInvoice.created_by_name || "Staff Keuangan"}</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
