"use client";

import { X, Edit, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface EntryDetailModalProps {
  isOpen: boolean;
  entry: any;
  onClose: () => void;
  onEdit: (entry: any) => void;
  onStatusChange: (id: number, nextStatus: string) => void;
}

export function EntryDetailModal({ isOpen, entry, onClose, onEdit, onStatusChange }: EntryDetailModalProps) {
  if (!isOpen || !entry) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const isShipment = entry.entry_type === "SHIPMENT";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas (PAID)
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5" /> Sebagian (PENDING)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Belum Lunas (UNPAID)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 relative my-auto border border-slate-100 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-mono font-black text-sm">
            #{entry.sequence_no}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              Detail Transaksi
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isShipment ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {isShipment ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {entry.entry_type}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Tanggal: {formatDate(entry.date_of_entry)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Main Info Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Act Information</span>
                <span className="text-sm font-bold text-slate-900">{entry.act_information || "-"}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Act Explaination</span>
                <span className="text-sm text-slate-700">{entry.act_explaination || "-"}</span>
              </div>
            </div>

            {isShipment && (
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Vendor</span>
                  <span className="text-xs font-bold text-blue-700">{entry.vendor_name_raw || "-"}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Terms of Payment</span>
                  <span className="text-xs font-bold text-slate-800">{entry.top_days ? `${entry.top_days} Hari` : "-"}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Jatuh Tempo</span>
                  <span className="text-xs font-bold text-amber-700">{formatDate(entry.due_date)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          {isShipment ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Grand Cost (HPP)</span>
                <span className="text-xs font-mono font-bold text-slate-900 mt-1 block">
                  {formatCurrency(entry.grand_cost)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Grand Selling</span>
                <span className="text-xs font-mono font-bold text-blue-700 mt-1 block">
                  {formatCurrency(entry.grand_selling)}
                </span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Profit</span>
                <span className="text-xs font-mono font-black text-emerald-700 mt-1 block">
                  {formatCurrency(entry.profit)}
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Margin</span>
                <span className="text-xs font-mono font-black text-blue-700 mt-1 block">
                  {(entry.margin_pct * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : null}

          {/* Ledger Cash Flow Impact */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Dampak Arus Kas</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Debit (Keluar)</span>
                <span className="text-sm font-mono font-bold text-rose-600">
                  {entry.debit > 0 ? `-${formatCurrency(entry.debit)}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Kredit (Masuk)</span>
                <span className="text-sm font-mono font-bold text-emerald-600">
                  {entry.kredit > 0 ? `+${formatCurrency(entry.kredit)}` : "-"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Saldo Akhir Berjalan</span>
                <span className="text-sm font-mono font-black text-blue-700">
                  {formatCurrency(entry.saldo)}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Quick Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/80">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Status Saat Ini:</span>
              {getStatusBadge(entry.remarks)}
            </div>

            {isShipment && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Ubah Status:</span>
                <select
                  value={entry.remarks}
                  onChange={(e) => onStatusChange(entry.id, e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UNPAID">Belum Lunas</option>
                  <option value="PENDING">Sebagian</option>
                  <option value="PAID">Lunas</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onEdit(entry);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Transaksi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
