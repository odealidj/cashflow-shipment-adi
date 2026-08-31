"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, FileText, CheckCircle2, ShieldCheck, Edit3 } from "lucide-react";
import { formatThousand, cleanThousand, terbilangRingkas } from "@/hooks/useTerbilang";
import { fetchWithAuth } from "@/lib/apiClient";
import { CustomerSelect } from "@/components/CustomerSelect";

interface InvoiceData {
  id: number;
  invoice_no: string;
  client_name: string;
  shipment_date: string;
  top_terms: string;
  top_days: number;
  due_date: string;
  amount: number;
  status: "UNPAID" | "PAID" | "OVERDUE";
  notes?: string;
}

interface EditInvoiceModalProps {
  isOpen: boolean;
  invoice: InvoiceData | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TOP_OPTIONS = [
  { label: "COD (Cash on Delivery)", days: 0 },
  { label: "Net 7 Hari", days: 7 },
  { label: "Net 14 Hari", days: 14 },
  { label: "Net 30 Hari", days: 30 },
  { label: "Net 45 Hari", days: 45 },
  { label: "Net 60 Hari", days: 60 },
  { label: "Net 90 Hari", days: 90 },
];

const INVOICE_STATUS_OPTIONS = [
  { value: "UNPAID", label: "Menunggu Pembayaran" },
  { value: "PAID", label: "Lunas" },
  { value: "OVERDUE", label: "Jatuh Tempo (Overdue)" }
];

export function EditInvoiceModal({ isOpen, invoice, onClose, onSuccess }: EditInvoiceModalProps) {
  const [clientName, setClientName] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [topDays, setTopDays] = useState(30);
  const [status, setStatus] = useState<"UNPAID" | "PAID" | "OVERDUE">("UNPAID");
  const [amountRaw, setAmountRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setClientName(invoice.client_name || "");
      const sDate = invoice.shipment_date ? invoice.shipment_date.split("T")[0] : "";
      setShipmentDate(sDate);
      setTopDays(Number(invoice.top_days) || 30);
      setStatus(invoice.status || "UNPAID");
      setAmountRaw(invoice.amount ? formatThousand(String(invoice.amount)) : "");
      setNotes(invoice.notes || "");
      setError(null);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  // Auto calculate due date display
  const calculateDueDateStr = () => {
    if (!shipmentDate) return "-";
    const d = new Date(shipmentDate);
    d.setDate(d.getDate() + Number(topDays));
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAmount = parseFloat(cleanThousand(amountRaw)) || 0;
    if (!clientName.trim()) {
      setError("Nama klien / perusahaan wajib diisi.");
      return;
    }
    if (cleanAmount <= 0) {
      setError("Nominal tagihan harus lebih dari 0.");
      return;
    }

    const selectedTop = TOP_OPTIONS.find(t => t.days === Number(topDays));
    const topTerms = selectedTop ? selectedTop.label : `Net ${topDays} Hari`;

    setLoading(true);
    try {
      const res = await fetchWithAuth(`http://localhost:8080/api/v1/invoices/${invoice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_name: clientName.trim(),
          shipment_date: shipmentDate,
          top_terms: topTerms,
          top_days: Number(topDays),
          amount: cleanAmount,
          status: status,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal memperbarui invoice");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-[#1B2A4A] to-[#223249] p-5 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Edit3 className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Edit Invoice</h2>
                <span className="bg-sky-500/30 text-sky-200 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-sky-400/30">
                  {invoice.invoice_no}
                </span>
              </div>
              <p className="text-xs text-sky-200/80 font-medium">Perbarui rincian piutang tagihan klien</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* No. Invoice (Read-only) & Klien */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. Invoice
              </label>
              <input
                type="text"
                value={invoice.invoice_no}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100/80 text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Klien / Perusahaan <span className="text-rose-500">*</span>
              </label>
              <CustomerSelect
                value={clientName}
                onChange={(val) => setClientName(val)}
                required
                placeholder="Pilih dari Master atau ketik nama klien..."
              />
            </div>
          </div>

          {/* Tgl Pengiriman & TOP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Tgl Pengiriman <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                value={shipmentDate}
                onChange={e => setShipmentDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Syarat Pembayaran (TOP)</span>
              </label>
              <select
                value={topDays}
                onChange={e => setTopDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white cursor-pointer"
              >
                {TOP_OPTIONS.map(opt => (
                  <option key={opt.days} value={opt.days}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info Auto Jatuh Tempo & Pilihan Status Pelunasan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 flex flex-col justify-center text-xs">
              <span className="font-bold text-sky-900 text-[11px] uppercase tracking-wider">Perkiraan Jatuh Tempo:</span>
              <span className="font-extrabold text-sky-950 font-mono mt-1 text-xs">
                📅 {calculateDueDateStr()}
              </span>
            </div>

            {/* Pilihan Status Invoice */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Status Invoice <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white cursor-pointer"
              >
                {INVOICE_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nominal Tagihan dengan Titik Ribuan & Live Terbilang Ringkas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nominal Tagihan (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={amountRaw}
                onChange={e => setAmountRaw(formatThousand(e.target.value))}
                placeholder="45.000.000"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-900"
              />
            </div>
            {/* Live Terbilang Helper Badge */}
            {(parseFloat(cleanThousand(amountRaw)) || 0) > 0 && (
              <div className="mt-1 text-[11px] font-semibold text-sky-800 bg-sky-50/80 px-2.5 py-1 rounded-lg border border-sky-200/60 inline-flex items-center gap-1.5 animate-in fade-in duration-150">
                <span>💬</span>
                <span>{terbilangRingkas(parseFloat(cleanThousand(amountRaw)) || 0)}</span>
              </div>
            )}
          </div>

          {/* Catatan / Keterangan Muatan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan / Deskripsi Muatan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Rute pengiriman, jenis armada tronton, atau no PO klien..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-sky-700 hover:bg-sky-800 transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Perbarui Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
