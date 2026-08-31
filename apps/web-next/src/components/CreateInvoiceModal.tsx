"use client";

import React, { useState } from "react";
import { X, Plus, Calendar, Clock, DollarSign, Building, FileText, CheckCircle2 } from "lucide-react";
import { formatThousand, cleanThousand, terbilangRingkas } from "@/hooks/useTerbilang";

interface CreateInvoiceModalProps {
  isOpen: boolean;
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

export function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [clientName, setClientName] = useState("");
  const [shipmentDate, setShipmentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [topDays, setTopDays] = useState(30);
  const [amountRaw, setAmountRaw] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    if (!invoiceNo.trim()) {
      setError("Nomor invoice wajib diisi.");
      return;
    }
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
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8080/api/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_no: invoiceNo.trim(),
          client_name: clientName.trim(),
          shipment_date: shipmentDate,
          top_terms: topTerms,
          top_days: Number(topDays),
          amount: cleanAmount,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.status) {
        throw new Error(data.message || "Gagal membuat invoice");
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
              <FileText className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Buat Invoice Baru</h2>
              <p className="text-xs text-sky-200/80 font-medium">Catat piutang tagihan klien / perusahaan</p>
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

          {/* No. Invoice & Klien */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                No. Invoice <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="INV/2026/08/009"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Klien / Perusahaan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="PT Surya Mandiri Abadi"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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

          {/* Info Auto Jatuh Tempo */}
          <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="font-bold text-sky-900">Perkiraan Jatuh Tempo:</span>
            <span className="font-extrabold text-sky-950 font-mono bg-white px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs">
              📅 {calculateDueDateStr()}
            </span>
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
                  <span>Simpan Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
