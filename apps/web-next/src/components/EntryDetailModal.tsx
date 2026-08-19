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
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount || 0);
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="w-3.5 h-3.5" /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> UNPAID
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 relative my-auto border border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-brand-400 font-mono font-bold">
            #{entry.sequence_no}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Transaction Details
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isShipment ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
              }`}>
                {isShipment ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {entry.entry_type}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Date: {formatDate(entry.date_of_entry)}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Info Box */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Activity / Title</span>
                <span className="text-sm font-semibold text-white">{entry.act_information || "-"}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Route / Explanation</span>
                <span className="text-sm text-gray-200">{entry.act_explaination || "-"}</span>
              </div>
            </div>

            {isShipment && (
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/5">
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Vendor</span>
                  <span className="text-sm font-medium text-brand-300">{entry.vendor_name_raw || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Terms of Payment</span>
                  <span className="text-sm text-gray-300">{entry.top_days ? `${entry.top_days} Days` : "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block mb-1">Due Date</span>
                  <span className="text-sm text-amber-300">{formatDate(entry.due_date)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Shipment Financials */}
          {isShipment && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Grand Cost (HPP)</span>
                <span className="text-sm font-mono font-semibold text-gray-200">{formatCurrency(entry.grand_cost)}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-gray-400 block mb-1">Selling Price</span>
                <span className="text-sm font-mono font-semibold text-blue-400">{formatCurrency(entry.grand_selling)}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-green-500/10 border border-green-500/20">
                <span className="text-xs text-green-300 block mb-1">Profit</span>
                <span className="text-sm font-mono font-bold text-green-400">{formatCurrency(entry.profit)}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-xs text-purple-300 block mb-1">Margin</span>
                <span className="text-sm font-mono font-bold text-purple-300">
                  {(entry.margin_pct * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Cashflow Movement */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-black/40 to-black/20 border border-white/10 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Cash Movement & Saldo</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Debit (Outflow)</span>
                <span className="text-base font-mono font-bold text-red-400">
                  {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Kredit (Inflow)</span>
                <span className="text-base font-mono font-bold text-green-400">
                  {entry.kredit > 0 ? formatCurrency(entry.kredit) : "-"}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block mb-1">Rolling Saldo</span>
                <span className="text-base font-mono font-bold text-white">
                  {formatCurrency(entry.saldo)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">Payment Status:</span>
              {getStatusBadge(entry.remarks)}
            </div>
            {isShipment && (
              <div className="flex gap-2">
                {entry.remarks !== "PAID" && (
                  <button
                    onClick={() => onStatusChange(entry.id, "PAID")}
                    className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-300 hover:bg-green-500/30 text-xs font-medium border border-green-500/30 transition-colors"
                  >
                    Mark as PAID
                  </button>
                )}
                {entry.remarks !== "UNPAID" && (
                  <button
                    onClick={() => onStatusChange(entry.id, "UNPAID")}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium border border-red-500/30 transition-colors"
                  >
                    Mark as UNPAID
                  </button>
                )}
                {entry.remarks !== "PENDING" && (
                  <button
                    onClick={() => onStatusChange(entry.id, "PENDING")}
                    className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-xs font-medium border border-yellow-500/30 transition-colors"
                  >
                    Mark as PENDING
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="flex-1 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 shadow-lg shadow-brand-500/30 transition-opacity flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
