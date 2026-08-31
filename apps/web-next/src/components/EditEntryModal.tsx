"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Edit3, Trash2, Wallet, ArrowRight, TrendingUp } from "lucide-react";
import { formatRupiah, calculateProfit, calculateMarginPct, calculateDueDate } from "@/hooks/useAutoCalculate";
import { VendorSelect } from "@/components/VendorSelect";

interface CashflowEntry {
  id: string;
  sequence_no: number;
  entry_type: "TOP_UP" | "SHIPMENT";
  date_of_entry: string;
  act_information: string;
  act_explaination: string;
  vendor_name_raw: string;
  top_days: number;
  due_date: string | null;
  grand_cost: number;
  grand_selling: number;
  kredit: number;
  debit: number;
  remarks: "PAID" | "UNPAID" | "PENDING";
}

interface EditEntryModalProps {
  isOpen: boolean;
  entry: CashflowEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({ isOpen, entry, onClose, onSuccess }: EditEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentSaldo, setCurrentSaldo] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date_of_entry: "",
    vendor_name_raw: "",
    act_information: "",
    act_explaination: "",
    grand_cost: "",
    grand_selling: "",
    debit: "",
    kredit: "",
    top_days: "",
    due_date: "",
    remarks: "UNPAID"
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        date_of_entry: entry.date_of_entry ? entry.date_of_entry.split("T")[0] : "",
        vendor_name_raw: entry.vendor_name_raw || "",
        act_information: entry.act_information || "",
        act_explaination: entry.act_explaination || "",
        grand_cost: entry.grand_cost ? String(entry.grand_cost) : "",
        grand_selling: entry.grand_selling ? String(entry.grand_selling) : "",
        debit: entry.debit ? String(entry.debit) : "",
        kredit: entry.kredit ? String(entry.kredit) : "",
        top_days: entry.top_days ? String(entry.top_days) : "",
        due_date: entry.due_date ? entry.due_date.split("T")[0] : "",
        remarks: entry.remarks || "UNPAID"
      });
    }

    if (isOpen) {
      const fetchSaldo = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("http://localhost:8080/api/v1/cashflow/summary", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.status && data.data) {
            setCurrentSaldo(data.data.current_saldo || 0);
          }
        } catch (e) {
          console.error("Gagal mengambil saldo:", e);
        }
      };
      fetchSaldo();
    }
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  const isShipment = entry.entry_type === "SHIPMENT";
  const costNum = parseFloat(formData.grand_cost || "0");
  const sellNum = parseFloat(formData.grand_selling || "0");
  const profitNum = calculateProfit(sellNum, costNum);
  const marginNum = calculateMarginPct(profitNum, sellNum);
  const autoDueDate = calculateDueDate(formData.date_of_entry, parseInt(formData.top_days || "0", 10));
  const effectiveDueDate = formData.due_date || autoDueDate;
  // Pada mode edit, saldo disesuaikan dengan selisih perubahan debit
  const originalDebit = entry.debit || 0;
  const projectedSaldo = (currentSaldo ?? 0) + originalDebit - costNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const payload: any = {
        date_of_entry: new Date(formData.date_of_entry).toISOString(),
        act_information: formData.act_information,
        act_explaination: formData.act_explaination,
        remarks: formData.remarks
      };

      if (isShipment) {
        payload.vendor_name_raw = formData.vendor_name_raw;
        payload.grand_cost = costNum;
        payload.grand_selling = sellNum;
        payload.debit = parseFloat(formData.debit || formData.grand_cost || "0");
        payload.top_days = parseInt(formData.top_days || "0", 10);
        payload.due_date = formData.due_date ? new Date(formData.due_date).toISOString() : null;
      } else {
        payload.kredit = parseFloat(formData.kredit.replace(/[^0-9.-]+/g, "") || "0");
      }

      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui transaksi");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Yakin ingin menghapus transaksi #${entry.sequence_no}? Data yang dihapus akan tercatat di log audit.`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:8080/api/v1/cashflow/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus transaksi");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-6 relative my-auto border border-slate-100 shadow-2xl">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Edit Transaksi #{entry.sequence_no}</h2>
            <p className="text-xs text-slate-500 font-medium">Perbarui rincian kas atau operasional shipment</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input
                type="date"
                required
                value={formData.date_of_entry}
                onChange={e => setFormData({ ...formData, date_of_entry: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isShipment && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Vendor</label>
                <VendorSelect
                  value={formData.vendor_name_raw}
                  onChange={v => setFormData({ ...formData, vendor_name_raw: v })}
                  placeholder="Pilih atau ketik vendor..."
                />
              </div>
            )}
            <div className={!isShipment ? "md:col-span-2" : ""}>
              <label className="block text-xs font-bold text-slate-700 mb-1">Act Information</label>
              <input
                type="text"
                required
                value={formData.act_information}
                onChange={e => setFormData({ ...formData, act_information: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Act Explaination</label>
            <input
              type="text"
              value={formData.act_explaination}
              onChange={e => setFormData({ ...formData, act_explaination: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {isShipment ? (
            <div className="space-y-4">
              {/* SEKSI INPUT FINANSIAL & TERMIN */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    Input Finansial & Termin Pembayaran
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grand Cost (HPP) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.grand_cost}
                        onChange={e => {
                          const v = e.target.value;
                          setFormData({ ...formData, grand_cost: v, debit: v });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Grand Selling (Harga Jual) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.grand_selling}
                        onChange={e => setFormData({ ...formData, grand_selling: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Termin Pembayaran (T.O.P) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={formData.top_days}
                        onChange={e => setFormData({ ...formData, top_days: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Hari</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status Pembayaran</label>
                    <select
                      value={formData.remarks}
                      onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-sky-600 focus:outline-none cursor-pointer"
                    >
                      <option value="UNPAID">Belum Lunas (UNPAID)</option>
                      <option value="PENDING">Sebagian (PENDING)</option>
                      <option value="PAID">Lunas (PAID)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEKSI HASIL KALKULASI OTOMATIS SISTEM */}
              <div className="p-3.5 bg-sky-950/5 border border-sky-200/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-sky-700" />
                    Hasil Kalkulasi Otomatis Sistem
                  </span>
                  <span className="text-[10px] text-sky-700 font-semibold bg-sky-100/70 px-2 py-0.5 rounded-md">
                    Auto-calculated
                  </span>
                </div>

                {/* LIVE SALDO IMPACT BAR */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-sky-700" />
                      Simulasi Dampak ke Saldo Kas
                    </span>
                    {costNum > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        projectedSaldo >= 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      }`}>
                        {projectedSaldo >= 0 ? '✓ Saldo Kas Cukup' : '⚠️ Saldo Kas Kurang (Defisit)'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Saldo Kas Saat Ini</span>
                      <span className="font-bold text-slate-700 font-mono text-[13px]">
                        {currentSaldo !== null ? formatRupiah(currentSaldo) : "Memuat..."}
                      </span>
                    </div>

                    <div className="text-slate-300 font-bold hidden sm:block">−</div>

                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Debit Biaya (Shipment)</span>
                      <span className="font-bold text-rose-600 font-mono text-[13px]">
                        − {formatRupiah(costNum)}
                      </span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-sky-700 shrink-0 hidden sm:block" />

                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-medium">Estimasi Sisa Saldo</span>
                      <span className={`font-black font-mono text-[13px] ${
                        projectedSaldo >= 0 ? 'text-sky-900' : 'text-rose-600'
                      }`}>
                        {currentSaldo !== null ? formatRupiah(projectedSaldo) : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Debit Kas Keluar</div>
                    <div className="text-xs font-black text-rose-700 font-mono mt-0.5">
                      {formatRupiah(costNum)}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 leading-none">= Grand Cost</div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Jatuh Tempo</div>
                    <div className="text-xs font-black text-amber-700 mt-0.5 truncate">
                      {effectiveDueDate ? new Date(effectiveDueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 leading-none">{formData.top_days || 0} hari kerja</div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-emerald-200/70 shadow-2xs">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-tight">Profit Estimasi</div>
                    <div className={`text-xs font-black font-mono mt-0.5 ${profitNum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {formatRupiah(profitNum)}
                    </div>
                    <div className="text-[9px] text-emerald-600/70 mt-0.5 leading-none">Selling - Cost</div>
                  </div>

                  <div className="bg-white rounded-xl p-2.5 border border-blue-200/70 shadow-2xs">
                    <div className="text-[10px] text-sky-700 font-bold uppercase tracking-tight">Margin Laba</div>
                    <div className={`text-xs font-black font-mono mt-0.5 ${marginNum >= 0 ? 'text-sky-700' : 'text-rose-600'}`}>
                      {marginNum}%
                    </div>
                    <div className="text-[9px] text-sky-600/70 mt-0.5 leading-none">Persentase</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Kredit (Kas Masuk) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                <input
                  type="number"
                  min="0"
                  value={formData.kredit}
                  onChange={e => setFormData({ ...formData, kredit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-sky-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-3 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Perbarui Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
