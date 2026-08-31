"use client";

import React from "react";
import { X, Printer, Building, FileText, CheckCircle2 } from "lucide-react";
import { terbilangLengkap } from "@/hooks/useTerbilang";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export function InvoicePrintModal({ isOpen, onClose, invoice }: InvoicePrintModalProps) {
  if (!isOpen || !invoice) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Toolbar (Screen Only) */}
        <div className="bg-[#223249] p-4 text-white flex justify-between items-center shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText className="w-4 h-4 text-sky-300" />
            <span>Pratinjau Dokumen Kwitansi / Tagihan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="p-8 overflow-y-auto space-y-6 bg-white text-slate-900 font-sans print:p-0">
          {/* Official Letterhead (Kop Surat PT Adijayantara) */}
          <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-wider uppercase">
                PT ADIJAYANTARA LOGISTIC INDONESIA
              </h1>
              <p className="text-xs font-bold text-sky-800 tracking-wide">
                Freight Forwarding & Logistics Services
              </p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-md leading-relaxed">
                WISMA SMR JL YOS SUDARSO, Kav. 89 Lantai 9, UNIT 904, Jakarta Utara 14350<br />
                Email: adijantara.logistic@gmail.com
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-sky-900 text-white text-xs font-black px-3 py-1 rounded-md tracking-wider uppercase">
                KWITANSI / INVOICE
              </div>
              <p className="font-mono text-xs font-black text-slate-800 mt-2">
                {invoice.invoice_no}
              </p>
            </div>
          </div>

          {/* Customer Info & Terms */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 font-bold block uppercase text-[10px]">Ditagihkan Kepada:</span>
              <span className="text-sm font-black text-slate-900 block mt-0.5">{invoice.client_name}</span>
              {invoice.notes && (
                <span className="text-[11px] text-slate-600 block mt-1">Keterangan: {invoice.notes}</span>
              )}
            </div>
            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-400 font-medium">Tgl Pengiriman: </span>
                <span className="font-bold text-slate-800">{formatDateIndo(invoice.shipment_date)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Syarat Pembayaran: </span>
                <span className="font-bold text-slate-800">{invoice.top_terms}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Tgl Jatuh Tempo: </span>
                <span className="font-bold text-rose-700 font-mono">{formatDateIndo(invoice.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Table Rincian */}
          <table className="w-full text-left border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                <th className="p-3 border-r border-slate-300 w-12 text-center">No</th>
                <th className="p-3 border-r border-slate-300">Deskripsi Layanan / Ekspedisi Muatan</th>
                <th className="p-3 text-right w-44">Jumlah Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="p-3 border-r border-slate-200 text-center font-bold">1</td>
                <td className="p-3 border-r border-slate-200">
                  <p className="font-bold text-slate-800">Biaya Pengiriman Logistik & Ekspedisi</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No. Ref: {invoice.invoice_no} | Pengiriman: {formatDateIndo(invoice.shipment_date)}
                  </p>
                </td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-black">
                <td colSpan={2} className="p-3 border-r border-slate-300 text-right uppercase tracking-wider text-[11px]">
                  Total Tagihan:
                </td>
                <td className="p-3 text-right text-sm font-mono text-sky-950">
                  {formatCurrency(invoice.amount)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Terbilang Formal Standar Kwitansi */}
          <div className="bg-sky-50/60 border border-sky-200 p-3.5 rounded-xl text-xs">
            <span className="font-bold text-sky-900 block text-[10px] uppercase tracking-wider">
              Terbilang:
            </span>
            <span className="font-bold text-slate-800 italic block mt-0.5 leading-relaxed">
              &ldquo;{terbilangLengkap(invoice.amount)}&rdquo;
            </span>
          </div>

          {/* Status Pelunasan */}
          <div className="flex justify-between items-center text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">Status Pembayaran:</span>
              {invoice.status === "PAID" ? (
                <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300">
                  LUNAS ({formatDateIndo(invoice.paid_at)})
                </span>
              ) : invoice.status === "OVERDUE" ? (
                <span className="font-extrabold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-300">
                  JATUH TEMPO (OVERDUE)
                </span>
              ) : (
                <span className="font-extrabold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                  MENUNGGU PEMBAYARAN
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Dokumen resmi PT Adijayantara Logistic Indonesia
            </span>
          </div>

          {/* Tanda Tangan 3 Otorisasi Sesuai Format Dokumen DOCX */}
          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="text-slate-500 font-medium">Dibuat Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 mx-4">
                Staff Finance & Billing
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Diperiksa Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 mx-4">
                Supervisor Keuangan
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Disetujui Oleh,</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900 border-t border-slate-400 pt-1 mx-4">
                Finance Manager
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
